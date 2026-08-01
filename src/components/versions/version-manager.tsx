"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import {
  ArchiveIcon,
  CopyIcon,
  DotsIcon,
  GitBranchIcon,
  PencilIcon,
  SearchIcon,
  TagIcon,
  TrashIcon,
  WarningIcon,
} from "@/components/ui/icons";
import { fuzzyScore } from "@/lib/fuzzy";
import { useI18n } from "@/lib/i18n/provider";
import { RelativeTime } from "@/components/ui/relative-time";
import { isHiddenFlag, type Version } from "@/lib/resume/types";
import { useResumeStore } from "@/store/resume-store";
import { useEditorUI } from "@/components/editor/editor-ui-context";

type Tab = "active" | "archived" | "trash";

/**
 * The table view for heavy version users: search, tags, customization
 * counts, bulk archive/delete, Trash with restore. Built to stay usable at
 * hundreds of versions.
 */
export function VersionManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <VersionManagerInner onClose={onClose} />;
}

function VersionManagerInner({ onClose }: { onClose: () => void }) {
  const versions = useResumeStore((s) => s.versions);
  const overrides = useResumeStore((s) => s.overrides);
  const nodes = useResumeStore((s) => s.nodes);
  const setActiveVersion = useResumeStore((s) => s.setActiveVersion);
  const renameVersion = useResumeStore((s) => s.renameVersion);
  const setVersionTags = useResumeStore((s) => s.setVersionTags);
  const duplicateVersion = useResumeStore((s) => s.duplicateVersion);
  const archiveVersion = useResumeStore((s) => s.archiveVersion);
  const trashVersion = useResumeStore((s) => s.trashVersion);
  const restoreTrashed = useResumeStore((s) => s.restoreTrashed);
  const hardDeleteVersion = useResumeStore((s) => s.hardDeleteVersion);
  const bulkVersions = useResumeStore((s) => s.bulkVersions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const ui = useEditorUI();
  const { t, fmt } = useI18n();

  const [tab, setTab] = useState<Tab>("active");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ id: string; field: "name" | "tags"; value: string } | null>(null);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [vid, forVersion] of Object.entries(overrides)) {
      map[vid] = Object.values(forVersion).filter(
        (o) => (o.patch && Object.keys(o.patch).length > 0) || isHiddenFlag(o.hidden) || o.rank != null,
      ).length;
    }
    for (const n of Object.values(nodes)) {
      if (n.ownerVersionId) map[n.ownerVersionId] = (map[n.ownerVersionId] ?? 0) + 1;
    }
    return map;
  }, [overrides, nodes]);

  const nameOf = (id: string | null) => versions.find((v) => v.id === id)?.name;

  const rows = useMemo(() => {
    let list: Version[];
    if (tab === "active") list = versions.filter((v) => !v.deletedAt && !v.archivedAt);
    else if (tab === "archived") list = versions.filter((v) => !v.deletedAt && v.archivedAt);
    else list = versions.filter((v) => v.deletedAt);

    if (query.trim()) {
      list = list
        .map((v) => ({ v, score: fuzzyScore(query, `${v.name} ${v.tags.join(" ")}`) }))
        .filter((r): r is { v: Version; score: number } => r.score !== null)
        .sort((a, b) => b.score - a.score)
        .map((r) => r.v);
    } else {
      list = [...list].sort((a, b) => {
        const aBase = a.isBase === 1 || a.isBase === true ? 1 : 0;
        const bBase = b.isBase === 1 || b.isBase === true ? 1 : 0;
        if (aBase !== bBase) return bBase - aBase;
        return (b.lastOpenedAt ?? b.createdAt) - (a.lastOpenedAt ?? a.createdAt);
      });
    }
    return list;
  }, [versions, tab, query]);

  const selectable = rows.filter((v) => !(v.isBase === 1 || v.isBase === true));
  const allSelected = selectable.length > 0 && selectable.every((v) => selected.has(v.id));

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "active", label: t.versions.tabActive, count: versions.filter((v) => !v.deletedAt && !v.archivedAt).length },
    { key: "archived", label: t.versions.tabArchived, count: versions.filter((v) => !v.deletedAt && v.archivedAt).length },
    { key: "trash", label: t.versions.tabTrash, count: versions.filter((v) => v.deletedAt).length },
  ];

  return (
    <Dialog open onClose={onClose} title={t.versions.managerTitle} width="max-w-3xl">
      <div className="px-5 pb-5 pt-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl bg-sunken p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setSelected(new Set());
                }}
                className={`pressable rounded-md px-3 py-1 text-[12.5px] font-medium transition-colors duration-150 ${
                  tab === t.key
                    ? "bg-surface text-ink shadow-card"
                    : "text-ink-muted hover:text-ink dark:hover:text-ink-faint"
                }`}
              >
                {t.label} <span className="tabular-nums opacity-60">{t.count}</span>
              </button>
            ))}
          </div>
          <div className="relative w-56">
            <SearchIcon className="absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.versions.managerSearch}
              className="w-full rounded-lg border border-hairline py-1.5 ps-8 pe-2 text-[12.5px] outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
            />
          </div>
        </div>

        {tab === "trash" && rows.length > 0 && (
          <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-[12px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <WarningIcon className="size-3.5 shrink-0" />
            {t.versions.trashNotice}
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-hairline">
          <table className="w-full text-start text-[13px]">
            <thead className="border-b border-hairline bg-sunken text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
              <tr>
                <th className="w-9 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(selectable.map((v) => v.id)))
                    }
                    className="size-3.5 accent-rose-600"
                  />
                </th>
                <th className="py-2 pe-3 font-medium">{t.versions.colVersion}</th>
                <th className="py-2 pe-3 font-medium">{t.versions.colTags}</th>
                <th className="py-2 pe-3 text-end font-medium">{t.versions.colCustomized}</th>
                <th className="py-2 pe-3 font-medium">{t.versions.colOpened}</th>
                <th className="w-10 py-2 pe-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[13px] text-ink-faint">
                    {tab === "trash"
                      ? t.versions.emptyTrash
                      : tab === "archived"
                        ? t.versions.emptyArchived
                        : t.versions.emptyActive}
                  </td>
                </tr>
              )}
              {rows.map((v) => {
                const base = v.isBase === 1 || v.isBase === true;
                const fromName = nameOf(v.createdFromVersionId);
                return (
                  <tr key={v.id} className="group/row bg-surface transition-colors duration-150 hover:bg-sunken/60">
                    <td className="px-3 py-2 align-middle">
                      {!base && (
                        <input
                          type="checkbox"
                          checked={selected.has(v.id)}
                          onChange={() =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(v.id)) next.delete(v.id);
                              else next.add(v.id);
                              return next;
                            })
                          }
                          className="size-3.5 accent-rose-600"
                        />
                      )}
                    </td>
                    <td className="py-2 pe-3">
                      {editing?.id === v.id && editing.field === "name" ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            renameVersion(v.id, editing.value);
                            setEditing(null);
                          }}
                        >
                          <input
                            autoFocus
                            dir="auto"
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            onBlur={() => {
                              renameVersion(v.id, editing.value);
                              setEditing(null);
                            }}
                            onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                            className="w-44 rounded border border-rose-300 px-1.5 py-0.5 text-[13px] outline-none"
                          />
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (tab === "active") {
                              setActiveVersion(v.id);
                              onClose();
                            }
                          }}
                          className="pressable text-start font-medium text-ink transition-colors duration-150 hover:text-rose-600 dark:hover:text-rose-400"
                          title={tab === "active" ? t.versions.openVersion : undefined}
                        >
                          <span dir="auto">{v.name}</span>
                          {base && (
                            <span className="ms-1.5 text-[10px] font-semibold uppercase text-ink-faint">
                              {t.versions.defaultBadge}
                            </span>
                          )}
                          {v.id === activeVersionId && (
                            <span className="ms-1.5 text-[10px] font-semibold uppercase text-emerald-500">
                              {t.versions.currentBadge}
                            </span>
                          )}
                        </button>
                      )}
                      {fromName && !base && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-faint">
                          <GitBranchIcon className="size-3" />
                          {fmt(t.versions.fromVersion, { name: fromName })}
                        </p>
                      )}
                    </td>
                    <td className="py-2 pe-3">
                      {editing?.id === v.id && editing.field === "tags" ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            setVersionTags(
                              v.id,
                              editing.value.split(",").map((t) => t.trim()).filter(Boolean),
                            );
                            setEditing(null);
                          }}
                        >
                          <input
                            autoFocus
                            value={editing.value}
                            placeholder={t.versions.tagsPlaceholder}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            onBlur={() => {
                              setVersionTags(
                                v.id,
                                editing.value.split(",").map((t) => t.trim()).filter(Boolean),
                              );
                              setEditing(null);
                            }}
                            onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                            className="w-36 rounded border border-rose-300 px-1.5 py-0.5 text-[12px] outline-none"
                          />
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditing({ id: v.id, field: "tags", value: v.tags.join(", ") })}
                          className="pressable flex flex-wrap gap-1"
                          title={t.versions.editTags}
                        >
                          {v.tags.length === 0 && (
                            <span className="text-[11px] text-ink-faint opacity-0 group-hover/row:opacity-100 dark:text-ink-muted">
                              {t.versions.addTag}
                            </span>
                          )}
                          {v.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-sunken px-2 py-0.5 text-[10.5px] text-ink-muted"
                            >
                              {t}
                            </span>
                          ))}
                        </button>
                      )}
                    </td>
                    <td className="py-2 pe-3 text-end">
                      {base ? (
                        <span className="text-[11px] text-ink-faint dark:text-ink-muted">—</span>
                      ) : (
                        <span
                          className={`tabular-nums ${counts[v.id] ? "font-medium text-amber-600 dark:text-amber-400" : "text-ink-faint dark:text-ink-muted"}`}
                        >
                          {counts[v.id] ?? 0}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pe-3 text-[12px] tabular-nums text-ink-faint">
                      {v.lastOpenedAt ? <RelativeTime ms={v.lastOpenedAt} /> : "—"}
                    </td>
                    <td className="py-2 pe-2">
                      <Menu
                        align="end"
                        trigger={
                          <button
                            type="button"
                            className="pressable rounded-lg p-1.5 text-ink-faint opacity-0 transition-all duration-150 hover:bg-sunken hover:text-ink group-hover/row:opacity-100"
                            aria-label={fmt(t.versions.optionsFor, { name: v.name })}
                          >
                            <DotsIcon className="size-4" />
                          </button>
                        }
                      >
                        {tab === "trash" ? (
                          <>
                            <MenuItem icon={<ArchiveIcon />} onSelect={() => restoreTrashed(v.id)}>
                              {t.common.restore}
                            </MenuItem>
                            <MenuItem
                              danger
                              icon={<TrashIcon />}
                              onSelect={() =>
                                ui.confirm({
                                  title: fmt(t.versions.deleteForeverTitle, { name: v.name }),
                                  body: t.versions.deleteForeverBody,
                                  confirmLabel: t.versions.deleteForever,
                                  danger: true,
                                  onConfirm: () => hardDeleteVersion(v.id),
                                })
                              }
                            >
                              {t.versions.deleteForever}
                            </MenuItem>
                          </>
                        ) : (
                          <>
                            {!base && (
                              <MenuItem
                                icon={<PencilIcon />}
                                onSelect={() => setEditing({ id: v.id, field: "name", value: v.name })}
                              >
                                {t.common.rename}
                              </MenuItem>
                            )}
                            <MenuItem
                              icon={<TagIcon />}
                              onSelect={() => setEditing({ id: v.id, field: "tags", value: v.tags.join(", ") })}
                            >
                              {t.versions.editTags}
                            </MenuItem>
                            <MenuItem icon={<CopyIcon />} onSelect={() => duplicateVersion(v.id)}>
                              {t.common.duplicate}
                            </MenuItem>
                            {!base && (
                              <>
                                <MenuSeparator />
                                {tab === "archived" ? (
                                  <MenuItem icon={<ArchiveIcon />} onSelect={() => archiveVersion(v.id, false)}>
                                    {t.versions.restoreFromArchive}
                                  </MenuItem>
                                ) : (
                                  <MenuItem icon={<ArchiveIcon />} onSelect={() => archiveVersion(v.id, true)}>
                                    {t.common.archive}
                                  </MenuItem>
                                )}
                                <MenuItem danger icon={<TrashIcon />} onSelect={() => trashVersion(v.id)}>
                                  {t.versions.moveToTrash}
                                </MenuItem>
                              </>
                            )}
                          </>
                        )}
                      </Menu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selected.size > 0 && (
          <div className="mt-3.5 flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-2.5 text-white shadow-card dark:bg-zinc-800">
            <span className="text-[12.5px] font-medium">
              {fmt(t.versions.selectedCount, { n: selected.size })}
            </span>
            <div className="flex gap-1.5">
              {tab === "active" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      bulkVersions([...selected], "archive");
                      setSelected(new Set());
                    }}
                    className="pressable rounded-lg bg-white/10 px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 hover:bg-white/20"
                  >
                    {t.common.archive}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      bulkVersions([...selected], "trash");
                      setSelected(new Set());
                    }}
                    className="pressable rounded-lg bg-red-500/80 px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 hover:bg-red-500"
                  >
                    {t.versions.moveToTrash}
                  </button>
                </>
              )}
              {tab === "archived" && (
                <button
                  type="button"
                  onClick={() => {
                    bulkVersions([...selected], "unarchive");
                    setSelected(new Set());
                  }}
                  className="pressable rounded-lg bg-white/10 px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 hover:bg-white/20"
                >
                  {t.common.restore}
                </button>
              )}
              {tab === "trash" && (
                <button
                  type="button"
                  onClick={() => {
                    bulkVersions([...selected], "restore");
                    setSelected(new Set());
                  }}
                  className="pressable rounded-lg bg-white/10 px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 hover:bg-white/20"
                >
                  {t.common.restore}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
