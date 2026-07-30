"use client";

import { nanoid } from "nanoid";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import * as contentActions from "@/app/actions/content";
import * as resumeActions from "@/app/actions/resumes";
import * as versionActions from "@/app/actions/versions";
import { resolveDesign, type DesignSettings } from "@/lib/design";
import type { ResumePayload } from "@/lib/payload";
import {
  mergedOverride,
  withFieldEdit,
  withFieldReset,
  withHidden,
  withRank,
} from "@/lib/resume/patch";
import { rankAfter, rankBetween } from "@/lib/resume/rank";
import { resolveVersion } from "@/lib/resume/resolve";
import {
  isHiddenFlag,
  type NodeData,
  type NodeKind,
  type NodeOverride,
  type ResumeNode,
  type Version,
} from "@/lib/resume/types";
import { editorUrl, parseView, type EditorTab } from "@/lib/view";

export type { EditorTab };
export { editorUrl, parseView };

/* --------------------------------- types --------------------------------- */

export interface Toast {
  id: number;
  message: string;
  kind: "info" | "error" | "success";
  undoLabel?: string;
  undo?: () => void;
}

type OverrideMap = Record<string, Record<string, NodeOverride>>;

export interface ResumeStoreState {
  resumeId: string;
  resumeName: string;
  versions: Version[];
  nodes: Record<string, ResumeNode>;
  overrides: OverrideMap;
  /** Resume-level base design settings (partial; defaults fill the rest). */
  baseSettings: Record<string, unknown> | null;
  /** Per-version sparse design overrides. */
  settingsPatches: Record<string, Record<string, unknown> | null>;
  activeVersionId: string;
  tab: EditorTab;
  pendingSaves: number;
  toasts: Toast[];

  /* navigation */
  setActiveVersion(id: string, opts?: { push?: boolean }): void;
  setTab(tab: EditorTab, opts?: { push?: boolean }): void;
  syncFromUrl(versionId: string | null, tab: EditorTab): void;

  /* content edits (optimistic; persistence debounced/fired in background) */
  editField(nodeId: string, field: string, value: unknown): void;
  setHidden(nodeId: string, hidden: boolean, opts?: { silent?: boolean }): void;
  moveNode(nodeId: string, direction: -1 | 1): void;
  addNode(parentId: string | null, kind: NodeKind, data?: NodeData): string;
  deleteNodeHard(nodeId: string): void;
  resetField(nodeId: string, field: string, opts?: { silent?: boolean }): void;
  resetNode(nodeId: string): void;
  resetScope(sectionId: string | null): void;
  pushFieldToBase(nodeId: string, field: string): void;
  promoteLocalNode(nodeId: string): void;
  copyCustomizations(fromVersionId: string, toVersionIds: string[], nodeIds: string[], localNodeIds: string[]): void;
  copyFieldTo(nodeId: string, field: string, value: unknown, toVersionIds: string[]): void;

  /* design settings (same layering as content: Default = base, others = patch) */
  updateDesign(key: keyof DesignSettings, value: unknown): void;
  resetDesignKey(key: keyof DesignSettings): void;
  resetDesignAll(): void;

  /* version management */
  createVersion(name: string, fromVersionId?: string | null): string;
  duplicateVersion(versionId: string): string;
  renameVersion(versionId: string, name: string): void;
  setVersionTags(versionId: string, tags: string[]): void;
  archiveVersion(versionId: string, archived: boolean): void;
  trashVersion(versionId: string): void;
  restoreTrashed(versionId: string): void;
  hardDeleteVersion(versionId: string): void;
  bulkVersions(versionIds: string[], op: "archive" | "unarchive" | "trash" | "restore"): void;

  /* toasts */
  toast(t: Omit<Toast, "id">): void;
  dismissToast(id: number): void;
}

export type ResumeStore = StoreApi<ResumeStoreState>;

/* ------------------------------ store factory ----------------------------- */

const isBase = (v: Version | undefined) => v?.isBase === 1 || v?.isBase === true;

export function createResumeStore(
  payload: ResumePayload,
  initialVersionId: string,
  initialTab: EditorTab,
): ResumeStore {
  const nodesById: Record<string, ResumeNode> = {};
  for (const n of payload.nodes) nodesById[n.id] = n;
  const overrideMap: OverrideMap = {};
  for (const o of payload.overrides) {
    (overrideMap[o.versionId] ??= {})[o.nodeId] = o;
  }

  // Debounced persistence for text fields.
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let toastSeq = 1;

  return createStore<ResumeStoreState>((set, get) => {
    /* ------------------------------ internals ------------------------------ */

    const run = (fn: () => Promise<unknown>) => {
      set((s) => ({ pendingSaves: s.pendingSaves + 1 }));
      fn()
        .catch((err) => {
          console.error(err);
          get().toast({ message: "Failed to save — your last change may not persist", kind: "error" });
        })
        .finally(() => set((s) => ({ pendingSaves: s.pendingSaves - 1 })));
    };

    const debounced = (key: string, fn: () => Promise<unknown>, ms = 500) => {
      const existing = timers.get(key);
      if (existing) clearTimeout(existing);
      else set((s) => ({ pendingSaves: s.pendingSaves + 1 }));
      timers.set(key, setTimeout(() => {
        timers.delete(key);
        fn()
          .catch((err) => {
            console.error(err);
            get().toast({ message: "Failed to save — your last change may not persist", kind: "error" });
          })
          .finally(() => set((s) => ({ pendingSaves: s.pendingSaves - 1 })));
      }, ms));
    };

    const activeVersion = () => {
      const s = get();
      return s.versions.find((v) => v.id === s.activeVersionId);
    };

    const baseVersion = () => get().versions.find((v) => isBase(v))!;

    const setOverride = (versionId: string, nodeId: string, next: NodeOverride | null) => {
      set((s) => {
        const forVersion = { ...(s.overrides[versionId] ?? {}) };
        if (next === null) delete forVersion[nodeId];
        else forVersion[nodeId] = next;
        return { overrides: { ...s.overrides, [versionId]: forVersion } };
      });
    };

    const patchNodeData = (nodeId: string, field: string, value: unknown) => {
      set((s) => {
        const node = s.nodes[nodeId];
        if (!node) return {};
        return {
          nodes: {
            ...s.nodes,
            [nodeId]: { ...node, data: { ...node.data, [field]: value } },
          },
        };
      });
    };

    const resolveActive = (versionId?: string) => {
      const s = get();
      const overridesArr = flattenOverrides(s.overrides);
      return resolveVersion(Object.values(s.nodes), overridesArr, versionId ?? s.activeVersionId, {
        includeHidden: true,
      });
    };

    const subtreeNodes = (rootId: string): ResumeNode[] => {
      const s = get();
      const all = Object.values(s.nodes);
      const childrenOf = new Map<string, ResumeNode[]>();
      for (const n of all) {
        if (!n.parentId) continue;
        const list = childrenOf.get(n.parentId) ?? [];
        list.push(n);
        childrenOf.set(n.parentId, list);
      }
      const out: ResumeNode[] = [];
      const stack = [s.nodes[rootId]].filter(Boolean) as ResumeNode[];
      while (stack.length) {
        const n = stack.pop()!;
        out.push(n);
        for (const c of childrenOf.get(n.id) ?? []) stack.push(c);
      }
      return out;
    };

    const removeNodesFromStore = (ids: string[]) => {
      const idSet = new Set(ids);
      set((s) => {
        const nodes = { ...s.nodes };
        for (const id of ids) delete nodes[id];
        const overrides: OverrideMap = {};
        const removedOverrides: NodeOverride[] = [];
        for (const [vid, m] of Object.entries(s.overrides)) {
          const next: Record<string, NodeOverride> = {};
          for (const [nid, o] of Object.entries(m)) {
            if (idSet.has(nid)) removedOverrides.push(o);
            else next[nid] = o;
          }
          overrides[vid] = next;
        }
        lastRemovedOverrides = removedOverrides;
        return { nodes, overrides };
      });
    };
    let lastRemovedOverrides: NodeOverride[] = [];

    /* -------------------------------- public ------------------------------- */

    return {
      resumeId: payload.resume.id,
      resumeName: payload.resume.name,
      versions: payload.versions,
      nodes: nodesById,
      overrides: overrideMap,
      baseSettings: payload.resume.settings,
      settingsPatches: payload.settingsPatches,
      activeVersionId: initialVersionId,
      tab: initialTab,
      pendingSaves: 0,
      toasts: [],

      /* ------------------------------ navigation ----------------------------- */

      setActiveVersion(id, opts) {
        const s = get();
        if (!s.versions.some((v) => v.id === id)) return;
        set({ activeVersionId: id });
        set((st) => ({
          versions: st.versions.map((v) => (v.id === id ? { ...v, lastOpenedAt: Date.now() } : v)),
        }));
        if (opts?.push !== false && typeof window !== "undefined") {
          window.history.pushState(null, "", editorUrl(s.resumeId, id, get().tab));
        }
        versionActions.touchVersionOpened({ versionId: id }).catch(() => {});
      },

      setTab(tab, opts) {
        const s = get();
        if (s.tab === tab) return;
        set({ tab });
        if (opts?.push !== false && typeof window !== "undefined") {
          window.history.pushState(null, "", editorUrl(s.resumeId, s.activeVersionId, tab));
        }
      },

      syncFromUrl(versionId, tab) {
        const s = get();
        if (versionId && versionId !== s.activeVersionId && s.versions.some((v) => v.id === versionId)) {
          set({ activeVersionId: versionId });
        }
        set({ tab });
      },

      /* ---------------------------- content editing --------------------------- */

      editField(nodeId, field, value) {
        const s = get();
        const version = activeVersion();
        const node = s.nodes[nodeId];
        if (!version || !node) return;
        const editsBaseTree = isBase(version) || node.ownerVersionId === version.id;

        if (editsBaseTree) {
          patchNodeData(nodeId, field, value);
        } else {
          const existing = s.overrides[version.id]?.[nodeId];
          const wasCustomized = !!existing?.patch && field in existing.patch;
          const next = withFieldEdit(existing, version.id, nodeId, node.data, field, value);
          setOverride(version.id, nodeId, next);
          const nowCustomized = !!next?.patch && field in next.patch;
          if (!wasCustomized && nowCustomized) {
            get().toast({
              message: `Customized for ${version.name} — other versions keep the Default`,
              kind: "info",
              undoLabel: "Undo",
              undo: () => get().resetField(nodeId, field, { silent: true }),
            });
          }
        }
        debounced(`field:${version.id}:${nodeId}:${field}`, () =>
          contentActions.saveFieldEdit({
            resumeId: s.resumeId,
            versionId: version.id,
            nodeId,
            field,
            value,
          }),
        );
      },

      setHidden(nodeId, hidden, opts) {
        const s = get();
        const version = activeVersion();
        const node = s.nodes[nodeId];
        if (!version || !node || node.ownerVersionId) return;
        const existing = s.overrides[version.id]?.[nodeId];
        setOverride(version.id, nodeId, withHidden(existing, version.id, nodeId, hidden));
        if (hidden && !opts?.silent) {
          const where = isBase(version) ? "the Default" : version.name;
          get().toast({
            message: `Hidden in ${where}${isBase(version) ? " — versions keep their own visibility" : " — it stays in the Default"}`,
            kind: "info",
            undoLabel: "Undo",
            undo: () => get().setHidden(nodeId, false, { silent: true }),
          });
        }
        run(() =>
          contentActions.saveHidden({ resumeId: s.resumeId, versionId: version.id, nodeId, hidden }),
        );
      },

      moveNode(nodeId, direction) {
        const s = get();
        const version = activeVersion();
        const node = s.nodes[nodeId];
        if (!version || !node) return;
        const tree = resolveActive();
        const resolved = tree.byId.get(nodeId);
        if (!resolved) return;
        const siblings = resolved.parentId
          ? (tree.byId.get(resolved.parentId)?.children ?? [])
          : tree.roots;
        const idx = siblings.findIndex((n) => n.id === nodeId);
        const target = idx + direction;
        if (idx === -1 || target < 0 || target >= siblings.length) return;

        let newRank: string;
        if (direction === -1) {
          const before = siblings[target - 1];
          newRank = rankBetween(before?.rank ?? null, siblings[target].rank);
        } else {
          const after = siblings[target + 1];
          newRank = rankBetween(siblings[target].rank, after?.rank ?? null);
        }

        const editsBaseTree = isBase(version) || node.ownerVersionId === version.id;
        if (editsBaseTree) {
          set((st) => ({
            nodes: { ...st.nodes, [nodeId]: { ...st.nodes[nodeId], rank: newRank } },
          }));
        } else {
          const existing = s.overrides[version.id]?.[nodeId];
          setOverride(version.id, nodeId, withRank(existing, version.id, nodeId, node.rank, newRank));
        }
        run(() =>
          contentActions.saveRank({ resumeId: s.resumeId, versionId: version.id, nodeId, rank: newRank }),
        );
      },

      addNode(parentId, kind, data) {
        const s = get();
        const version = activeVersion()!;
        const tree = resolveActive();
        const siblings = parentId ? (tree.byId.get(parentId)?.children ?? []) : tree.roots;
        const last = siblings[siblings.length - 1];
        const id = nanoid();
        const node: ResumeNode = {
          id,
          resumeId: s.resumeId,
          parentId,
          kind,
          rank: rankAfter(last?.rank ?? null),
          data: data ?? kindDefaults(kind),
          ownerVersionId: isBase(version) ? null : version.id,
        };
        set((st) => ({ nodes: { ...st.nodes, [id]: node } }));
        run(() =>
          contentActions.createNode({
            resumeId: s.resumeId,
            versionId: version.id,
            node: { id, parentId, kind, rank: node.rank, data: node.data },
          }),
        );
        return id;
      },

      deleteNodeHard(nodeId) {
        const s = get();
        const version = activeVersion()!;
        const node = s.nodes[nodeId];
        if (!node) return;
        const removed = subtreeNodes(nodeId);
        removeNodesFromStore(removed.map((n) => n.id));
        const removedOverrides = lastRemovedOverrides;
        get().toast({
          message: node.ownerVersionId
            ? `Removed from ${version.name}`
            : "Deleted from the Default and every version",
          kind: "info",
          undoLabel: "Undo",
          undo: () => {
            set((st) => {
              const nodes = { ...st.nodes };
              for (const n of removed) nodes[n.id] = n;
              const overrides = { ...st.overrides };
              for (const o of removedOverrides) {
                overrides[o.versionId] = { ...(overrides[o.versionId] ?? {}), [o.nodeId]: o };
              }
              return { nodes, overrides };
            });
            run(async () => {
              await contentActions.restoreNodes({ resumeId: s.resumeId, nodes: removed });
              if (removedOverrides.length > 0) {
                await contentActions.restoreOverrides({ resumeId: s.resumeId, overrides: removedOverrides });
              }
            });
          },
        });
        run(() =>
          contentActions.deleteNode({ resumeId: s.resumeId, versionId: version.id, nodeId }),
        );
      },

      resetField(nodeId, field, opts) {
        const s = get();
        const version = activeVersion()!;
        const existing = s.overrides[version.id]?.[nodeId];
        if (!existing) return;
        const beforeRow = existing;
        setOverride(version.id, nodeId, withFieldReset(existing, field));
        if (!opts?.silent) {
          get().toast({
            message: "Field reset to the Default value",
            kind: "info",
            undoLabel: "Undo",
            undo: () => {
              setOverride(version.id, nodeId, beforeRow);
              run(() => contentActions.restoreOverrides({ resumeId: s.resumeId, overrides: [beforeRow] }));
            },
          });
        }
        run(() =>
          contentActions.resetField({ resumeId: s.resumeId, versionId: version.id, nodeId, field }),
        );
      },

      resetNode(nodeId) {
        const s = get();
        const version = activeVersion()!;
        const existing = s.overrides[version.id]?.[nodeId];
        if (!existing) return;
        setOverride(version.id, nodeId, null);
        get().toast({
          message: "Reset to the Default",
          kind: "info",
          undoLabel: "Undo",
          undo: () => {
            setOverride(version.id, nodeId, existing);
            run(() => contentActions.restoreOverrides({ resumeId: s.resumeId, overrides: [existing] }));
          },
        });
        run(() => contentActions.resetNode({ resumeId: s.resumeId, versionId: version.id, nodeId }));
      },

      resetScope(sectionId) {
        const s = get();
        const version = activeVersion()!;
        const scopeIds = sectionId ? new Set(subtreeNodes(sectionId).map((n) => n.id)) : null;

        const removedOverrides: NodeOverride[] = [];
        const forVersion = s.overrides[version.id] ?? {};
        for (const [nid, o] of Object.entries(forVersion)) {
          if (!scopeIds || scopeIds.has(nid)) removedOverrides.push(o);
        }
        const removedLocals = Object.values(s.nodes).filter(
          (n) => n.ownerVersionId === version.id && (!scopeIds || scopeIds.has(n.id)),
        );

        set((st) => {
          const nextForVersion: Record<string, NodeOverride> = {};
          for (const [nid, o] of Object.entries(st.overrides[version.id] ?? {})) {
            if (scopeIds && !scopeIds.has(nid)) nextForVersion[nid] = o;
          }
          const nodes = { ...st.nodes };
          for (const n of removedLocals) delete nodes[n.id];
          return { overrides: { ...st.overrides, [version.id]: nextForVersion }, nodes };
        });

        get().toast({
          message: sectionId ? "Section reset to the Default" : `${version.name} reset to the Default`,
          kind: "success",
          undoLabel: "Undo",
          undo: () => {
            set((st) => {
              const nodes = { ...st.nodes };
              for (const n of removedLocals) nodes[n.id] = n;
              const forV = { ...(st.overrides[version.id] ?? {}) };
              for (const o of removedOverrides) forV[o.nodeId] = o;
              return { nodes, overrides: { ...st.overrides, [version.id]: forV } };
            });
            run(async () => {
              if (removedLocals.length > 0) {
                await contentActions.restoreNodes({ resumeId: s.resumeId, nodes: removedLocals });
              }
              if (removedOverrides.length > 0) {
                await contentActions.restoreOverrides({ resumeId: s.resumeId, overrides: removedOverrides });
              }
            });
          },
        });
        run(() =>
          contentActions.resetScope({ resumeId: s.resumeId, versionId: version.id, sectionId }),
        );
      },

      pushFieldToBase(nodeId, field) {
        const s = get();
        const version = activeVersion()!;
        const node = s.nodes[nodeId];
        const existing = s.overrides[version.id]?.[nodeId];
        if (!node || !existing?.patch || !(field in existing.patch)) return;
        const value = existing.patch[field];
        const baseBefore = node.data[field];
        patchNodeData(nodeId, field, value);
        setOverride(version.id, nodeId, withFieldReset(existing, field));
        get().toast({
          message: "Pushed to the Default — versions without their own edit now use it",
          kind: "success",
          undoLabel: "Undo",
          undo: () => {
            patchNodeData(nodeId, field, baseBefore);
            setOverride(version.id, nodeId, existing);
            run(async () => {
              await contentActions.saveFieldEdit({
                resumeId: s.resumeId,
                versionId: baseVersion().id,
                nodeId,
                field,
                value: baseBefore,
              });
              await contentActions.restoreOverrides({ resumeId: s.resumeId, overrides: [existing] });
            });
          },
        });
        run(() =>
          contentActions.pushFieldToBase({ resumeId: s.resumeId, versionId: version.id, nodeId, field }),
        );
      },

      promoteLocalNode(nodeId) {
        const s = get();
        const version = activeVersion()!;
        const node = s.nodes[nodeId];
        if (!node || node.ownerVersionId !== version.id) return;
        const ids = new Set(subtreeNodes(nodeId).map((n) => n.id));
        let parentId = node.parentId;
        while (parentId) {
          const p = s.nodes[parentId];
          if (!p) break;
          if (p.ownerVersionId === version.id) ids.add(p.id);
          parentId = p.parentId;
        }
        set((st) => {
          const nodes = { ...st.nodes };
          for (const id of ids) {
            if (nodes[id]?.ownerVersionId === version.id) {
              nodes[id] = { ...nodes[id], ownerVersionId: null };
            }
          }
          return { nodes };
        });
        get().toast({ message: "Added to the Default — now part of every version", kind: "success" });
        run(() =>
          contentActions.promoteNodeToBase({ resumeId: s.resumeId, versionId: version.id, nodeId }),
        );
      },

      copyCustomizations(fromVersionId, toVersionIds, nodeIds, localNodeIds) {
        const s = get();
        const source = s.overrides[fromVersionId] ?? {};
        const targets = toVersionIds.filter(
          (t) => t !== fromVersionId && !isBase(s.versions.find((v) => v.id === t)),
        );
        if (targets.length === 0) return;

        // Overrides: merge source rows into each target.
        set((st) => {
          const overrides = { ...st.overrides };
          for (const target of targets) {
            const forTarget = { ...(overrides[target] ?? {}) };
            for (const nodeId of nodeIds) {
              const src = source[nodeId];
              if (!src) continue;
              const merged = mergedOverride(forTarget[nodeId], src, target);
              if (merged === null) delete forTarget[nodeId];
              else forTarget[nodeId] = merged;
            }
            overrides[target] = forTarget;
          }
          return { overrides };
        });

        // Local nodes: clone subtrees per target with fresh ids.
        const clonesByTarget: Record<string, ResumeNode[]> = {};
        for (const target of targets) {
          const clones: ResumeNode[] = [];
          for (const rootId of localNodeIds) {
            const subtree = subtreeNodes(rootId).filter((n) => n.ownerVersionId === fromVersionId);
            const idMap = new Map(subtree.map((n) => [n.id, nanoid()] as const));
            for (const n of subtree) {
              clones.push({
                ...n,
                id: idMap.get(n.id)!,
                parentId: n.parentId && idMap.has(n.parentId) ? idMap.get(n.parentId)! : n.parentId,
                ownerVersionId: target,
              });
            }
          }
          clonesByTarget[target] = clones;
        }
        set((st) => {
          const nodes = { ...st.nodes };
          for (const clones of Object.values(clonesByTarget)) {
            for (const n of clones) nodes[n.id] = n;
          }
          return { nodes };
        });

        get().toast({
          message: `Copied to ${targets.length} version${targets.length === 1 ? "" : "s"}`,
          kind: "success",
        });

        run(async () => {
          if (nodeIds.length > 0) {
            await contentActions.copyOverrides({
              resumeId: s.resumeId,
              fromVersionId,
              toVersionIds: targets,
              nodeIds,
            });
          }
          for (const target of targets) {
            const clones = clonesByTarget[target];
            if (clones.length > 0) {
              await contentActions.insertLocalNodes({
                resumeId: s.resumeId,
                versionId: target,
                nodes: clones.map((n) => ({
                  id: n.id,
                  parentId: n.parentId,
                  kind: n.kind,
                  rank: n.rank,
                  data: n.data,
                })),
              });
            }
          }
        });
      },

      copyFieldTo(nodeId, field, value, toVersionIds) {
        const s = get();
        const node = s.nodes[nodeId];
        if (!node) return;
        for (const targetId of toVersionIds) {
          const target = s.versions.find((v) => v.id === targetId);
          if (!target) continue;
          if (isBase(target) || node.ownerVersionId === targetId) {
            patchNodeData(nodeId, field, value);
          } else if (node.ownerVersionId === null) {
            const existing = get().overrides[targetId]?.[nodeId];
            setOverride(targetId, nodeId, withFieldEdit(existing, targetId, nodeId, node.data, field, value));
          }
        }
        get().toast({
          message: `Value copied to ${toVersionIds.length} version${toVersionIds.length === 1 ? "" : "s"}`,
          kind: "success",
        });
        run(() =>
          contentActions.copyFieldValue({ resumeId: s.resumeId, nodeId, field, value, toVersionIds }),
        );
      },

      /* ----------------------------- design settings ---------------------------- */

      updateDesign(key, value) {
        const s = get();
        const version = activeVersion();
        if (!version) return;
        if (isBase(version)) {
          set((st) => ({ baseSettings: { ...(st.baseSettings ?? {}), [key]: value } }));
          debounced(`design:base:${key}`, () =>
            resumeActions.setResumeSettings({ resumeId: s.resumeId, patch: { [key]: value } }),
          );
        } else {
          set((st) => {
            const patch = { ...(st.settingsPatches[version.id] ?? {}), [key]: value };
            return { settingsPatches: { ...st.settingsPatches, [version.id]: patch } };
          });
          debounced(`design:${version.id}:${key}`, () =>
            versionActions.setVersionSettings({
              resumeId: s.resumeId,
              versionId: version.id,
              patch: { [key]: value },
            }),
          );
        }
      },

      resetDesignKey(key) {
        const s = get();
        const version = activeVersion();
        if (!version || isBase(version)) return;
        set((st) => {
          const patch = { ...(st.settingsPatches[version.id] ?? {}) };
          delete patch[key];
          return {
            settingsPatches: {
              ...st.settingsPatches,
              [version.id]: Object.keys(patch).length ? patch : null,
            },
          };
        });
        run(() =>
          versionActions.setVersionSettings({
            resumeId: s.resumeId,
            versionId: version.id,
            patch: { [key]: null },
          }),
        );
      },

      resetDesignAll() {
        const s = get();
        const version = activeVersion();
        if (!version || isBase(version)) return;
        const current = s.settingsPatches[version.id] ?? {};
        const keys = Object.keys(current);
        if (keys.length === 0) return;
        set((st) => ({ settingsPatches: { ...st.settingsPatches, [version.id]: null } }));
        get().toast({
          message: `Design reset — ${version.name} now follows the Default`,
          kind: "success",
          undoLabel: "Undo",
          undo: () => {
            set((st) => ({ settingsPatches: { ...st.settingsPatches, [version.id]: current } }));
            run(() =>
              versionActions.setVersionSettings({ resumeId: s.resumeId, versionId: version.id, patch: current }),
            );
          },
        });
        run(() =>
          versionActions.setVersionSettings({
            resumeId: s.resumeId,
            versionId: version.id,
            patch: Object.fromEntries(keys.map((k) => [k, null])),
          }),
        );
      },

      /* --------------------------- version management -------------------------- */

      createVersion(name, fromVersionId) {
        const s = get();
        const id = nanoid();
        const from = fromVersionId ? s.versions.find((v) => v.id === fromVersionId) : undefined;

        // Copy the source overlay (nothing when creating from the Default).
        const copiedOverrides: NodeOverride[] = [];
        if (from && !isBase(from)) {
          for (const o of Object.values(s.overrides[from.id] ?? {})) {
            copiedOverrides.push({ ...o, versionId: id });
          }
        }

        // Clone the source version's local nodes with fresh ids.
        const localClones: ResumeNode[] = [];
        if (from) {
          const locals = Object.values(s.nodes).filter((n) => n.ownerVersionId === from.id);
          const idMap = new Map(locals.map((n) => [n.id, nanoid()] as const));
          for (const n of locals) {
            localClones.push({
              ...n,
              id: idMap.get(n.id)!,
              parentId: n.parentId && idMap.has(n.parentId) ? idMap.get(n.parentId)! : n.parentId,
              ownerVersionId: id,
            });
          }
        }

        const version: Version = {
          id,
          resumeId: s.resumeId,
          name,
          isBase: 0,
          tags: from ? [...from.tags] : [],
          createdFromVersionId: from?.id ?? baseVersion().id,
          lastOpenedAt: Date.now(),
          archivedAt: null,
          deletedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const settingsPatch = from && !isBase(from) ? (s.settingsPatches[from.id] ?? null) : null;

        set((st) => {
          const nodes = { ...st.nodes };
          for (const n of localClones) nodes[n.id] = n;
          const overrides = { ...st.overrides, [id]: Object.fromEntries(copiedOverrides.map((o) => [o.nodeId, o])) };
          return {
            versions: [...st.versions, version],
            nodes,
            overrides,
            settingsPatches: { ...st.settingsPatches, [id]: settingsPatch },
          };
        });

        run(() =>
          versionActions.createVersion({
            resumeId: s.resumeId,
            id,
            name,
            fromVersionId: version.createdFromVersionId,
            tags: version.tags,
            settingsPatch,
            overrides: copiedOverrides,
            localNodes: localClones.map((n) => ({
              id: n.id,
              parentId: n.parentId,
              kind: n.kind,
              rank: n.rank,
              data: n.data,
            })),
          }),
        );
        return id;
      },

      duplicateVersion(versionId) {
        const s = get();
        const source = s.versions.find((v) => v.id === versionId);
        if (!source) return "";
        const names = new Set(s.versions.filter((v) => !v.deletedAt).map((v) => v.name));
        let name = `${source.name} (copy)`;
        for (let i = 2; names.has(name); i++) name = `${source.name} (copy ${i})`;
        const id = get().createVersion(name, versionId);
        get().toast({ message: `Duplicated as “${name}”`, kind: "success" });
        return id;
      },

      renameVersion(versionId, name) {
        const s = get();
        const trimmed = name.trim();
        if (!trimmed) return;
        set((st) => ({
          versions: st.versions.map((v) => (v.id === versionId ? { ...v, name: trimmed, updatedAt: Date.now() } : v)),
        }));
        run(() => versionActions.renameVersion({ resumeId: s.resumeId, versionId, name: trimmed }));
      },

      setVersionTags(versionId, tags) {
        const s = get();
        set((st) => ({
          versions: st.versions.map((v) => (v.id === versionId ? { ...v, tags, updatedAt: Date.now() } : v)),
        }));
        run(() => versionActions.setVersionTags({ resumeId: s.resumeId, versionId, tags }));
      },

      archiveVersion(versionId, archived) {
        const s = get();
        const version = s.versions.find((v) => v.id === versionId);
        if (!version || isBase(version)) return;
        set((st) => ({
          versions: st.versions.map((v) =>
            v.id === versionId ? { ...v, archivedAt: archived ? Date.now() : null, updatedAt: Date.now() } : v,
          ),
        }));
        if (archived && s.activeVersionId === versionId) {
          get().setActiveVersion(baseVersion().id);
        }
        if (archived) {
          get().toast({
            message: `“${version.name}” archived`,
            kind: "info",
            undoLabel: "Undo",
            undo: () => get().archiveVersion(versionId, false),
          });
        }
        run(() => versionActions.archiveVersion({ resumeId: s.resumeId, versionId, archived }));
      },

      trashVersion(versionId) {
        const s = get();
        const version = s.versions.find((v) => v.id === versionId);
        if (!version || isBase(version)) return;
        set((st) => ({
          versions: st.versions.map((v) =>
            v.id === versionId ? { ...v, deletedAt: Date.now(), updatedAt: Date.now() } : v,
          ),
        }));
        if (s.activeVersionId === versionId) {
          get().setActiveVersion(baseVersion().id);
        }
        get().toast({
          message: `“${version.name}” moved to Trash — kept for 30 days`,
          kind: "info",
          undoLabel: "Undo",
          undo: () => get().restoreTrashed(versionId),
        });
        run(() => versionActions.trashVersion({ resumeId: s.resumeId, versionId, trashed: true }));
      },

      restoreTrashed(versionId) {
        const s = get();
        set((st) => ({
          versions: st.versions.map((v) =>
            v.id === versionId ? { ...v, deletedAt: null, updatedAt: Date.now() } : v,
          ),
        }));
        run(() => versionActions.trashVersion({ resumeId: s.resumeId, versionId, trashed: false }));
      },

      hardDeleteVersion(versionId) {
        const s = get();
        const version = s.versions.find((v) => v.id === versionId);
        if (!version || isBase(version)) return;
        set((st) => {
          const nodes = Object.fromEntries(
            Object.entries(st.nodes).filter(([, n]) => n.ownerVersionId !== versionId),
          );
          const overrides = { ...st.overrides };
          delete overrides[versionId];
          const settingsPatches = { ...st.settingsPatches };
          delete settingsPatches[versionId];
          return {
            versions: st.versions.filter((v) => v.id !== versionId),
            nodes,
            overrides,
            settingsPatches,
          };
        });
        if (s.activeVersionId === versionId) {
          get().setActiveVersion(baseVersion().id);
        }
        get().toast({ message: `“${version.name}” permanently deleted`, kind: "info" });
        run(() => versionActions.hardDeleteVersion({ resumeId: s.resumeId, versionId }));
      },

      bulkVersions(versionIds, op) {
        const s = get();
        const affected = s.versions.filter((v) => versionIds.includes(v.id) && !isBase(v));
        if (affected.length === 0) return;
        const patch =
          op === "archive"
            ? { archivedAt: Date.now() }
            : op === "unarchive"
              ? { archivedAt: null }
              : op === "trash"
                ? { deletedAt: Date.now() }
                : { deletedAt: null };
        set((st) => ({
          versions: st.versions.map((v) =>
            affected.some((a) => a.id === v.id) ? { ...v, ...patch, updatedAt: Date.now() } : v,
          ),
        }));
        if (
          (op === "archive" || op === "trash") &&
          affected.some((a) => a.id === s.activeVersionId)
        ) {
          get().setActiveVersion(baseVersion().id);
        }
        get().toast({
          message: `${affected.length} version${affected.length === 1 ? "" : "s"} ${
            op === "archive" ? "archived" : op === "unarchive" ? "restored" : op === "trash" ? "moved to Trash" : "restored"
          }`,
          kind: "success",
        });
        run(() => versionActions.bulkVersionOp({ resumeId: s.resumeId, versionIds, op }));
      },

      /* -------------------------------- toasts -------------------------------- */

      toast(t) {
        const id = toastSeq++;
        set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
        setTimeout(() => get().dismissToast(id), t.undo ? 6000 : 3500);
      },

      dismissToast(id) {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      },
    };
  });
}

/* ------------------------------ kind defaults ----------------------------- */

export function kindDefaults(kind: NodeKind): NodeData {
  switch (kind) {
    case "header":
      return { fullName: "", headline: "", email: "", phone: "", location: "", website: "", summary: "" };
    case "section":
      return { title: "New section", sectionType: "experience" };
    case "experience":
      return { company: "", title: "", location: "", startDate: "", endDate: "" };
    case "education":
      return { school: "", degree: "", field: "", location: "", startDate: "", endDate: "" };
    case "project":
      return { name: "", url: "", description: "" };
    case "skillGroup":
      return { name: "" };
    case "skill":
      return { name: "" };
    case "bullet":
      return { text: "" };
    case "certification":
      return { name: "", issuer: "", date: "" };
    case "reference":
      return { name: "", title: "", company: "", email: "", phone: "" };
  }
}

/* ------------------------------ react wiring ------------------------------ */

const ResumeStoreContext = createContext<ResumeStore | null>(null);

export function ResumeStoreProvider({
  payload,
  initialVersionId,
  initialTab,
  children,
}: {
  payload: ResumePayload;
  initialVersionId: string;
  initialTab: EditorTab;
  children: React.ReactNode;
}) {
  const [store] = useState(() => createResumeStore(payload, initialVersionId, initialTab));

  // Next-driven navigations to the same segment (e.g. a Link to another
  // version) arrive as prop changes; sync them into the store without
  // reseeding data — the store is the source of truth while mounted.
  useEffect(() => {
    store.getState().syncFromUrl(initialVersionId, initialTab);
  }, [store, initialVersionId, initialTab]);

  // Browser back/forward: version and tab switches use history.pushState, so
  // popstate is where we re-sync from the URL.
  useEffect(() => {
    const onPop = () => {
      const segments = window.location.pathname.split("/").filter(Boolean);
      // /resume/[resumeId]/[versionId]/[tab?]
      if (segments[0] !== "resume" || segments[1] !== store.getState().resumeId) return;
      const { versionId, tab } = parseView(segments.slice(2));
      store.getState().syncFromUrl(versionId, tab);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [store]);

  return <ResumeStoreContext.Provider value={store}>{children}</ResumeStoreContext.Provider>;
}

export function useResumeStore<T>(selector: (s: ResumeStoreState) => T): T {
  const store = useContext(ResumeStoreContext);
  if (!store) throw new Error("useResumeStore must be used inside ResumeStoreProvider");
  return useStore(store, selector);
}

export function flattenOverrides(map: OverrideMap): NodeOverride[] {
  const out: NodeOverride[] = [];
  for (const forVersion of Object.values(map)) {
    for (const o of Object.values(forVersion)) out.push(o);
  }
  return out;
}

/** Resolved tree for a version (hidden nodes included, flagged). */
export function useResolvedTree(versionId?: string | null) {
  const nodes = useResumeStore((s) => s.nodes);
  const overrides = useResumeStore((s) => s.overrides);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const vid = versionId ?? activeVersionId;
  return useMemo(
    () =>
      resolveVersion(Object.values(nodes), flattenOverrides(overrides), vid, {
        includeHidden: true,
      }),
    [nodes, overrides, vid],
  );
}

/** Resolved tree with hidden nodes pruned — what the preview renders. */
export function useRenderTree(versionId?: string | null) {
  const nodes = useResumeStore((s) => s.nodes);
  const overrides = useResumeStore((s) => s.overrides);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const vid = versionId ?? activeVersionId;
  return useMemo(
    () => resolveVersion(Object.values(nodes), flattenOverrides(overrides), vid),
    [nodes, overrides, vid],
  );
}

/** Effective design for a version + which keys it overrides. */
export function useDesign(versionId?: string | null) {
  const baseSettings = useResumeStore((s) => s.baseSettings);
  const settingsPatches = useResumeStore((s) => s.settingsPatches);
  const versions = useResumeStore((s) => s.versions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const vid = versionId ?? activeVersionId;
  return useMemo(() => {
    const version = versions.find((v) => v.id === vid);
    const onBase = version?.isBase === 1 || version?.isBase === true;
    const patch = onBase ? null : (settingsPatches[vid] ?? null);
    return {
      design: resolveDesign(baseSettings as Partial<DesignSettings> | null, patch),
      overriddenKeys: new Set(Object.keys(patch ?? {})),
      onBase,
    };
  }, [baseSettings, settingsPatches, versions, vid]);
}

/** Count of divergences from the Default for a version (badge numbers). */
export function useCustomizationCount(versionId: string): number {
  const overrides = useResumeStore((s) => s.overrides);
  const nodes = useResumeStore((s) => s.nodes);
  return useMemo(() => {
    const rows = Object.values(overrides[versionId] ?? {}).filter(
      (o) => (o.patch && Object.keys(o.patch).length > 0) || isHiddenFlag(o.hidden) || o.rank != null,
    );
    const locals = Object.values(nodes).filter((n) => n.ownerVersionId === versionId);
    return rows.length + locals.length;
  }, [overrides, nodes, versionId]);
}
