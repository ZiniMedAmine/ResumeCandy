"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACCENT_PRESETS,
  ACCENT_TARGETS,
  COLUMN_OPTIONS,
  DATE_FORMAT_OPTIONS,
  DATE_POSITION_OPTIONS,
  FONTS,
  HEADER_ALIGN_OPTIONS,
  HEADER_DETAILS_OPTIONS,
  HEADER_SEPARATOR_OPTIONS,
  HEADING_CASE_OPTIONS,
  HEADING_ICON_OPTIONS,
  HEADING_STYLE_OPTIONS,
  PAGE_FORMATS,
  PAGE_FORMAT_OPTIONS,
  RANGES,
  SUBTITLE_OPTIONS,
  TEMPLATES,
  fontStack,
  type DesignSettings,
  type FontId,
} from "@/lib/design";
import {
  CheckIcon,
  FileIcon,
  GripIcon,
  LayersIcon,
  LinkIcon,
  MarginsIcon,
  PaletteIcon,
  SpacingIcon,
  TemplateIcon,
  TypeIcon,
  UndoIcon,
  UserIcon,
} from "@/components/ui/icons";
import { Lines, OptionCards, TwoUp } from "@/components/ui/option-cards";
import { Segmented } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { Toggle } from "@/components/ui/toggle";
import { dragClasses, useDragReorder } from "@/components/editor/use-drag-reorder";
import { sectionColumn } from "@/components/preview/shared";
import { enterDelay } from "@/lib/motion";
import type { SectionColumn } from "@/lib/design";
import type { ResolvedNode } from "@/lib/resume/types";
import { useDesign, useResolvedTree, useResumeStore } from "@/store/resume-store";

/* --------------------------------- groups ---------------------------------- */

const GROUPS = [
  { id: "document", label: "Document", icon: FileIcon },
  { id: "templates", label: "Templates", icon: TemplateIcon },
  { id: "layout", label: "Layout", icon: LayersIcon },
  { id: "fontsize", label: "Font Size", icon: TypeIcon },
  { id: "spacing", label: "Spacing", icon: SpacingIcon },
  { id: "entries", label: "Entries", icon: MarginsIcon },
  { id: "headings", label: "Headings", icon: TypeIcon },
  { id: "font", label: "Font", icon: TypeIcon },
  { id: "colors", label: "Colors", icon: PaletteIcon },
  { id: "header", label: "Header", icon: UserIcon },
  { id: "links", label: "Links", icon: LinkIcon },
  { id: "footer", label: "Footer", icon: FileIcon },
] as const;

type GroupId = (typeof GROUPS)[number]["id"];

/** Card container for a group of related design controls. */
function Group({
  id,
  title,
  icon,
  children,
  index,
}: {
  id: GroupId;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  index: number;
}) {
  return (
    <section
      id={`customize-${id}`}
      data-group={id}
      className="anim-rise scroll-mt-4 rounded-2xl bg-surface p-5 shadow-card"
      style={enterDelay(index)}
    >
      <h3 className="mb-4 flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-ink">
        <span className="flex size-8 items-center justify-center rounded-xl bg-sunken text-ink-muted [&>svg]:size-4">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/* -------------------------------- override --------------------------------- */

/** The amber "customized in this version" marker, click to follow Default. */
function ResetDot({ show, onReset }: { show: boolean; onReset: () => void }) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onReset}
      className="pressable flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 transition-colors duration-150 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
      title="Customized in this version — click to follow the Default again"
    >
      <span className="size-1.5 rounded-full bg-amber-400" />
      Reset
    </button>
  );
}

/** Label + optional reset marker above a control. */
function RowLabel({ label, trailing }: { label: string; trailing?: React.ReactNode }) {
  return (
    <div className="mb-2 flex h-4 items-center justify-between gap-2">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
        {label}
      </span>
      {trailing}
    </div>
  );
}

/* ------------------------------ template thumbs ---------------------------- */

/** Miniature page thumbnails for the template picker, drawn in CSS. */
function TemplateThumb({ id }: { id: DesignSettings["template"] }) {
  if (id === "classic") {
    return (
      <div className="flex h-full w-full flex-col items-center gap-[5px] bg-white p-3.5">
        <div className="h-[6px] w-16 rounded-sm bg-zinc-700" />
        <div className="h-[3px] w-10 rounded-sm bg-rose-300" />
        <div className="mt-1 h-[3px] w-full border-b border-zinc-400" />
        <div className="h-[3px] w-full rounded-sm bg-zinc-200" />
        <div className="h-[3px] w-4/5 self-start rounded-sm bg-zinc-200" />
        <div className="mt-1 h-[3px] w-full border-b border-zinc-400" />
        <div className="h-[3px] w-full rounded-sm bg-zinc-200" />
        <div className="h-[3px] w-3/5 self-start rounded-sm bg-zinc-200" />
      </div>
    );
  }
  return (
    <div className="flex h-full w-full flex-col gap-[5px] bg-white p-3.5">
      <div className="h-[6px] w-14 rounded-sm bg-zinc-700" />
      <div className="h-[3px] w-9 rounded-sm bg-rose-400" />
      <div className="h-[2px] w-8 rounded-sm bg-rose-400" />
      <div className="mt-1 flex flex-1 gap-2">
        <div className="flex flex-[1.8] flex-col gap-[4px]">
          <div className="h-[3px] w-full rounded-sm bg-zinc-200" />
          <div className="h-[3px] w-4/5 rounded-sm bg-zinc-200" />
          <div className="h-[3px] w-full rounded-sm bg-zinc-200" />
          <div className="h-[3px] w-3/5 rounded-sm bg-zinc-200" />
        </div>
        <div className="flex flex-1 flex-col gap-[4px] border-l border-zinc-200 pl-2">
          <div className="h-[3px] w-full rounded-sm bg-zinc-300" />
          <div className="h-[3px] w-4/5 rounded-sm bg-zinc-300" />
          <div className="h-[3px] w-full rounded-sm bg-zinc-300" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ heading preview ---------------------------- */

/** A one-line sketch of each heading style, for the picker. */
function HeadingPreview({ style }: { style: string }) {
  const base = "block h-[3px] w-9 rounded-full bg-current opacity-70";
  switch (style) {
    case "underline":
      return (
        <span className="flex flex-col items-center gap-[3px]">
          <span className={base} />
          <span className="block h-[1.5px] w-12 rounded-full bg-current" />
        </span>
      );
    case "double":
      return (
        <span className="flex flex-col items-center gap-[3px]">
          <span className="block h-[1.5px] w-12 rounded-full bg-current" />
          <span className={base} />
          <span className="block h-[1.5px] w-12 rounded-full bg-current" />
        </span>
      );
    case "box":
      return (
        <span className="flex items-center justify-center rounded-[3px] border border-current px-2 py-1">
          <span className={base} />
        </span>
      );
    case "bar":
      return (
        <span className="flex items-center gap-1.5">
          <span className="block h-3.5 w-[3px] rounded-full bg-current" />
          <span className={base} />
        </span>
      );
    case "background":
      return (
        <span className="flex items-center justify-center rounded-[3px] bg-current px-2.5 py-1.5">
          <span className="block h-[3px] w-9 rounded-full bg-white/80" />
        </span>
      );
    default:
      return <span className={base} />;
  }
}

/* ------------------------------ section layout ----------------------------- */

const COLUMN_LABEL: Record<SectionColumn, string> = {
  main: "Main",
  side: "Side",
  full: "Full",
};

/**
 * The section list from FlowCV's Layout group: drag to reorder, click the pill
 * to move a section between columns. Both edits go through the normal content
 * actions, so they layer per version like any other change.
 */
function SectionLayoutList() {
  const editField = useResumeStore((s) => s.editField);
  const moveNodeTo = useResumeStore((s) => s.moveNodeTo);
  const tree = useResolvedTree();
  const { design } = useDesign();

  const sections = tree.roots.filter((n) => n.kind === "section");
  const firstIndex = Math.max(0, tree.roots.findIndex((n) => n.kind === "section"));
  const drag = useDragReorder((id, to) => moveNodeTo(id, to + firstIndex), { requireHandle: true });

  if (sections.length === 0) {
    return <p className="text-[12.5px] text-ink-faint">Add a section in the Content tab first.</p>;
  }

  // In one-column mode there is nowhere for a section to move to.
  const showColumns = design.columns !== "one";
  const cycle = (node: ResolvedNode) => {
    const order: SectionColumn[] =
      design.columns === "mix" ? ["main", "side", "full"] : ["main", "side"];
    const next = order[(order.indexOf(sectionColumn(node)) + 1) % order.length];
    editField(node.id, "column", next);
  };

  return (
    <div className="space-y-1.5">
      {sections.map((node, i) => (
        <div
          key={node.id}
          {...drag.itemProps(node.id, i)}
          className={`flex items-center gap-2 rounded-xl bg-sunken px-2 py-2 ${dragClasses(
            drag.draggingId === node.id,
            drag.dropEdge(i, sections.length),
          )}`}
        >
          <span
            {...drag.handleProps(node.id)}
            className="flex size-5 shrink-0 cursor-grab items-center justify-center text-ink-faint/50 transition-colors duration-150 select-none hover:text-ink-faint active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripIcon className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">
            {String(node.data.title ?? "Untitled")}
          </span>
          {showColumns && (
            <button
              type="button"
              onClick={() => cycle(node)}
              className="pressable shrink-0 rounded-lg border border-hairline bg-surface px-2 py-1 text-[10.5px] font-semibold text-ink-muted transition-colors duration-150 hover:border-hairline-strong hover:text-ink"
              title="Move between columns"
            >
              {COLUMN_LABEL[sectionColumn(node)]}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------- panel ---------------------------------- */

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * The Customize tab: a rail of groups beside the controls themselves. Follows
 * the same layering as content — editing on the Default restyles every
 * version; editing on a named version overrides only that version, key by key.
 */
export function CustomizePanel() {
  const versions = useResumeStore((s) => s.versions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const updateDesign = useResumeStore((s) => s.updateDesign);
  const resetDesignKey = useResumeStore((s) => s.resetDesignKey);
  const resetDesignAll = useResumeStore((s) => s.resetDesignAll);
  const { design, overriddenKeys, onBase } = useDesign();
  const activeVersion = versions.find((v) => v.id === activeVersionId);

  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const [active, setActive] = useState<GroupId>("document");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const customAccent = !ACCENT_PRESETS.some((p) => p.value === design.accentColor);

  /** Reset marker for one key — hidden on the Default, where nothing overrides. */
  const marker = (key: keyof DesignSettings) => (
    <ResetDot show={!onBase && overriddenKeys.has(key)} onReset={() => resetDesignKey(key)} />
  );
  const set = <K extends keyof DesignSettings>(key: K, value: DesignSettings[K]) =>
    updateDesign(key, value);

  // Rail follows the reader: whichever group's top is nearest the top of the
  // viewport without having passed it wins.
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = visible[0]?.target.getAttribute("data-group");
        if (id) setActive(id as GroupId);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );
    root.querySelectorAll("[data-group]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex gap-5">
      {/* The rail: jump-to plus a reading position. */}
      <nav className="sticky top-0 hidden h-fit w-32 shrink-0 py-1 sm:block">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() =>
              document.getElementById(`customize-${g.id}`)?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
            className={`relative block w-full truncate rounded-lg py-1.5 pl-3 pr-2 text-left text-[12.5px] transition-colors duration-150 ${
              active === g.id
                ? "font-semibold text-ink"
                : "font-medium text-ink-faint hover:text-ink-muted"
            }`}
          >
            <span
              className={`absolute inset-y-1 left-0 w-[2px] rounded-full transition-colors duration-200 ${
                active === g.id ? "bg-rose-500" : "bg-transparent"
              }`}
            />
            {g.label}
          </button>
        ))}
      </nav>

      <div ref={scrollerRef} className="min-w-0 flex-1 space-y-3.5 pb-24">
        {onBase ? (
          <p className="rounded-2xl bg-surface px-5 py-3.5 text-[12.5px] leading-relaxed text-ink-muted shadow-card">
            You’re customizing the <strong className="font-semibold text-ink">Default</strong> — these
            design choices flow into every version that hasn’t overridden them.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-5 py-3.5 shadow-card">
            <p className="text-[12.5px] leading-relaxed text-ink-muted">
              Design changes here apply to{" "}
              <strong className="font-semibold text-ink">{activeVersion?.name}</strong> only.
            </p>
            {overriddenKeys.size > 0 && (
              <button
                type="button"
                onClick={resetDesignAll}
                className="pressable flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
              >
                <UndoIcon className="size-3.5" />
                Reset design
              </button>
            )}
          </div>
        )}

        {/* ------------------------------ document ------------------------------ */}
        <Group id="document" title="Document Settings" icon={<FileIcon />} index={0}>
          <div className="space-y-5">
            <div>
              <RowLabel label="Page format" trailing={marker("pageFormat")} />
              <Segmented
                options={PAGE_FORMAT_OPTIONS}
                value={design.pageFormat}
                onChange={(v) => set("pageFormat", v)}
              />
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
                {PAGE_FORMATS[design.pageFormat].hint} — content that overflows continues on a new page.
              </p>
            </div>
            <div>
              <RowLabel label="Date format" trailing={marker("dateFormat")} />
              <Segmented
                options={DATE_FORMAT_OPTIONS}
                value={design.dateFormat}
                onChange={(v) => set("dateFormat", v)}
              />
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
                Applies to every date on the resume. Dates you typed freehand are left alone.
              </p>
            </div>
          </div>
        </Group>

        {/* ------------------------------ templates ----------------------------- */}
        <Group id="templates" title="Design Templates" icon={<TemplateIcon />} index={1}>
          <RowLabel label="Template" trailing={marker("template")} />
          <div className="grid grid-cols-2 gap-3.5">
            {TEMPLATES.map((t) => {
              const isActive = design.template === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set("template", t.id)}
                  className={`pressable group overflow-hidden rounded-xl border text-left transition-all duration-150 ${
                    isActive
                      ? "border-rose-400 ring-4 ring-rose-500/10"
                      : "border-hairline hover:border-hairline-strong"
                  }`}
                >
                  <div className="relative aspect-[4/3] w-full border-b border-hairline bg-sunken">
                    <TemplateThumb id={t.id} />
                    {isActive && (
                      <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-card">
                        <CheckIcon className="size-3" />
                      </span>
                    )}
                  </div>
                  <div className="px-3.5 py-2.5">
                    <p className="text-[13px] font-semibold text-ink">{t.name}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">{t.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Group>

        {/* ------------------------------- layout ------------------------------- */}
        <Group id="layout" title="Layout" icon={<LayersIcon />} index={2}>
          <div className="space-y-5">
            <div>
              <RowLabel label="Columns" trailing={marker("columns")} />
              <OptionCards
                value={design.columns}
                onChange={(v) => set("columns", v)}
                options={COLUMN_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                  preview:
                    o.value === "one" ? (
                      <Lines count={4} />
                    ) : o.value === "two" ? (
                      <TwoUp />
                    ) : (
                      <span className="flex w-full flex-col gap-[5px]">
                        <Lines count={1} />
                        <TwoUp />
                      </span>
                    ),
                }))}
              />
            </div>

            {design.columns !== "one" && (
              <Stepper
                label="Side column width"
                range={RANGES.sidebarWidth}
                value={design.sidebarWidth}
                onChange={(v) => set("sidebarWidth", v)}
                trailing={marker("sidebarWidth")}
              />
            )}

            <div>
              <RowLabel label="Section order" />
              <SectionLayoutList />
              {design.columns === "mix" && (
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
                  Sections set to <strong className="font-semibold text-ink-muted">Full</strong> span the
                  whole width and are printed above the two-column area.
                </p>
              )}
            </div>
          </div>
        </Group>

        {/* ------------------------------ font size ----------------------------- */}
        <Group id="fontsize" title="Font Size" icon={<TypeIcon />} index={3}>
          <div className="space-y-4">
            <Stepper
              label="Base font size"
              range={RANGES.fontSize}
              value={design.fontSize}
              onChange={(v) => set("fontSize", v)}
              trailing={marker("fontSize")}
            />
            <Stepper
              label="Full name"
              range={RANGES.nameSize}
              value={design.nameSize}
              onChange={(v) => set("nameSize", v)}
              trailing={marker("nameSize")}
            />
            <Stepper
              label="Professional title"
              range={RANGES.titleSize}
              value={design.titleSize}
              onChange={(v) => set("titleSize", v)}
              trailing={marker("titleSize")}
            />
            <Stepper
              label="Section headings"
              range={RANGES.headingSize}
              value={design.headingSize}
              onChange={(v) => set("headingSize", v)}
              trailing={marker("headingSize")}
            />
            <Stepper
              label="Entry header"
              range={RANGES.entryHeaderSize}
              value={design.entryHeaderSize}
              onChange={(v) => set("entryHeaderSize", v)}
              trailing={marker("entryHeaderSize")}
            />
          </div>
        </Group>

        {/* ------------------------------- spacing ------------------------------ */}
        <Group id="spacing" title="Spacing" icon={<SpacingIcon />} index={4}>
          <div className="space-y-4">
            <Stepper
              label="Line height"
              range={RANGES.lineHeight}
              value={design.lineHeight}
              onChange={(v) => set("lineHeight", v)}
              trailing={marker("lineHeight")}
            />
            <Stepper
              label="Space between elements"
              range={RANGES.sectionSpacing}
              value={design.sectionSpacing}
              onChange={(v) => set("sectionSpacing", v)}
              trailing={marker("sectionSpacing")}
            />
            <Stepper
              label="Left & right margin"
              range={RANGES.marginX}
              value={design.marginX}
              onChange={(v) => set("marginX", v)}
              trailing={marker("marginX")}
            />
            <Stepper
              label="Top & bottom margin"
              range={RANGES.marginY}
              value={design.marginY}
              onChange={(v) => set("marginY", v)}
              trailing={marker("marginY")}
            />
          </div>
        </Group>

        {/* ------------------------------- entries ------------------------------ */}
        <Group id="entries" title="Entry Layout" icon={<MarginsIcon />} index={5}>
          <div className="space-y-5">
            <div>
              <RowLabel label="Structure" trailing={marker("entryStructure")} />
              <OptionCards
                columns={2}
                value={design.entryStructure}
                onChange={(v) => set("entryStructure", v)}
                options={[
                  { value: "full" as const, label: "Full width", preview: <Lines count={3} /> },
                  { value: "columns" as const, label: "Columns", preview: <TwoUp ratio="2fr 1fr" /> },
                ]}
              />
            </div>
            <div>
              <RowLabel label="Date & location position" trailing={marker("datePosition")} />
              <Segmented
                options={DATE_POSITION_OPTIONS}
                value={design.datePosition}
                onChange={(v) => set("datePosition", v)}
              />
            </div>
            <div>
              <RowLabel label="Subtitle placement" trailing={marker("subtitlePlacement")} />
              <Segmented
                options={SUBTITLE_OPTIONS}
                value={design.subtitlePlacement}
                onChange={(v) => set("subtitlePlacement", v)}
              />
            </div>
          </div>
        </Group>

        {/* ------------------------------ headings ------------------------------ */}
        <Group id="headings" title="Section Headings" icon={<TypeIcon />} index={6}>
          <div className="space-y-5">
            <div>
              <RowLabel label="Style" trailing={marker("headingStyle")} />
              <OptionCards
                value={design.headingStyle}
                onChange={(v) => set("headingStyle", v)}
                options={HEADING_STYLE_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                  preview: <HeadingPreview style={o.value} />,
                }))}
              />
            </div>
            <div>
              <RowLabel label="Capitalization" trailing={marker("headingCase")} />
              <Segmented
                options={HEADING_CASE_OPTIONS}
                value={design.headingCase}
                onChange={(v) => set("headingCase", v)}
              />
            </div>
            <div>
              <RowLabel label="Icons" trailing={marker("headingIcons")} />
              <Segmented
                options={HEADING_ICON_OPTIONS}
                value={design.headingIcons}
                onChange={(v) => set("headingIcons", v)}
              />
            </div>
          </div>
        </Group>

        {/* -------------------------------- font -------------------------------- */}
        <Group id="font" title="Font" icon={<TypeIcon />} index={7}>
          <div className="space-y-5">
            <div>
              <RowLabel label="Body font" trailing={marker("fontFamily")} />
              <FontSelect
                value={design.fontFamily}
                onChange={(v) => v && set("fontFamily", v)}
              />
            </div>
            <div>
              <RowLabel label="Name font" trailing={marker("nameFont")} />
              <FontSelect
                value={design.nameFont}
                allowSame
                onChange={(v) => set("nameFont", v)}
              />
            </div>
          </div>
        </Group>

        {/* ------------------------------- colors ------------------------------- */}
        <Group id="colors" title="Colors" icon={<PaletteIcon />} index={8}>
          <RowLabel label="Accent color" trailing={marker("accentColor")} />
          <div className="flex flex-wrap items-center gap-2.5">
            {ACCENT_PRESETS.map((preset) => {
              const isActive = design.accentColor === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  title={preset.name}
                  onClick={() => {
                    setHexDraft(null);
                    set("accentColor", preset.value);
                  }}
                  className={`pressable flex size-8 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 ${
                    isActive ? "ring-2 ring-ink ring-offset-2 ring-offset-[var(--surface)]" : ""
                  }`}
                  style={{ background: preset.value }}
                >
                  {isActive && <CheckIcon className="size-4 text-white" />}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2.5">
            <span
              className={`size-8 shrink-0 rounded-full border border-hairline ${
                customAccent ? "ring-2 ring-ink ring-offset-2 ring-offset-[var(--surface)]" : ""
              }`}
              style={{ background: design.accentColor }}
            />
            <input
              value={hexDraft ?? design.accentColor}
              onChange={(e) => {
                const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                setHexDraft(v);
                if (HEX_RE.test(v)) set("accentColor", v.toLowerCase());
              }}
              onBlur={() => setHexDraft(null)}
              spellCheck={false}
              className="w-28 rounded-lg border border-hairline bg-surface px-3 py-2 font-mono text-[12.5px] uppercase text-ink outline-none transition-colors duration-150 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
            />
            <span className="text-[11.5px] text-ink-faint">Custom hex</span>
          </div>

          <div className="mt-5">
            <RowLabel label="Apply accent color to" />
            <div className="grid grid-cols-2 gap-x-4">
              {ACCENT_TARGETS.map((t) => (
                <Toggle
                  key={t.key}
                  label={t.label}
                  checked={design[t.key] as boolean}
                  onChange={(v) => set(t.key, v as never)}
                  trailing={marker(t.key)}
                />
              ))}
            </div>
          </div>
        </Group>

        {/* ------------------------------- header ------------------------------- */}
        <Group id="header" title="Header" icon={<UserIcon />} index={9}>
          <div className="space-y-5">
            <div>
              <RowLabel label="Text alignment" trailing={marker("headerAlign")} />
              <Segmented
                options={HEADER_ALIGN_OPTIONS}
                value={design.headerAlign}
                onChange={(v) => set("headerAlign", v)}
              />
            </div>
            <div>
              <RowLabel label="Details arrangement" trailing={marker("headerDetails")} />
              <Segmented
                options={HEADER_DETAILS_OPTIONS}
                value={design.headerDetails}
                onChange={(v) => set("headerDetails", v)}
              />
            </div>
            <div>
              <RowLabel label="Separator" trailing={marker("headerSeparator")} />
              <Segmented
                options={HEADER_SEPARATOR_OPTIONS}
                value={design.headerSeparator}
                onChange={(v) => set("headerSeparator", v)}
              />
            </div>
            <Toggle
              label="Show photo"
              hint="A placeholder circle until photo uploads land"
              checked={design.showPhoto}
              onChange={(v) => set("showPhoto", v)}
              trailing={marker("showPhoto")}
            />
          </div>
        </Group>

        {/* -------------------------------- links ------------------------------- */}
        <Group id="links" title="Link Styling" icon={<LinkIcon />} index={10}>
          <div className="space-y-1">
            <Toggle
              label="Underline"
              checked={design.linkUnderline}
              onChange={(v) => set("linkUnderline", v)}
              trailing={marker("linkUnderline")}
            />
            <Toggle
              label="Accent color"
              checked={design.linkAccent}
              onChange={(v) => set("linkAccent", v)}
              trailing={marker("linkAccent")}
            />
            <Toggle
              label="Link icon"
              checked={design.linkIcon}
              onChange={(v) => set("linkIcon", v)}
              trailing={marker("linkIcon")}
            />
          </div>
        </Group>

        {/* ------------------------------- footer ------------------------------- */}
        <Group id="footer" title="Footer" icon={<FileIcon />} index={11}>
          <div className="space-y-1">
            <Toggle
              label="Page numbers"
              checked={design.footerPageNumbers}
              onChange={(v) => set("footerPageNumbers", v)}
              trailing={marker("footerPageNumbers")}
            />
            <Toggle
              label="Email"
              checked={design.footerEmail}
              onChange={(v) => set("footerEmail", v)}
              trailing={marker("footerEmail")}
            />
            <Toggle
              label="Name"
              checked={design.footerName}
              onChange={(v) => set("footerName", v)}
              trailing={marker("footerName")}
            />
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
            The footer prints inside the bottom margin of every page. Widen it under Spacing if it
            feels cramped.
          </p>
        </Group>
      </div>
    </div>
  );
}

/** Font picker that previews each family in its own typeface. */
function FontSelect({
  value,
  onChange,
  allowSame = false,
}: {
  value: FontId | null;
  onChange: (value: FontId | null) => void;
  allowSame?: boolean;
}) {
  return (
    <select
      value={value ?? "__same"}
      onChange={(e) => onChange(e.target.value === "__same" ? null : (e.target.value as FontId))}
      className="w-full cursor-pointer rounded-xl border border-hairline bg-surface px-3 py-2.5 text-[13px] text-ink outline-none transition-colors duration-150 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
      style={{ fontFamily: value ? fontStack(value) : undefined }}
    >
      {allowSame && <option value="__same">Same as body font</option>}
      {FONTS.map((f) => (
        <option key={f.id} value={f.id} style={{ fontFamily: f.stack }}>
          {f.name}
        </option>
      ))}
    </select>
  );
}
