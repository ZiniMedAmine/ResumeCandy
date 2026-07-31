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

export const TEMPLATES: { id: TemplateId; name: string; description: string }[] = [
  { id: "classic", name: "Classic", description: "Serif, centered header, ruled sections" },
  { id: "modern", name: "Modern", description: "Sans-serif, accent header, sidebar column" },
];

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
  | "trebuchet";

export interface FontOption {
  id: FontId;
  name: string;
  /** Everything after the first family is a fallback, so nothing renders blank. */
  stack: string;
  kind: "serif" | "sans";
}

/**
 * Two bundled families plus the fonts that ship with essentially every OS.
 * System fonts need no download and still embed correctly when the browser
 * prints, which keeps the PDF's text real text.
 */
export const FONTS: FontOption[] = [
  { id: "serif", name: "Source Serif", stack: "var(--font-resume-serif)", kind: "serif" },
  { id: "sans", name: "Geist", stack: "var(--font-resume-sans)", kind: "sans" },
  { id: "georgia", name: "Georgia", stack: "Georgia, 'Times New Roman', serif", kind: "serif" },
  { id: "times", name: "Times New Roman", stack: "'Times New Roman', Times, serif", kind: "serif" },
  { id: "garamond", name: "Garamond", stack: "Garamond, 'EB Garamond', Georgia, serif", kind: "serif" },
  { id: "arial", name: "Arial", stack: "Arial, Helvetica, sans-serif", kind: "sans" },
  { id: "helvetica", name: "Helvetica", stack: "Helvetica, Arial, sans-serif", kind: "sans" },
  { id: "verdana", name: "Verdana", stack: "Verdana, Geneva, sans-serif", kind: "sans" },
  { id: "tahoma", name: "Tahoma", stack: "Tahoma, Geneva, sans-serif", kind: "sans" },
  { id: "trebuchet", name: "Trebuchet MS", stack: "'Trebuchet MS', Tahoma, sans-serif", kind: "sans" },
];

export function fontStack(id: FontId | null | undefined): string {
  return (FONTS.find((f) => f.id === id) ?? FONTS[0]).stack;
}

/* -------------------------------- controls -------------------------------- */

export interface SegmentOption<T> {
  label: string;
  value: T;
}

export const PAGE_FORMAT_OPTIONS: SegmentOption<PageFormatId>[] = [
  { label: "A4", value: "a4" },
  { label: "Letter", value: "letter" },
  { label: "Legal", value: "legal" },
];

export const DATE_FORMAT_OPTIONS: SegmentOption<DateFormatId>[] = [
  { label: "Mar 2022", value: "monthYear" },
  { label: "March 2022", value: "longMonth" },
  { label: "03/2022", value: "numeric" },
  { label: "2022-03", value: "numericUS" },
  { label: "2022", value: "yearOnly" },
];

export const COLUMN_OPTIONS: SegmentOption<ColumnsId>[] = [
  { label: "One", value: "one" },
  { label: "Two", value: "two" },
  { label: "Mix", value: "mix" },
];

export const ENTRY_STRUCTURE_OPTIONS: SegmentOption<EntryStructure>[] = [
  { label: "Full width", value: "full" },
  { label: "Columns", value: "columns" },
];

export const DATE_POSITION_OPTIONS: SegmentOption<DatePosition>[] = [
  { label: "Right", value: "right" },
  { label: "Left", value: "left" },
  { label: "Split", value: "split" },
];

export const SUBTITLE_OPTIONS: SegmentOption<SubtitlePlacement>[] = [
  { label: "Same line", value: "sameLine" },
  { label: "Below title", value: "below" },
];

export const HEADING_STYLE_OPTIONS: SegmentOption<HeadingStyle>[] = [
  { label: "Underline", value: "underline" },
  { label: "Plain", value: "plain" },
  { label: "Box", value: "box" },
  { label: "Left bar", value: "bar" },
  { label: "Filled", value: "background" },
  { label: "Double rule", value: "double" },
];

export const HEADING_CASE_OPTIONS: SegmentOption<HeadingCase>[] = [
  { label: "Capitalize", value: "capitalize" },
  { label: "UPPERCASE", value: "uppercase" },
];

export const HEADING_ICON_OPTIONS: SegmentOption<HeadingIcons>[] = [
  { label: "None", value: "none" },
  { label: "Outline", value: "outline" },
  { label: "Filled", value: "filled" },
];

export const HEADER_ALIGN_OPTIONS: SegmentOption<HeaderAlign>[] = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
];

export const HEADER_DETAILS_OPTIONS: SegmentOption<HeaderDetails>[] = [
  { label: "Inline", value: "inline" },
  { label: "Stacked", value: "stacked" },
];

export const HEADER_SEPARATOR_OPTIONS: SegmentOption<HeaderSeparator>[] = [
  { label: "Icon", value: "icon" },
  { label: "Bullet", value: "bullet" },
  { label: "Bar", value: "bar" },
];

export const ACCENT_PRESETS = [
  { name: "Maroon", value: "#9f1239" },
  { name: "Charcoal", value: "#27272a" },
  { name: "Slate", value: "#334155" },
  { name: "Navy", value: "#1e3a8a" },
  { name: "Royal", value: "#1d4ed8" },
  { name: "Sky", value: "#0284c7" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Teal", value: "#0f766e" },
  { name: "Emerald", value: "#047857" },
  { name: "Amber", value: "#b45309" },
  { name: "Rose", value: "#e11d48" },
];

/** Every accent-target toggle, so the panel can render them from one list. */
export const ACCENT_TARGETS: { key: keyof DesignSettings; label: string }[] = [
  { key: "accentName", label: "Name" },
  { key: "accentSubtitle", label: "Company / subtitle" },
  { key: "accentHeadings", label: "Section headings" },
  { key: "accentHeadingLine", label: "Heading rules" },
  { key: "accentBullets", label: "Bullets & chips" },
  { key: "accentDates", label: "Dates" },
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
  return merged;
}

export function isDesignKey(key: string): key is keyof DesignSettings {
  return key in DESIGN_DEFAULTS;
}

/* ----------------------------- date rendering ------------------------------ */

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Renders a stored date ("2022-03", "2014", "Present", or anything hand-typed)
 * in the chosen display format. Values that matched no known shape are passed
 * through verbatim — a format setting must never eat someone's text.
 */
export function formatResumeDate(raw: string, format: DateFormatId): string {
  const text = raw.trim();
  if (!text) return "";

  const iso = /^(\d{4})[-/](\d{1,2})$/.exec(text);
  const slashed = /^(\d{1,2})\/(\d{4})$/.exec(text);
  const yearOnly = /^(\d{4})$/.exec(text);

  let year: number | null = null;
  let month: number | null = null;
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
  } else if (slashed) {
    month = Number(slashed[1]);
    year = Number(slashed[2]);
  } else if (yearOnly) {
    year = Number(yearOnly[1]);
  } else {
    return text;
  }

  if (month != null && (month < 1 || month > 12)) return text;
  if (year == null) return text;
  if (month == null || format === "yearOnly") return String(year);

  switch (format) {
    case "numeric":
      return `${String(month).padStart(2, "0")}/${year}`;
    case "numericUS":
      return `${year}-${String(month).padStart(2, "0")}`;
    case "longMonth":
      return `${MONTHS_LONG[month - 1]} ${year}`;
    default:
      return `${MONTHS_SHORT[month - 1]} ${year}`;
  }
}
