/**
 * The catalogue of profile links and personal details a header can carry —
 * LinkedIn, GitHub, Behance, a nationality line, a notice period…
 *
 * Each one is stored as its own `contact` node under the header rather than as
 * one more header field. That is what lets them layer like every other piece
 * of content: a version can hide the GitHub link for a sales application,
 * reorder the links, rewrite one, or carry a link that exists only in that
 * version ("Only here") — all through the same override machinery, with no
 * special cases.
 *
 * Like `locale.ts`, this module is pure data and functions: no React, so the
 * PDF writer, the ATS checker and the tests can all use it.
 */

import { localeOf, type LocaleId } from "./locale";

export type NetworkType =
  | "linkedin"
  | "github"
  | "gitlab"
  | "bitbucket"
  | "stackoverflow"
  | "leetcode"
  | "hackerrank"
  | "kaggle"
  | "huggingface"
  | "codepen"
  | "devto"
  | "medium"
  | "substack"
  | "behance"
  | "dribbble"
  | "artstation"
  | "figma"
  | "youtube"
  | "vimeo"
  | "x"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "orcid"
  | "scholar"
  | "researchgate"
  | "upwork"
  | "malt"
  | "telegram"
  | "whatsapp";

/** Links whose printed name is a common noun, so it follows the CV's language. */
export type GenericLinkType = "portfolio" | "blog" | "link";

/** Plain-text personal details, printed as "Label: value". */
export type DetailType =
  | "nationality"
  | "birthDate"
  | "drivingLicense"
  | "workPermit"
  | "availability"
  | "info";

export type ContactType = NetworkType | GenericLinkType | DetailType;

export type ContactGroup = "network" | "web" | "detail";

export interface ContactTypeDef {
  id: ContactType;
  group: ContactGroup;
  /**
   * Brand name, printed as-is in every language — LinkedIn is LinkedIn on an
   * Arabic CV too. Absent for generic links and details, whose printed label
   * comes from the CV's locale instead.
   */
  brand?: string;
  /** Hostnames that identify this network when a URL is pasted. */
  hosts?: string[];
  /** Turns a bare handle ("ada", "@ada") into a full profile URL. */
  profile?: (handle: string) => string;
  /** Example value shown in the empty input. */
  placeholder: string;
}

const at = (h: string) => h.replace(/^@/, "");

/**
 * Picker order: the networks recruiters actually look for first, then the
 * creative and academic ones, then the rest.
 */
export const CONTACT_TYPES: ContactTypeDef[] = [
  // --- professional & code
  { id: "linkedin", group: "network", brand: "LinkedIn", hosts: ["linkedin.com", "lnkd.in"], profile: (h) => `https://www.linkedin.com/in/${at(h)}`, placeholder: "linkedin.com/in/ada" },
  { id: "github", group: "network", brand: "GitHub", hosts: ["github.com"], profile: (h) => `https://github.com/${at(h)}`, placeholder: "github.com/ada" },
  { id: "gitlab", group: "network", brand: "GitLab", hosts: ["gitlab.com"], profile: (h) => `https://gitlab.com/${at(h)}`, placeholder: "gitlab.com/ada" },
  { id: "bitbucket", group: "network", brand: "Bitbucket", hosts: ["bitbucket.org"], profile: (h) => `https://bitbucket.org/${at(h)}`, placeholder: "bitbucket.org/ada" },
  { id: "stackoverflow", group: "network", brand: "Stack Overflow", hosts: ["stackoverflow.com", "stackexchange.com"], placeholder: "stackoverflow.com/users/123/ada" },
  { id: "leetcode", group: "network", brand: "LeetCode", hosts: ["leetcode.com", "leetcode.cn"], profile: (h) => `https://leetcode.com/u/${at(h)}`, placeholder: "leetcode.com/u/ada" },
  { id: "hackerrank", group: "network", brand: "HackerRank", hosts: ["hackerrank.com"], profile: (h) => `https://www.hackerrank.com/profile/${at(h)}`, placeholder: "hackerrank.com/profile/ada" },
  { id: "kaggle", group: "network", brand: "Kaggle", hosts: ["kaggle.com"], profile: (h) => `https://www.kaggle.com/${at(h)}`, placeholder: "kaggle.com/ada" },
  { id: "huggingface", group: "network", brand: "Hugging Face", hosts: ["huggingface.co"], profile: (h) => `https://huggingface.co/${at(h)}`, placeholder: "huggingface.co/ada" },
  { id: "codepen", group: "network", brand: "CodePen", hosts: ["codepen.io"], profile: (h) => `https://codepen.io/${at(h)}`, placeholder: "codepen.io/ada" },
  { id: "devto", group: "network", brand: "DEV", hosts: ["dev.to"], profile: (h) => `https://dev.to/${at(h)}`, placeholder: "dev.to/ada" },
  { id: "medium", group: "network", brand: "Medium", hosts: ["medium.com"], profile: (h) => `https://medium.com/@${at(h)}`, placeholder: "medium.com/@ada" },
  { id: "substack", group: "network", brand: "Substack", hosts: ["substack.com"], profile: (h) => `https://${at(h)}.substack.com`, placeholder: "ada.substack.com" },
  // --- design & media
  { id: "behance", group: "network", brand: "Behance", hosts: ["behance.net"], profile: (h) => `https://www.behance.net/${at(h)}`, placeholder: "behance.net/ada" },
  { id: "dribbble", group: "network", brand: "Dribbble", hosts: ["dribbble.com"], profile: (h) => `https://dribbble.com/${at(h)}`, placeholder: "dribbble.com/ada" },
  { id: "artstation", group: "network", brand: "ArtStation", hosts: ["artstation.com"], profile: (h) => `https://www.artstation.com/${at(h)}`, placeholder: "artstation.com/ada" },
  { id: "figma", group: "network", brand: "Figma", hosts: ["figma.com"], profile: (h) => `https://www.figma.com/@${at(h)}`, placeholder: "figma.com/@ada" },
  { id: "youtube", group: "network", brand: "YouTube", hosts: ["youtube.com", "youtu.be"], profile: (h) => `https://www.youtube.com/@${at(h)}`, placeholder: "youtube.com/@ada" },
  { id: "vimeo", group: "network", brand: "Vimeo", hosts: ["vimeo.com"], profile: (h) => `https://vimeo.com/${at(h)}`, placeholder: "vimeo.com/ada" },
  // --- social
  { id: "x", group: "network", brand: "X", hosts: ["x.com", "twitter.com"], profile: (h) => `https://x.com/${at(h)}`, placeholder: "x.com/ada" },
  { id: "instagram", group: "network", brand: "Instagram", hosts: ["instagram.com"], profile: (h) => `https://www.instagram.com/${at(h)}`, placeholder: "instagram.com/ada" },
  { id: "facebook", group: "network", brand: "Facebook", hosts: ["facebook.com", "fb.com"], profile: (h) => `https://www.facebook.com/${at(h)}`, placeholder: "facebook.com/ada" },
  { id: "tiktok", group: "network", brand: "TikTok", hosts: ["tiktok.com"], profile: (h) => `https://www.tiktok.com/@${at(h)}`, placeholder: "tiktok.com/@ada" },
  // --- academic
  { id: "orcid", group: "network", brand: "ORCID", hosts: ["orcid.org"], profile: (h) => `https://orcid.org/${at(h)}`, placeholder: "orcid.org/0000-0002-1825-0097" },
  { id: "scholar", group: "network", brand: "Google Scholar", hosts: ["scholar.google.com"], placeholder: "scholar.google.com/citations?user=…" },
  { id: "researchgate", group: "network", brand: "ResearchGate", hosts: ["researchgate.net"], profile: (h) => `https://www.researchgate.net/profile/${at(h)}`, placeholder: "researchgate.net/profile/Ada-Lovelace" },
  // --- freelance & messaging
  { id: "upwork", group: "network", brand: "Upwork", hosts: ["upwork.com"], placeholder: "upwork.com/freelancers/~01…" },
  { id: "malt", group: "network", brand: "Malt", hosts: ["malt.fr", "malt.com", "malt.de", "malt.es", "malt.be", "malt.nl", "malt.ch"], profile: (h) => `https://www.malt.fr/profile/${at(h)}`, placeholder: "malt.fr/profile/ada" },
  { id: "telegram", group: "network", brand: "Telegram", hosts: ["t.me", "telegram.me"], profile: (h) => `https://t.me/${at(h)}`, placeholder: "t.me/ada" },
  { id: "whatsapp", group: "network", brand: "WhatsApp", hosts: ["wa.me", "whatsapp.com"], profile: (h) => `https://wa.me/${h.replace(/[^\d]/g, "")}`, placeholder: "+212 600 000 000" },
  // --- generic web
  { id: "portfolio", group: "web", placeholder: "ada.design" },
  { id: "blog", group: "web", placeholder: "blog.ada.dev" },
  { id: "link", group: "web", placeholder: "example.com/anything" },
  // --- personal details
  { id: "nationality", group: "detail", placeholder: "Moroccan" },
  { id: "birthDate", group: "detail", placeholder: "12 March 1995" },
  { id: "drivingLicense", group: "detail", placeholder: "B" },
  { id: "workPermit", group: "detail", placeholder: "EU work permit" },
  { id: "availability", group: "detail", placeholder: "Immediately / 1 month notice" },
  { id: "info", group: "detail", placeholder: "Anything else" },
];

const BY_ID = new Map(CONTACT_TYPES.map((c) => [c.id, c]));

/** Unknown types fall back to a plain link, so old or hand-edited data still renders. */
export function contactType(id: unknown): ContactTypeDef {
  return BY_ID.get(id as ContactType) ?? BY_ID.get("link")!;
}

export function isLinkType(id: unknown): boolean {
  return contactType(id).group !== "detail";
}

/* ------------------------------- detection -------------------------------- */

function hostOf(value: string): string | null {
  const raw = value.trim();
  if (!raw || /\s/.test(raw)) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Which network a pasted URL belongs to, if any — so dropping a GitHub URL
 * into a generic link row turns it into a GitHub row with the right icon and
 * name.
 */
export function detectContactType(value: string): NetworkType | null {
  const host = hostOf(value);
  if (!host || !host.includes(".")) return null;
  for (const def of CONTACT_TYPES) {
    if (def.group !== "network" || !def.hosts) continue;
    if (def.hosts.some((h) => host === h || host.endsWith(`.${h}`))) return def.id as NetworkType;
  }
  return null;
}

/* ------------------------------- rendering -------------------------------- */

const SAFE_SCHEMES = /^(https?:\/\/|mailto:|tel:)/i;

/** True when a value already starts with a scheme ("https://", "mailto:"…). */
function hasScheme(value: string): boolean {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value) || /^(mailto|tel|javascript|data|vbscript):/i.test(value);
}

/**
 * Only web, email and phone links are ever made clickable. Anything else —
 * `javascript:`, `data:`, `file:` — would put script or local files behind a
 * link on the page and in the PDF.
 */
function safeScheme(value: string): string | null {
  return SAFE_SCHEMES.test(value) ? value : null;
}


/** True when a value reads as a URL (has a scheme, or a dot before any slash). */
function looksLikeUrl(value: string): boolean {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) return true;
  if (/^mailto:|^tel:/i.test(value)) return true;
  const head = value.split(/[/?#]/)[0];
  return /^[^\s@]+\.[a-z]{2,}$/i.test(head);
}

/**
 * A clickable URL for a contact value, or null for a plain-text detail.
 *
 * People type links every which way — "github.com/ada", "@ada", "https://…" —
 * and the printed result has to be a link that actually opens, so a bare
 * handle is expanded with the network's profile URL and a schemeless domain
 * gets https.
 */
export function contactHref(type: unknown, value: unknown): string | null {
  const def = contactType(type);
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || def.group === "detail") return null;
  if (hasScheme(raw)) return safeScheme(raw);
  const handle = raw.replace(/\s/g, "");
  // In a network's own field, a bare word is a handle even when it has a dot
  // in it ("ada.lovelace" on GitHub) — unless it names the network's host.
  const namesHost = (def.hosts ?? []).some((h) => raw.toLowerCase().includes(h));
  if (def.profile && !/[/@:]/.test(raw.replace(/^@/, "")) && !namesHost && /^@?[\w.+-]+$/.test(handle)) {
    return def.profile(handle);
  }
  return urlHref(raw);
}

/** Any URL a user typed, made clickable; null when it is not a URL at all. */
export function urlHref(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  if (hasScheme(raw)) return safeScheme(raw);
  if (EMAIL_RE.test(raw)) return `mailto:${raw}`;
  return looksLikeUrl(raw) ? `https://${raw}` : null;
}

const EMAIL_RE = /^[^\s@/]+@[^\s@/]+\.[a-z]{2,}$/i;

/**
 * The form a URL is printed in: no scheme, no "www.", no trailing slash.
 *
 * Printing the address itself rather than a "LinkedIn" label is what keeps a
 * link useful to an ATS — parsers read the text layer, and most never follow
 * the hidden target of a link annotation.
 */
export function displayUrl(href: string): string {
  return href
    .replace(/^[a-z][a-z\d+.-]*:\/\//i, "")
    .replace(/^(mailto|tel):/i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}

/** How link-type contacts are printed: the address itself, or just its name. */
export type LinkTextMode = "url" | "name";

/** The printed name of a contact: custom label, brand, or the CV-language noun. */
export function contactName(data: Record<string, unknown>, locale: LocaleId): string {
  const label = typeof data.label === "string" ? data.label.trim() : "";
  if (label) return label;
  const def = contactType(data.type);
  if (def.brand) return def.brand;
  if (def.id === "info") return "";
  return localeOf(locale).contactLabels[def.id as Exclude<ContactType, NetworkType | "info">] ?? "";
}

export interface ContactRender {
  type: ContactType;
  group: ContactGroup;
  /** What is printed. */
  text: string;
  /** Printed ahead of the text for details ("Nationality"), else empty. */
  prefix: string;
  /** Clickable target, when the contact is a link. */
  href: string | null;
}

/**
 * Everything a template or the PDF writer needs to print one contact, so the
 * screen and the export can never disagree about what a row says.
 */
export function renderContact(
  data: Record<string, unknown>,
  opts: { locale: LocaleId; linkText: LinkTextMode },
): ContactRender | null {
  const value = typeof data.value === "string" ? data.value.trim() : "";
  if (!value) return null;
  const def = contactType(data.type);
  if (def.group === "detail") {
    return { type: def.id, group: def.group, text: value, prefix: contactName(data, opts.locale), href: null };
  }
  const href = contactHref(def.id, value);
  const name = contactName(data, opts.locale);
  const text = opts.linkText === "name" && href && name ? name : href ? displayUrl(href) : value;
  return { type: def.id, group: def.group, text, prefix: "", href };
}

/* ------------------------------ header line ------------------------------- */

/** The fixed header fields plus every contact type. */
export type HeaderContactKind = "email" | "phone" | "location" | "website" | ContactType;

export interface HeaderContact {
  /** Stable React key: the field name, or the contact node's id. */
  key: string;
  kind: HeaderContactKind;
  text: string;
  /** "Nationality" for details; empty for everything else. */
  prefix: string;
  href: string | null;
  /**
   * Addresses, numbers and URLs are pinned LTR — a phone number has no strong
   * character and would come out as "212+" inside an Arabic paragraph. Text
   * that can genuinely be Arabic follows its own content.
   */
  dir: "ltr" | "auto";
}

interface HeaderLike {
  data: Record<string, unknown>;
  children: { id: string; kind: string; data: Record<string, unknown> }[];
}

/**
 * Every item of the header's contact line, in printed order: email, phone,
 * location and website, then the links and details in the order the version
 * arranged them. The preview and the PDF both print from this one list.
 */
export function headerContacts(
  header: HeaderLike,
  opts: { locale: LocaleId; linkText: LinkTextMode },
): HeaderContact[] {
  const d = header.data;
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const out: HeaderContact[] = [];

  const email = s(d.email);
  if (email) out.push({ key: "email", kind: "email", text: email, prefix: "", href: `mailto:${email}`, dir: "ltr" });
  const phone = s(d.phone);
  if (phone) {
    const digits = phone.replace(/[^\d+]/g, "");
    out.push({ key: "phone", kind: "phone", text: phone, prefix: "", href: digits ? `tel:${digits}` : null, dir: "ltr" });
  }
  const location = s(d.location);
  if (location) out.push({ key: "location", kind: "location", text: location, prefix: "", href: null, dir: "auto" });
  const website = s(d.website);
  if (website) {
    const href = urlHref(website);
    const named = opts.linkText === "name" && href;
    out.push({
      key: "website",
      kind: "website",
      text: named ? localeOf(opts.locale).contactLabels.link : href ? displayUrl(href) : website,
      prefix: "",
      href,
      dir: named ? "auto" : "ltr",
    });
  }

  for (const child of header.children) {
    if (child.kind !== "contact") continue;
    const r = renderContact(child.data, opts);
    if (!r) continue;
    const isUrlText = r.href != null && r.text === displayUrl(r.href);
    out.push({
      key: child.id,
      kind: r.type,
      text: r.text,
      prefix: r.prefix,
      href: r.href,
      dir: isUrlText ? "ltr" : "auto",
    });
  }
  return out;
}
