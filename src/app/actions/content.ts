"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db, tables } from "@/db";
import {
  assertOwnsResume,
  collectSubtreeIds,
  deleteSubtree,
  getNodeOrThrow,
  getVersionOrThrow,
  localNodeIdsIn,
  logEdit,
  touchResume,
} from "@/lib/server/mutations";
import {
  mergedOverride,
  withFieldEdit,
  withFieldReset,
  withHidden,
  withRank,
} from "@/lib/resume/patch";
import type { NodeOverride, ResumeNode } from "@/lib/resume/types";

const { nodeOverrides, nodes } = tables;

function getOverride(versionId: string, nodeId: string): NodeOverride | undefined {
  const row = db
    .select()
    .from(nodeOverrides)
    .where(and(eq(nodeOverrides.versionId, versionId), eq(nodeOverrides.nodeId, nodeId)))
    .all()[0];
  return row
    ? { versionId: row.versionId, nodeId: row.nodeId, patch: row.patch ?? null, hidden: row.hidden, rank: row.rank }
    : undefined;
}

function writeOverride(versionId: string, nodeId: string, next: NodeOverride | null) {
  if (next === null) {
    db.delete(nodeOverrides)
      .where(and(eq(nodeOverrides.versionId, versionId), eq(nodeOverrides.nodeId, nodeId)))
      .run();
    return;
  }
  db.insert(nodeOverrides)
    .values({
      versionId,
      nodeId,
      patch: next.patch,
      hidden: next.hidden == null ? null : next.hidden ? 1 : 0,
      rank: next.rank,
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: [nodeOverrides.versionId, nodeOverrides.nodeId],
      set: {
        patch: next.patch,
        hidden: next.hidden == null ? null : next.hidden ? 1 : 0,
        rank: next.rank,
        updatedAt: Date.now(),
      },
    })
    .run();
}

/**
 * The single write path for text edits. Editing the base version (or a
 * version-local node) writes the node itself; editing a base node from any
 * other version writes a sparse per-field override — healing back to
 * "inherited" when the typed value matches the base.
 */
export async function saveFieldEdit(input: {
  resumeId: string;
  versionId: string;
  nodeId: string;
  field: string;
  value: unknown;
}) {
  await assertOwnsResume(input.resumeId);
  const version = getVersionOrThrow(input.versionId);
  const node = getNodeOrThrow(input.nodeId);
  if (version.resumeId !== input.resumeId || node.resumeId !== input.resumeId) {
    throw new Error("Cross-resume write rejected");
  }

  const editsBase = version.isBase === 1 || node.ownerVersionId === version.id;
  if (editsBase) {
    const before = node.data[input.field];
    db.update(nodes)
      .set({ data: { ...node.data, [input.field]: input.value }, updatedAt: Date.now() })
      .where(eq(nodes.id, node.id))
      .run();
    logEdit({
      resumeId: input.resumeId,
      versionId: version.isBase === 1 ? null : version.id,
      nodeId: node.id,
      path: `data.${input.field}`,
      before,
      after: input.value,
    });
  } else {
    const existing = getOverride(version.id, node.id);
    const next = withFieldEdit(existing, version.id, node.id, node.data, input.field, input.value);
    writeOverride(version.id, node.id, next);
    logEdit({
      resumeId: input.resumeId,
      versionId: version.id,
      nodeId: node.id,
      path: `patch.${input.field}`,
      before: existing?.patch?.[input.field],
      after: input.value,
    });
  }
  touchResume(input.resumeId);
  return { ok: true as const };
}

/** Hide/show a node in one version (base version included — "hidden in Default"). */
export async function saveHidden(input: {
  resumeId: string;
  versionId: string;
  nodeId: string;
  hidden: boolean;
}) {
  await assertOwnsResume(input.resumeId);
  const version = getVersionOrThrow(input.versionId);
  const node = getNodeOrThrow(input.nodeId);
  if (node.ownerVersionId) throw new Error("Local nodes are deleted, not hidden");
  const existing = getOverride(version.id, node.id);
  writeOverride(version.id, node.id, withHidden(existing, version.id, node.id, input.hidden));
  logEdit({
    resumeId: input.resumeId,
    versionId: version.id,
    nodeId: node.id,
    path: "hidden",
    before: !input.hidden,
    after: input.hidden,
  });
  touchResume(input.resumeId);
  return { ok: true as const };
}

/** Reorder: base version / local nodes move the node; others get a rank override. */
export async function saveRank(input: {
  resumeId: string;
  versionId: string;
  nodeId: string;
  rank: string;
}) {
  await assertOwnsResume(input.resumeId);
  const version = getVersionOrThrow(input.versionId);
  const node = getNodeOrThrow(input.nodeId);
  const editsBase = version.isBase === 1 || node.ownerVersionId === version.id;
  if (editsBase) {
    db.update(nodes).set({ rank: input.rank, updatedAt: Date.now() }).where(eq(nodes.id, node.id)).run();
  } else {
    const existing = getOverride(version.id, node.id);
    writeOverride(version.id, node.id, withRank(existing, version.id, node.id, node.rank, input.rank));
  }
  logEdit({
    resumeId: input.resumeId,
    versionId: version.isBase === 1 ? null : version.id,
    nodeId: node.id,
    path: "rank",
    before: node.rank,
    after: input.rank,
  });
  touchResume(input.resumeId);
  return { ok: true as const };
}

/**
 * Insert a node. Created on the base version → shared everywhere; created on
 * any other version → local to it. The id comes from the client so the
 * optimistic insert and the persisted row are the same node.
 */
export async function createNode(input: {
  resumeId: string;
  versionId: string;
  node: { id: string; parentId: string | null; kind: string; rank: string; data: Record<string, unknown> };
}) {
  await assertOwnsResume(input.resumeId);
  const version = getVersionOrThrow(input.versionId);
  db.insert(nodes)
    .values({
      id: input.node.id,
      resumeId: input.resumeId,
      parentId: input.node.parentId,
      kind: input.node.kind,
      rank: input.node.rank,
      data: input.node.data,
      ownerVersionId: version.isBase === 1 ? null : version.id,
    })
    .run();
  logEdit({
    resumeId: input.resumeId,
    versionId: version.isBase === 1 ? null : version.id,
    nodeId: input.node.id,
    path: "node.create",
    before: null,
    after: input.node.kind,
  });
  touchResume(input.resumeId);
  return { ok: true as const };
}

/** Hard-delete a subtree (base-version deletes and local-node deletes). */
export async function deleteNode(input: { resumeId: string; versionId: string; nodeId: string }) {
  await assertOwnsResume(input.resumeId);
  const version = getVersionOrThrow(input.versionId);
  const node = getNodeOrThrow(input.nodeId);
  if (node.ownerVersionId === null && version.isBase !== 1) {
    throw new Error("Base nodes can only be deleted from the Default version — hide instead");
  }
  const removed = deleteSubtree(input.resumeId, node.id);
  logEdit({
    resumeId: input.resumeId,
    versionId: node.ownerVersionId,
    nodeId: node.id,
    path: "node.delete",
    before: removed.length,
    after: null,
  });
  touchResume(input.resumeId);
  return { ok: true as const, removed };
}

/** Undo helper: re-insert previously deleted nodes verbatim. */
export async function restoreNodes(input: { resumeId: string; nodes: ResumeNode[] }) {
  await assertOwnsResume(input.resumeId);
  if (input.nodes.length === 0) return { ok: true as const };
  db.insert(nodes)
    .values(
      input.nodes.map((n) => ({
        id: n.id,
        resumeId: input.resumeId,
        parentId: n.parentId,
        kind: n.kind,
        rank: n.rank,
        data: n.data,
        ownerVersionId: n.ownerVersionId,
      })),
    )
    .run();
  touchResume(input.resumeId);
  return { ok: true as const };
}

/** Undo helper: put back previously removed override rows. */
export async function restoreOverrides(input: { resumeId: string; overrides: NodeOverride[] }) {
  await assertOwnsResume(input.resumeId);
  for (const o of input.overrides) {
    writeOverride(o.versionId, o.nodeId, o);
  }
  touchResume(input.resumeId);
  return { ok: true as const };
}

export async function resetField(input: { resumeId: string; versionId: string; nodeId: string; field: string }) {
  await assertOwnsResume(input.resumeId);
  const existing = getOverride(input.versionId, input.nodeId);
  writeOverride(input.versionId, input.nodeId, withFieldReset(existing, input.field));
  logEdit({
    resumeId: input.resumeId,
    versionId: input.versionId,
    nodeId: input.nodeId,
    path: `reset.${input.field}`,
    before: existing?.patch?.[input.field],
    after: null,
  });
  touchResume(input.resumeId);
  return { ok: true as const };
}

/** Reset a whole node in one version: drop its override row entirely. */
export async function resetNode(input: { resumeId: string; versionId: string; nodeId: string }) {
  await assertOwnsResume(input.resumeId);
  db.delete(nodeOverrides)
    .where(and(eq(nodeOverrides.versionId, input.versionId), eq(nodeOverrides.nodeId, input.nodeId)))
    .run();
  logEdit({
    resumeId: input.resumeId,
    versionId: input.versionId,
    nodeId: input.nodeId,
    path: "reset.node",
    before: null,
    after: null,
  });
  touchResume(input.resumeId);
  return { ok: true as const };
}

/**
 * Reset a section (or the whole version when sectionId is null) back to the
 * parent: deletes the version's overrides in scope and its local nodes.
 */
export async function resetScope(input: { resumeId: string; versionId: string; sectionId: string | null }) {
  await assertOwnsResume(input.resumeId);
  const version = getVersionOrThrow(input.versionId);
  const scopeIds = input.sectionId ? collectSubtreeIds(input.resumeId, input.sectionId) : null;

  if (scopeIds) {
    db.delete(nodeOverrides)
      .where(and(eq(nodeOverrides.versionId, version.id), inArray(nodeOverrides.nodeId, scopeIds)))
      .run();
  } else {
    db.delete(nodeOverrides).where(eq(nodeOverrides.versionId, version.id)).run();
  }

  const localIds = localNodeIdsIn(input.resumeId, version.id, input.sectionId ?? undefined);
  if (localIds.length > 0) {
    db.delete(nodes).where(inArray(nodes.id, localIds)).run();
  }

  logEdit({
    resumeId: input.resumeId,
    versionId: version.id,
    nodeId: input.sectionId ?? "*",
    path: input.sectionId ? "reset.section" : "reset.version",
    before: null,
    after: null,
  });
  touchResume(input.resumeId);
  return { ok: true as const };
}

/**
 * Push a customized field into the base: every version that hasn't its own
 * override for the field now inherits this value; the pushing version's
 * override for it is dropped.
 */
export async function pushFieldToBase(input: { resumeId: string; versionId: string; nodeId: string; field: string }) {
  await assertOwnsResume(input.resumeId);
  const node = getNodeOrThrow(input.nodeId);
  const existing = getOverride(input.versionId, input.nodeId);
  if (!existing?.patch || !(input.field in existing.patch)) {
    throw new Error("Field is not customized in this version");
  }
  const value = existing.patch[input.field];
  const before = node.data[input.field];
  db.update(nodes)
    .set({ data: { ...node.data, [input.field]: value }, updatedAt: Date.now() })
    .where(eq(nodes.id, node.id))
    .run();
  writeOverride(input.versionId, input.nodeId, withFieldReset(existing, input.field));
  logEdit({
    resumeId: input.resumeId,
    versionId: null,
    nodeId: input.nodeId,
    path: `push.${input.field}`,
    before,
    after: value,
  });
  touchResume(input.resumeId);
  return { ok: true as const };
}

/**
 * Promote a version-local node into the base tree so every version sees it.
 * Local ancestors come along (otherwise it would be orphaned elsewhere) and
 * so does its local subtree.
 */
export async function promoteNodeToBase(input: { resumeId: string; versionId: string; nodeId: string }) {
  await assertOwnsResume(input.resumeId);
  const node = getNodeOrThrow(input.nodeId);
  if (node.ownerVersionId !== input.versionId) throw new Error("Node is not local to this version");

  const toPromote = new Set<string>(collectSubtreeIds(input.resumeId, node.id));
  // Walk up: promote any local ancestors too.
  let parentId = node.parentId;
  while (parentId) {
    const parent = getNodeOrThrow(parentId);
    if (parent.ownerVersionId === input.versionId) toPromote.add(parent.id);
    parentId = parent.parentId;
  }
  db.update(nodes)
    .set({ ownerVersionId: null, updatedAt: Date.now() })
    .where(and(inArray(nodes.id, [...toPromote]), eq(nodes.ownerVersionId, input.versionId)))
    .run();
  logEdit({
    resumeId: input.resumeId,
    versionId: null,
    nodeId: node.id,
    path: "node.promote",
    before: input.versionId,
    after: null,
  });
  touchResume(input.resumeId);
  return { ok: true as const };
}

/** Copy whole-node customizations from one version into others. */
export async function copyOverrides(input: {
  resumeId: string;
  fromVersionId: string;
  toVersionIds: string[];
  nodeIds: string[];
}) {
  await assertOwnsResume(input.resumeId);
  const source = getVersionOrThrow(input.fromVersionId);
  for (const targetId of input.toVersionIds) {
    if (targetId === source.id) continue;
    const target = getVersionOrThrow(targetId);
    if (target.isBase === 1) continue; // pushing to base is a separate, explicit act
    for (const nodeId of input.nodeIds) {
      const src = getOverride(source.id, nodeId);
      if (!src) continue;
      const merged = mergedOverride(getOverride(targetId, nodeId), src, targetId);
      writeOverride(targetId, nodeId, merged);
    }
  }
  touchResume(input.resumeId);
  return { ok: true as const };
}

/** Set one field's value as an override (or base value) on target versions. */
export async function copyFieldValue(input: {
  resumeId: string;
  nodeId: string;
  field: string;
  value: unknown;
  toVersionIds: string[];
}) {
  await assertOwnsResume(input.resumeId);
  const node = getNodeOrThrow(input.nodeId);
  for (const targetId of input.toVersionIds) {
    const target = getVersionOrThrow(targetId);
    if (target.isBase === 1 || node.ownerVersionId === targetId) {
      db.update(nodes)
        .set({ data: { ...node.data, [input.field]: input.value }, updatedAt: Date.now() })
        .where(eq(nodes.id, node.id))
        .run();
    } else if (node.ownerVersionId === null) {
      const existing = getOverride(targetId, node.id);
      writeOverride(
        targetId,
        node.id,
        withFieldEdit(existing, targetId, node.id, node.data, input.field, input.value),
      );
    }
  }
  touchResume(input.resumeId);
  return { ok: true as const };
}

/** Clone version-local nodes into another version (ids supplied by client). */
export async function insertLocalNodes(input: {
  resumeId: string;
  versionId: string;
  nodes: { id: string; parentId: string | null; kind: string; rank: string; data: Record<string, unknown> }[];
}) {
  await assertOwnsResume(input.resumeId);
  const version = getVersionOrThrow(input.versionId);
  if (input.nodes.length === 0) return { ok: true as const };
  db.insert(nodes)
    .values(
      input.nodes.map((n) => ({
        id: n.id,
        resumeId: input.resumeId,
        parentId: n.parentId,
        kind: n.kind,
        rank: n.rank,
        data: n.data,
        ownerVersionId: version.isBase === 1 ? null : version.id,
      })),
    )
    .run();
  touchResume(input.resumeId);
  return { ok: true as const };
}
