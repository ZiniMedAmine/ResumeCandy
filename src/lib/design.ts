/**
 * Design settings follow the same layering as content: the resume carries the
 * base settings (edited from the Default version), and each named version may
 * override individual keys via its settingsPatch. Same mental model, same
 * provenance affordances.
 */

export type TemplateId = "classic" | "modern";

export type PageFormatId = "a4" | "letter" | "legal";

export interface DesignSettings {
  template: TemplateId;
  /** Physical page the resume is laid out on; drives where pages break. */
  pageFormat: PageFormatId;
  accentColor: string;
  fontFamily: "serif" | "sans";
  /** Base font size in px — everything in the templates scales off it (em). */
  fontSize: number;
  lineHeight: number;
  /** Multiplier on vertical rhythm between sections/items. */
  sectionSpacing: number;
  /** Page padding in px. */
  pageMargins: number;
}

export const DESIGN_DEFAULTS: DesignSettings = {
  template: "classic",
  pageFormat: "a4",
  accentColor: "#9f1239",
  fontFamily: "serif",
  fontSize: 13,
  lineHeight: 1.5,
  sectionSpacing: 1,
  pageMargins: 40,
};

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

export const ACCENT_PRESETS = [
  { name: "Maroon", value: "#9f1239" },
  { name: "Charcoal", value: "#27272a" },
  { name: "Navy", value: "#1e3a8a" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Teal", value: "#0f766e" },
  { name: "Emerald", value: "#047857" },
  { name: "Amber", value: "#b45309" },
  { name: "Rose", value: "#e11d48" },
];

export interface SegmentOption<T> {
  label: string;
  value: T;
}

export const FONT_FAMILY_OPTIONS: SegmentOption<DesignSettings["fontFamily"]>[] = [
  { label: "Serif", value: "serif" },
  { label: "Sans", value: "sans" },
];

export const FONT_SIZE_OPTIONS: SegmentOption<number>[] = [
  { label: "S", value: 12 },
  { label: "M", value: 13 },
  { label: "L", value: 14.5 },
];

export const LINE_HEIGHT_OPTIONS: SegmentOption<number>[] = [
  { label: "Compact", value: 1.35 },
  { label: "Normal", value: 1.5 },
  { label: "Relaxed", value: 1.65 },
];

export const SECTION_SPACING_OPTIONS: SegmentOption<number>[] = [
  { label: "Tight", value: 0.7 },
  { label: "Normal", value: 1 },
  { label: "Roomy", value: 1.35 },
];

export const PAGE_MARGIN_OPTIONS: SegmentOption<number>[] = [
  { label: "Narrow", value: 28 },
  { label: "Normal", value: 40 },
  { label: "Wide", value: 52 },
];

export const PAGE_FORMAT_OPTIONS: SegmentOption<PageFormatId>[] = [
  { label: "A4", value: "a4" },
  { label: "Letter", value: "letter" },
  { label: "Legal", value: "legal" },
];

/** Base settings (resume) + a version's sparse patch → effective settings. */
export function resolveDesign(
  base: Partial<DesignSettings> | null | undefined,
  patch: Record<string, unknown> | null | undefined,
): DesignSettings {
  const merged = { ...DESIGN_DEFAULTS, ...(base ?? {}), ...(patch ?? {}) } as DesignSettings;
  // Each template has a natural typeface; it applies until the user picks a
  // font family explicitly (then their choice wins across templates).
  const fontChosen =
    (base && "fontFamily" in base) || (patch && "fontFamily" in patch);
  if (!fontChosen) {
    merged.fontFamily = merged.template === "modern" ? "sans" : "serif";
  }
  return merged;
}

export function isDesignKey(key: string): key is keyof DesignSettings {
  return key in DESIGN_DEFAULTS;
}
