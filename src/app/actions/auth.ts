"use server";

import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { getI18n, seedLocaleCookie } from "@/lib/i18n/server";

const { collections, users } = tables;

/** Legacy owner id used by the dev seed before accounts existed. */
const LEGACY_USER_ID = "dev";

export interface AuthFormState {
  error?: string;
  fieldErrors?: { name?: string; email?: string; password?: string };
  values?: { name?: string; email?: string };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * The very first account adopts anything the dev seed left behind.
 *
 * Without this, adding accounts would strand the resumes that already exist in
 * the database behind a user id ("dev") nobody can ever sign in as. Only
 * collections with no real owner are claimable, and only when the new user has
 * none of their own, so this can never move data between real accounts.
 */
function claimOrphanedCollections(userId: string): void {
  const [{ value: mine }] = db
    .select({ value: count() })
    .from(collections)
    .where(eq(collections.userId, userId))
    .all();
  if (mine > 0) return;

  db.update(collections)
    .set({ userId })
    .where(eq(collections.userId, LEGACY_USER_ID))
    .run();
}

/**
 * Gives the user a collection if the claim above did not already hand them
 * one. Ordering matters: creating one first would make `claimOrphanedCollections`
 * see an existing collection and skip, stranding the seeded resumes.
 */
function ensureCollection(userId: string): void {
  const [{ value: mine }] = db
    .select({ value: count() })
    .from(collections)
    .where(eq(collections.userId, userId))
    .all();
  if (mine === 0) {
    db.insert(collections).values({ id: nanoid(), userId }).run();
  }
}

export async function signUp(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const values = { name, email };

  // Messages that come back to the form are chrome, so they follow the
  // interface language — which is resolved here exactly as it is for a page.
  const { t } = await getI18n();

  const fieldErrors: AuthFormState["fieldErrors"] = {};
  if (name.length < 2) fieldErrors.name = t.auth.errorName;
  if (!EMAIL_RE.test(email)) fieldErrors.email = t.auth.errorEmail;
  if (password.length < 8) fieldErrors.password = t.auth.errorPassword;
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  const existing = db.select({ id: users.id }).from(users).where(eq(users.email, email)).all()[0];
  if (existing) {
    return { fieldErrors: { email: t.auth.errorEmailTaken }, values };
  }

  // Hashing is the slow part, so it happens once, outside the transaction.
  const passwordHash = await hashPassword(password);
  const userId = nanoid();

  try {
    db.insert(users).values({ id: userId, email, name, passwordHash }).run();
  } catch {
    // The unique index is the real guard — two simultaneous signups with the
    // same address both pass the check above but only one can insert.
    return { fieldErrors: { email: t.auth.errorEmailTaken }, values };
  }

  // Claim before creating: the claim only fires for a user with no collection.
  claimOrphanedCollections(userId);
  ensureCollection(userId);
  await createSession(userId);
  redirect("/");
}

export async function signIn(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const values = { email };
  const { t } = await getI18n();

  if (!email || !password) {
    return { error: t.auth.errorMissing, values };
  }

  const user = db
    .select({ id: users.id, passwordHash: users.passwordHash, uiLocale: users.uiLocale })
    .from(users)
    .where(eq(users.email, email))
    .all()[0];

  // One message for "no such user" and "wrong password", and the hash is
  // verified either way: a fast failure on unknown addresses would turn this
  // form into an account-enumeration oracle.
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, DUMMY_HASH);

  if (!user || !ok) {
    return { error: t.auth.errorCredentials, values };
  }

  claimOrphanedCollections(user.id);
  await createSession(user.id);
  // The account's own language wins over whatever this browser asked for, so
  // signing in on a borrowed machine still speaks the right language.
  await seedLocaleCookie(user.uiLocale);
  redirect("/");
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/**
 * A real hash of a random string, verified when the address is unknown so the
 * response takes the same time either way.
 */
const DUMMY_HASH =
  "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" +
  "Ej0xUEP6nrfoUp7hE7dS8yqkJ5nQKQrTkhxYPS6Wm9lYzKrDzWMOVMOnGVCyBqvXeNMTvV4NC0jGDMLUFdSPWA==";
