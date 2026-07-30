"use client";

import { useState } from "react";
import { createResume } from "@/app/actions/resumes";
import { ResumePreview } from "@/components/preview/resume-preview";
import { ArrowLeftIcon, CheckIcon, SparkleIcon } from "@/components/ui/icons";
import {
  DESIGN_DEFAULTS,
  PAGE_FORMATS,
  TEMPLATES,
  resolveDesign,
  type TemplateId,
} from "@/lib/design";
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
  const roots = sampleResumeRoots();
  const format = PAGE_FORMATS[DESIGN_DEFAULTS.pageFormat];

  return (
    <div>
      <Link
        href="/"
        className="pressable mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:text-ink"
      >
        <ArrowLeftIcon className="size-4 text-ink-faint" />
        Back to resumes
      </Link>

      <header className="mb-8">
        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-rose-500">
          Step 2 of 2
        </p>
        <h1 className="text-[26px] font-bold tracking-tight text-ink">Choose a template</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
          For <span className="font-semibold text-ink">{name}</span>. You can switch template and
          restyle everything later in Customize.
        </p>
      </header>

      <form action={createResume}>
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="template" value={selected} />

        <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
          {TEMPLATES.map((template) => {
            const active = selected === template.id;
            return (
              <div key={template.id}>
                <button
                  type="button"
                  onClick={() => setSelected(template.id)}
                  aria-pressed={active}
                  className={`pressable relative block w-full overflow-hidden rounded-xl bg-surface text-left transition-all duration-200 ${
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
                      design={resolveDesign(null, { template: template.id })}
                      thumbnail
                    />
                  </div>
                  {active && (
                    <span className="absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-card">
                      <CheckIcon className="size-3.5" />
                    </span>
                  )}
                </button>
                <div className="mt-3">
                  <p className="text-[14px] font-semibold text-ink">{template.name}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-ink-faint">{template.description}</p>
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
              <p className="text-[13px] font-semibold text-ink-muted">More templates coming</p>
              <p className="text-[11.5px] leading-relaxed text-ink-faint">
                Extra layouts will appear here and can be applied to resumes you’ve already made.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-9 flex items-center gap-3">
          <button
            type="submit"
            className="pressable rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-6 py-3 text-[13.5px] font-semibold text-white shadow-card transition-all duration-150 hover:shadow-card-hover hover:brightness-[1.03]"
          >
            Create resume
          </button>
          <span className="text-[12.5px] text-ink-faint">
            Starts you in the editor with {TEMPLATES.find((t) => t.id === selected)?.name}.
          </span>
        </div>
      </form>
    </div>
  );
}
