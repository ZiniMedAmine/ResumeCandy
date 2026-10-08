"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { assessJob, generateTailoredResume, type AiFailure } from "@/app/actions/tailor";
import { ResumePreview } from "@/components/preview/resume-preview";
import { ArrowLeftIcon, CheckIcon, SparkleIcon, WarningIcon } from "@/components/ui/icons";
import { Segmented } from "@/components/ui/segmented";
import type { Assessment, RequirementStatus, Verdict } from "@/lib/ai/assessment";
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
import { AUTOFIT_KEY } from "@/lib/pdf/fit";
import { sampleResumeRoots } from "@/lib/sample-resume";
import { editorUrl } from "@/lib/view";

type Phase =
  | { name: "form" }
  | { name: "assessed"; assessment: Assessment }
  | { name: "done"; resumeId: string; versionId: string; notes: string[] };

const field =
  "w-full rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint/60 hover:border-hairline-strong focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10";

const primary =
  "pressable inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-3 text-[14px] font-semibold text-white shadow-card transition-all duration-150 hover:shadow-card-hover hover:brightness-[1.03] disabled:pointer-events-none disabled:opacity-50";

const secondary =
  "pressable inline-flex items-center gap-2 rounded-xl bg-surface px-5 py-3 text-[14px] font-semibold text-ink shadow-card transition-shadow duration-150 hover:shadow-card-hover disabled:pointer-events-none disabled:opacity-50";

/**
 * The tailoring flow, one screen: describe the job, read the fit report,
 * generate. The fit check is the default first step, as it should be — a CV
 * for a role that is out of reach is wasted effort — but it is never a gate:
 * the person can always generate anyway, having been told.
 */
export function TailorFlow() {
  const { t } = useI18n();
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [template, setTemplate] = useState<TemplateId>(DESIGN_DEFAULTS.template);
  const [language, setLanguage] = useState<LocaleId | "auto">("auto");
  const [coverLetter, setCoverLetter] = useState(true);
  const [phase, setPhase] = useState<Phase>({ name: "form" });
  const [error, setError] = useState<AiFailure | null>(null);
  const [checking, startChecking] = useTransition();
  const [generating, startGenerating] = useTransition();
  const busy = checking || generating;

  // The previous error is cleared outside the transition: updates inside one
  // only land when it ends, which would leave a stale error on screen while
  // Claude works.
  const check = () => {
    setError(null);
    startChecking(async () => {
      const result = await assessJob({ jobDescription });
      if (result.ok) setPhase({ name: "assessed", assessment: result.assessment });
      else setError(result);
    });
  };

  const generate = () => {
    setError(null);
    startGenerating(async () => {
      const result = await generateTailoredResume({
        jobDescription,
        jobUrl,
        template,
        language,
        coverLetter,
        assessment: phase.name === "assessed" ? phase.assessment : null,
      });
      if (!result.ok) {
        setError(result);
        return;
      }
      try {
        sessionStorage.setItem(AUTOFIT_KEY, result.versionId);
      } catch {
        // Private mode: the editor's "Fit to 1 page" button still works.
      }
      setPhase({ name: "done", resumeId: result.resumeId, versionId: result.versionId, notes: result.notes });
    });
  };

  if (phase.name === "done") {
    return (
      <section className="anim-rise max-w-2xl rounded-2xl bg-surface p-8 shadow-card">
        <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
          <CheckIcon className="size-6" />
        </span>
        <h2 className="text-[19px] font-semibold text-ink">{t.tailor.doneTitle}</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">{t.tailor.doneHint}</p>
        {phase.notes.length > 0 && (
          <ul className="mt-5 space-y-2 text-[14px] leading-relaxed text-ink-muted">
            {phase.notes.map((note) => (
              <li key={note} className="flex gap-2.5">
                <span className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-rose-400" />
                <span dir="auto">{note}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={editorUrl(phase.resumeId, phase.versionId)} className={primary}>
            <SparkleIcon className="size-4.5" />
            {t.tailor.openResume}
          </Link>
          <button
            type="button"
            className={secondary}
            onClick={() => {
              setPhase({ name: "form" });
              setJobDescription("");
              setJobUrl("");
            }}
          >
            {t.tailor.changeJob}
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      {phase.name === "form" ? (
        <JobForm
          jobDescription={jobDescription}
          setJobDescription={setJobDescription}
          jobUrl={jobUrl}
          setJobUrl={setJobUrl}
          disabled={busy}
        />
      ) : (
        <AssessmentCard assessment={phase.assessment} onBack={() => setPhase({ name: "form" })} disabled={busy} />
      )}

      <section className="rounded-2xl bg-surface p-7 shadow-card">
        <div className="grid gap-7 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="mb-3 text-[13px] font-semibold text-ink">{t.tailor.templateLabel}</p>
            <TemplatePicker value={template} onChange={setTemplate} />
          </div>
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink">{t.tailor.languageLabel}</p>
              <Segmented
                options={[{ label: t.tailor.languageAuto, value: "auto" as const }, ...LOCALE_OPTIONS]}
                value={language}
                onChange={setLanguage}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-3 text-[14px] text-ink">
              <input
                type="checkbox"
                checked={coverLetter}
                onChange={(e) => setCoverLetter(e.target.checked)}
                className="size-4 accent-rose-500"
              />
              {t.tailor.coverLetter}
            </label>
          </div>
        </div>
      </section>

      {error && <ErrorCard error={error} onRetry={phase.name === "assessed" ? generate : check} />}

      <div className="flex flex-wrap items-center gap-3">
        {phase.name === "form" ? (
          <>
            <button type="button" className={primary} disabled={busy || !jobDescription.trim()} onClick={check}>
              <SparkleIcon className="size-4.5" />
              {checking ? t.tailor.checking : t.tailor.check}
            </button>
            <button type="button" className={secondary} disabled={busy || !jobDescription.trim()} onClick={generate}>
              {generating ? t.tailor.generating : t.tailor.skipCheck}
            </button>
          </>
        ) : (
          <button
            type="button"
            className={phase.assessment.verdict === "notAdvised" ? secondary : primary}
            disabled={busy}
            onClick={generate}
          >
            <SparkleIcon className="size-4.5" />
            {generating
              ? t.tailor.generating
              : phase.assessment.verdict === "greenlit"
                ? t.tailor.generate
                : t.tailor.generateAnyway}
          </button>
        )}
        {busy && (
          <span className="flex items-center gap-2.5 text-[13px] text-ink-faint">
            <span className="size-4 animate-spin rounded-full border-2 border-rose-300 border-t-transparent" />
            {generating && t.tailor.generatingHint}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- form ---------------------------------- */

function JobForm(props: {
  jobDescription: string;
  setJobDescription: (v: string) => void;
  jobUrl: string;
  setJobUrl: (v: string) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  return (
    <section className="space-y-5 rounded-2xl bg-surface p-7 shadow-card">
      <div>
        <label htmlFor="job" className="mb-2 block text-[13px] font-semibold text-ink">
          {t.tailor.jobLabel}
        </label>
        <textarea
          id="job"
          value={props.jobDescription}
          onChange={(e) => props.setJobDescription(e.target.value)}
          placeholder={t.tailor.jobPlaceholder}
          disabled={props.disabled}
          dir="auto"
          rows={12}
          className={`${field} resize-y leading-relaxed`}
        />
      </div>
      <div className="max-w-xl">
        <label htmlFor="job-url" className="mb-2 block text-[13px] font-semibold text-ink">
          {t.tailor.urlLabel}
        </label>
        <input
          id="job-url"
          value={props.jobUrl}
          onChange={(e) => props.setJobUrl(e.target.value)}
          placeholder={t.tailor.urlPlaceholder}
          disabled={props.disabled}
          dir="ltr"
          className={field}
        />
      </div>
    </section>
  );
}

function TemplatePicker({ value, onChange }: { value: TemplateId; onChange: (id: TemplateId) => void }) {
  const { t } = useI18n();
  const roots = sampleResumeRoots();
  const format = PAGE_FORMATS[DESIGN_DEFAULTS.pageFormat];
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
      {TEMPLATE_IDS.map((id) => {
        const active = value === id;
        return (
          <div key={id}>
            <button
              type="button"
              onClick={() => onChange(id)}
              aria-pressed={active}
              className={`pressable relative block w-full overflow-hidden rounded-xl bg-surface text-start transition-all duration-200 ${
                active
                  ? "shadow-card-hover ring-2 ring-rose-400 ring-offset-4 ring-offset-[var(--surface)]"
                  : "shadow-card hover:-translate-y-0.5 hover:shadow-card-hover"
              }`}
              style={{ aspectRatio: `${format.width} / ${format.height}` }}
            >
              <div className="pointer-events-none select-none">
                <ResumePreview tree={{ roots }} design={resolveDesign(null, { template: id })} thumbnail />
              </div>
              {active && (
                <span className="absolute end-2 top-2 flex size-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-card">
                  <CheckIcon className="size-3.5" />
                </span>
              )}
            </button>
            <p className="mt-2.5 text-[13px] font-semibold text-ink">{t.design.template[id].name}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------- assessment ------------------------------- */

const VERDICT_STYLE: Record<Verdict, string> = {
  greenlit: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  borderline: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  notAdvised: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

const STATUS_STYLE: Record<RequirementStatus, string> = {
  match: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  partial: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  mitigable: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  gap: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

function percent(v: number) {
  return `${Math.round(v * 100)}%`;
}

function AssessmentCard({
  assessment: a,
  onBack,
  disabled,
}: {
  assessment: Assessment;
  onBack: () => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const order: Record<string, number> = { hard: 0, nice: 1, soft: 2 };
  const requirements = [...a.requirements].sort((x, y) => order[x.category] - order[y.category]);

  return (
    <section className="anim-rise rounded-2xl bg-surface p-7 shadow-card">
      <button
        type="button"
        onClick={onBack}
        disabled={disabled}
        className="pressable mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:text-ink disabled:opacity-50"
      >
        <ArrowLeftIcon className="size-4 text-ink-faint rtl:-scale-x-100" />
        {t.tailor.changeJob}
      </button>

      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-1">
          {(a.jobTitle || a.company) && (
            <p dir="auto" className="text-[13px] font-medium text-ink-faint">
              {[a.jobTitle, a.company].filter(Boolean).join(" · ")}
            </p>
          )}
          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-[13px] font-semibold ${VERDICT_STYLE[a.verdict]}`}>
            {t.tailor.verdict[a.verdict]}
          </span>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink">{t.tailor.verdictBody[a.verdict]}</p>
          {a.summary && (
            <p dir="auto" className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
              {a.summary}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Score label={t.tailor.hardScore} value={a.hardScore} />
          <Score label={t.tailor.overallScore} value={a.overallScore} />
        </div>
      </div>

      <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
            {t.tailor.requirements}
          </p>
          <ul className="divide-y divide-hairline rounded-xl border border-hairline">
            {requirements.map((r, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${STATUS_STYLE[r.status]}`}>
                  {t.tailor.status[r.status]}
                </span>
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="text-[13.5px] font-medium text-ink">
                    {r.requirement}
                    <span className="ms-2 text-[11.5px] font-normal text-ink-faint">{t.tailor.category[r.category]}</span>
                  </p>
                  {r.evidence && (
                    <p dir="auto" className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
                      {r.evidence}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <BulletBlock title={t.tailor.strengths} items={a.strengths} />
          <BulletBlock title={t.tailor.framing} items={a.framing} />
        </div>
      </div>
    </section>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  const tone = value >= 0.8 ? "text-emerald-600" : value >= 0.65 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="min-w-[120px] rounded-xl bg-sunken/70 px-4 py-3">
      <p className={`text-[26px] font-bold tabular-nums tracking-tight ${tone}`}>{percent(value)}</p>
      <p className="text-[12px] text-ink-muted">{label}</p>
    </div>
  );
}

function BulletBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">{title}</p>
      <ul className="space-y-2 text-[13px] leading-relaxed text-ink-muted">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-rose-400" />
            <span dir="auto">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------- error --------------------------------- */

function ErrorCard({ error, onRetry }: { error: AiFailure; onRetry: () => void }) {
  const { t } = useI18n();
  const known = t.tailor.error[error.error];
  return (
    <section className="flex gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-500/30 dark:bg-rose-500/10">
      <WarningIcon className="mt-0.5 size-5 shrink-0 text-rose-500" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-rose-800 dark:text-rose-200">{t.tailor.errorTitle}</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-rose-800/90 dark:text-rose-200/90">{known}</p>
        {error.message && error.error !== "no-job" && error.error !== "no-profile" && (
          <details className="mt-2 text-[12px] text-rose-800/70 dark:text-rose-200/70">
            <summary className="cursor-pointer">{t.tailor.details}</summary>
            <pre dir="ltr" className="mt-1.5 whitespace-pre-wrap break-words font-mono">
              {error.message}
            </pre>
          </details>
        )}
        {error.error !== "no-profile" && error.error !== "no-job" && error.error !== "cli-missing" && (
          <button type="button" onClick={onRetry} className="mt-3 text-[13px] font-semibold text-rose-700 underline dark:text-rose-300">
            {t.tailor.retry}
          </button>
        )}
      </div>
    </section>
  );
}
