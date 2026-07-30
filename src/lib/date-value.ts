/**
 * Resume dates are month-granular ("2022-03"), sometimes year-only ("2014"),
 * and end dates are often the word "Present". The picker writes a canonical
 * form, but existing values — including anything hand-typed — must survive a
 * round trip untouched, so parsing is forgiving and unknown shapes are kept
 * verbatim as `custom`.
 */

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const PRESENT = "Present";

export interface DateValue {
  year: number | null;
  /** 1–12, or null when the value is year-only. */
  month: number | null;
  present: boolean;
  /** Set when the value matched no known shape; rendered as-is. */
  custom: string | null;
}

const EMPTY: DateValue = { year: null, month: null, present: false, custom: null };

const PRESENT_WORDS = /^(present|current|now|ongoing|to date)$/i;

export function parseDateValue(raw: unknown): DateValue {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return { ...EMPTY };
  if (PRESENT_WORDS.test(text)) return { ...EMPTY, present: true };

  // 2022-03 (canonical) — also tolerates a single-digit month.
  const iso = /^(\d{4})[-/](\d{1,2})$/.exec(text);
  if (iso) {
    const month = Number(iso[2]);
    if (month >= 1 && month <= 12) return { year: Number(iso[1]), month, present: false, custom: null };
  }

  // 03/2022 — the other common ordering.
  const slashed = /^(\d{1,2})\/(\d{4})$/.exec(text);
  if (slashed) {
    const month = Number(slashed[1]);
    if (month >= 1 && month <= 12) return { year: Number(slashed[2]), month, present: false, custom: null };
  }

  // 2014
  const yearOnly = /^(\d{4})$/.exec(text);
  if (yearOnly) return { year: Number(yearOnly[1]), month: null, present: false, custom: null };

  return { ...EMPTY, custom: text };
}

/** Canonical string for a parsed value — what gets stored and printed. */
export function formatDateValue(value: DateValue): string {
  if (value.present) return PRESENT;
  if (value.custom) return value.custom;
  if (value.year == null) return "";
  if (value.month == null) return String(value.year);
  return `${value.year}-${String(value.month).padStart(2, "0")}`;
}

/** Human label for the picker trigger, e.g. "Mar 2022". Falls back to raw text. */
export function describeDateValue(raw: unknown): string {
  const value = parseDateValue(raw);
  if (value.present) return PRESENT;
  if (value.custom) return value.custom;
  if (value.year == null) return "";
  if (value.month == null) return String(value.year);
  return `${MONTHS[value.month - 1]} ${value.year}`;
}

/** Year the picker should open on when the field is empty or free-form. */
export function initialPickerYear(raw: unknown, fallback = new Date().getFullYear()): number {
  const { year } = parseDateValue(raw);
  return year ?? fallback;
}
