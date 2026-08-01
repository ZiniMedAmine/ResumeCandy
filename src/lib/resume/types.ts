/**
 * Core domain types for the resume versioning engine.
 *
 * The mental model: one shared base tree of content nodes per resume; each
 * version is a sparse overlay (field patches, hidden flags, per-version
 * ranks, plus version-local nodes). Everything here is plain data — the
 * engine files (resolve/diff/patch/rank) are pure functions over it.
 */

export type NodeKind =
  | "header"
  | "section"
  | "experience"
  | "education"
  | "project"
  | "skillGroup"
  | "skill"
  | "bullet"
  | "certification"
  | "reference"
  | "language"
  | "text";

export interface HeaderData {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
  [key: string]: unknown;
}

export type SectionType =
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "certifications"
  | "references"
  | "languages"
  | "interests"
  | "courses"
  | "awards"
  | "organisations"
  | "publications"
  | "declaration"
  | "custom";

export interface SectionData {
  title: string;
  sectionType: SectionType;
  [key: string]: unknown;
}

export interface ExperienceData {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  [key: string]: unknown;
}

export interface EducationData {
  school: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  [key: string]: unknown;
}

export interface ProjectData {
  name: string;
  url: string;
  description: string;
  [key: string]: unknown;
}

export interface SkillGroupData {
  name: string;
  [key: string]: unknown;
}

export interface SkillData {
  name: string;
  [key: string]: unknown;
}

export interface BulletData {
  text: string;
  [key: string]: unknown;
}

export interface CertificationData {
  name: string;
  issuer: string;
  date: string;
  [key: string]: unknown;
}

export interface ReferenceData {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  [key: string]: unknown;
}

export type NodeData = Record<string, unknown>;

/** A content node as stored (base tree or version-local). */
export interface ResumeNode {
  id: string;
  resumeId: string;
  parentId: string | null;
  kind: NodeKind;
  rank: string;
  data: NodeData;
  /** null = shared base node; a version id = local to that version only. */
  ownerVersionId: string | null;
}

/** A sparse overlay row: what one version changes about one node. */
export interface NodeOverride {
  versionId: string;
  nodeId: string;
  /** Only the fields that differ from base. */
  patch: NodeData | null;
  /** Truthy = excluded from this version. */
  hidden: number | boolean | null;
  /** Per-version rank; null inherits base rank. */
  rank: string | null;
}

export interface Version {
  id: string;
  resumeId: string;
  name: string;
  isBase: number | boolean;
  tags: string[];
  createdFromVersionId: string | null;
  lastOpenedAt: number | null;
  archivedAt: number | null;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export type NodeStatus = "base" | "customized" | "local";

export interface ResolvedNode {
  id: string;
  parentId: string | null;
  kind: NodeKind;
  /** Effective rank in this version (override rank if present). */
  rank: string;
  /** Effective data: base data with the version's field patch applied. */
  data: NodeData;
  /** base = fully inherited; customized = has overrides; local = only in this version. */
  status: NodeStatus;
  /** Field names overridden by this version (per-field provenance). */
  customizedFields: string[];
  /** True when the node is hidden in this version (only present with includeHidden). */
  hidden: boolean;
  /** True when the override changes rank relative to base. */
  reordered: boolean;
  children: ResolvedNode[];
}

export interface ResolvedTree {
  versionId: string;
  roots: ResolvedNode[];
  byId: Map<string, ResolvedNode>;
}

/* ----------------------------- shared helpers ---------------------------- */

export function isHiddenFlag(v: number | boolean | null | undefined): boolean {
  return v === true || v === 1;
}

/**
 * The names of things, supplied by the caller.
 *
 * The engine is pure data over pure functions and must not know which language
 * the interface happens to be in, so the fallback wording is passed in rather
 * than baked here. In practice the caller hands over `t.kind` / `t.field`
 * straight from the dictionary.
 */
export type KindLabels = Record<NodeKind, string>;
export type FieldLabels = Record<string, string>;

/**
 * Human label for a node, used in diff lists and the customizations panel.
 *
 * The content itself is preferred wherever it exists — a role's own title, a
 * project's own name — and `labels` only supplies the fallback for a node that
 * is still empty.
 */
export function nodeLabel(kind: NodeKind, data: NodeData, labels: KindLabels): string {
  const s = (k: string) => {
    const v = data[k];
    return typeof v === "string" ? v.trim() : "";
  };
  switch (kind) {
    case "header":
      return s("fullName") || labels.header;
    case "section":
      return s("title") || labels.section;
    case "experience":
      return [s("title"), s("company")].filter(Boolean).join(" · ") || labels.experience;
    case "education":
      return [s("degree"), s("school")].filter(Boolean).join(" · ") || labels.education;
    case "project":
      return s("name") || labels.project;
    case "skillGroup":
      return s("name") || labels.skillGroup;
    case "skill":
      return s("name") || labels.skill;
    case "bullet": {
      const t = s("text");
      return t.length > 72 ? `${t.slice(0, 72)}…` : t || labels.bullet;
    }
    case "certification":
      return s("name") || labels.certification;
    case "reference":
      return s("name") || labels.reference;
    case "language":
      return [s("name"), s("level")].filter(Boolean).join(" — ") || labels.language;
    case "text": {
      const t = s("text");
      return t.length > 72 ? `${t.slice(0, 72)}…` : t || labels.text;
    }
  }
}

/** Falls back to the raw field name, so a new field is never invisible. */
export function fieldLabel(field: string, labels: FieldLabels): string {
  return labels[field] ?? field;
}
