/**
 * "now", "5 minutes ago", "2 days ago", else a short date — in the language of
 * the interface.
 *
 * This is chrome, so `Intl` is exactly right here: it knows that Arabic wants
 * "قبل ٥ دقائق" and French "il y a 5 minutes", including the plural agreement,
 * and none of that has to be spelled out in a dictionary.
 *
 * The résumé's own dates deliberately do *not* go through `Intl` — see
 * `formatResumeDate` — because the preview and the PDF writer must agree
 * exactly, and a browser's CLDR data is not a promise the exporter can keep.
 */

import { intlLocale } from "./i18n/translate";
import type { LocaleId } from "./locale";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

interface Step {
  unit: Intl.RelativeTimeFormatUnit;
  ms: number;
}

// Coarsest first: the first threshold a duration clears is the unit to use.
const STEPS: Step[] = [
  { unit: "day", ms: DAY },
  { unit: "hour", ms: HOUR },
  { unit: "minute", ms: MINUTE },
];

/** Beyond this a relative phrase stops helping and a date is clearer. */
const ABSOLUTE_AFTER = 30 * DAY;

const relativeFormats = new Map<LocaleId, Intl.RelativeTimeFormat>();
const dateFormats = new Map<LocaleId, Intl.DateTimeFormat>();
const unitFormats = new Map<string, Intl.NumberFormat>();

function relativeFormat(locale: LocaleId): Intl.RelativeTimeFormat {
  let format = relativeFormats.get(locale);
  if (!format) {
    // "auto" is what turns -1 day into "yesterday" rather than "1 day ago".
    format = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });
    relativeFormats.set(locale, format);
  }
  return format;
}

function dateFormat(locale: LocaleId): Intl.DateTimeFormat {
  let format = dateFormats.get(locale);
  if (!format) {
    format = new Intl.DateTimeFormat(intlLocale(locale), {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    dateFormats.set(locale, format);
  }
  return format;
}

function unitFormat(locale: LocaleId, unit: Intl.RelativeTimeFormatUnit): Intl.NumberFormat {
  const key = `${locale}:${unit}`;
  let format = unitFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(intlLocale(locale), {
      style: "unit",
      unit,
      unitDisplay: "long",
    });
    unitFormats.set(key, format);
  }
  return format;
}

function split(diff: number): { unit: Intl.RelativeTimeFormatUnit; value: number } | null {
  for (const step of STEPS) {
    if (diff >= step.ms) return { unit: step.unit, value: Math.floor(diff / step.ms) };
  }
  return null;
}

/** How long ago: "now", "5 minutes ago", "yesterday", or a short date. */
export function relativeTime(ms: number | null | undefined, locale: LocaleId = "en"): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff >= ABSOLUTE_AFTER) return dateFormat(locale).format(new Date(ms));

  const parts = split(diff);
  // Under a minute there is no useful unit, and "0 minutes ago" reads wrong;
  // zero seconds is what makes `numeric: "auto"` say "now".
  if (!parts) return relativeFormat(locale).format(0, "second");
  return relativeFormat(locale).format(-parts.value, parts.unit);
}

/**
 * The same duration as a bare quantity — "5 minutes", "3 days" — for places
 * that read as an age rather than as a point in the past.
 */
export function elapsedTime(ms: number | null | undefined, locale: LocaleId = "en"): string {
  if (!ms) return "—";
  const diff = Math.max(0, Date.now() - ms);
  const parts = split(diff) ?? { unit: "minute" as const, value: 0 };
  return unitFormat(locale, parts.unit).format(parts.value);
}
