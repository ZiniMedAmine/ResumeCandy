"use client";

import { useState } from "react";
import {
  ACCENT_PRESETS,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  PAGE_FORMAT_OPTIONS,
  PAGE_FORMATS,
  PAGE_MARGIN_OPTIONS,
  SECTION_SPACING_OPTIONS,
  TEMPLATES,
  type DesignSettings,
} from "@/lib/design";
import {
  CheckIcon,
  FileIcon,
  MarginsIcon,
  PaletteIcon,
  SpacingIcon,
  TemplateIcon,
  TypeIcon,
  UndoIcon,
} from "@/components/ui/icons";
import { Segmented } from "@/components/ui/segmented";
import { useDesign, useResumeStore } from "@/store/resume-store";

/** Card container for a group of related design controls. */
function Group({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface p-5 shadow-card">
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

/** Row label with the per-version override marker (click to reset the key). */
function RowLabel({
  label,
  settingKey,
  overridden,
  onReset,
}: {
  label: string;
  settingKey: keyof DesignSettings;
  overridden: boolean;
  onReset: (key: keyof DesignSettings) => void;
}) {
  return (
    <div className="mb-2 flex h-4 items-center justify-between">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">{label}</span>
      {overridden && (
        <button
          type="button"
          onClick={() => onReset(settingKey)}
          className="pressable flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 transition-colors duration-150 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
          title="Customized in this version — click to follow the Default again"
        >
          <span className="size-1.5 rounded-full bg-amber-400" />
          Reset
        </button>
      )}
    </div>
  );
}

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

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * The Customize tab: template, colors, typography and page layout. Follows
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
  const customAccent = !ACCENT_PRESETS.some((p) => p.value === design.accentColor);

  const dot = (key: keyof DesignSettings) => !onBase && overriddenKeys.has(key);

  return (
    <div className="space-y-3.5 pb-24">
      {onBase ? (
        <p className="rounded-2xl bg-surface px-5 py-3.5 text-[12.5px] leading-relaxed text-ink-muted shadow-card">
          You’re customizing the <strong className="font-semibold text-ink">Default</strong> — these design
          choices flow into every version that hasn’t overridden them.
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

      <Group icon={<TemplateIcon />} title="Template">
        <RowLabel label="Layout" settingKey="template" overridden={dot("template")} onReset={resetDesignKey} />
        <div className="grid grid-cols-2 gap-3.5">
          {TEMPLATES.map((t) => {
            const active = design.template === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => updateDesign("template", t.id)}
                className={`pressable group overflow-hidden rounded-xl border text-left transition-all duration-150 ${
                  active
                    ? "border-rose-400 ring-4 ring-rose-500/10"
                    : "border-hairline hover:border-hairline-strong"
                }`}
              >
                <div className="relative aspect-[4/3] w-full border-b border-hairline bg-sunken">
                  <TemplateThumb id={t.id} />
                  {active && (
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

      <Group icon={<PaletteIcon />} title="Colors">
        <RowLabel
          label="Accent color"
          settingKey="accentColor"
          overridden={dot("accentColor")}
          onReset={resetDesignKey}
        />
        <div className="flex flex-wrap items-center gap-2.5">
          {ACCENT_PRESETS.map((preset) => {
            const active = design.accentColor === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                title={preset.name}
                onClick={() => {
                  setHexDraft(null);
                  updateDesign("accentColor", preset.value);
                }}
                className={`pressable flex size-8 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 ${
                  active ? "ring-2 ring-ink ring-offset-2 ring-offset-[var(--surface)]" : ""
                }`}
                style={{ background: preset.value }}
              >
                {active && <CheckIcon className="size-4 text-white" />}
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
              if (HEX_RE.test(v)) updateDesign("accentColor", v.toLowerCase());
            }}
            onBlur={() => setHexDraft(null)}
            spellCheck={false}
            className="w-28 rounded-lg border border-hairline bg-surface px-3 py-2 font-mono text-[12.5px] uppercase text-ink outline-none transition-colors duration-150 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
          />
          <span className="text-[11.5px] text-ink-faint">Custom hex</span>
        </div>
      </Group>

      <Group icon={<TypeIcon />} title="Typography">
        <div className="space-y-5">
          <div>
            <RowLabel
              label="Font family"
              settingKey="fontFamily"
              overridden={dot("fontFamily")}
              onReset={resetDesignKey}
            />
            <Segmented
              options={FONT_FAMILY_OPTIONS}
              value={design.fontFamily}
              onChange={(v) => updateDesign("fontFamily", v)}
            />
          </div>
          <div>
            <RowLabel label="Font size" settingKey="fontSize" overridden={dot("fontSize")} onReset={resetDesignKey} />
            <Segmented
              options={FONT_SIZE_OPTIONS}
              value={design.fontSize}
              onChange={(v) => updateDesign("fontSize", v)}
            />
          </div>
          <div>
            <RowLabel
              label="Line height"
              settingKey="lineHeight"
              overridden={dot("lineHeight")}
              onReset={resetDesignKey}
            />
            <Segmented
              options={LINE_HEIGHT_OPTIONS}
              value={design.lineHeight}
              onChange={(v) => updateDesign("lineHeight", v)}
            />
          </div>
        </div>
      </Group>

      <Group icon={<FileIcon />} title="Page">
        <div className="space-y-5">
          <div>
            <RowLabel
              label="Page size"
              settingKey="pageFormat"
              overridden={dot("pageFormat")}
              onReset={resetDesignKey}
            />
            <Segmented
              options={PAGE_FORMAT_OPTIONS}
              value={design.pageFormat}
              onChange={(v) => updateDesign("pageFormat", v)}
            />
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
              {PAGE_FORMATS[design.pageFormat].hint} — content that overflows continues on a new page.
            </p>
          </div>
          <div>
            <RowLabel
              label="Page margins"
              settingKey="pageMargins"
              overridden={dot("pageMargins")}
              onReset={resetDesignKey}
            />
            <div className="flex items-center gap-2.5">
              <MarginsIcon className="size-4 shrink-0 text-ink-faint" />
              <Segmented
                options={PAGE_MARGIN_OPTIONS}
                value={design.pageMargins}
                onChange={(v) => updateDesign("pageMargins", v)}
              />
            </div>
          </div>
        </div>
      </Group>

      <Group icon={<SpacingIcon />} title="Spacing">
        <RowLabel
          label="Section spacing"
          settingKey="sectionSpacing"
          overridden={dot("sectionSpacing")}
          onReset={resetDesignKey}
        />
        <Segmented
          options={SECTION_SPACING_OPTIONS}
          value={design.sectionSpacing}
          onChange={(v) => updateDesign("sectionSpacing", v)}
        />
      </Group>
    </div>
  );
}
