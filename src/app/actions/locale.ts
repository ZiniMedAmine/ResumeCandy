"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { UI_LOCALE_COOKIE, UI_LOCALE_COOKIE_MAX_AGE, isUiLocale } from "@/lib/i18n";
import type { LocaleId } from "@/lib/locale";

const { users } = tables;

function localeCookieOptions() {
  return {
    // Deliberately readable by scripts: it is a display preference, not a
    // credential, and nothing is protected by keeping it out of reach.
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: UI_LOCALE_COOKIE_MAX_AGE,
  };
}

/**
 * Changes the language of the interface.
 *
 * Writes both places on purpose: the column is the durable truth that follows
 * the user to a new browser, and the cookie is what the root layout reads on
 * every render so the language costs no query. Signed-out visitors on the
 * login page get the cookie alone, which is exactly enough for them.
 *
 * `revalidatePath("/", "layout")` is what makes the change appear immediately —
 * the dictionary is chosen in the root layout, and a layout does not re-render
 * on client navigation, so without this the new language would only show up on
 * the next hard load.
 */
export async function setUiLocale(locale: LocaleId): Promise<void> {
  if (!isUiLocale(locale)) return;

  const store = await cookies();
  store.set(UI_LOCALE_COOKIE, locale, localeCookieOptions());

  const user = await getCurrentUser();
  if (user) {
    db.update(users).set({ uiLocale: locale }).where(eq(users.id, user.id)).run();
  }

  revalidatePath("/", "layout");
}
