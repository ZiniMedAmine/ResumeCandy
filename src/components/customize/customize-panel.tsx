"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACCENT_PRESETS,
  ACCENT_TARGET_KEYS,
  COLUMN_IDS,
  DATE_POSITION_IDS,
  ENTRY_STRUCTURE_IDS,
  HEADER_ALIGN_IDS,
  HEADER_DETAILS_IDS,
  HEADER_SEPARATOR_IDS,
  HEADING_CASE_IDS,
  HEADING_ICON_IDS,
  HEADING_STYLE_IDS,
  LOCALE_OPTIONS,
  PAGE_FORMATS,
  PAGE_FORMAT_IDS,
  RANGES,
  SUBTITLE_IDS,
  TEMPLATE_IDS,
  dateFormatOptions,
  fontStack,
  fontsFor,
  isRtl,
  optionsFor,
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
import { useI18n, useT } from "@/lib/i18n/provider";
import { enterDelay } from "@/lib/motion";
import type { SectionColumn } from "@/lib/design";
import type { LocaleId } from "@/lib/locale";
import type { ResolvedNode } from "@/lib/resume/types";
import { useDesign, useResolvedTree, useResumeStore } from "@/store/resume-store";

/* --------------------------------- groups ---------------------------------- */

/** Ids only; the rail label and the card title come from the dictionary. */
const GROUPS = [
  { id: "document", icon: FileIcon },
  { id: "templates", icon: TemplateIcon },
  { id: "layout", icon: LayersIcon },
  { id: "fontsize", icon: TypeIcon },
  { id: "spacing", icon: SpacingIcon },
  { id: "entries", icon: MarginsIcon },
  { id: "headings", icon: TypeIcon },
  { id: "font", icon: TypeIcon },
  { id: "colors", icon: PaletteIcon },
  { id: "header", icon: UserIcon },
  { id: "links", icon: LinkIcon },
  { id: "footer", icon: FileIcon },
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
  const t = useT();
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onReset}
      className="pressable flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 transition-colors duration-150 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
      title={t.customize.resetDot}
    >
      <span className="size-1.5 rounded-full bg-amber-400" />
      {t.common.reset}
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
  const t = useT();

  const sections = tree.roots.filter((n) => n.kind === "section");
  const firstIndex = Math.max(0, tree.roots.findIndex((n) => n.kind === "section"));
  const drag = useDragReorder((id, to) => moveNodeTo(id, to + firstIndex), { requireHandle: true });

  if (sections.length === 0) {
    return <p className="text-[12.5px] text-ink-faint">{t.customize.sectionOrderEmpty}</p>;
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
            title={t.customize.dragToReorder}
          >
            <GripIcon className="size-3.5" />
          </span>
          {/* A section heading is résumé content, so it reads its own way. */}
          <span
            dir="auto"
            className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink"
          >
            {String(node.data.title ?? t.customize.untitled)}
          </span>
          {showColumns && (
            <button
              type="button"
              onClick={() => cycle(node)}
              className="pressable shrink-0 rounded-lg border border-hairline bg-surface px-2 py-1 text-[10.5px] font-semibold text-ink-muted transition-colors duration-150 hover:border-hairline-strong hover:text-ink"
              title={t.customize.moveBetweenColumns}
            >
              {t.design.sectionColumn[sectionColumn(node)]}
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
  const setLanguage = useResumeStore((s) => s.setLanguage);
  const resetDesignKey = useResumeStore((s) => s.resetDesignKey);
  const resetDesignAll = useResumeStore((s) => s.resetDesignAll);
  const { design, overriddenKeys, onBase } = useDesign();
  const { t, fmt } = useI18n();
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
            className={`relative block w-full truncate rounded-lg py-1.5 ps-3 pe-2 text-start text-[12.5px] transition-colors duration-150 ${
              active === g.id
                ? "font-semibold text-ink"
                : "font-medium text-ink-faint hover:text-ink-muted"
            }`}
          >
            <span
              className={`absolute inset-y-1 start-0 w-[2px] rounded-full transition-colors duration-200 ${
                active === g.id ? "bg-rose-500" : "bg-transparent"
              }`}
            />
            {t.customize.rail[g.id]}
          </button>
        ))}
      </nav>

      <div ref={scrollerRef} className="min-w-0 flex-1 space-y-3.5 pb-24">
        {onBase ? (
          <p className="rounded-2xl bg-surface px-5 py-3.5 text-[12.5px] leading-relaxed text-ink-muted shadow-card">
            {t.customize.onDefaultNotice}
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-5 py-3.5 shadow-card">
            <p className="text-[12.5px] leading-relaxed text-ink-muted">
              {fmt(t.customize.onVersionNotice, { name: activeVersion?.name ?? "" })}
            </p>
            {overriddenKeys.size > 0 && (
              <button
                type="button"
                onClick={resetDesignAll}
                className="pressable flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
              >
                <UndoIcon className="size-3.5" />
                {t.customize.resetDesign}
              </button>
            )}
          </div>
        )}

        {/* ------------------------------ document ------------------------------ */}
        <Group id="document" title={t.customize.group.document} icon={<FileIcon />} index={0}>
          <div className="space-y-5">
            <div>
              <RowLabel label={t.customize.resumeLanguage} trailing={marker("language")} />
              <Segmented
                options={LOCALE_OPTIONS}
                value={design.language}
                onChange={(v) => setLanguage(v)}
              />
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
                {t.customize.resumeLanguageHint}
              </p>
            </div>
            {isRtl(design) && (
              <Toggle
                label={t.customize.arabicNumerals}
                hint={t.customize.arabicNumeralsHint}
                checked={design.arabicIndicDigits}
                onChange={(v) => set("arabicIndicDigits", v)}
                trailing={marker("arabicIndicDigits")}
              />
            )}
            <div>
              <RowLabel label={t.customize.pageFormat} trailing={marker("pageFormat")} />
              <Segmented
                options={optionsFor(PAGE_FORMAT_IDS, t.design.pageFormat)}
                value={design.pageFormat}
                onChange={(v) => set("pageFormat", v)}
              />
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
                {fmt(t.customize.pageFormatHint, { hint: PAGE_FORMATS[design.pageFormat].hint })}
              </p>
            </div>
            <div>
              <RowLabel label={t.customize.dateFormat} trailing={marker("dateFormat")} />
              <Segmented
                options={dateFormatOptions(design)}
                value={design.dateFormat}
                onChange={(v) => set("dateFormat", v)}
              />
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
                {t.customize.dateFormatHint}
              </p>
            </div>
          </div>
        </Group>

        {/* ------------------------------ templates ----------------------------- */}
        <Group id="templates" title={t.customize.group.templates} icon={<TemplateIcon />} index={1}>
          <RowLabel label={t.customize.template} trailing={marker("template")} />
          <div className="grid grid-cols-2 gap-3.5">
            {TEMPLATE_IDS.map((id) => {
              const isActive = design.template === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => set("template", id)}
                  className={`pressable group overflow-hidden rounded-xl border text-start transition-all duration-150 ${
                    isActive
                      ? "border-rose-400 ring-4 ring-rose-500/10"
                      : "border-hairline hover:border-hairline-strong"
                  }`}
                >
                  <div className="relative aspect-[4/3] w-full border-b border-hairline bg-sunken">
                    <TemplateThumb id={id} />
                    {isActive && (
                      <span className="absolute end-2 top-2 flex size-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-card">
                        <CheckIcon className="size-3" />
                      </span>
                    )}
                  </div>
                  <div className="px-3.5 py-2.5">
                    <p className="text-[13px] font-semibold text-ink">
                      {t.design.template[id].name}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">
                      {t.design.template[id].description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </Group>

        {/* ------------------------------- layout ------------------------------- */}
        <Group id="layout" title={t.customize.group.layout} icon={<LayersIcon />} index={2}>
          <div className="space-y-5">
            <div>
              <RowLabel label={t.customize.columns} trailing={marker("columns")} />
              <OptionCards
                value={design.columns}
                onChange={(v) => set("columns", v)}
                options={optionsFor(COLUMN_IDS, t.design.columns).map((o) => ({
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
                label={t.customize.sidebarWidth}
                range={RANGES.sidebarWidth}
                value={design.sidebarWidth}
                onChange={(v) => set("sidebarWidth", v)}
                trailing={marker("sidebarWidth")}
              />
            )}

            <div>
              <RowLabel label={t.customize.sectionOrder} />
              <SectionLayoutList />
              {design.columns === "mix" && (
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
                  {t.customize.mixHint}
                </p>
              )}
            </div>
          </div>
        </Group>

        {/* ------------------------------ font size ----------------------------- */}
        <Group id="fontsize" title={t.customize.group.fontsize} icon={<TypeIcon />} index={3}>
          <div className="space-y-4">
            <Stepper
              label={t.customize.fontSize}
              range={RANGES.fontSize}
              value={design.fontSize}
              onChange={(v) => set("fontSize", v)}
              trailing={marker("fontSize")}
            />
            <Stepper
              label={t.customize.nameSize}
              range={RANGES.nameSize}
              value={design.nameSize}
              onChange={(v) => set("nameSize", v)}
              trailing={marker("nameSize")}
            />
            <Stepper
              label={t.customize.titleSize}
              range={RANGES.titleSize}
              value={design.titleSize}
              onChange={(v) => set("titleSize", v)}
              trailing={marker("titleSize")}
            />
            <Stepper
              label={t.customize.headingSize}
              range={RANGES.headingSize}
              value={design.headingSize}
              onChange={(v) => set("headingSize", v)}
              trailing={marker("headingSize")}
            />
            <Stepper
              label={t.customize.entryHeaderSize}
              range={RANGES.entryHeaderSize}
              value={design.entryHeaderSize}
              onChange={(v) => set("entryHeaderSize", v)}
              trailing={marker("entryHeaderSize")}
            />
          </div>
        </Group>

        {/* ------------------------------- spacing ------------------------------ */}
        <Group id="spacing" title={t.customize.group.spacing} icon={<SpacingIcon />} index={4}>
          <div className="space-y-4">
            <Stepper
              label={t.customize.lineHeight}
              range={RANGES.lineHeight}
              value={design.lineHeight}
              onChange={(v) => set("lineHeight", v)}
              trailing={marker("lineHeight")}
            />
            <Stepper
              label={t.customize.sectionSpacing}
              range={RANGES.sectionSpacing}
              value={design.sectionSpacing}
              onChange={(v) => set("sectionSpacing", v)}
              trailing={marker("sectionSpacing")}
            />
            <Stepper
              label={t.customize.marginX}
              range={RANGES.marginX}
              value={design.marginX}
              onChange={(v) => set("marginX", v)}
              trailing={marker("marginX")}
            />
            <Stepper
              label={t.customize.marginY}
              range={RANGES.marginY}
              value={design.marginY}
              onChange={(v) => set("marginY", v)}
              trailing={marker("marginY")}
            />
          </div>
        </Group>

        {/* ------------------------------- entries ------------------------------ */}
        <Group id="entries" title={t.customize.group.entries} icon={<MarginsIcon />} index={5}>
          <div className="space-y-5">
            <div>
              <RowLabel label={t.customize.structure} trailing={marker("entryStructure")} />
              <OptionCards
                columns={2}
                value={design.entryStructure}
                onChange={(v) => set("entryStructure", v)}
                options={optionsFor(ENTRY_STRUCTURE_IDS, t.design.entryStructure).map((o) => ({
                  ...o,
                  preview: o.value === "full" ? <Lines count={3} /> : <TwoUp ratio="2fr 1fr" />,
                }))}
              />
            </div>
            <div>
              <RowLabel label={t.customize.datePosition} trailing={marker("datePosition")} />
              <Segmented
                options={optionsFor(DATE_POSITION_IDS, t.design.datePosition)}
                value={design.datePosition}
                onChange={(v) => set("datePosition", v)}
              />
            </div>
            <div>
              <RowLabel label={t.customize.subtitlePlacement} trailing={marker("subtitlePlacement")} />
              <Segmented
                options={optionsFor(SUBTITLE_IDS, t.design.subtitlePlacement)}
                value={design.subtitlePlacement}
                onChange={(v) => set("subtitlePlacement", v)}
              />
            </div>
          </div>
        </Group>

        {/* ------------------------------ headings ------------------------------ */}
        <Group id="headings" title={t.customize.group.headings} icon={<TypeIcon />} index={6}>
          <div className="space-y-5">
            <div>
              <RowLabel label={t.customize.headingStyle} trailing={marker("headingStyle")} />
              <OptionCards
                value={design.headingStyle}
                onChange={(v) => set("headingStyle", v)}
                options={optionsFor(HEADING_STYLE_IDS, t.design.headingStyle).map((o) => ({
                  value: o.value,
                  label: o.label,
                  preview: <HeadingPreview style={o.value} />,
                }))}
              />
            </div>
            <div>
              <RowLabel label={t.customize.headingCase} trailing={marker("headingCase")} />
              <Segmented
                options={optionsFor(HEADING_CASE_IDS, t.design.headingCase)}
                value={design.headingCase}
                onChange={(v) => set("headingCase", v)}
              />
            </div>
            <div>
              <RowLabel label={t.customize.headingIcons} trailing={marker("headingIcons")} />
              <Segmented
                options={optionsFor(HEADING_ICON_IDS, t.design.headingIcons)}
                value={design.headingIcons}
                onChange={(v) => set("headingIcons", v)}
              />
            </div>
          </div>
        </Group>

        {/* -------------------------------- font -------------------------------- */}
        <Group id="font" title={t.customize.group.font} icon={<TypeIcon />} index={7}>
          <div className="space-y-5">
            <div>
              <RowLabel label={t.customize.bodyFont} trailing={marker("fontFamily")} />
              <FontSelect
                value={design.fontFamily}
                locale={design.language}
                onChange={(v) => v && set("fontFamily", v)}
              />
            </div>
            <div>
              <RowLabel label={t.customize.nameFont} trailing={marker("nameFont")} />
              <FontSelect
                value={design.nameFont}
                locale={design.language}
                allowSame
                onChange={(v) => set("nameFont", v)}
              />
            </div>
          </div>
        </Group>

        {/* ------------------------------- colors ------------------------------- */}
        <Group id="colors" title={t.customize.group.colors} icon={<PaletteIcon />} index={8}>
          <RowLabel label={t.customize.accentColor} trailing={marker("accentColor")} />
          <div className="flex flex-wrap items-center gap-2.5">
            {ACCENT_PRESETS.map((preset) => {
              const isActive = design.accentColor === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  title={t.design.accent[preset.id]}
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
            <span className="text-[11.5px] text-ink-faint">{t.customize.customHex}</span>
          </div>

          <div className="mt-5">
            <RowLabel label={t.customize.applyAccentTo} />
            <div className="grid grid-cols-2 gap-x-4">
              {ACCENT_TARGET_KEYS.map((key) => (
                <Toggle
                  key={key}
                  label={t.design.accentTarget[key]}
                  checked={design[key]}
                  onChange={(v) => set(key, v)}
                  trailing={marker(key)}
                />
              ))}
            </div>
          </div>
        </Group>

        {/* ------------------------------- header ------------------------------- */}
        <Group id="header" title={t.customize.group.header} icon={<UserIcon />} index={9}>
          <div className="space-y-5">
            <div>
              <RowLabel label={t.customize.headerAlign} trailing={marker("headerAlign")} />
              <Segmented
                options={optionsFor(HEADER_ALIGN_IDS, t.design.headerAlign)}
                value={design.headerAlign}
                onChange={(v) => set("headerAlign", v)}
              />
            </div>
            <div>
              <RowLabel label={t.customize.headerDetails} trailing={marker("headerDetails")} />
              <Segmented
                options={optionsFor(HEADER_DETAILS_IDS, t.design.headerDetails)}
                value={design.headerDetails}
                onChange={(v) => set("headerDetails", v)}
              />
            </div>
            <div>
              <RowLabel label={t.customize.headerSeparator} trailing={marker("headerSeparator")} />
              <Segmented
                options={optionsFor(HEADER_SEPARATOR_IDS, t.design.headerSeparator)}
                value={design.headerSeparator}
                onChange={(v) => set("headerSeparator", v)}
              />
            </div>
            <Toggle
              label={t.customize.showPhoto}
              hint={t.customize.showPhotoHint}
              checked={design.showPhoto}
              onChange={(v) => set("showPhoto", v)}
              trailing={marker("showPhoto")}
            />
          </div>
        </Group>

        {/* -------------------------------- links ------------------------------- */}
        <Group id="links" title={t.customize.group.links} icon={<LinkIcon />} index={10}>
          <div className="space-y-1">
            <Toggle
              label={t.customize.linkUnderline}
              checked={design.linkUnderline}
              onChange={(v) => set("linkUnderline", v)}
              trailing={marker("linkUnderline")}
            />
            <Toggle
              label={t.customize.linkAccent}
              checked={design.linkAccent}
              onChange={(v) => set("linkAccent", v)}
              trailing={marker("linkAccent")}
            />
            <Toggle
              label={t.customize.linkIcon}
              checked={design.linkIcon}
              onChange={(v) => set("linkIcon", v)}
              trailing={marker("linkIcon")}
            />
          </div>
        </Group>

        {/* ------------------------------- footer ------------------------------- */}
        <Group id="footer" title={t.customize.group.footer} icon={<FileIcon />} index={11}>
          <div className="space-y-1">
            <Toggle
              label={t.customize.footerPageNumbers}
              checked={design.footerPageNumbers}
              onChange={(v) => set("footerPageNumbers", v)}
              trailing={marker("footerPageNumbers")}
            />
            <Toggle
              label={t.customize.footerEmail}
              checked={design.footerEmail}
              onChange={(v) => set("footerEmail", v)}
              trailing={marker("footerEmail")}
            />
            <Toggle
              label={t.customize.footerName}
              checked={design.footerName}
              onChange={(v) => set("footerName", v)}
              trailing={marker("footerName")}
            />
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
            {t.customize.footerHint}
          </p>
        </Group>
      </div>
    </div>
  );
}

/** Font picker that previews each family in its own typeface. */
/**
 * Only families that can actually draw the CV's script are offered — listing
 * Georgia for an Arabic resume would just be a way to render tofu.
 */
function FontSelect({
  value,
  onChange,
  locale,
  allowSame = false,
}: {
  value: FontId | null;
  onChange: (value: FontId | null) => void;
  locale: LocaleId;
  allowSame?: boolean;
}) {
  const t = useT();
  return (
    <select
      value={value ?? "__same"}
      onChange={(e) => onChange(e.target.value === "__same" ? null : (e.target.value as FontId))}
      className="w-full cursor-pointer rounded-xl border border-hairline bg-surface px-3 py-2.5 text-[13px] text-ink outline-none transition-colors duration-150 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
      style={{ fontFamily: value ? fontStack(value) : undefined }}
    >
      {allowSame && <option value="__same">{t.customize.sameAsBody}</option>}
      {fontsFor(locale).map((f) => (
        <option key={f.id} value={f.id} style={{ fontFamily: f.stack }}>
          {f.name}
        </option>
      ))}
    </select>
  );
}
