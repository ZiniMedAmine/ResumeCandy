/**
 * Tiny subsequence fuzzy matcher for the version switcher.
 * Returns a score (higher = better) or null when the query doesn't match.
 * Rewards prefix matches, word starts and contiguous runs.
 */
export function fuzzyScore(query: string, target: string): number | null {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 0;

  let score = 0;
  let ti = 0;
  let lastMatch = -2;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    if (ch === " ") continue;
    let found = -1;
    while (ti < t.length) {
      if (t[ti] === ch) {
        found = ti;
        break;
      }
      ti++;
    }
    if (found === -1) return null;
    score += 1;
    if (found === 0) score += 3; // prefix
    else if (/[\s\-_/]/.test(t[found - 1])) score += 2; // word start
    if (found === lastMatch + 1) score += 2; // contiguous
    lastMatch = found;
    ti = found + 1;
  }
  // Slight preference for shorter targets.
  return score - t.length * 0.01;
}
