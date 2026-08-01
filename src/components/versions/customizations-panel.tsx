"use client";

import { useMemo, useState } from "react";
import {
  ChevronRightIcon,
  CopyIcon,
  EyeOffIcon,
  GripIcon,
  PencilIcon,
  SparkleIcon,
  UndoIcon,
  UploadIcon,
  XIcon,
} from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/provider";
import type { Dictionary } from "@/lib/i18n";
import {
  fieldLabel,
  isHiddenFlag,
  nodeLabel,
  type ResolvedTree,
} from "@/lib/resume/types";
import { sectionTitleOf } from "@/lib/resume/resolve";
import { useResolvedTree, useResumeStore } from "@/store/resume-store";
import { useEditorUI } from "@/components/editor/editor-ui-context";

interface Row {
  nodeId: string;
  label: string;
  section: string;
  kindIcon: "edit" | "hidden" | "moved" | "local";
  fields: { field: string; before: string; after: string }[];
  hidden: boolean;
  moved: boolean;
  local: boolean;
}

function buildRows(
  activeTree: ResolvedTree,
  baseTree: ResolvedTree,
  overridesForVersion: Record<string, { patch: Record<string, unknown> | null; hidden: unknown; rank: string | null }>,
  localRoots: { id: string }[],
  kinds: Dictionary["kind"],
): Row[] {
  const rows: Row[] = [];

  for (const [nodeId, o] of Object.entries(overridesForVersion)) {
    const active = activeTree.byId.get(nodeId);
    const base = baseTree.byId.get(nodeId);
    const source = active ?? base;
    if (!source) continue;
    const fields = Object.keys(o.patch ?? {}).map((field) => ({
      field,
      before: typeof base?.data[field] === "string" ? (base.data[field] as string) : JSON.stringify(base?.data[field] ?? ""),
      after:
        typeof source.data[field] === "string" ? (source.data[field] as string) : JSON.stringify(source.data[field] ?? ""),
    }));
    const hidden = isHiddenFlag(o.hidden as never);
    const moved = o.rank != null;
    if (fields.length === 0 && !hidden && !moved) continue;
    rows.push({
      nodeId,
      label: nodeLabel(source.kind, source.data, kinds),
      section: sectionTitleOf(active ? activeTree : baseTree, nodeId),
      kindIcon: fields.length > 0 ? "edit" : hidden ? "hidden" : "moved",
      fields,
      hidden,
      moved,
      local: false,
    });
  }

  for (const { id } of localRoots) {
    const node = activeTree.byId.get(id);
    if (!node) continue;
    rows.push({
      nodeId: id,
      label: nodeLabel(node.kind, node.data, kinds),
      section: sectionTitleOf(activeTree, id),
      kindIcon: "local",
      fields: [],
      hidden: false,
      moved: false,
      local: true,
    });
  }

  rows.sort((a, b) => a.section.localeCompare(b.section) || a.label.localeCompare(b.label));
  return rows;
}

const ROW_ICON = {
  edit: <PencilIcon className="size-3.5 text-amber-500" />,
  hidden: <EyeOffIcon className="size-3.5 text-ink-faint" />,
  moved: <GripIcon className="size-3.5 text-sky-500" />,
  local: <SparkleIcon className="size-3.5 text-violet-500" />,
};

/**
 * "See what differs": the version's stored overlay rendered as a checklist —
 * every row is one divergence from the Default, resettable in place.
 */
export function CustomizationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const versions = useResumeStore((s) => s.versions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const overrides = useResumeStore((s) => s.overrides);
  const nodes = useResumeStore((s) => s.nodes);
  const resetNode = useResumeStore((s) => s.resetNode);
  const resetField = useResumeStore((s) => s.resetField);
  const resetScope = useResumeStore((s) => s.resetScope);
  const pushFieldToBase = useResumeStore((s) => s.pushFieldToBase);
  const promoteLocalNode = useResumeStore((s) => s.promoteLocalNode);
  const deleteNodeHard = useResumeStore((s) => s.deleteNodeHard);
  const setHidden = useResumeStore((s) => s.setHidden);
  const ui = useEditorUI();
  const { t, fmt } = useI18n();

  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const onBase = activeVersion?.isBase === 1 || activeVersion?.isBase === true;
  const base = versions.find((v) => v.isBase === 1 || v.isBase === true);

  const activeTree = useResolvedTree(activeVersionId);
  const baseTree = useResolvedTree(base?.id ?? activeVersionId);
  const [expanded, setExpanded] = useState<string | null>(null);

  const forVersion = useMemo(() => overrides[activeVersionId] ?? {}, [overrides, activeVersionId]);
  const localRoots = useMemo(
    () =>
      Object.values(nodes).filter(
        (n) =>
          n.ownerVersionId === activeVersionId &&
          (!n.parentId || nodes[n.parentId]?.ownerVersionId !== activeVersionId),
      ),
    [nodes, activeVersionId],
  );

  const rows = useMemo(
    () => buildRows(activeTree, baseTree, forVersion, localRoots, t.kind),
    [activeTree, baseTree, forVersion, localRoots, t.kind],
  );

  if (!open) return null;

  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const list = grouped.get(row.section) ?? [];
    list.push(row);
    grouped.set(row.section, list);
  }

  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-s border-hairline bg-surface">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <div>
          <h3 className="text-[13.5px] font-semibold text-ink">
            {onBase ? t.customizations.hiddenInDefaultTitle : t.customizations.title}
          </h3>
          <p className="text-[11.5px] text-ink-faint">
            {onBase
              ? t.customizations.excludedFromDefault
              : fmt(t.customizations.differenceCount, { n: rows.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
          aria-label={t.customizations.closePanel}
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {rows.length === 0 && (
          <div className="mt-10 px-4 text-center">
            <p className="text-[13px] font-medium text-ink-muted">
              {onBase ? t.customizations.nothingHidden : t.customizations.identical}
            </p>
            {!onBase && (
              <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">
                {t.customizations.identicalHint}
              </p>
            )}
          </div>
        )}

        {[...grouped.entries()].map(([section, sectionRows]) => (
          <div key={section} className="mb-3">
            <p
              dir="auto"
              className="mb-1 px-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint"
            >
              {section || t.customizations.resumeGroup}
            </p>
            <div className="space-y-1">
              {sectionRows.map((row) => (
                <div
                  key={row.nodeId}
                  className="rounded-xl border border-hairline bg-canvas/50"
                >
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <span className="shrink-0">{ROW_ICON[row.kindIcon]}</span>
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === row.nodeId ? null : row.nodeId)}
                      className="pressable flex min-w-0 flex-1 items-center gap-1 text-start"
                    >
                      <span dir="auto" className="min-w-0 truncate text-[12.5px] font-medium text-ink">
                        {row.label}
                      </span>
                      {row.fields.length > 0 && (
                        <ChevronRightIcon
                          className={`size-3 shrink-0 text-ink-faint transition-transform rtl:-scale-x-100 ${expanded === row.nodeId ? "rotate-90" : ""}`}
                        />
                      )}
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      {row.local ? (
                        <>
                          <button
                            type="button"
                            title={t.customizations.addToDefault}
                            onClick={() => promoteLocalNode(row.nodeId)}
                            className="pressable rounded-md p-1 text-ink-faint transition-colors duration-150 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                          >
                            <UploadIcon className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            title={t.customizations.removeFromVersion}
                            onClick={() => deleteNodeHard(row.nodeId)}
                            className="pressable rounded-md p-1 text-ink-faint transition-colors duration-150 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                          >
                            <XIcon className="size-3.5" />
                          </button>
                        </>
                      ) : row.kindIcon === "hidden" && onBase ? (
                        <button
                          type="button"
                          title={t.customizations.showInDefault}
                          onClick={() => setHidden(row.nodeId, false)}
                          className="pressable rounded-md px-1.5 py-0.5 text-[11px] font-medium text-rose-600 transition-colors duration-150 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950"
                        >
                          {t.common.show}
                        </button>
                      ) : (
                        <button
                          type="button"
                          title={t.customizations.resetItem}
                          onClick={() => resetNode(row.nodeId)}
                          className="pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
                        >
                          <UndoIcon className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 px-2.5 pb-2">
                    {row.hidden && !onBase && (
                      <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                        {t.customizations.hiddenHere}
                      </span>
                    )}
                    {row.moved && (
                      <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:bg-sky-950 dark:text-sky-300">
                        {t.customizations.reordered}
                      </span>
                    )}
                    {row.local && (
                      <span className="rounded-full bg-violet-100/80 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                        {t.customizations.onlyInThisVersion}
                      </span>
                    )}
                    {row.fields.map((f) => (
                      <span
                        key={f.field}
                        className="rounded-full bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      >
                        {fieldLabel(f.field, t.field)}
                      </span>
                    ))}
                  </div>

                  {expanded === row.nodeId && row.fields.length > 0 && (
                    <div className="space-y-2 border-t border-hairline px-3 py-2.5">
                      {row.fields.map((f) => (
                        <div key={f.field} className="text-[11.5px]">
                          <div className="mb-0.5 flex items-center justify-between">
                            <span className="font-medium text-ink-muted">
                              {fieldLabel(f.field, t.field)}
                            </span>
                            <span className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => resetField(row.nodeId, f.field)}
                                className="pressable rounded-md px-1.5 py-0.5 text-[10.5px] font-medium text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
                              >
                                {t.common.reset}
                              </button>
                              <button
                                type="button"
                                onClick={() => pushFieldToBase(row.nodeId, f.field)}
                                className="pressable rounded px-1 py-0.5 text-[10.5px] font-medium text-rose-500 transition-colors duration-150 hover:bg-rose-50 dark:hover:bg-rose-950"
                              >
                                {t.provenance.pushToDefault}
                              </button>
                            </span>
                          </div>
                          <p
                            dir="auto"
                            className="rounded bg-red-50 px-1.5 py-1 text-red-700/80 line-through decoration-red-300 dark:bg-red-950/30 dark:text-red-300/70"
                          >
                            {f.before || <em className="opacity-60">{t.common.empty}</em>}
                          </p>
                          <p
                            dir="auto"
                            className="mt-0.5 rounded bg-emerald-50 px-1.5 py-1 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                          >
                            {f.after || <em className="opacity-60">{t.common.empty}</em>}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!onBase && rows.length > 0 && (
        <div className="flex gap-2 border-t border-hairline p-4">
          <button
            type="button"
            onClick={() => ui.openCopyCustomizations()}
            className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-hairline py-1.5 text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:bg-sunken "
          >
            <CopyIcon className="size-3.5" />
            {t.customizations.copyToVersions}
          </button>
          <button
            type="button"
            onClick={() =>
              ui.confirm({
                title: fmt(t.customizations.resetVersionTitle, { name: activeVersion?.name ?? "" }),
                body: t.customizations.resetVersionBody,
                confirmLabel: t.customizations.resetVersionConfirm,
                onConfirm: () => resetScope(null),
              })
            }
            className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 py-1.5 text-[12.5px] font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <UndoIcon className="size-3.5" />
            {t.customizations.resetAll}
          </button>
        </div>
      )}
    </aside>
  );
}
