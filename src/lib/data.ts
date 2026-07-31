import { and, asc, count, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { ensureSeeded } from "@/db/seed";
import { requireUser } from "./auth/dal";
import { resolveDesign, type DesignSettings } from "./design";
import type { ResumeListItem, ResumePayload } from "./payload";
import { resolveVersion } from "./resume/resolve";
import type { NodeKind, ResolvedNode } from "./resume/types";

const { collections, nodeOverrides, nodes, resumes, versions } = tables;

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The signed-in user's collection — the scope every read below is filtered by.
 *
 * Created on demand rather than at signup alone, so an account that predates a
 * schema change, or one whose collection was removed, still lands somewhere
 * valid instead of throwing. `requireUser` redirects anonymous callers, which
 * is what makes every function built on this one safe by construction.
 */
export async function getCollection() {
  ensureSeeded();
  const user = await requireUser();

  const existing = db
    .select()
    .from(collections)
    .where(eq(collections.userId, user.id))
    .limit(1)
    .all()[0];
  if (existing) return existing;

  const id = nanoid();
  db.insert(collections).values({ id, userId: user.id }).run();
  return db.select().from(collections).where(eq(collections.id, id)).all()[0];
}

export async function listResumes(): Promise<ResumeListItem[]> {
  const collection = await getCollection();
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

export interface VersionTreeVersion {
  id: string;
  name: string;
  isBase: number | boolean;
  tags: string[];
  archivedAt: number | null;
  lastOpenedAt: number | null;
  createdAt: number;
  /** Which version this one was branched from — the lineage the tree draws. */
  createdFromVersionId: string | null;
}

export interface VersionTreeResume {
  id: string;
  name: string;
  updatedAt: number;
  versions: VersionTreeVersion[];
}

/**
 * Every resume in the collection with its live versions — the whole shelf, for
 * the switcher's tree. Trashed versions are excluded; archived ones are kept
 * so a version never silently disappears from the place you go to find it.
 */
export async function listVersionTree(): Promise<VersionTreeResume[]> {
  const collection = await getCollection();
  const resumeRows = db
    .select({ id: resumes.id, name: resumes.name, updatedAt: resumes.updatedAt })
    .from(resumes)
    .where(eq(resumes.collectionId, collection.id))
    .orderBy(desc(resumes.updatedAt))
    .all();
  if (resumeRows.length === 0) return [];

  const versionRows = db
    .select()
    .from(versions)
    .where(
      and(
        inArray(
          versions.resumeId,
          resumeRows.map((r) => r.id),
        ),
        isNull(versions.deletedAt),
      ),
    )
    .all();

  const byResume = new Map<string, VersionTreeVersion[]>();
  for (const v of versionRows) {
    const list = byResume.get(v.resumeId) ?? [];
    list.push({
      id: v.id,
      name: v.name,
      isBase: v.isBase,
      tags: v.tags ?? [],
      archivedAt: v.archivedAt,
      lastOpenedAt: v.lastOpenedAt,
      createdAt: v.createdAt,
      createdFromVersionId: v.createdFromVersionId,
    });
    byResume.set(v.resumeId, list);
  }

  return resumeRows.map((resume) => ({
    ...resume,
    versions: (byResume.get(resume.id) ?? []).sort((a, b) => {
      // Default first, then archived last, then most recently opened.
      const aBase = a.isBase === 1 || a.isBase === true ? 1 : 0;
      const bBase = b.isBase === 1 || b.isBase === true ? 1 : 0;
      if (aBase !== bBase) return bBase - aBase;
      if (!!a.archivedAt !== !!b.archivedAt) return a.archivedAt ? 1 : -1;
      return (b.lastOpenedAt ?? b.createdAt) - (a.lastOpenedAt ?? a.createdAt);
    }),
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
export async function listResumeCards(): Promise<ResumeCardData[]> {
  const base = await listResumes();
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
export async function accountSummary() {
  const user = await requireUser();
  const collection = await getCollection();
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
    name: user.name,
    email: user.email,
    memberSince: user.createdAt,
    collectionCreatedAt: collection.createdAt,
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

export async function loadResumePayload(resumeId: string): Promise<ResumePayload | null> {
  const collection = await getCollection();
  // Scoped by collection, not just id: a resume id is guessable, and this is
  // the single door every editor and print route loads through.
  const resume = db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, resumeId), eq(resumes.collectionId, collection.id)))
    .all()[0];
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
