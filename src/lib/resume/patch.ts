import { isHiddenFlag, type NodeData, type NodeOverride } from "./types";

/**
 * Pure override/patch arithmetic shared by the client store (optimistic
 * updates) and the server actions (persistence) so both sides converge on
 * identical state.
 *
 * Convention: functions return the next override for a (version, node) pair,
 * or `null` meaning "no divergence left — delete the row". Overrides are
 * sparse: an empty override must not exist.
 */

const valuesEqual = (a: unknown, b: unknown) =>
  a === b || JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function overrideIsEmpty(o: NodeOverride): boolean {
  const patchEmpty = !o.patch || Object.keys(o.patch).length === 0;
  return patchEmpty && !isHiddenFlag(o.hidden) && o.rank == null;
}

function normalized(o: NodeOverride): NodeOverride | null {
  if (o.patch && Object.keys(o.patch).length === 0) o = { ...o, patch: null };
  return overrideIsEmpty(o) ? null : o;
}

function emptyOverride(versionId: string, nodeId: string): NodeOverride {
  return { versionId, nodeId, patch: null, hidden: null, rank: null };
}

/**
 * Set one field in a version's patch. Writing a value identical to the base
 * value heals the field back to "inherited" (the override key is dropped) so
 * overlays never accumulate no-op noise.
 */
export function withFieldEdit(
  existing: NodeOverride | undefined,
  versionId: string,
  nodeId: string,
  baseData: NodeData,
  field: string,
  value: unknown,
): NodeOverride | null {
  const o = existing ?? emptyOverride(versionId, nodeId);
  const patch = { ...(o.patch ?? {}) };
  if (valuesEqual(baseData[field], value)) delete patch[field];
  else patch[field] = value;
  return normalized({ ...o, patch: Object.keys(patch).length ? patch : null });
}

export function withHidden(
  existing: NodeOverride | undefined,
  versionId: string,
  nodeId: string,
  hidden: boolean,
): NodeOverride | null {
  const o = existing ?? emptyOverride(versionId, nodeId);
  return normalized({ ...o, hidden: hidden ? 1 : null });
}

export function withRank(
  existing: NodeOverride | undefined,
  versionId: string,
  nodeId: string,
  baseRank: string,
  rank: string,
): NodeOverride | null {
  const o = existing ?? emptyOverride(versionId, nodeId);
  return normalized({ ...o, rank: rank === baseRank ? null : rank });
}

/** Reset a single field back to inherited. */
export function withFieldReset(
  existing: NodeOverride | undefined,
  field: string,
): NodeOverride | null {
  if (!existing?.patch || !(field in existing.patch)) return existing ?? null;
  const patch = { ...existing.patch };
  delete patch[field];
  return normalized({ ...existing, patch: Object.keys(patch).length ? patch : null });
}

/**
 * Merge a source version's override into a target's (used by "copy to
 * version"): source patch fields win; hidden/rank copied when the source
 * diverges on them.
 */
export function mergedOverride(
  target: NodeOverride | undefined,
  source: NodeOverride,
  versionId: string,
): NodeOverride | null {
  const o = target ?? emptyOverride(versionId, source.nodeId);
  const patch = { ...(o.patch ?? {}), ...(source.patch ?? {}) };
  return normalized({
    ...o,
    patch: Object.keys(patch).length ? patch : null,
    hidden: isHiddenFlag(source.hidden) ? 1 : o.hidden,
    rank: source.rank ?? o.rank,
  });
}

/**
 * How many versions inherit this field (no override for it) — powers the
 * "Updates N of M versions" counter shown while editing the Default.
 */
export function inheritingVersionCount(
  allVersionIds: string[],
  baseVersionId: string,
  overrides: NodeOverride[],
  nodeId: string,
  field: string,
): { inheriting: number; total: number } {
  const others = allVersionIds.filter((id) => id !== baseVersionId);
  let overridden = 0;
  for (const o of overrides) {
    if (o.nodeId !== nodeId) continue;
    if (!others.includes(o.versionId)) continue;
    if ((o.patch && field in o.patch) || isHiddenFlag(o.hidden)) overridden++;
  }
  return { inheriting: others.length - overridden, total: others.length };
}
