"use client";

import { useState } from "react";
import { createResume } from "@/app/actions/resumes";
import { ResumePreview } from "@/components/preview/resume-preview";
import { ArrowLeftIcon, CheckIcon, SparkleIcon } from "@/components/ui/icons";
import { Segmented } from "@/components/ui/segmented";
import {
  DESIGN_DEFAULTS,
  LOCALE_OPTIONS,
  PAGE_FORMATS,
  TEMPLATE_IDS,
  resolveDesign,
  type TemplateId,
} from "@/lib/design";
import { useI18n } from "@/lib/i18n/provider";
import type { LocaleId } from "@/lib/locale";
import { sampleResumeRoots } from "@/lib/sample-resume";
import Link from "next/link";

/**
 * Step two of creating a resume: pick the layout. Each card is the real
 * template rendered over sample content, so the choice shows itself.
 * The pick is stored as the resume's base design and stays changeable later
 * in Customize — nothing here is locked in.
 */
export function TemplateChooser({ name }: { name: string }) {
  const [selected, setSelected] = useState<TemplateId>(DESIGN_DEFAULTS.template);
  const [language, setLanguage] = useState<LocaleId>(DESIGN_DEFAULTS.language);
  const { t, fmt } = useI18n();
  const roots = sampleResumeRoots();
  const format = PAGE_FORMATS[DESIGN_DEFAULTS.pageFormat];

  return (
    <div>
      <Link
        href="/"
        className="pressable mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:text-ink"
      >
        <ArrowLeftIcon className="size-4 text-ink-faint rtl:-scale-x-100" />
        {t.newResume.backToResumes}
      </Link>

      <header className="mb-8">
        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-rose-500">
          {t.newResume.step2}
        </p>
        <h1 className="text-[26px] font-bold tracking-tight text-ink">
          {t.newResume.chooseTemplateTitle}
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
          {fmt(t.newResume.forName, { name })} {t.newResume.switchLater}
        </p>
      </header>

      <form action={createResume}>
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="template" value={selected} />
        <input type="hidden" name="language" value={language} />

        <div className="mb-8 max-w-md">
          <p className="mb-2 text-[13px] font-semibold text-ink">{t.newResume.language}</p>
          <Segmented options={LOCALE_OPTIONS} value={language} onChange={setLanguage} />
          <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
            {t.newResume.languageHint}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
          {TEMPLATE_IDS.map((id) => {
            const active = selected === id;
            return (
              <div key={id}>
                <button
                  type="button"
                  onClick={() => setSelected(id)}
                  aria-pressed={active}
                  className={`pressable relative block w-full overflow-hidden rounded-xl bg-surface text-start transition-all duration-200 ${
                    active
                      ? "ring-2 ring-rose-400 ring-offset-4 ring-offset-[var(--canvas)] shadow-card-hover"
                      : "shadow-card hover:-translate-y-0.5 hover:shadow-card-hover"
                  }`}
                  style={{ aspectRatio: `${format.width} / ${format.height}` }}
                >
                  <div className="pointer-events-none select-none">
                    {/* resolveDesign applies each template's natural typeface. */}
                    <ResumePreview
                      tree={{ roots }}
                      design={resolveDesign(null, { template: id })}
                      thumbnail
                    />
                  </div>
                  {active && (
                    <span className="absolute end-2.5 top-2.5 flex size-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-card">
                      <CheckIcon className="size-3.5" />
                    </span>
                  )}
                </button>
                <div className="mt-3">
                  <p className="text-[14px] font-semibold text-ink">{t.design.template[id].name}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-ink-faint">
                    {t.design.template[id].description}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Honest placeholder: more layouts are planned, none exist yet. */}
          <div className="flex flex-col">
            <div
              className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-hairline-strong px-5 text-center"
              style={{ aspectRatio: `${format.width} / ${format.height}` }}
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-sunken text-ink-faint">
                <SparkleIcon className="size-5" />
              </span>
              <p className="text-[13px] font-semibold text-ink-muted">
                {t.newResume.moreTemplates}
              </p>
              <p className="text-[11.5px] leading-relaxed text-ink-faint">
                {t.newResume.moreTemplatesHint}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-9 flex items-center gap-3">
          <button
            type="submit"
            className="pressable rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-6 py-3 text-[13.5px] font-semibold text-white shadow-card transition-all duration-150 hover:shadow-card-hover hover:brightness-[1.03]"
          >
            {t.newResume.create}
          </button>
          <span className="text-[12.5px] text-ink-faint">
            {fmt(t.newResume.startsWith, { template: t.design.template[selected].name })}
          </span>
        </div>
      </form>
    </div>
  );
}
