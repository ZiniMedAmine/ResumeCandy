import { and, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { requireUser } from "@/lib/auth/dal";
import { NODE_KINDS } from "@/lib/resume/types";

const { collections, edits, nodes, resumes, versions } = tables;

const EDIT_LOG_LIMIT = 500;

/**
 * Asserts the signed-in user owns this resume, and fails identically whether
 * it belongs to someone else or does not exist — a distinct "forbidden" would
 * confirm which ids are real.
 *
 * Server Actions are public endpoints: the client calling them is not evidence
 * of anything, so every mutation entry point runs this before touching a row.
 */
export async function assertOwnsResume(resumeId: string): Promise<void> {
  const user = await requireUser();
  const row = db
    .select({ id: resumes.id })
    .from(resumes)
    .innerJoin(collections, eq(resumes.collectionId, collections.id))
    .where(and(eq(resumes.id, resumeId), eq(collections.userId, user.id)))
    .all()[0];
  if (!row) throw new Error("Resume not found");
}

/** Same guarantee, addressed by version — resolves the resume, then checks it. */
export async function assertOwnsVersion(versionId: string): Promise<string> {
  const version = db
    .select({ resumeId: versions.resumeId })
    .from(versions)
    .where(eq(versions.id, versionId))
    .all()[0];
  if (!version) throw new Error("Version not found");
  await assertOwnsResume(version.resumeId);
  return version.resumeId;
}

export function getVersionOrThrow(versionId: string) {
  const v = db.select().from(versions).where(eq(versions.id, versionId)).all()[0];
  if (!v) throw new Error(`Version not found: ${versionId}`);
  return v;
}

export function getNodeOrThrow(nodeId: string) {
  const n = db.select().from(nodes).where(eq(nodes.id, nodeId)).all()[0];
  if (!n) throw new Error(`Node not found: ${nodeId}`);
  return n;
}

/**
 * A version of *this* resume, or an error.
 *
 * Ownership is checked once per action, on the resume id; every other id the
 * client sends (versions, nodes, parents) must then be shown to belong to that
 * same resume. Without this, a signed-in user could pass their own resume id
 * alongside someone else's version or node id and edit it.
 */
export function versionOf(resumeId: string, versionId: string) {
  const v = getVersionOrThrow(versionId);
  if (v.resumeId !== resumeId) throw new Error(`Version not found: ${versionId}`);
  return v;
}

/** A node of *this* resume, or an error — see `versionOf`. */
export function nodeOf(resumeId: string, nodeId: string) {
  const n = getNodeOrThrow(nodeId);
  if (n.resumeId !== resumeId) throw new Error(`Node not found: ${nodeId}`);
  return n;
}

/**
 * Validates nodes a client wants to insert: a known kind, and a parent that
 * is either one of the resume's nodes or another node in the same batch.
 */
export function assertInsertableNodes(
  resumeId: string,
  batch: { id: string; parentId: string | null; kind: string }[],
) {
  const inBatch = new Set(batch.map((n) => n.id));
  for (const n of batch) {
    if (!(NODE_KINDS as readonly string[]).includes(n.kind)) throw new Error(`Unknown node kind: ${n.kind}`);
    if (n.parentId && !inBatch.has(n.parentId)) nodeOf(resumeId, n.parentId);
  }
}

export function touchResume(resumeId: string) {
  db.update(resumes)
    .set({ updatedAt: Date.now() })
    .where(eq(resumes.id, resumeId))
    .run();
}

/** Longest value the audit log keeps verbatim; a photo is ~40 KB of base64. */
const LOG_VALUE_MAX = 2000;

function logValue(value: unknown): string | null {
  if (value === undefined) return null;
  const json = JSON.stringify(value);
  return json.length > LOG_VALUE_MAX ? `${json.slice(0, LOG_VALUE_MAX)}…[${json.length} chars]` : json;
}

/** Append to the bounded edit log (undo/audit trail). */
export function logEdit(entry: {
  resumeId: string;
  versionId: string | null;
  nodeId: string;
  path: string;
  before: unknown;
  after: unknown;
}) {
  db.insert(edits)
    .values({
      id: nanoid(),
      resumeId: entry.resumeId,
      versionId: entry.versionId,
      nodeId: entry.nodeId,
      path: entry.path,
      before: logValue(entry.before),
      after: logValue(entry.after),
    })
    .run();
  // Keep the log bounded per resume.
  db.run(
    sql`DELETE FROM edits WHERE resume_id = ${entry.resumeId} AND id NOT IN (
      SELECT id FROM edits WHERE resume_id = ${entry.resumeId} ORDER BY at DESC LIMIT ${EDIT_LOG_LIMIT}
    )`,
  );
}

/** All node ids in the subtree rooted at rootId (inclusive), across owners. */
export function collectSubtreeIds(resumeId: string, rootId: string): string[] {
  const all = db
    .select({ id: nodes.id, parentId: nodes.parentId })
    .from(nodes)
    .where(eq(nodes.resumeId, resumeId))
    .all();
  const childrenOf = new Map<string, string[]>();
  for (const n of all) {
    if (!n.parentId) continue;
    const list = childrenOf.get(n.parentId) ?? [];
    list.push(n.id);
    childrenOf.set(n.parentId, list);
  }
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    out.push(id);
    for (const c of childrenOf.get(id) ?? []) stack.push(c);
  }
  return out;
}

/** Hard-delete a subtree; overrides cascade via FK. */
export function deleteSubtree(resumeId: string, rootId: string) {
  const ids = collectSubtreeIds(resumeId, rootId);
  db.delete(nodes).where(inArray(nodes.id, ids)).run();
  return ids;
}

/** Local node ids of one version inside a subtree (for scoped resets). */
export function localNodeIdsIn(
  resumeId: string,
  versionId: string,
  subtreeRootId?: string,
): string[] {
  const rows = db
    .select({ id: nodes.id })
    .from(nodes)
    .where(and(eq(nodes.resumeId, resumeId), eq(nodes.ownerVersionId, versionId)))
    .all();
  if (!subtreeRootId) return rows.map((r) => r.id);
  const subtree = new Set(collectSubtreeIds(resumeId, subtreeRootId));
  return rows.map((r) => r.id).filter((id) => subtree.has(id));
}
