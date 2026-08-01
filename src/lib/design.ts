/**
 * Design settings follow the same layering as content: the resume carries the
 * base settings (edited from the Default version), and each named version may
 * override individual keys via its settingsPatch. Same mental model, same
 * provenance affordances.
 *
 * Settings are persisted as free-form JSON, so adding a key here needs no
 * migration — `resolveDesign` fills the default for every resume saved before
 * it existed. Keys that changed shape are migrated explicitly in `resolveDesign`.
 */

import { parseDateValue } from "./date-value";
import { LOCALE_LIST, localeOf, toArabicIndic, type Direction, type LocaleId } from "./locale";

export type TemplateId = "classic" | "modern";

export type PageFormatId = "a4" | "letter" | "legal";

export type DateFormatId = "monthYear" | "numeric" | "numericUS" | "yearOnly" | "longMonth";

/** How the body is divided: one column, two columns, or a mix of both. */
export type ColumnsId = "one" | "two" | "mix";

/** Which column a section sits in. `full` spans both (only meaningful in mix). */
export type SectionColumn = "main" | "side" | "full";

export type HeadingStyle = "underline" | "plain" | "box" | "bar" | "background" | "double";
export type HeadingCase = "capitalize" | "uppercase";
export type HeadingIcons = "none" | "outline" | "filled";

export type EntryStructure = "full" | "columns";
export type DatePosition = "right" | "left" | "split";
export type SubtitlePlacement = "sameLine" | "below";

export type HeaderAlign = "left" | "center";
export type HeaderDetails = "inline" | "stacked";
export type HeaderSeparator = "icon" | "bullet" | "bar";

export interface DesignSettings {
  /* -------------------------------- document ------------------------------- */
  template: TemplateId;
  /** Physical page the resume is laid out on; drives where pages break. */
  pageFormat: PageFormatId;
  /**
   * The language the résumé itself is written in — nothing to do with the
   * language of the app's interface. Drives text direction, date wording,
   * default section headings and which fonts are offered.
   */
  language: LocaleId;
  /** Arabic-Indic numerals (٢٠٢٢) instead of Western ones. Arabic only. */
  arabicIndicDigits: boolean;
  /** How dates in entries are rendered. */
  dateFormat: DateFormatId;

  /* --------------------------------- layout -------------------------------- */
  columns: ColumnsId;
  /** Side column width as a fraction of the content width, 0.25–0.45. */
  sidebarWidth: number;

  /* ---------------------------------- font --------------------------------- */
  fontFamily: FontId;
  /** `null` keeps the name in the body font. */
  nameFont: FontId | null;
  /** Base font size in px — everything in the templates scales off it (em). */
  fontSize: number;
  /* Per-element offsets, in px, added to the base size. */
  nameSize: number;
  titleSize: number;
  headingSize: number;
  entryHeaderSize: number;

  /* -------------------------------- spacing -------------------------------- */
  lineHeight: number;
  /** Multiplier on vertical rhythm between sections/items. */
  sectionSpacing: number;
  /** Left/right page padding in px. */
  marginX: number;
  /** Top/bottom page padding in px. */
  marginY: number;

  /* -------------------------------- entries -------------------------------- */
  entryStructure: EntryStructure;
  datePosition: DatePosition;
  subtitlePlacement: SubtitlePlacement;

  /* -------------------------------- headings ------------------------------- */
  headingStyle: HeadingStyle;
  headingCase: HeadingCase;
  headingIcons: HeadingIcons;

  /* --------------------------------- colors -------------------------------- */
  accentColor: string;
  /* Where the accent is actually allowed to show up. */
  accentName: boolean;
  accentSubtitle: boolean;
  accentHeadings: boolean;
  accentHeadingLine: boolean;
  accentBullets: boolean;
  accentDates: boolean;

  /* --------------------------------- header -------------------------------- */
  headerAlign: HeaderAlign;
  headerDetails: HeaderDetails;
  headerSeparator: HeaderSeparator;
  showPhoto: boolean;

  /* ---------------------------------- links -------------------------------- */
  linkUnderline: boolean;
  linkAccent: boolean;
  linkIcon: boolean;

  /* --------------------------------- footer -------------------------------- */
  footerPageNumbers: boolean;
  footerEmail: boolean;
  footerName: boolean;
}

export const DESIGN_DEFAULTS: DesignSettings = {
  template: "classic",
  pageFormat: "a4",
  language: "en",
  arabicIndicDigits: false,
  dateFormat: "monthYear",

  columns: "one",
  sidebarWidth: 0.34,

  fontFamily: "serif",
  nameFont: null,
  fontSize: 13,
  nameSize: 8,
  titleSize: 1,
  headingSize: 0,
  entryHeaderSize: 0,

  lineHeight: 1.5,
  sectionSpacing: 1,
  marginX: 40,
  marginY: 40,

  entryStructure: "columns",
  datePosition: "right",
  subtitlePlacement: "below",

  headingStyle: "underline",
  headingCase: "uppercase",
  headingIcons: "none",

  accentColor: "#9f1239",
  accentName: false,
  accentSubtitle: true,
  accentHeadings: false,
  accentHeadingLine: false,
  accentBullets: false,
  accentDates: false,

  headerAlign: "center",
  headerDetails: "inline",
  headerSeparator: "icon",
  showPhoto: false,

  linkUnderline: false,
  linkAccent: false,
  linkIcon: false,

  footerPageNumbers: false,
  footerEmail: false,
  footerName: false,
};

/* --------------------------------- pages ---------------------------------- */

export interface PageFormat {
  id: PageFormatId;
  name: string;
  /** Physical size, shown next to the control. */
  hint: string;
  /** CSS pixels at 96dpi — the same basis browsers print at. */
  width: number;
  height: number;
  /** Physical size for the `@page` rule, so the PDF comes out true to size. */
  cssSize: string;
}

/**
 * A4 and US Letter are the two resume standards (A4 everywhere except North
 * America); Legal shows up occasionally for long academic CVs.
 */
export const PAGE_FORMATS: Record<PageFormatId, PageFormat> = {
  a4: { id: "a4", name: "A4", hint: "210 × 297 mm", width: 794, height: 1123, cssSize: "210mm 297mm" },
  letter: { id: "letter", name: "Letter", hint: "8.5 × 11 in", width: 816, height: 1056, cssSize: "8.5in 11in" },
  legal: { id: "legal", name: "Legal", hint: "8.5 × 14 in", width: 816, height: 1344, cssSize: "8.5in 14in" },
};

export function pageFormatOf(design: DesignSettings): PageFormat {
  return PAGE_FORMATS[design.pageFormat] ?? PAGE_FORMATS.a4;
}

/** Every template, in picker order. Names and blurbs come from the dictionary. */
export const TEMPLATE_IDS: TemplateId[] = ["classic", "modern"];

/* --------------------------------- fonts ---------------------------------- */

export type FontId =
  | "serif"
  | "sans"
  | "georgia"
  | "times"
  | "garamond"
  | "arial"
  | "helvetica"
  | "verdana"
  | "tahoma"
  | "trebuchet"
  | "naskh"
  | "arabicSans";

export interface FontOption {
  id: FontId;
  name: string;
  /** Everything after the first family is a fallback, so nothing renders blank. */
  stack: string;
  kind: "serif" | "sans";
  /** Which script this family actually has glyphs for. */
  script: "latin" | "arabic";
}

/**
 * Two bundled Latin families plus the fonts that ship with essentially every
 * OS. System fonts need no download and still embed correctly when the browser
 * prints, which keeps the PDF's text real text.
 *
 * The Arabic families are bundled rather than borrowed from the system: the
 * PDF exporter has to embed the very same file it renders from, and what
 * "Traditional Arabic" resolves to differs wildly between machines. Their
 * stacks fall back to a Latin family so an Arabic CV's email addresses and
 * URLs keep the body typeface instead of dropping to a browser default.
 */
export const FONTS: FontOption[] = [
  { id: "serif", name: "Source Serif", stack: "var(--font-resume-serif)", kind: "serif", script: "latin" },
  { id: "sans", name: "Geist", stack: "var(--font-resume-sans)", kind: "sans", script: "latin" },
  { id: "georgia", name: "Georgia", stack: "Georgia, 'Times New Roman', serif", kind: "serif", script: "latin" },
  { id: "times", name: "Times New Roman", stack: "'Times New Roman', Times, serif", kind: "serif", script: "latin" },
  { id: "garamond", name: "Garamond", stack: "Garamond, 'EB Garamond', Georgia, serif", kind: "serif", script: "latin" },
  { id: "arial", name: "Arial", stack: "Arial, Helvetica, sans-serif", kind: "sans", script: "latin" },
  { id: "helvetica", name: "Helvetica", stack: "Helvetica, Arial, sans-serif", kind: "sans", script: "latin" },
  { id: "verdana", name: "Verdana", stack: "Verdana, Geneva, sans-serif", kind: "sans", script: "latin" },
  { id: "tahoma", name: "Tahoma", stack: "Tahoma, Geneva, sans-serif", kind: "sans", script: "latin" },
  { id: "trebuchet", name: "Trebuchet MS", stack: "'Trebuchet MS', Tahoma, sans-serif", kind: "sans", script: "latin" },
  {
    id: "naskh",
    name: "Amiri",
    stack: "var(--font-resume-naskh), var(--font-resume-serif), serif",
    kind: "serif",
    script: "arabic",
  },
  {
    id: "arabicSans",
    name: "IBM Plex Sans Arabic",
    stack: "var(--font-resume-arabic-sans), var(--font-resume-sans), sans-serif",
    kind: "sans",
    script: "arabic",
  },
];

export function fontStack(id: FontId | null | undefined): string {
  return (FONTS.find((f) => f.id === id) ?? FONTS[0]).stack;
}

export function fontOption(id: FontId | null | undefined): FontOption | undefined {
  return FONTS.find((f) => f.id === id);
}

/** The families offered for a CV in this language. */
export function fontsFor(locale: LocaleId): FontOption[] {
  const script = localeOf(locale).dir === "rtl" ? "arabic" : "latin";
  return FONTS.filter((f) => f.script === script);
}

/**
 * A font that can actually render this language, keeping the current choice
 * when it already can.
 *
 * Switching a CV to Arabic while a Latin-only family is selected would render
 * every heading as tofu, so the language control corrects the family along
 * with the language — matching serif with serif so the change stays subtle.
 */
export function fontForLocale(current: FontId, locale: LocaleId): FontId {
  const options = fontsFor(locale);
  if (options.some((f) => f.id === current)) return current;
  const kind = fontOption(current)?.kind ?? "serif";
  return (options.find((f) => f.kind === kind) ?? options[0]).id;
}

/* -------------------------------- controls -------------------------------- */

/**
 * A control's choices are the ids below; what each one is *called* lives in
 * the interface dictionary, keyed by the same id.
 *
 * That split is the point: this file stays a catalogue of what a setting can
 * be, and stops being a copy deck that would need a second copy per language.
 * `optionsFor` is what puts the two back together at the call site.
 */
export interface SegmentOption<T> {
  label: string;
  value: T;
}

export function optionsFor<T extends string>(
  ids: readonly T[],
  labels: Record<T, string>,
): SegmentOption<T>[] {
  return ids.map((value) => ({ label: labels[value], value }));
}

/**
 * The résumé's own language, named in that language — "Français", never
 * "French". A language picker that translates its own options is a language
 * picker you cannot use once you are lost in it.
 */
export const LOCALE_OPTIONS: SegmentOption<LocaleId>[] = LOCALE_LIST.map((l) => ({
  label: l.name,
  value: l.id,
}));

export const PAGE_FORMAT_IDS: PageFormatId[] = ["a4", "letter", "legal"];

const DATE_FORMAT_IDS: DateFormatId[] = ["monthYear", "longMonth", "numeric", "numericUS", "yearOnly"];

/**
 * Each option labelled with what it actually produces for this CV — "mars
 * 2022", "مارس 2022" — rather than a fixed English sample that would not match
 * what the user is about to see on the paper.
 */
export function dateFormatOptions(style: Omit<DateStyle, "dateFormat">): SegmentOption<DateFormatId>[] {
  return DATE_FORMAT_IDS.map((dateFormat) => ({
    label: formatResumeDate("2022-03", { ...style, dateFormat }),
    value: dateFormat,
  }));
}

export const COLUMN_IDS: ColumnsId[] = ["one", "two", "mix"];

export const ENTRY_STRUCTURE_IDS: EntryStructure[] = ["full", "columns"];

export const DATE_POSITION_IDS: DatePosition[] = ["right", "left", "split"];

export const SUBTITLE_IDS: SubtitlePlacement[] = ["sameLine", "below"];

export const HEADING_STYLE_IDS: HeadingStyle[] = [
  "underline",
  "plain",
  "box",
  "bar",
  "background",
  "double",
];

export const HEADING_CASE_IDS: HeadingCase[] = ["capitalize", "uppercase"];

export const HEADING_ICON_IDS: HeadingIcons[] = ["none", "outline", "filled"];

export const HEADER_ALIGN_IDS: HeaderAlign[] = ["left", "center"];

export const HEADER_DETAILS_IDS: HeaderDetails[] = ["inline", "stacked"];

export const HEADER_SEPARATOR_IDS: HeaderSeparator[] = ["icon", "bullet", "bar"];

export type AccentPresetId =
  | "maroon"
  | "charcoal"
  | "slate"
  | "navy"
  | "royal"
  | "sky"
  | "indigo"
  | "violet"
  | "teal"
  | "emerald"
  | "amber"
  | "rose";

export const ACCENT_PRESETS: { id: AccentPresetId; value: string }[] = [
  { id: "maroon", value: "#9f1239" },
  { id: "charcoal", value: "#27272a" },
  { id: "slate", value: "#334155" },
  { id: "navy", value: "#1e3a8a" },
  { id: "royal", value: "#1d4ed8" },
  { id: "sky", value: "#0284c7" },
  { id: "indigo", value: "#4f46e5" },
  { id: "violet", value: "#7c3aed" },
  { id: "teal", value: "#0f766e" },
  { id: "emerald", value: "#047857" },
  { id: "amber", value: "#b45309" },
  { id: "rose", value: "#e11d48" },
];

export type AccentTargetKey =
  | "accentName"
  | "accentSubtitle"
  | "accentHeadings"
  | "accentHeadingLine"
  | "accentBullets"
  | "accentDates";

/** Every accent-target toggle, so the panel can render them from one list. */
export const ACCENT_TARGET_KEYS: AccentTargetKey[] = [
  "accentName",
  "accentSubtitle",
  "accentHeadings",
  "accentHeadingLine",
  "accentBullets",
  "accentDates",
];

/* ------------------------------ numeric ranges ----------------------------- */

export interface StepperRange {
  min: number;
  max: number;
  step: number;
  /** Rendered next to the label, e.g. "13px" or "+2px". */
  format: (value: number) => string;
}

const px = (v: number) => `${Math.round(v * 10) / 10}px`;
const offsetPx = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v * 10) / 10}px`;

export const RANGES = {
  fontSize: { min: 9, max: 18, step: 0.5, format: px },
  nameSize: { min: 0, max: 22, step: 1, format: offsetPx },
  titleSize: { min: -2, max: 12, step: 0.5, format: offsetPx },
  headingSize: { min: -2, max: 10, step: 0.5, format: offsetPx },
  entryHeaderSize: { min: -2, max: 8, step: 0.5, format: offsetPx },
  lineHeight: { min: 1, max: 2, step: 0.05, format: (v: number) => v.toFixed(2) },
  sectionSpacing: { min: 0.5, max: 2, step: 0.05, format: (v: number) => `${Math.round(v * 100)}%` },
  marginX: { min: 12, max: 90, step: 2, format: px },
  marginY: { min: 12, max: 90, step: 2, format: px },
  sidebarWidth: { min: 0.25, max: 0.45, step: 0.01, format: (v: number) => `${Math.round(v * 100)}%` },
} satisfies Record<string, StepperRange>;

export function clampToRange(range: StepperRange, value: number): number {
  const stepped = Math.round(value / range.step) * range.step;
  // Rounding to the step reintroduces float noise (0.30000000000000004).
  const clean = Math.round(stepped * 1000) / 1000;
  return Math.min(range.max, Math.max(range.min, clean));
}

/* -------------------------------- resolving -------------------------------- */

/**
 * Settings saved before a key existed simply fall back to its default. Two
 * keys needed real migration rather than a default:
 *
 *  - `pageMargins` was one number for all four edges before left/right and
 *    top/bottom could differ;
 *  - `fontFamily` used to be exactly "serif" | "sans", which are still valid
 *    font ids, so those values keep working untouched.
 */
export function resolveDesign(
  base: Partial<DesignSettings> | null | undefined,
  patch: Record<string, unknown> | null | undefined,
): DesignSettings {
  const raw = { ...(base ?? {}), ...(patch ?? {}) } as Record<string, unknown>;
  const merged = { ...DESIGN_DEFAULTS, ...raw } as DesignSettings;

  const legacyMargin = raw.pageMargins;
  if (typeof legacyMargin === "number") {
    if (raw.marginX == null) merged.marginX = legacyMargin;
    if (raw.marginY == null) merged.marginY = legacyMargin;
  }

  // Each template has a natural typeface; it applies until the user picks a
  // font family explicitly (then their choice wins across templates).
  if (raw.fontFamily == null) {
    merged.fontFamily = merged.template === "modern" ? "sans" : "serif";
  }

  // A Latin-only family cannot draw a single Arabic letter, so the pairing is
  // corrected here rather than trusted: any route into these settings — an
  // older resume, a copied version patch, a half-applied language change —
  // would otherwise render the whole paper as tofu.
  merged.fontFamily = fontForLocale(merged.fontFamily, merged.language);
  if (merged.nameFont) merged.nameFont = fontForLocale(merged.nameFont, merged.language);

  return merged;
}

/** Which way this CV reads. */
export function designDirection(design: DesignSettings): Direction {
  return localeOf(design.language).dir;
}

export function isRtl(design: DesignSettings): boolean {
  return designDirection(design) === "rtl";
}

export function isDesignKey(key: string): key is keyof DesignSettings {
  return key in DESIGN_DEFAULTS;
}

/* ----------------------------- date rendering ------------------------------ */

/** Everything that decides how a stored date reads on the paper. */
export type DateStyle = Pick<DesignSettings, "dateFormat" | "language" | "arabicIndicDigits">;

/**
 * Renders a stored date ("2022-03", "2014", "Present", or anything hand-typed)
 * in the chosen display format and the CV's language. Values that matched no
 * known shape are passed through verbatim — a format setting must never eat
 * someone's text.
 *
 * Parsing is delegated to `parseDateValue` so the picker, the trigger label
 * and the paper all agree on what a stored string means; only the rendering
 * differs here.
 */
export function formatResumeDate(raw: string, style: DateStyle): string {
  const text = raw.trim();
  if (!text) return "";

  const locale = localeOf(style.language);
  const digits = (value: string) =>
    style.arabicIndicDigits && locale.dir === "rtl" ? toArabicIndic(value) : value;

  const value = parseDateValue(text);
  // "Present" is stored as an English sentinel but is real content on the
  // paper, so it is translated at render time rather than at rest.
  if (value.present) return locale.present;
  if (value.year == null) return text;
  if (value.month == null || style.dateFormat === "yearOnly") return digits(String(value.year));

  const { year, month } = value;
  switch (style.dateFormat) {
    case "numeric":
      return digits(`${String(month).padStart(2, "0")}/${year}`);
    case "numericUS":
      return digits(`${year}-${String(month).padStart(2, "0")}`);
    case "longMonth":
      return `${locale.monthsLong[month - 1]} ${digits(String(year))}`;
    default:
      return `${locale.monthsShort[month - 1]} ${digits(String(year))}`;
  }
}
