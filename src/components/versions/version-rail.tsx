"use client";

import { useState } from "react";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import {
  ArchiveIcon,
  ChevronRightIcon,
  CopyIcon,
  DotsIcon,
  GitBranchIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UndoIcon,
} from "@/components/ui/icons";
import { isHiddenFlag, type Version } from "@/lib/resume/types";
import { useResumeStore } from "@/store/resume-store";
import { useEditorUI } from "@/components/editor/editor-ui-context";

function useCustomizationCounts(): Record<string, number> {
  const overrides = useResumeStore((s) => s.overrides);
  const nodes = useResumeStore((s) => s.nodes);
  const counts: Record<string, number> = {};
  for (const [vid, forVersion] of Object.entries(overrides)) {
    counts[vid] = Object.values(forVersion).filter(
      (o) => (o.patch && Object.keys(o.patch).length > 0) || isHiddenFlag(o.hidden) || o.rank != null,
    ).length;
  }
  for (const n of Object.values(nodes)) {
    if (n.ownerVersionId) counts[n.ownerVersionId] = (counts[n.ownerVersionId] ?? 0) + 1;
  }
  return counts;
}

function RailItem({
  version,
  active,
  count,
  onRename,
}: {
  version: Version;
  active: boolean;
  count: number;
  onRename: () => void;
}) {
  const setActiveVersion = useResumeStore((s) => s.setActiveVersion);
  const duplicateVersion = useResumeStore((s) => s.duplicateVersion);
  const archiveVersion = useResumeStore((s) => s.archiveVersion);
  const trashVersion = useResumeStore((s) => s.trashVersion);
  const resetScope = useResumeStore((s) => s.resetScope);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const ui = useEditorUI();
  const isBase = version.isBase === 1 || version.isBase === true;

  return (
    <div
      className={`group/rail relative flex items-center rounded-xl transition-colors duration-150 ${
        active ? "bg-surface shadow-card" : "hover:bg-surface/70"
      }`}
    >
      <button
        type="button"
        onClick={() => setActiveVersion(version.id)}
        className="pressable flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left"
        title={version.name}
      >
        <span
          className={`size-1.5 shrink-0 rounded-full ${
            active ? "bg-rose-500" : count > 0 ? "bg-amber-400" : "bg-ink-faint/40"
          }`}
        />
        <span
          className={`min-w-0 flex-1 truncate text-[13px] ${
            active ? "font-semibold text-ink" : "font-medium text-ink-muted"
          }`}
        >
          {version.name}
        </span>
        {!isBase && count > 0 && (
          <span
            className="shrink-0 rounded-full bg-amber-50 px-1.5 text-[10.5px] font-semibold tabular-nums text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
            title={`${count} customization${count === 1 ? "" : "s"}`}
          >
            {count}
          </span>
        )}
      </button>
      <div className="pr-1.5 opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100">
        <Menu
          align="start"
          trigger={
            <button
              type="button"
              className="pressable rounded-lg p-1 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
              aria-label={`Options for ${version.name}`}
            >
              <DotsIcon className="size-4" />
            </button>
          }
        >
          {!isBase && (
            <MenuItem icon={<PencilIcon />} onSelect={onRename}>
              Rename
            </MenuItem>
          )}
          <MenuItem icon={<CopyIcon />} onSelect={() => duplicateVersion(version.id)}>
            Duplicate
          </MenuItem>
          <MenuItem icon={<GitBranchIcon />} onSelect={() => ui.openNewVersion(version.id)}>
            New version from this…
          </MenuItem>
          {!isBase && (
            <>
              <MenuSeparator />
              <MenuItem
                icon={<UndoIcon />}
                onSelect={() =>
                  ui.confirm({
                    title: `Reset “${version.name}”?`,
                    body: "All customizations in this version will be removed and it will match the Default exactly. You can undo right after.",
                    confirmLabel: "Reset version",
                    onConfirm: () => {
                      if (version.id !== activeVersionId) setActiveVersion(version.id);
                      // resetScope acts on the active version; switching first keeps it honest.
                      setTimeout(() => resetScope(null), 0);
                    },
                  })
                }
              >
                Reset to Default
              </MenuItem>
              <MenuItem icon={<ArchiveIcon />} onSelect={() => archiveVersion(version.id, true)}>
                Archive
              </MenuItem>
              <MenuItem danger icon={<TrashIcon />} onSelect={() => trashVersion(version.id)}>
                Delete
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
    </div>
  );
}

export function VersionRail() {
  const versions = useResumeStore((s) => s.versions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const renameVersion = useResumeStore((s) => s.renameVersion);
  const archiveVersion = useResumeStore((s) => s.archiveVersion);
  const ui = useEditorUI();
  const counts = useCustomizationCounts();
  const [showArchived, setShowArchived] = useState(false);
  const [renaming, setRenaming] = useState<Version | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const live = versions.filter((v) => !v.deletedAt && !v.archivedAt);
  const base = live.find((v) => v.isBase === 1 || v.isBase === true);
  const named = live
    .filter((v) => v !== base)
    .sort((a, b) => (b.lastOpenedAt ?? b.createdAt) - (a.lastOpenedAt ?? a.createdAt));
  const archived = versions.filter((v) => !v.deletedAt && v.archivedAt);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-hairline bg-canvas">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
          Versions <span className="tabular-nums">({live.length})</span>
        </span>
        <button
          type="button"
          onClick={() => ui.openNewVersion(null)}
          className="pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-rose-500"
          title="New version"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2.5 pb-4">
        {base && (
          <RailItem version={base} active={base.id === activeVersionId} count={0} onRename={() => {}} />
        )}
        {named.length > 0 && <div className="mx-3 my-2 h-px bg-hairline" />}
        {named.map((v) => (
          <RailItem
            key={v.id}
            version={v}
            active={v.id === activeVersionId}
            count={counts[v.id] ?? 0}
            onRename={() => {
              setRenaming(v);
              setRenameValue(v.name);
            }}
          />
        ))}

        {archived.length > 0 && (
          <div className="pt-3">
            <button
              type="button"
              onClick={() => setShowArchived((s) => !s)}
              className="pressable flex w-full items-center gap-1.5 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint transition-colors duration-150 hover:text-ink-muted"
            >
              <ChevronRightIcon
                className={`size-3 transition-transform duration-200 ${showArchived ? "rotate-90" : ""}`}
              />
              Archived ({archived.length})
            </button>
            {showArchived &&
              archived.map((v) => (
                <div
                  key={v.id}
                  className="group/rail flex items-center rounded-xl px-3 py-2 transition-colors duration-150 hover:bg-surface/70"
                >
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink-faint">{v.name}</span>
                  <button
                    type="button"
                    onClick={() => archiveVersion(v.id, false)}
                    className="pressable shrink-0 rounded-lg px-2 py-0.5 text-[11.5px] font-medium text-rose-500 opacity-0 transition-opacity duration-150 hover:bg-rose-50 group-hover/rail:opacity-100 dark:hover:bg-rose-500/10"
                  >
                    Restore
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {renaming && (
        <div className="border-t border-hairline bg-surface p-3">
          <p className="mb-1.5 text-[11px] text-ink-faint">Rename “{renaming.name}”</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              renameVersion(renaming.id, renameValue);
              setRenaming(null);
            }}
            className="flex gap-1.5"
          >
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setRenaming(null)}
              className="w-full rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none transition-colors duration-150 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
            />
            <button
              type="submit"
              className="pressable shrink-0 rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-medium text-canvas transition-opacity duration-150 hover:opacity-90"
            >
              Save
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
