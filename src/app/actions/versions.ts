"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db, tables } from "@/db";
import { getVersionOrThrow, touchResume } from "@/lib/server/mutations";
import type { NodeOverride } from "@/lib/resume/types";

const { nodeOverrides, nodes, versions } = tables;

/**
 * Create a version. An empty overlay when created from the Default;
 * when created from another version, the client precomputes the overlay copy
 * and the local-node clones (with fresh ids) so its optimistic state and the
 * database agree byte-for-byte.
 */
export async function createVersion(input: {
  resumeId: string;
  id: string;
  name: string;
  fromVersionId: string | null;
  tags: string[];
  settingsPatch: Record<string, unknown> | null;
  overrides: NodeOverride[];
  localNodes: { id: string; parentId: string | null; kind: string; rank: string; data: Record<string, unknown> }[];
}) {
  db.transaction((tx) => {
    tx.insert(versions)
      .values({
        id: input.id,
        resumeId: input.resumeId,
        name: input.name,
        isBase: 0,
        tags: input.tags,
        settingsPatch: input.settingsPatch,
        createdFromVersionId: input.fromVersionId,
        lastOpenedAt: Date.now(),
      })
      .run();
    if (input.overrides.length > 0) {
      tx.insert(nodeOverrides)
        .values(
          input.overrides.map((o) => ({
            versionId: input.id,
            nodeId: o.nodeId,
            patch: o.patch,
            hidden: o.hidden == null ? null : o.hidden ? 1 : 0,
            rank: o.rank,
          })),
        )
        .run();
    }
    if (input.localNodes.length > 0) {
      tx.insert(nodes)
        .values(
          input.localNodes.map((n) => ({
            id: n.id,
            resumeId: input.resumeId,
            parentId: n.parentId,
            kind: n.kind,
            rank: n.rank,
            data: n.data,
            ownerVersionId: input.id,
          })),
        )
        .run();
    }
  });
  touchResume(input.resumeId);
  return { ok: true as const };
}

export async function renameVersion(input: { resumeId: string; versionId: string; name: string }) {
  const name = input.name.trim();
  if (!name) throw new Error("Version name cannot be empty");
  db.update(versions)
    .set({ name, updatedAt: Date.now() })
    .where(eq(versions.id, input.versionId))
    .run();
  touchResume(input.resumeId);
  return { ok: true as const };
}

export async function setVersionTags(input: { resumeId: string; versionId: string; tags: string[] }) {
  db.update(versions)
    .set({ tags: input.tags, updatedAt: Date.now() })
    .where(eq(versions.id, input.versionId))
    .run();
  touchResume(input.resumeId);
  return { ok: true as const };
}

/** Merge keys into the version's settings patch (e.g. accent color). */
export async function setVersionSettings(input: {
  resumeId: string;
  versionId: string;
  patch: Record<string, unknown>;
}) {
  const v = getVersionOrThrow(input.versionId);
  const merged = { ...(v.settingsPatch ?? {}), ...input.patch };
  for (const key of Object.keys(merged)) {
    if (merged[key] === null) delete merged[key];
  }
  db.update(versions)
    .set({ settingsPatch: Object.keys(merged).length ? merged : null, updatedAt: Date.now() })
    .where(eq(versions.id, input.versionId))
    .run();
  touchResume(input.resumeId);
  return { ok: true as const };
}

export async function archiveVersion(input: { resumeId: string; versionId: string; archived: boolean }) {
  const v = getVersionOrThrow(input.versionId);
  if (v.isBase === 1 && input.archived) throw new Error("The Default version cannot be archived");
  db.update(versions)
    .set({ archivedAt: input.archived ? Date.now() : null, updatedAt: Date.now() })
    .where(eq(versions.id, input.versionId))
    .run();
  touchResume(input.resumeId);
  return { ok: true as const };
}

/** Soft delete → Trash (30-day retention, purged on load). */
export async function trashVersion(input: { resumeId: string; versionId: string; trashed: boolean }) {
  const v = getVersionOrThrow(input.versionId);
  if (v.isBase === 1 && input.trashed) throw new Error("The Default version cannot be deleted");
  db.update(versions)
    .set({ deletedAt: input.trashed ? Date.now() : null, updatedAt: Date.now() })
    .where(eq(versions.id, input.versionId))
    .run();
  touchResume(input.resumeId);
  return { ok: true as const };
}

/** Permanent delete: version row (overrides cascade) plus its local nodes. */
export async function hardDeleteVersion(input: { resumeId: string; versionId: string }) {
  const v = getVersionOrThrow(input.versionId);
  if (v.isBase === 1) throw new Error("The Default version cannot be deleted");
  db.transaction((tx) => {
    tx.delete(nodes)
      .where(and(eq(nodes.resumeId, input.resumeId), eq(nodes.ownerVersionId, input.versionId)))
      .run();
    tx.delete(versions).where(eq(versions.id, input.versionId)).run();
  });
  touchResume(input.resumeId);
  return { ok: true as const };
}

/** Recents bookkeeping for the switcher. */
export async function touchVersionOpened(input: { versionId: string }) {
  db.update(versions)
    .set({ lastOpenedAt: Date.now() })
    .where(eq(versions.id, input.versionId))
    .run();
  return { ok: true as const };
}

/** Bulk archive/trash used by the versions table view. */
export async function bulkVersionOp(input: {
  resumeId: string;
  versionIds: string[];
  op: "archive" | "unarchive" | "trash" | "restore";
}) {
  const rows = db.select().from(versions).where(inArray(versions.id, input.versionIds)).all();
  const ids = rows.filter((r) => r.isBase !== 1).map((r) => r.id);
  if (ids.length === 0) return { ok: true as const };
  const patch =
    input.op === "archive"
      ? { archivedAt: Date.now() }
      : input.op === "unarchive"
        ? { archivedAt: null }
        : input.op === "trash"
          ? { deletedAt: Date.now() }
          : { deletedAt: null };
  db.update(versions)
    .set({ ...patch, updatedAt: Date.now() })
    .where(inArray(versions.id, ids))
    .run();
  touchResume(input.resumeId);
  return { ok: true as const };
}
