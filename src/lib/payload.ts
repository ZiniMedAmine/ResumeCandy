import type { NodeOverride, ResumeNode, Version } from "./resume/types";

/**
 * Everything the editor needs for one resume, loaded in a single query pass:
 * the base tree, every version, and every version's sparse overlay. Overlays
 * only contain divergences, so this stays small even with hundreds of
 * versions — and it's what makes version switching a zero-network operation.
 */
export interface ResumePayload {
  resume: {
    id: string;
    name: string;
    slug: string;
    /** Base design settings; null = code defaults. */
    settings: Record<string, unknown> | null;
  };
  versions: Version[];
  nodes: ResumeNode[];
  overrides: NodeOverride[];
  settingsPatches: Record<string, Record<string, unknown> | null>;
  loadedAt: number;
}

export interface ResumeListItem {
  id: string;
  name: string;
  slug: string;
  updatedAt: number;
  versionCount: number;
  archivedAt: number | null;
}
