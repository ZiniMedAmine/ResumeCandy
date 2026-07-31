import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, lt } from "drizzle-orm";
import { db, tables } from "@/db";

const { sessions } = tables;

export const SESSION_COOKIE = "resumecandy_session";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Re-issue when less than this is left, so active users are never logged out. */
const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

/** The cookie holds this; the database only ever sees its hash. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    // Localhost is not https, and a Secure cookie there is simply dropped —
    // which would silently break sign-in in development.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(expiresAt),
  };
}

/**
 * Issues a session: a fresh 32-byte token to the browser, its hash to the
 * database. Because only the hash is stored, a dump of the sessions table
 * cannot be replayed as a login.
 */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_TTL_MS;

  db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt }).run();
  // Opportunistic cleanup, so expired rows do not accumulate forever.
  db.delete(sessions).where(lt(sessions.expiresAt, Date.now())).run();

  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export interface ActiveSession {
  userId: string;
  tokenHash: string;
  expiresAt: number;
}

/**
 * Resolves the cookie to a live session row, or null.
 *
 * The lookup is by hash, so an attacker who can read the database still has
 * nothing to send. Expired rows are deleted on sight rather than merely
 * ignored.
 */
export async function readSession(): Promise<ActiveSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const row = db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).all()[0];
  if (!row) return null;

  if (row.expiresAt <= Date.now()) {
    db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)).run();
    return null;
  }

  // Defence in depth: the primary-key lookup already matched, so this only
  // guards against a future change making the comparison non-exact.
  const a = Buffer.from(row.tokenHash);
  const b = Buffer.from(tokenHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { userId: row.userId, tokenHash: row.tokenHash, expiresAt: row.expiresAt };
}

/**
 * Slides the expiry of a session that is being used, so someone who visits
 * regularly is never signed out mid-flow. Only writes when the remaining life
 * has actually dropped below the threshold.
 */
export async function refreshSession(session: ActiveSession): Promise<void> {
  if (session.expiresAt - Date.now() > REFRESH_THRESHOLD_MS) return;
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.update(sessions)
    .set({ expiresAt })
    .where(eq(sessions.tokenHash, session.tokenHash))
    .run();

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) store.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

/** Signs out this browser: the row goes, so the token is dead everywhere. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token))).run();
  }
  store.delete(SESSION_COOKIE);
}

/** Signs the user out of every browser — used after a password change. */
export function destroyAllSessionsFor(userId: string): void {
  db.delete(sessions).where(and(eq(sessions.userId, userId))).run();
}
