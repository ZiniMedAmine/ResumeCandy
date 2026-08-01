import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import type { Direction, LocaleId } from "@/lib/locale";
import { formatter, type Format } from "./translate";
import {
  UI_LOCALE_COOKIE,
  UI_LOCALE_COOKIE_MAX_AGE,
  getDictionary,
  isUiLocale,
  localeFromAcceptLanguage,
  uiDirection,
  type Dictionary,
} from "./index";

export interface ServerI18n {
  locale: LocaleId;
  dir: Direction;
  /** The active dictionary — plain strings are read straight off it. */
  t: Dictionary;
  /** Interpolation and plural selection, with the locale already applied. */
  fmt: Format;
}

/**
 * Resolves the interface language for this request.
 *
 * Order: the `resumecandy_locale` cookie, then the browser's `Accept-Language`,
 * then English. The user's stored `users.uiLocale` is the durable truth, but it
 * is written *through* the cookie — sign-in and the language control both set
 * it — so the render path never has to touch the database. Same split as the
 * session: the cookie is the fast path, the column is what survives.
 *
 * Wrapped in React's `cache`, so the root layout, `generateMetadata` and any
 * server component underneath all share one cookie read.
 */
export const getI18n = cache(async (): Promise<ServerI18n> => {
  const cookieLocale = (await cookies()).get(UI_LOCALE_COOKIE)?.value;

  let locale: LocaleId;
  if (isUiLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    locale = localeFromAcceptLanguage((await headers()).get("accept-language")) ?? "en";
  }

  return { locale, dir: uiDirection(locale), t: getDictionary(locale), fmt: formatter(locale) };
});

/**
 * Seeds the cookie from an account's stored preference at sign-in.
 *
 * Without it, signing in on a new machine would show the browser's language
 * rather than the one the user chose: the column would be right and the screen
 * would be wrong until they set it again.
 */
export async function seedLocaleCookie(uiLocale: string | null | undefined): Promise<void> {
  if (!isUiLocale(uiLocale)) return;
  (await cookies()).set(UI_LOCALE_COOKIE, uiLocale, {
    // A display preference, not a credential — nothing is protected by hiding it.
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: UI_LOCALE_COOKIE_MAX_AGE,
  });
}
