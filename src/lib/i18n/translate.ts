/**
 * The two things a dictionary lookup needs beyond returning a string:
 * substituting values into it, and picking the right form for a count.
 *
 * Both are done with the platform's own `Intl`, not a hand-rolled rule. Arabic
 * has six plural categories (zero/one/two/few/many/other) where English has
 * two, so `n === 1 ? a : b` is not a simplification here — it is simply wrong,
 * and would produce "3 نسخة" where the language wants "3 نسخ".
 *
 * There is deliberately no ICU message parser. Interpolation is `{name}` and
 * plurals are objects; that covers every string in this app, and the parser is
 * the one thing a full i18n library would have bought.
 */

import type { LocaleId } from "@/lib/locale";

/**
 * A count-dependent string. `other` is the only required form because it is
 * the one category `Intl.PluralRules` guarantees for every locale — the rest
 * are filled in per language.
 */
export interface Plural {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/**
 * Marks an entry as count-dependent.
 *
 * Purely a type annotation: it widens the literal object to `Plural` so the
 * English dictionary (which types the other two) allows French and Arabic to
 * supply categories English does not have.
 */
export function plural(forms: Plural): Plural {
  return forms;
}

export type Entry = string | Plural;

export type Params = Record<string, string | number>;

/**
 * Arabic here uses Western digits (`-u-nu-latn`).
 *
 * Arabic-Indic numerals are a Mashriq convention; Maghrebi usage is Western,
 * and this is the interface rather than the paper — the résumé side already
 * has its own explicit per-document toggle for anyone who wants ٢٠٢٢ printed.
 */
export function intlLocale(locale: LocaleId): string {
  return locale === "ar" ? "ar-u-nu-latn" : locale;
}

// Constructing an Intl formatter is the expensive part; reusing them keeps a
// list of a hundred rows from building a hundred identical rule sets.
const pluralRules = new Map<LocaleId, Intl.PluralRules>();
const numberFormats = new Map<LocaleId, Intl.NumberFormat>();

function rulesFor(locale: LocaleId): Intl.PluralRules {
  let rules = pluralRules.get(locale);
  if (!rules) {
    // Plural categories are a property of the language, not of the numbering
    // system, so the plain tag is correct here.
    rules = new Intl.PluralRules(locale);
    pluralRules.set(locale, rules);
  }
  return rules;
}

export function formatNumber(locale: LocaleId, value: number): string {
  let format = numberFormats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(intlLocale(locale));
    numberFormats.set(locale, format);
  }
  return format.format(value);
}

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Resolves one dictionary entry against a locale and a bag of values.
 *
 * A count is passed as `n` — the same name the placeholder uses — so a plural
 * string reads the way it will be written: `{ n: versions.length }`.
 * Placeholders with no matching value are left in place rather than blanked,
 * because a visible `{name}` is a bug report and an empty gap is not.
 */
export function translate(locale: LocaleId, entry: Entry, params?: Params): string {
  let template: string;

  if (typeof entry === "string") {
    template = entry;
  } else {
    const count = Number(params?.n ?? 0);
    const category = Number.isFinite(count) ? rulesFor(locale).select(count) : "other";
    // A locale that never selects, say, "two" simply has no such key; falling
    // back to `other` is what keeps a partially filled entry rendering.
    template = entry[category] ?? entry.other;
  }

  if (!params) return template;

  return template.replace(PLACEHOLDER, (whole, key: string) => {
    const value = params[key];
    if (value === undefined) return whole;
    return typeof value === "number" ? formatNumber(locale, value) : value;
  });
}

/** A `translate` with the locale already applied — what components are handed. */
export type Format = (entry: Entry, params?: Params) => string;

export function formatter(locale: LocaleId): Format {
  return (entry, params) => translate(locale, entry, params);
}
