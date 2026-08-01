import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { isUiLocale } from "@/lib/i18n";
import type { LocaleId } from "@/lib/locale";
import { readSession, refreshSession } from "./session";

const { users } = tables;

/** What the rest of the app is allowed to see about the signed-in user. */
export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  /** Interface language; null = follow the browser. Never a résumé's language. */
  uiLocale: LocaleId | null;
  createdAt: number;
}

/**
 * The authoritative check, and the only place the app learns who is signed in.
 *
 * Wrapped in React's `cache` so a page that asks in the layout, the page and a
 * leaf component still costs one cookie read and one query per request.
 *
 * The password hash is deliberately never selected: it cannot leak into an RSC
 * payload through a field nobody remembered to strip.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;

  const row = db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      uiLocale: users.uiLocale,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .all()[0];

  // The session outlived its user (deleted account): treat as signed out.
  if (!row) return null;

  await refreshSession(session);
  return { ...row, uiLocale: isUiLocale(row.uiLocale) ? row.uiLocale : null };
});

/**
 * Same, but for everything that cannot proceed anonymously. Redirecting here
 * rather than in a layout is what makes the guarantee hold — layouts do not
 * re-render on every navigation, so a check there can be skipped.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
