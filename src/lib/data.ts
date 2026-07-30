import { and, asc, count, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { db, tables } from "@/db";
import { ensureSeeded } from "@/db/seed";
import { resolveDesign, type DesignSettings } from "./design";
import type { ResumeListItem, ResumePayload } from "./payload";
import { resolveVersion } from "./resume/resolve";
import type { NodeKind, ResolvedNode } from "./resume/types";

const { collections, nodeOverrides, nodes, resumes, versions } = tables;

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** Dev stand-in for auth: the single seeded collection. */
export function getCollection() {
  ensureSeeded();
  const row = db.select().from(collections).limit(1).all()[0];
  if (!row) throw new Error("No collection found after seeding");
  return row;
}

export function listResumes(): ResumeListItem[] {
  const collection = getCollection();
  const rows = db
    .select({
      id: resumes.id,
      name: resumes.name,
      slug: resumes.slug,
      updatedAt: resumes.updatedAt,
      archivedAt: resumes.archivedAt,
    })
    .from(resumes)
    .where(eq(resumes.collectionId, collection.id))
    .orderBy(desc(resumes.updatedAt))
    .all();

  const counts = db
    .select({ resumeId: versions.resumeId, value: count() })
    .from(versions)
    .where(and(isNull(versions.deletedAt), isNull(versions.archivedAt)))
    .groupBy(versions.resumeId)
    .all();
  const countByResume = new Map(counts.map((c) => [c.resumeId, c.value]));

  return rows.map((r) => ({
    ...r,
    versionCount: countByResume.get(r.id) ?? 0,
  }));
}

export interface ResumeCardData extends ResumeListItem {
  /** Effective design of the Default version — drives the thumbnail. */
  design: DesignSettings;
  /** Resolved Default version, roots only so it can cross the RSC boundary. */
  roots: ResolvedNode[];
  /** The version a card-level action (open, download) applies to. */
  baseVersionId: string | null;
}

/**
 * The dashboard grid: every resume plus enough of its Default version to
 * render a real thumbnail of page one.
 */
export function listResumeCards(): ResumeCardData[] {
  const base = listResumes();
  return base.map((resume) => {
    const row = db.select().from(resumes).where(eq(resumes.id, resume.id)).all()[0];
    const baseVersion = db
      .select()
      .from(versions)
      .where(and(eq(versions.resumeId, resume.id), eq(versions.isBase, 1)))
      .all()[0];

    const design = resolveDesign(
      (row?.settings ?? null) as Partial<DesignSettings> | null,
      null,
    );
    if (!baseVersion) return { ...resume, design, roots: [], baseVersionId: null };

    const nodeRows = db.select().from(nodes).where(eq(nodes.resumeId, resume.id)).all();
    const overrideRows = db
      .select()
      .from(nodeOverrides)
      .where(eq(nodeOverrides.versionId, baseVersion.id))
      .all();

    const tree = resolveVersion(
      nodeRows.map((n) => ({
        id: n.id,
        resumeId: n.resumeId,
        parentId: n.parentId,
        kind: n.kind as NodeKind,
        rank: n.rank,
        data: n.data,
        ownerVersionId: n.ownerVersionId,
      })),
      overrideRows.map((o) => ({
        versionId: o.versionId,
        nodeId: o.nodeId,
        patch: o.patch ?? null,
        hidden: o.hidden,
        rank: o.rank,
      })),
      baseVersion.id,
    );

    return { ...resume, design, roots: tree.roots, baseVersionId: baseVersion.id };
  });
}

/** Real numbers for the account page — no invented plan or billing state. */
export function accountSummary() {
  const collection = getCollection();
  const [{ value: resumeCount }] = db
    .select({ value: count() })
    .from(resumes)
    .where(eq(resumes.collectionId, collection.id))
    .all();
  const [{ value: versionCount }] = db
    .select({ value: count() })
    .from(versions)
    .where(isNull(versions.deletedAt))
    .all();
  return {
    userId: collection.userId,
    createdAt: collection.createdAt,
    resumeCount,
    versionCount,
  };
}

/** Hard-delete trashed versions past retention (their local nodes too). */
function purgeExpiredTrash(resumeId: string) {
  const cutoff = Date.now() - TRASH_RETENTION_MS;
  const expired = db
    .select({ id: versions.id })
    .from(versions)
    .where(and(eq(versions.resumeId, resumeId), lt(versions.deletedAt, cutoff)))
    .all();
  if (expired.length === 0) return;
  const ids = expired.map((v) => v.id);
  db.transaction((tx) => {
    tx.delete(nodes).where(inArray(nodes.ownerVersionId, ids)).run();
    tx.delete(versions).where(inArray(versions.id, ids)).run(); // overrides cascade
  });
}

export function loadResumePayload(resumeId: string): ResumePayload | null {
  getCollection();
  const resume = db.select().from(resumes).where(eq(resumes.id, resumeId)).all()[0];
  if (!resume) return null;

  purgeExpiredTrash(resumeId);

  const versionRows = db
    .select()
    .from(versions)
    .where(eq(versions.resumeId, resumeId))
    .orderBy(asc(versions.createdAt))
    .all();

  const nodeRows = db
    .select()
    .from(nodes)
    .where(eq(nodes.resumeId, resumeId))
    .all();

  const versionIds = versionRows.map((v) => v.id);
  const overrideRows =
    versionIds.length > 0
      ? db
          .select()
          .from(nodeOverrides)
          .where(inArray(nodeOverrides.versionId, versionIds))
          .all()
      : [];

  return {
    resume: { id: resume.id, name: resume.name, slug: resume.slug, settings: resume.settings ?? null },
    versions: versionRows.map((v) => ({
      id: v.id,
      resumeId: v.resumeId,
      name: v.name,
      isBase: v.isBase,
      tags: v.tags ?? [],
      createdFromVersionId: v.createdFromVersionId,
      lastOpenedAt: v.lastOpenedAt,
      archivedAt: v.archivedAt,
      deletedAt: v.deletedAt,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    })),
    nodes: nodeRows.map((n) => ({
      id: n.id,
      resumeId: n.resumeId,
      parentId: n.parentId,
      kind: n.kind as NodeKind,
      rank: n.rank,
      data: n.data,
      ownerVersionId: n.ownerVersionId,
    })),
    overrides: overrideRows.map((o) => ({
      versionId: o.versionId,
      nodeId: o.nodeId,
      patch: o.patch ?? null,
      hidden: o.hidden,
      rank: o.rank,
    })),
    settingsPatches: Object.fromEntries(
      versionRows.map((v) => [v.id, v.settingsPatch ?? null]),
    ),
    loadedAt: Date.now(),
  };
}

/** The version a bare /resume/[id] link should land on. */
export function defaultVersionId(resumeId: string): string | null {
  const rows = db
    .select({ id: versions.id, isBase: versions.isBase, lastOpenedAt: versions.lastOpenedAt })
    .from(versions)
    .where(and(eq(versions.resumeId, resumeId), isNull(versions.deletedAt), isNull(versions.archivedAt)))
    .all();
  if (rows.length === 0) return null;
  const opened = rows
    .filter((r) => r.lastOpenedAt != null)
    .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0));
  if (opened.length > 0) return opened[0].id;
  return rows.find((r) => r.isBase)?.id ?? rows[0].id;
}
