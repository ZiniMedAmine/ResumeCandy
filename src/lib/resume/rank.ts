import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

/** Rank strictly between two ranks (null = open end). */
export function rankBetween(a: string | null, b: string | null): string {
  return generateKeyBetween(a, b);
}

/** N evenly spread ranks between two bounds — used when seeding lists. */
export function ranksBetween(a: string | null, b: string | null, n: number): string[] {
  return generateNKeysBetween(a, b, n);
}

/** First rank for an empty sibling list. */
export function firstRank(): string {
  return generateKeyBetween(null, null);
}

/** Rank after the last sibling (append). */
export function rankAfter(last: string | null): string {
  return generateKeyBetween(last, null);
}

/** Sort comparator for rank strings (plain lexicographic by design). */
export function compareRank(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
