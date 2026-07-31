import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

/**
 * All timestamps are unix epoch milliseconds (plain numbers) so rows can be
 * passed straight through RSC payloads and the client store without mapping.
 */
const now = () => Date.now();

export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    // Stored lower-cased and trimmed; the unique index is what enforces
    // "one account per address" rather than a read-then-write race.
    email: text("email").notNull(),
    name: text("name").notNull(),
    // scrypt, as "scrypt$N$r$p$salt$hash" — never a reversible encoding.
    passwordHash: text("password_hash").notNull(),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

/**
 * Database-backed sessions: the browser holds an opaque random token, and
 * only its SHA-256 hash is stored here. A leaked database therefore cannot be
 * replayed as a login, and revoking a session is a single DELETE.
 */
export const sessions = sqliteTable(
  "sessions",
  {
    // SHA-256 of the token the cookie carries — never the token itself.
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const collections = sqliteTable(
  "collections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    // Every collection belongs to a user; all resume queries scope through it.
    userId: text("user_id").notNull(),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("collections_user_idx").on(t.userId)],
);

export const resumes = sqliteTable(
  "resumes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // Base design settings (template, accent, typography…). Edited from the
    // Default version; named versions override keys via versions.settingsPatch.
    settings: text("settings", { mode: "json" }).$type<Record<
      string,
      unknown
    > | null>(),
    archivedAt: integer("archived_at"),
    createdAt: integer("created_at").notNull().$defaultFn(now),
    updatedAt: integer("updated_at").notNull().$defaultFn(now),
  },
  (t) => [index("resumes_collection_idx").on(t.collectionId)],
);

/**
 * The shared base content tree. Every piece of resume content — the header,
 * each section, each experience, each individual bullet — is one node with a
 * stable id. Versions never copy nodes; they overlay them (node_overrides).
 *
 * ownerVersionId = NULL  → base node, shared by every version of the resume.
 * ownerVersionId = <id>  → node that exists only in that one version.
 */
export const nodes = sqliteTable(
  "nodes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    kind: text("kind").notNull(),
    // Fractional index — ordering among siblings is lexicographic on this.
    rank: text("rank").notNull(),
    // Kind-specific fields, JSON. Patched per-field by node_overrides.
    data: text("data", { mode: "json" })
      .notNull()
      .$type<Record<string, unknown>>(),
    ownerVersionId: text("owner_version_id"),
    createdAt: integer("created_at").notNull().$defaultFn(now),
    updatedAt: integer("updated_at").notNull().$defaultFn(now),
  },
  (t) => [
    index("nodes_resume_parent_idx").on(t.resumeId, t.parentId),
    index("nodes_owner_version_idx").on(t.ownerVersionId),
  ],
);

export const versions = sqliteTable(
  "versions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Exactly one version per resume is the base ("Default"). Editing it
    // writes to the shared node tree; editing any other version writes
    // sparse overrides.
    isBase: integer("is_base").notNull().default(0),
    tags: text("tags", { mode: "json" }).notNull().$type<string[]>().default([]),
    settingsPatch: text("settings_patch", { mode: "json" }).$type<Record<
      string,
      unknown
    > | null>(),
    // Provenance: which version this one was created from ("Created from Google").
    createdFromVersionId: text("created_from_version_id"),
    lastOpenedAt: integer("last_opened_at"),
    archivedAt: integer("archived_at"),
    deletedAt: integer("deleted_at"),
    createdAt: integer("created_at").notNull().$defaultFn(now),
    updatedAt: integer("updated_at").notNull().$defaultFn(now),
  },
  (t) => [index("versions_resume_idx").on(t.resumeId)],
);

/**
 * THE overlay — sparse by design. A row exists only when a version diverges
 * from the base for that node, so `SELECT * WHERE version_id = ?` is
 * simultaneously the render overlay and the customization diff.
 */
export const nodeOverrides = sqliteTable(
  "node_overrides",
  {
    versionId: text("version_id")
      .notNull()
      .references(() => versions.id, { onDelete: "cascade" }),
    nodeId: text("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    // Only the fields that differ from base. NULL = no field changes.
    patch: text("patch", { mode: "json" }).$type<Record<
      string,
      unknown
    > | null>(),
    // 1 = node excluded from this version.
    hidden: integer("hidden"),
    // Per-version ordering. NULL = inherit base rank.
    rank: text("rank"),
    updatedAt: integer("updated_at").notNull().$defaultFn(now),
  },
  (t) => [
    primaryKey({ columns: [t.versionId, t.nodeId] }),
    index("node_overrides_version_idx").on(t.versionId),
  ],
);

/**
 * Bounded append-only edit log: powers toast-undo and audit. Not a CRDT —
 * just before/after snapshots of individual mutations.
 */
export const edits = sqliteTable(
  "edits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    resumeId: text("resume_id").notNull(),
    versionId: text("version_id"),
    nodeId: text("node_id").notNull(),
    // Dot path of what changed, e.g. "data.title" or "hidden" or "rank".
    path: text("path").notNull(),
    before: text("before"),
    after: text("after"),
    at: integer("at").notNull().$defaultFn(now),
  },
  (t) => [index("edits_resume_idx").on(t.resumeId, t.at)],
);

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type CollectionRow = typeof collections.$inferSelect;
export type ResumeRow = typeof resumes.$inferSelect;
export type NodeRow = typeof nodes.$inferSelect;
export type VersionRow = typeof versions.$inferSelect;
export type NodeOverrideRow = typeof nodeOverrides.$inferSelect;
export type EditRow = typeof edits.$inferSelect;
