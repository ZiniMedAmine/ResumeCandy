import { CONTACT_TYPES } from "@/lib/contacts";
import type { LocaleId } from "@/lib/locale";
import { sectionTitle } from "@/lib/locale";
import { ranksBetween } from "@/lib/resume/rank";
import type { NodeKind, SectionType } from "@/lib/resume/types";

/**
 * A tailored résumé as Claude returns it, and its translation into
 * ResumeCandy's node tree.
 *
 * The shape is deliberately flat and close to how a CV reads — header,
 * sections, entries, bullets — rather than ResumeCandy's own nodes: the model
 * writes better content against a document it recognises, and turning that
 * into ranked nodes is mechanical work that belongs in code.
 */

export type TailoredSection = "experience" | "projects" | "education" | "skills" | "certifications" | "languages";

export const TAILORED_SECTIONS: TailoredSection[] = [
  "experience",
  "projects",
  "education",
  "skills",
  "certifications",
  "languages",
];

export interface TailoredResume {
  language: LocaleId;
  header: {
    fullName: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    summary: string;
  };
  contacts: { type: string; value: string }[];
  sectionOrder: TailoredSection[];
  experience: {
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    url: string;
    bullets: string[];
  }[];
  projects: { name: string; url: string; description: string; startDate: string; endDate: string; bullets: string[] }[];
  education: {
    degree: string;
    field: string;
    school: string;
    location: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }[];
  skills: { name: string; items: string[] }[];
  certifications: { name: string; issuer: string; date: string; url: string }[];
  languages: { name: string; level: string }[];
  /** What was emphasised or left out, for the person reading the result. */
  notes: string[];
}

/* --------------------------------- schema --------------------------------- */

const str = { type: "string" } as const;
const strings = { type: "array", items: str } as const;

function object(properties: Record<string, unknown>) {
  return {
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  } as const;
}

/** Link-type contacts only: email, phone and location live on the header. */
const CONTACT_IDS = CONTACT_TYPES.map((c) => c.id);

export const TAILORED_SCHEMA = object({
  language: { type: "string", enum: ["en", "fr", "ar"] },
  header: object({
    fullName: str,
    headline: str,
    email: str,
    phone: str,
    location: str,
    website: str,
    summary: str,
  }),
  contacts: { type: "array", items: object({ type: { type: "string", enum: CONTACT_IDS }, value: str }) },
  sectionOrder: { type: "array", items: { type: "string", enum: TAILORED_SECTIONS } },
  experience: {
    type: "array",
    items: object({ title: str, company: str, location: str, startDate: str, endDate: str, url: str, bullets: strings }),
  },
  projects: {
    type: "array",
    items: object({ name: str, url: str, description: str, startDate: str, endDate: str, bullets: strings }),
  },
  education: {
    type: "array",
    items: object({ degree: str, field: str, school: str, location: str, startDate: str, endDate: str, bullets: strings }),
  },
  skills: { type: "array", items: object({ name: str, items: strings }) },
  certifications: { type: "array", items: object({ name: str, issuer: str, date: str, url: str }) },
  languages: { type: "array", items: object({ name: str, level: str }) },
  notes: strings,
});

/* ------------------------------- validation ------------------------------- */

const s = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const arr = (v: unknown, max: number): Record<string, unknown>[] =>
  Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Record<string, unknown>[]).slice(0, max) : [];
const texts = (v: unknown, max: number, len = 600) =>
  Array.isArray(v) ? v.map((x) => s(x, len)).filter(Boolean).slice(0, max) : [];

const MONTH_FIRST = /^(\d{1,2})[/.-](\d{4})$/;
const PRESENT = /^(present|current|now|ongoing|today|aujourd'hui|présent|actuel|en cours|حتى الآن|حاليا)$/i;

/**
 * Dates in ResumeCandy's canonical form ("2022-03", "2022", "Present"), so
 * they format in the CV's language like hand-entered ones. Anything else is
 * kept verbatim — the date field already renders unknown shapes as typed.
 */
export function normalizeDate(raw: unknown): string {
  const v = s(raw, 40);
  if (!v) return "";
  if (PRESENT.test(v)) return "Present";
  if (/^\d{4}(-\d{2})?$/.test(v)) return v;
  const m = v.match(MONTH_FIRST);
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;
  return v;
}

export function sanitizeTailored(raw: unknown, fallbackLanguage: LocaleId): TailoredResume {
  const r = (raw ?? {}) as Record<string, unknown>;
  const h = (r.header ?? {}) as Record<string, unknown>;
  const language = (["en", "fr", "ar"] as const).includes(r.language as LocaleId)
    ? (r.language as LocaleId)
    : fallbackLanguage;
  const order = texts(r.sectionOrder, 12, 40).filter((x): x is TailoredSection =>
    TAILORED_SECTIONS.includes(x as TailoredSection),
  );
  // Every section with content gets a place, even if the order forgot it.
  const sectionOrder = [...new Set([...order, ...TAILORED_SECTIONS])];

  return {
    language,
    header: {
      fullName: s(h.fullName, 120),
      headline: s(h.headline, 200),
      email: s(h.email, 200),
      phone: s(h.phone, 60),
      location: s(h.location, 120),
      website: s(h.website, 300),
      summary: s(h.summary, 1500),
    },
    contacts: arr(r.contacts, 12)
      .map((c) => ({ type: s(c.type, 40), value: s(c.value, 300) }))
      .filter((c) => c.value && CONTACT_IDS.includes(c.type as (typeof CONTACT_IDS)[number])),
    sectionOrder,
    experience: arr(r.experience, 10).map((e) => ({
      title: s(e.title, 200),
      company: s(e.company, 200),
      location: s(e.location, 120),
      startDate: normalizeDate(e.startDate),
      endDate: normalizeDate(e.endDate),
      url: s(e.url, 300),
      bullets: texts(e.bullets, 10),
    })),
    projects: arr(r.projects, 8).map((p) => ({
      name: s(p.name, 200),
      url: s(p.url, 300),
      description: s(p.description, 600),
      startDate: normalizeDate(p.startDate),
      endDate: normalizeDate(p.endDate),
      bullets: texts(p.bullets, 8),
    })),
    education: arr(r.education, 6).map((e) => ({
      degree: s(e.degree, 200),
      field: s(e.field, 200),
      school: s(e.school, 200),
      location: s(e.location, 120),
      startDate: normalizeDate(e.startDate),
      endDate: normalizeDate(e.endDate),
      bullets: texts(e.bullets, 6),
    })),
    skills: arr(r.skills, 8)
      .map((g) => ({ name: s(g.name, 80), items: texts(g.items, 30, 80) }))
      .filter((g) => g.items.length > 0),
    certifications: arr(r.certifications, 10)
      .map((c) => ({ name: s(c.name, 200), issuer: s(c.issuer, 200), date: normalizeDate(c.date), url: s(c.url, 300) }))
      .filter((c) => c.name),
    languages: arr(r.languages, 8)
      .map((l) => ({ name: s(l.name, 60), level: s(l.level, 60) }))
      .filter((l) => l.name),
    notes: texts(r.notes, 8),
  };
}

/* ---------------------------------- nodes --------------------------------- */

export interface NewNode {
  id: string;
  parentId: string | null;
  kind: NodeKind;
  rank: string;
  data: Record<string, unknown>;
}

const SECTION_TYPE: Record<TailoredSection, SectionType> = {
  experience: "experience",
  projects: "projects",
  education: "education",
  skills: "skills",
  certifications: "certifications",
  languages: "languages",
};

/**
 * The tailored résumé as base nodes of a new resume, in reading order.
 * Section headings are written in the CV's language, exactly as a resume
 * created by hand in that language starts out, so they keep following it.
 */
export function tailoredToNodes(content: TailoredResume, newId: () => string): NewNode[] {
  const out: NewNode[] = [];
  const add = (parentId: string | null, kind: NodeKind, rank: string, data: Record<string, unknown>) => {
    const id = newId();
    out.push({ id, parentId, kind, rank, data });
    return id;
  };
  const children = <T,>(parentId: string, items: T[], kind: NodeKind, data: (item: T) => Record<string, unknown>) => {
    const ranks = ranksBetween(null, null, items.length);
    return items.map((item, i) => add(parentId, kind, ranks[i], data(item)));
  };
  const bullets = (parentId: string, list: string[]) => children(parentId, list, "bullet", (text) => ({ text }));

  const sections = content.sectionOrder.filter((type) => content[type].length > 0);
  const rootRanks = ranksBetween(null, null, sections.length + 1);

  const headerId = add(null, "header", rootRanks[0], { ...content.header });
  children(headerId, content.contacts, "contact", (c) => ({ type: c.type, value: c.value, label: "" }));

  sections.forEach((type, i) => {
    const sectionId = add(null, "section", rootRanks[i + 1], {
      title: sectionTitle(SECTION_TYPE[type], content.language),
      sectionType: SECTION_TYPE[type],
    });
    const entryRanks = ranksBetween(null, null, content[type].length);
    const entry = (kind: NodeKind, data: Record<string, unknown>, index: number) =>
      add(sectionId, kind, entryRanks[index], data);
    switch (type) {
      case "experience":
        content.experience.forEach(({ bullets: list, ...data }, j) => bullets(entry("experience", data, j), list));
        break;
      case "projects":
        content.projects.forEach(({ bullets: list, ...data }, j) => bullets(entry("project", data, j), list));
        break;
      case "education":
        content.education.forEach(({ bullets: list, ...data }, j) => bullets(entry("education", data, j), list));
        break;
      case "skills":
        content.skills.forEach((g, j) => {
          const groupId = entry("skillGroup", { name: g.name }, j);
          children(groupId, g.items, "skill", (name) => ({ name }));
        });
        break;
      case "certifications":
        children(sectionId, content.certifications, "certification", (c) => ({ ...c }));
        break;
      case "languages":
        children(sectionId, content.languages, "language", (l) => ({ ...l }));
        break;
    }
  });

  return out;
}

/** Plain text of a tailored résumé — what the cover letter is written against. */
export function tailoredToText(content: TailoredResume): string {
  const lines: string[] = [];
  const h = content.header;
  lines.push(h.fullName, h.headline, h.summary, "");
  for (const e of content.experience) {
    lines.push(`${e.title}, ${e.company} (${e.startDate} – ${e.endDate})`, ...e.bullets.map((b) => `- ${b}`), "");
  }
  for (const p of content.projects) lines.push(`${p.name}: ${p.description}`, ...p.bullets.map((b) => `- ${b}`));
  for (const g of content.skills) lines.push(`${g.name}: ${g.items.join(", ")}`);
  return lines.join("\n");
}
