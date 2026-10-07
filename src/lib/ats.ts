/**
 * An applicant-tracking-system readiness check, run over exactly what a
 * version would print: the resolved tree (hidden nodes already pruned) plus
 * its effective design.
 *
 * Everything here is a pure function of that data, so the score moves live as
 * the user types, and the rules are covered by unit tests rather than by
 * eyeballing. What a check *says* lives in the interface dictionary, keyed by
 * its id; this file only decides pass / warn / fail and the numbers a message
 * needs.
 *
 * The rules are deliberately the uncontroversial ones — the things that make
 * a parser drop a field or misfile a section — not opinions about style.
 */

import { isLinkType } from "./contacts";
import type { DesignSettings } from "./design";
import { isStandardHeading } from "./locale";
import type { ResolvedNode } from "./resume/types";

export type AtsStatus = "pass" | "warn" | "fail";

export type AtsCheckId =
  | "name"
  | "email"
  | "phone"
  | "location"
  | "profiles"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "dates"
  | "bullets"
  | "bulletLength"
  | "headings"
  | "columns"
  | "photo"
  | "fontSize"
  | "linkText"
  | "length";

export interface AtsCheck {
  id: AtsCheckId;
  status: AtsStatus;
  /** How much the check counts toward the score. */
  weight: number;
  /** Values the message interpolates ({n}, {titles}…). */
  params?: Record<string, string | number>;
}

export interface AtsReport {
  /** 0–100. */
  score: number;
  checks: AtsCheck[];
  wordCount: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LONG_BULLET = 220;
const MIN_WORDS = 150;
const MAX_WORDS = 1200;
/** Below this the printed body is under ~8pt, which OCR-ing parsers misread. */
const MIN_FONT_PX = 11;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function walk(nodes: ResolvedNode[], visit: (n: ResolvedNode) => void) {
  for (const n of nodes) {
    visit(n);
    walk(n.children, visit);
  }
}

/** Fields that hold no printed words (ids, enums, image data). */
const NON_TEXT_FIELDS = new Set(["type", "sectionType", "column", "photo"]);

/**
 * All the words a parser would extract from this version, in reading order.
 * Shared with the keyword matcher so both see the same document.
 */
export function resumeText(roots: ResolvedNode[]): string {
  const parts: string[] = [];
  walk(roots, (n) => {
    for (const [key, value] of Object.entries(n.data)) {
      if (NON_TEXT_FIELDS.has(key) || typeof value !== "string") continue;
      const v = value.trim();
      if (v) parts.push(v);
    }
  });
  return parts.join("\n");
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

function sectionsOfType(sections: ResolvedNode[], type: string) {
  return sections.filter((s) => s.data.sectionType === type && s.children.length > 0);
}

export function analyzeResume(roots: ResolvedNode[], design: DesignSettings): AtsReport {
  const header = roots.find((n) => n.kind === "header");
  const h = header?.data ?? {};
  const contacts = header?.children.filter((c) => c.kind === "contact" && str(c.data.value)) ?? [];
  const links = contacts.filter((c) => isLinkType(c.data.type));
  const sections = roots.filter((n) => n.kind === "section" && n.children.length > 0);
  const checks: AtsCheck[] = [];
  const add = (id: AtsCheckId, status: AtsStatus, weight: number, params?: AtsCheck["params"]) =>
    checks.push({ id, status, weight, params });

  /* ------------------------------- contact -------------------------------- */
  add("name", str(h.fullName) ? "pass" : "fail", 3);
  const email = str(h.email);
  add("email", !email ? "fail" : EMAIL_RE.test(email) ? "pass" : "warn", 3);
  add("phone", str(h.phone) ? "pass" : "warn", 2);
  add("location", str(h.location) ? "pass" : "warn", 1);
  add("profiles", links.length > 0 || str(h.website) ? "pass" : "warn", 1);

  const summary = str(h.summary);
  add("summary", summary && summary.length <= 900 ? "pass" : "warn", 1, {
    n: summary.length,
  });

  /* ------------------------------- sections ------------------------------- */
  const experience = [...sectionsOfType(sections, "experience")];
  add("experience", experience.length > 0 ? "pass" : "warn", 3);
  add("education", sectionsOfType(sections, "education").length > 0 ? "pass" : "warn", 2);
  const skillCount = sectionsOfType(sections, "skills").reduce(
    (total, s) =>
      total +
      s.children.reduce(
        (sum, g) => sum + g.children.filter((c) => c.kind === "skill" && str(c.data.name)).length,
        0,
      ),
    0,
  );
  add("skills", skillCount > 0 ? "pass" : "warn", 2, { n: skillCount });

  /* -------------------------------- entries ------------------------------- */
  let undated = 0;
  let bulletless = 0;
  let longBullets = 0;
  for (const section of sections) {
    for (const entry of section.children) {
      if (entry.kind === "experience" || entry.kind === "education") {
        if (!str(entry.data.startDate) && !str(entry.data.endDate)) undated += 1;
      }
      if (entry.kind === "experience" && section.data.sectionType === "experience") {
        const bullets = entry.children.filter((b) => b.kind === "bullet" && str(b.data.text));
        if (bullets.length === 0) bulletless += 1;
      }
      walk(entry.children, (b) => {
        if (b.kind === "bullet" && str(b.data.text).length > LONG_BULLET) longBullets += 1;
      });
    }
  }
  add("dates", undated === 0 ? "pass" : "warn", 2, { n: undated });
  add("bullets", bulletless === 0 ? "pass" : "warn", 2, { n: bulletless });
  add("bulletLength", longBullets === 0 ? "pass" : "warn", 1, { n: longBullets, max: LONG_BULLET });

  const odd = sections.map((s) => str(s.data.title)).filter((title) => !isStandardHeading(title));
  add("headings", odd.length === 0 ? "pass" : "warn", 2, {
    n: odd.length,
    titles: odd.map((t) => `“${t}”`).join(", "),
  });

  /* -------------------------------- design -------------------------------- */
  const sideInUse =
    design.columns !== "one" && sections.some((s) => s.data.column === "side" || isDefaultSide(s));
  add("columns", sideInUse ? "warn" : "pass", 2);
  // Only a photo that will actually print counts; the empty placeholder doesn't.
  const hasPhoto = Boolean(str(h.photo) || str(h.photoUrl));
  add("photo", design.showPhoto && hasPhoto ? "warn" : "pass", 1);
  add("fontSize", design.fontSize >= MIN_FONT_PX ? "pass" : "warn", 1, { size: design.fontSize });
  add("linkText", design.linkText === "name" && links.length > 0 ? "warn" : "pass", 1);

  const wordCount = countWords(resumeText(roots));
  add("length", wordCount >= MIN_WORDS && wordCount <= MAX_WORDS ? "pass" : "warn", 1, {
    n: wordCount,
    min: MIN_WORDS,
    max: MAX_WORDS,
  });

  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  const earned = checks.reduce(
    (sum, c) => sum + (c.status === "pass" ? c.weight : c.status === "warn" ? c.weight * 0.4 : 0),
    0,
  );
  return { score: Math.round((earned / total) * 100), checks, wordCount };
}

/** Mirrors `sectionColumn`'s fallback without importing React code. */
function isDefaultSide(section: ResolvedNode): boolean {
  if (section.data.column != null) return false;
  return ["skills", "certifications", "references"].includes(String(section.data.sectionType));
}

/* ------------------------------- keywords --------------------------------- */

/**
 * Words that carry no signal in a job posting: grammar in the CV languages
 * plus the boilerplate every posting shares ("team", "experience", "strong").
 */
const STOPWORDS = new Set(
  `a about above after again all also am an and any are as at be been being below between both but by can could
  did do does doing down during each etc few for from further had has have having he her here hers him his how i
  if in into is it its itself just me more most must my no nor not now of off on once only or other our ours out
  over own per same she should so some such than that the their theirs them then there these they this those
  through to too under until up very via was we were what when where which while who whom why will with within
  without would you your yours us e.g i.e
  ability able across apply applicant applicants applying based benefits best candidate candidates career
  company competitive day days degree environment equal excellent experience experienced familiarity familiar
  full good great help highly ideal include includes including job join knowledge looking make new offer
  opportunity opportunities plus position preferred proven related required requirements responsibilities
  responsible role salary skills strong success successful team teams time understanding using well work
  working world year years
  au aux avec ce ces dans de des du elle en et eux il ils je la le les leur lui ma mais me même mes moi mon ne
  nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous
  est sont être avoir été très plus moins afin ainsi dont où chez entre sans sous vers
  poste profil missions mission candidat candidate expérience équipe entreprise compétences connaissance
  في من على إلى عن مع هذا هذه التي الذي أن أو و ثم كما لدى ذات`.split(/\s+/),
);

/** Lower-cased words, keeping tech spellings like c++, c#, node.js and ci/cd intact. */
function tokens(text: string): string[] {
  return (text.toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}+#./-]*[\p{L}\p{N}+#]|[\p{L}\p{N}]/gu) ?? [])
    .map((t) => t.replace(/[./-]+$/, ""))
    .filter(Boolean);
}

function isKeyword(token: string): boolean {
  if (STOPWORDS.has(token)) return false;
  if (/^\d+([.,]\d+)?$/.test(token)) return false;
  // Two-letter tokens are mostly noise, except acronyms such as "ai", "ui" or "qa".
  if (token.length < 2) return token === "c" || token === "r";
  return true;
}

export interface KeywordReport {
  matched: string[];
  missing: string[];
  /** Share of the extracted keywords the CV mentions, 0–100. */
  coverage: number;
}

/**
 * The terms a posting leans on, most frequent first: single keywords plus
 * two-word phrases that recur ("machine learning", "product management").
 */
export function extractKeywords(jobDescription: string, limit = 30): string[] {
  const words = tokens(jobDescription);
  const counts = new Map<string, number>();
  const bump = (term: string) => counts.set(term, (counts.get(term) ?? 0) + 1);

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (isKeyword(w)) bump(w);
    const next = words[i + 1];
    if (next && isKeyword(w) && isKeyword(next)) bump(`${w} ${next}`);
  }

  const ranked = [...counts.entries()]
    // A phrase only counts once it recurs; a single word counts on sight,
    // but a recurring one outranks it.
    .filter(([term, n]) => !term.includes(" ") || n >= 2)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);

  const picked: string[] = [];
  for (const [term] of ranked) {
    // A word already covered by a chosen phrase adds nothing on its own.
    if (!term.includes(" ") && picked.some((p) => p.split(" ").includes(term))) continue;
    picked.push(term);
    if (picked.length >= limit) break;
  }
  return picked;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word presence, so "java" is not found inside "javascript". */
export function mentions(haystack: string, term: string): boolean {
  const re = new RegExp(`(^|[^\\p{L}\\p{N}+#])${escapeRegExp(term)}(?=$|[^\\p{L}\\p{N}+#])`, "iu");
  return re.test(haystack);
}

export function matchKeywords(jobDescription: string, roots: ResolvedNode[], limit = 30): KeywordReport {
  const keywords = extractKeywords(jobDescription, limit);
  const text = tokens(resumeText(roots)).join(" ");
  const matched = keywords.filter((k) => mentions(text, k));
  const missing = keywords.filter((k) => !matched.includes(k));
  return {
    matched,
    missing,
    coverage: keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0,
  };
}
