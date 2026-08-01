/**
 * The language of the *interface* — deliberately not the language of any
 * résumé.
 *
 * The two are separate settings on purpose: someone should be able to write an
 * English CV while the app talks to them in Arabic, and the reverse. A
 * document's language is a design setting on the résumé (`lib/design.ts`);
 * this one is an account setting on the user.
 *
 * The set of languages, their endonyms and their writing direction are shared
 * with `lib/locale.ts` — those are facts about the languages themselves, and
 * having two lists of them would only be a way for the two to drift apart.
 * Everything in that module that is about *paper* (month names, section
 * headings, the word for an ongoing role) is simply unused here.
 *
 * This file must stay free of `next/headers` so it can be imported from
 * anywhere; request-scoped resolution lives in `./server`.
 *
 * It statically imports all three dictionaries, so Client Components must only
 * ever take *types* from here. The active dictionary reaches the browser once,
 * as a prop on `I18nProvider`, which is what keeps two unused languages out of
 * the bundle.
 */

import { localeOf, type Direction, type LocaleId } from "@/lib/locale";
import { en } from "./dictionaries/en";
import { fr } from "./dictionaries/fr";
import { ar } from "./dictionaries/ar";

export type { Dictionary } from "./dictionaries/en";
export type { Format, Params, Plural } from "./translate";

/** Written to on sign-in and whenever the language changes. */
export const UI_LOCALE_COOKIE = "resumecandy_locale";

/** A year: this is a preference, not a session, and outliving one is the point. */
export const UI_LOCALE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

const DICTIONARIES = { en, fr, ar } as const;

export function getDictionary(locale: LocaleId) {
  return DICTIONARIES[locale] ?? en;
}

export function isUiLocale(value: string | null | undefined): value is LocaleId {
  return value != null && value in DICTIONARIES;
}

export function uiDirection(locale: LocaleId): Direction {
  return localeOf(locale).dir;
}

/**
 * Best supported match for an `Accept-Language` header.
 *
 * Only ever a first guess, for the very first visit before any preference
 * exists. Quality values are honoured because a browser configured as
 * `en;q=0.9, fr;q=1.0` means it, and the primary subtag is what is matched —
 * `fr-CA` and `fr-FR` are both simply French here.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): LocaleId | null {
  if (!header) return null;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => /^\s*q=([\d.]+)\s*$/.exec(p))
        .find(Boolean)?.[1];
      return { tag: tag.trim().toLowerCase(), q: q == null ? 1 : Number(q) };
    })
    .filter((entry) => entry.tag && Number.isFinite(entry.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const primary = tag.split("-")[0];
    if (isUiLocale(primary)) return primary;
  }
  return null;
}
