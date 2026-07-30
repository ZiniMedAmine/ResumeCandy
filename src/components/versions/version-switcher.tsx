"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import { fuzzyScore } from "@/lib/fuzzy";
import { relativeTime } from "@/lib/relative-time";
import type { Version } from "@/lib/resume/types";
import { useResumeStore } from "@/store/resume-store";

interface Row {
  kind: "version" | "create";
  version?: Version;
  label: string;
  hint?: string;
  archived?: boolean;
}

/**
 * The Cmd+K palette: fuzzy search across names and tags, recents first,
 * instant switch on Enter. Creating a missing version is one keystroke away —
 * the workflow for "new company, new tailored version" is type → Enter.
 */
export function VersionSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <SwitcherInner onClose={onClose} />;
}

function SwitcherInner({ onClose }: { onClose: () => void }) {
  const versions = useResumeStore((s) => s.versions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const setActiveVersion = useResumeStore((s) => s.setActiveVersion);
  const createVersion = useResumeStore((s) => s.createVersion);

  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo<Row[]>(() => {
    const live = versions.filter((v) => !v.deletedAt);
    const searchable = live.map((v) => ({
      v,
      text: `${v.name} ${v.tags.join(" ")}`,
    }));

    let matched: { v: Version; score: number }[];
    if (query.trim()) {
      matched = searchable
        .map(({ v, text }) => ({ v, score: fuzzyScore(query, text) }))
        .filter((r): r is { v: Version; score: number } => r.score !== null)
        .sort((a, b) => b.score - a.score);
    } else {
      matched = searchable
        .map(({ v }) => ({ v, score: 0 }))
        .sort((a, b) => {
          const aBase = a.v.isBase === 1 || a.v.isBase === true ? 1 : 0;
          const bBase = b.v.isBase === 1 || b.v.isBase === true ? 1 : 0;
          if (aBase !== bBase) return bBase - aBase;
          if (!!a.v.archivedAt !== !!b.v.archivedAt) return a.v.archivedAt ? 1 : -1;
          return (b.v.lastOpenedAt ?? b.v.createdAt) - (a.v.lastOpenedAt ?? a.v.createdAt);
        });
    }

    const out: Row[] = matched.map(({ v }) => ({
      kind: "version",
      version: v,
      label: v.name,
      hint: v.archivedAt ? "archived" : relativeTime(v.lastOpenedAt ?? v.createdAt),
      archived: !!v.archivedAt,
    }));

    const q = query.trim();
    if (q && !live.some((v) => v.name.toLowerCase() === q.toLowerCase())) {
      out.push({ kind: "create", label: q });
    }
    return out;
  }, [versions, query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${index}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const choose = (row: Row) => {
    if (row.kind === "create") {
      const id = createVersion(row.label, null);
      setActiveVersion(id);
    } else if (row.version) {
      setActiveVersion(row.version.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[14vh]">
      <div className="fixed inset-0 bg-zinc-950/30 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-hairline bg-surface shadow-pop">
        <div className="flex items-center gap-2.5 border-b border-hairline px-4">
          <SearchIcon className="size-4 shrink-0 text-ink-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, rows.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && rows[index]) {
                e.preventDefault();
                choose(rows[index]);
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
            placeholder="Switch version, search by name or tag…"
            className="w-full bg-transparent py-3.5 text-[14px] text-ink outline-none placeholder:text-ink-faint"
          />
          <kbd className="shrink-0 rounded border border-hairline px-1.5 py-0.5 text-[10px] text-ink-faint">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-1.5">
          {rows.length === 0 && (
            <p className="px-3 py-6 text-center text-[13px] text-ink-faint">No versions match.</p>
          )}
          {rows.map((row, i) => {
            const isActiveRow = row.kind === "version" && row.version?.id === activeVersionId;
            const isBase = row.version && (row.version.isBase === 1 || row.version.isBase === true);
            return (
              <button
                key={row.kind === "version" ? row.version!.id : "__create__"}
                type="button"
                data-index={i}
                onMouseEnter={() => setIndex(i)}
                onClick={() => choose(row)}
                className={`pressable flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors duration-100 ${
                  i === index ? "bg-rose-50 dark:bg-rose-950/50" : ""
                }`}
              >
                {row.kind === "create" ? (
                  <>
                    <span className="flex size-5 items-center justify-center rounded-md bg-rose-100 text-rose-600 dark:bg-rose-900">
                      <PlusIcon className="size-3.5" />
                    </span>
                    <span className="flex-1 text-[13.5px] text-ink">
                      Create version <strong>“{row.label}”</strong>
                    </span>
                    <kbd className="rounded border border-hairline px-1.5 py-0.5 text-[10px] text-ink-faint">
                      ↵
                    </kbd>
                  </>
                ) : (
                  <>
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${
                        isBase ? "bg-ink-faint" : row.archived ? "bg-ink-faint/40" : "bg-emerald-400"
                      }`}
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-[13.5px] font-medium ${
                        row.archived ? "text-ink-faint" : "text-ink"
                      }`}
                    >
                      {row.label}
                      {isBase && <span className="ml-1.5 text-[10.5px] font-semibold uppercase text-ink-faint">default</span>}
                      {isActiveRow && <span className="ml-1.5 text-[10.5px] font-semibold uppercase text-emerald-500">current</span>}
                    </span>
                    {row.version!.tags.map((t) => (
                      <span
                        key={t}
                        className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[10.5px] text-ink-muted"
                      >
                        {t}
                      </span>
                    ))}
                    <span className="shrink-0 text-[11px] tabular-nums text-ink-faint">{row.hint}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-hairline px-4 py-2.5 text-[10.5px] text-ink-faint">
          <span><kbd className="font-sans">↑↓</kbd> navigate</span>
          <span><kbd className="font-sans">↵</kbd> switch</span>
          <span>type a new name to create</span>
        </div>
      </div>
    </div>
  );
}
