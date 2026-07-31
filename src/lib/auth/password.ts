import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * scrypt parameters. N is the work factor and dominates both cost and
 * resistance; 2^15 keeps a single hash around a tenth of a second on a laptop,
 * which is slow enough to make offline guessing expensive and fast enough that
 * a sign-in still feels instant.
 *
 * They are stored inside each hash, so raising them later re-hashes new
 * passwords without invalidating existing ones.
 */
const PARAMS = { N: 32768, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// scrypt needs roughly 128 * N * r bytes; Node's default cap is below that at
// N = 2^15, so raise it deliberately rather than letting the hash throw.
const MAX_MEM = 128 * PARAMS.N * PARAMS.r * 2;

/**
 * Hashes a password with a fresh random salt.
 *
 * The result is self-describing — `scrypt$N$r$p$salt$hash` — so verification
 * needs no configuration and old hashes keep verifying after the parameters
 * are raised.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    ...PARAMS,
    maxmem: MAX_MEM,
  });
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/**
 * Verifies a password against a stored hash.
 *
 * Comparison is constant-time: a plain `===` leaks how many leading bytes
 * matched through timing, which is enough to reconstruct a hash byte by byte.
 * Any malformed stored value fails closed rather than throwing.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], "base64");
    expected = Buffer.from(parts[5], "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const derived = await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
      N,
      r,
      p,
      maxmem: 128 * N * r * 2,
    });
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
