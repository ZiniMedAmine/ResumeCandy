import {
  isHiddenFlag,
  type NodeOverride,
  type ResolvedNode,
  type ResolvedTree,
  type ResumeNode,
} from "./types";
import { compareRank } from "./rank";

export interface ResolveOptions {
  /**
   * Keep hidden nodes in the tree (flagged `hidden: true`) instead of
   * pruning them. The customizations panel needs this; rendering doesn't.
   */
  includeHidden?: boolean;
}

/**
 * Resolve one version's view of a resume: base nodes ∪ version-local nodes,
 * with the version's sparse overlay applied per field.
 *
 * Pure function — no I/O — so it runs identically on the server (initial
 * render), in the client store (instant version switching), and in tests.
 */
export function resolveVersion(
  nodes: ResumeNode[],
  overrides: NodeOverride[],
  versionId: string,
  opts: ResolveOptions = {},
): ResolvedTree {
  const overrideByNode = new Map<string, NodeOverride>();
  for (const o of overrides) {
    if (o.versionId === versionId) overrideByNode.set(o.nodeId, o);
  }

  const resolved: ResolvedNode[] = [];
  for (const node of nodes) {
    // A node is visible to this version when shared (base) or local to it.
    if (node.ownerVersionId !== null && node.ownerVersionId !== versionId) {
      continue;
    }
    const isLocal = node.ownerVersionId === versionId;
    const override = isLocal ? undefined : overrideByNode.get(node.id);
    const patch = override?.patch ?? null;
    const patchKeys = patch ? Object.keys(patch) : [];
    const hidden = isHiddenFlag(override?.hidden);
    const rank = override?.rank ?? node.rank;

    resolved.push({
      id: node.id,
      parentId: node.parentId,
      kind: node.kind,
      rank,
      data: patch ? { ...node.data, ...patch } : node.data,
      status: isLocal ? "local" : patchKeys.length > 0 || hidden || override?.rank != null ? "customized" : "base",
      customizedFields: patchKeys,
      hidden,
      reordered: override?.rank != null && override.rank !== node.rank,
      children: [],
    });
  }

  // Assemble the tree; hidden subtrees are pruned unless requested.
  const byId = new Map<string, ResolvedNode>();
  for (const n of resolved) byId.set(n.id, n);

  const roots: ResolvedNode[] = [];
  for (const n of resolved) {
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    if (n.parentId && !parent) continue; // orphan (parent not visible here)
    if (parent) parent.children.push(n);
    else roots.push(n);
  }

  const sortChildren = (list: ResolvedNode[]) => {
    list.sort((a, b) => compareRank(a.rank, b.rank) || (a.id < b.id ? -1 : 1));
    for (const n of list) sortChildren(n.children);
  };
  sortChildren(roots);

  if (!opts.includeHidden) {
    const prune = (list: ResolvedNode[]): ResolvedNode[] => {
      const kept = list.filter((n) => !n.hidden);
      for (const n of kept) n.children = prune(n.children);
      for (const n of list) if (n.hidden) dropSubtree(n);
      return kept;
    };
    const dropSubtree = (n: ResolvedNode) => {
      byId.delete(n.id);
      for (const c of n.children) dropSubtree(c);
    };
    return { versionId, roots: prune(roots), byId };
  }

  return { versionId, roots, byId };
}

/** Flatten a resolved tree depth-first (parents before children). */
export function flattenTree(roots: ResolvedNode[]): ResolvedNode[] {
  const out: ResolvedNode[] = [];
  const walk = (list: ResolvedNode[]) => {
    for (const n of list) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(roots);
  return out;
}

/** Find the section title a node lives under (its own title for sections). */
export function sectionTitleOf(
  tree: ResolvedTree,
  nodeId: string,
): string {
  let current = tree.byId.get(nodeId);
  while (current) {
    if (current.kind === "section") {
      return typeof current.data.title === "string" ? current.data.title : "Section";
    }
    if (current.kind === "header") return "Header";
    current = current.parentId ? tree.byId.get(current.parentId) : undefined;
  }
  return "";
}
