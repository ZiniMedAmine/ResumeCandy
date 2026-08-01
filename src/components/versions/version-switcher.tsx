"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchVersionTree } from "@/app/actions/versions";
import { LayersIcon, SearchIcon } from "@/components/ui/icons";
import { fuzzyScore } from "@/lib/fuzzy";
import type { VersionTreeResume, VersionTreeVersion } from "@/lib/data";
import { useI18n } from "@/lib/i18n/provider";
import { RelativeTime } from "@/components/ui/relative-time";
import { layoutTree, type TreeInput } from "@/lib/tree-layout";
import { editorUrl } from "@/lib/view";
import { useResumeStore } from "@/store/resume-store";

/** What each drawn circle stands for. */
type NodeData =
  | { kind: "root" }
  | { kind: "resume"; resume: VersionTreeResume }
  | { kind: "version"; resume: VersionTreeResume; version: VersionTreeVersion };

const COLUMN_GAP = 116;
const ROW_GAP = 104;
const PADDING = 44;
const RADIUS = 19;

const isBaseVersion = (v: VersionTreeVersion) => v.isBase === 1 || v.isBase === true;

export function VersionSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <SwitcherInner onClose={onClose} />;
}

/**
 * The switcher, drawn as the tree it actually is.
 *
 * Versions are not a flat list: each one records the version it was branched
 * from, so "Google" descending from the Default and a tweak of Google
 * descending from that is real structure a list can only flatten away. Drawing
 * it makes lineage — and which resume a version belongs to — readable at a
 * glance, which matters once two resumes both have a version called "Google".
 */
function SwitcherInner({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const resumeId = useResumeStore((s) => s.resumeId);
  const resumeName = useResumeStore((s) => s.resumeName);
  const localVersions = useResumeStore((s) => s.versions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const setActiveVersion = useResumeStore((s) => s.setActiveVersion);
  const createVersion = useResumeStore((s) => s.createVersion);
  const tab = useResumeStore((s) => s.tab);
  const { t, fmt, dir } = useI18n();

  const [tree, setTree] = useState<VersionTreeResume[] | null>(null);
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // The current resume is already in the store, so it draws instantly; the
  // rest of the shelf fills in when the action returns.
  const seed = useMemo<VersionTreeResume[]>(
    () => [
      {
        id: resumeId,
        name: resumeName,
        updatedAt: Date.now(),
        versions: localVersions
          .filter((v) => !v.deletedAt)
          .map((v) => ({
            id: v.id,
            name: v.name,
            isBase: v.isBase,
            tags: v.tags,
            archivedAt: v.archivedAt,
            lastOpenedAt: v.lastOpenedAt,
            createdAt: v.createdAt,
            createdFromVersionId: v.createdFromVersionId,
          })),
      },
    ],
    [resumeId, resumeName, localVersions],
  );

  useEffect(() => {
    let cancelled = false;
    fetchVersionTree()
      .then((rows) => {
        if (!cancelled) setTree(rows);
      })
      .catch(() => {
        // The seed still covers the current resume, which is the common case.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The live store wins for the current resume — it may hold a version created
  // seconds ago that the server fetch predates.
  const resumes = useMemo(() => {
    const rows = tree ?? seed;
    const ordered = [
      ...rows.filter((r) => r.id === resumeId),
      ...rows.filter((r) => r.id !== resumeId),
    ];
    return ordered.map((r) => (r.id === resumeId ? { ...r, versions: seed[0].versions } : r));
  }, [tree, seed, resumeId]);

  const rtl = dir === "rtl";

  const layout = useMemo(() => {
    const root: TreeInput<NodeData> = {
      id: "__root__",
      data: { kind: "root" },
      children: resumes.map((resume) => ({
        id: `resume:${resume.id}`,
        data: { kind: "resume", resume } as NodeData,
        children: versionForest(resume),
      })),
    };
    return layoutTree([root], { columnGap: COLUMN_GAP, rowGap: ROW_GAP, padding: PADDING });
  }, [resumes]);

  // Bring the version being edited into view when the diagram is wider than
  // the dialog — the interesting node should never start off-screen.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [layout]);

  const matches = (data: NodeData): boolean => {
    const q = query.trim();
    if (!q) return true;
    if (data.kind === "root") return false;
    const text =
      data.kind === "resume"
        ? data.resume.name
        : `${data.version.name} ${data.version.tags.join(" ")}`;
    return fuzzyScore(q, text) !== null;
  };

  const open = (data: NodeData) => {
    if (data.kind === "root") return;
    if (data.kind === "resume") {
      const base = data.resume.versions.find(isBaseVersion) ?? data.resume.versions[0];
      if (!base) return;
      if (data.resume.id === resumeId) setActiveVersion(base.id);
      else router.push(editorUrl(data.resume.id, base.id, tab));
      onClose();
      return;
    }
    if (data.resume.id === resumeId) setActiveVersion(data.version.id);
    else router.push(editorUrl(data.resume.id, data.version.id, tab));
    onClose();
  };

  const currentVersions = resumes.find((r) => r.id === resumeId)?.versions ?? [];
  const trimmed = query.trim();
  const canCreate =
    trimmed !== "" && !currentVersions.some((v) => v.name.toLowerCase() === trimmed.toLowerCase());

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]">
      <div
        className="anim-fade fixed inset-0 bg-zinc-950/30 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden
      />
      <div className="anim-lift relative flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-hairline bg-surface shadow-pop">
        <div className="flex items-center gap-2.5 border-b border-hairline px-4">
          <SearchIcon className="size-4 shrink-0 text-ink-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && canCreate) {
                e.preventDefault();
                setActiveVersion(createVersion(trimmed, null));
                onClose();
              }
            }}
            placeholder={t.versions.searchPlaceholder}
            className="w-full bg-transparent py-3.5 text-[14px] text-ink outline-none placeholder:text-ink-faint"
          />
          <kbd className="shrink-0 rounded border border-hairline px-1.5 py-0.5 text-[10px] text-ink-faint">
            {t.versions.esc}
          </kbd>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-canvas/40">
          <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
            {/* An RTL interface reads the tree from the right, so the drawing
                is reflected at render — x → width − x. Mirroring here rather
                than in `layoutTree` keeps that function pure geometry, with
                its tests untouched. */}
            <svg
              className="absolute inset-0 overflow-visible"
              width={layout.width}
              height={layout.height}
              aria-hidden
            >
              {layout.edges.map((edge) => (
                <line
                  key={edge.id}
                  x1={mirror(edge.fromX, layout.width, rtl)}
                  y1={edge.fromY + RADIUS}
                  x2={mirror(edge.toX, layout.width, rtl)}
                  y2={edge.toY - RADIUS}
                  className="stroke-hairline-strong"
                  strokeWidth={1.5}
                />
              ))}
            </svg>

            {layout.nodes.map((node) => (
              <TreeNode
                key={node.id}
                x={mirror(node.x, layout.width, rtl)}
                y={node.y}
                data={node.data}
                dimmed={query.trim() !== "" && !matches(node.data)}
                hovered={hovered === node.id}
                isActive={
                  node.data.kind === "version" &&
                  node.data.resume.id === resumeId &&
                  node.data.version.id === activeVersionId
                }
                onHover={(on) => setHovered(on ? node.id : null)}
                onOpen={() => open(node.data)}
                nodeRef={
                  node.data.kind === "version" &&
                  node.data.resume.id === resumeId &&
                  node.data.version.id === activeVersionId
                    ? activeRef
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-2.5 text-[10.5px] text-ink-faint">
          <span className="flex items-center gap-3">
            <Legend className="bg-ink-faint" label={t.versions.legendDefault} />
            <Legend className="bg-emerald-400" label={t.versions.legendVersion} />
            <Legend className="bg-rose-500" label={t.versions.legendEditing} />
          </span>
          {canCreate ? (
            <button
              type="button"
              onClick={() => {
                setActiveVersion(createVersion(trimmed, null));
                onClose();
              }}
              className="pressable rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-500 transition-colors duration-150 hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              {fmt(t.versions.createNamed, { name: trimmed })}
            </button>
          ) : (
            <span>{t.versions.clickHint}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Reflects an x coordinate about the drawing's centre line. */
function mirror(x: number, width: number, rtl: boolean): number {
  return rtl ? width - x : x;
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-1.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

/**
 * One circle plus its caption. Rendered as an HTML button layered over the SVG
 * edges rather than inside it, so nodes get real focus, hover and keyboard
 * behaviour instead of hand-rolled SVG equivalents.
 */
function TreeNode({
  x,
  y,
  data,
  dimmed,
  hovered,
  isActive,
  onHover,
  onOpen,
  nodeRef,
}: {
  x: number;
  y: number;
  data: NodeData;
  dimmed: boolean;
  hovered: boolean;
  isActive: boolean;
  onHover: (on: boolean) => void;
  onOpen: () => void;
  nodeRef?: React.Ref<HTMLButtonElement>;
}) {
  const { t, fmt } = useI18n();
  const label =
    data.kind === "root"
      ? t.versions.rootLabel
      : data.kind === "resume"
        ? data.resume.name
        : data.version.name;

  const archived = data.kind === "version" && !!data.version.archivedAt;
  const base = data.kind === "version" && isBaseVersion(data.version);

  const caption =
    data.kind === "version" ? (
      archived ? (
        t.versions.archived
      ) : (
        <RelativeTime ms={data.version.lastOpenedAt ?? data.version.createdAt} />
      )
    ) : data.kind === "resume" ? (
      fmt(t.versions.versionCount, { n: data.resume.versions.length })
    ) : (
      ""
    );

  const ring = isActive
    ? "border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
    : data.kind === "root"
      ? "border-hairline-strong bg-sunken text-ink-faint"
      : data.kind === "resume"
        ? "border-ink-faint/50 bg-surface text-ink"
        : base
          ? "border-ink-faint/60 bg-surface text-ink-muted"
          : archived
            ? "border-hairline bg-surface text-ink-faint"
            : "border-emerald-400/70 bg-surface text-ink";

  return (
    <button
      ref={nodeRef}
      type="button"
      onClick={onOpen}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      disabled={data.kind === "root"}
      title={label}
      style={{ left: x, top: y }}
      className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-opacity duration-200 disabled:cursor-default ${
        dimmed ? "opacity-25" : "opacity-100"
      }`}
    >
      <span
        className={`flex items-center justify-center rounded-full border-[1.5px] text-[11px] font-bold transition-all duration-150 ${ring} ${
          hovered && data.kind !== "root" ? "scale-110 shadow-card-hover" : "shadow-card"
        }`}
        style={{ width: RADIUS * 2, height: RADIUS * 2 }}
      >
        {data.kind === "root" ? (
          <LayersIcon className="size-4" />
        ) : (
          initials(label)
        )}
      </span>
      <span
        dir="auto"
        className={`mt-1.5 max-w-[104px] truncate text-[11.5px] ${
          isActive ? "font-semibold text-ink" : data.kind === "resume" ? "font-semibold text-ink" : "text-ink-muted"
        }`}
      >
        {label}
      </span>
      {caption && <span className="text-[10px] tabular-nums text-ink-faint">{caption}</span>}
    </button>
  );
}

/** Up to two letters, so a circle stays a circle whatever the name is. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * A resume's versions as a lineage tree.
 *
 * `createdFromVersionId` gives the real parent. Anything whose parent is
 * missing, self-referential, or outside this resume is re-attached to the
 * Default so that a broken link degrades to a flat row rather than losing the
 * version from the diagram entirely.
 */
function versionForest(resume: VersionTreeResume): TreeInput<NodeData>[] {
  const byId = new Map(resume.versions.map((v) => [v.id, v]));
  const base = resume.versions.find(isBaseVersion);
  const childrenOf = new Map<string, VersionTreeVersion[]>();
  const roots: VersionTreeVersion[] = [];

  for (const version of resume.versions) {
    const parentId = version.createdFromVersionId;
    const parent =
      parentId && parentId !== version.id && byId.has(parentId)
        ? parentId
        : version.id === base?.id
          ? null
          : (base?.id ?? null);

    if (!parent) {
      roots.push(version);
      continue;
    }
    const list = childrenOf.get(parent) ?? [];
    list.push(version);
    childrenOf.set(parent, list);
  }

  const build = (version: VersionTreeVersion, seen: Set<string>): TreeInput<NodeData> => {
    seen.add(version.id);
    return {
      id: `version:${version.id}`,
      data: { kind: "version", resume, version },
      // `seen` guards against a cycle in stored lineage looping forever.
      children: (childrenOf.get(version.id) ?? [])
        .filter((child) => !seen.has(child.id))
        .map((child) => build(child, seen)),
    };
  };

  const seen = new Set<string>();
  return roots.map((r) => build(r, seen));
}
