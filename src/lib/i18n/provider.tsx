"use client";

import { createContext, useContext, useMemo } from "react";
import type { Direction, LocaleId } from "@/lib/locale";
import { formatter, type Format } from "./translate";
import type { Dictionary } from "./dictionaries/en";

export interface I18n {
  locale: LocaleId;
  dir: Direction;
  /** The active dictionary — plain strings are read straight off it. */
  t: Dictionary;
  /** Interpolation and plural selection, with the locale already applied. */
  fmt: Format;
}

const I18nContext = createContext<I18n | null>(null);

/**
 * Carries the active dictionary to the 40-odd Client Components that need it.
 *
 * The root layout resolves the language on the server and passes exactly one
 * dictionary down, so the payload cost is a single JSON blob per hard load and
 * the other two languages never reach the browser. The provider sits above the
 * router, and the root layout does not re-render on client navigation, so this
 * is not paid again on every page change.
 */
export function I18nProvider({
  locale,
  dir,
  dictionary,
  children,
}: {
  locale: LocaleId;
  dir: Direction;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const value = useMemo<I18n>(
    () => ({ locale, dir, t: dictionary, fmt: formatter(locale) }),
    [locale, dir, dictionary],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}

/** Shorthand for the common case: `const t = useT()` then `t.common.cancel`. */
export function useT(): Dictionary {
  return useI18n().t;
}
