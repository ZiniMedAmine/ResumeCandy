"use client";

import { useState } from "react";
import { CheckIcon, ChevronRightIcon, WarningIcon, XIcon } from "@/components/ui/icons";
import { analyzeResume, matchKeywords, type AtsCheck } from "@/lib/ats";
import { useI18n } from "@/lib/i18n/provider";
import { useDesign, useRenderTree, useResumeStore } from "@/store/resume-store";

function tone(score: number) {
  if (score >= 85) return { ring: "#10b981", text: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 65) return { ring: "#f59e0b", text: "text-amber-600 dark:text-amber-400" };
  return { ring: "#f43f5e", text: "text-rose-600 dark:text-rose-400" };
}

/** The score as a ring — the one number on the panel, so it gets the space. */
function ScoreRing({ score }: { score: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const { ring } = tone(score);
  return (
    <svg viewBox="0 0 72 72" className="size-[72px] shrink-0 -rotate-90" aria-hidden>
      <circle cx="36" cy="36" r={r} fill="none" strokeWidth="6" className="stroke-sunken" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        stroke={ring}
        strokeDasharray={`${(score / 100) * c} ${c}`}
        className="transition-[stroke-dasharray] duration-500"
      />
    </svg>
  );
}

function CheckRow({ check }: { check: AtsCheck }) {
  const { t, fmt } = useI18n();
  const copy = t.ats.checks[check.id];
  const pass = check.status === "pass";
  return (
    <div className="flex gap-2.5 rounded-xl px-2.5 py-2">
      <span
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
          pass
            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
            : check.status === "warn"
              ? "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
              : "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
        }`}
      >
        {pass ? (
          <CheckIcon className="size-3" />
        ) : check.status === "warn" ? (
          <WarningIcon className="size-3" />
        ) : (
          <XIcon className="size-3" />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-ink">{copy.title}</p>
        <p className="text-[11.5px] leading-relaxed text-ink-muted">
          {fmt(pass ? copy.pass : copy.issue, check.params)}
        </p>
      </div>
    </div>
  );
}

/**
 * "ATS check": scores what this version would print — hidden content is
 * already gone from the tree it reads — and, when the version carries a job
 * description, which of the posting's key terms the CV actually uses.
 */
export function AtsPanel({ onClose, onOpenJob }: { onClose: () => void; onOpenJob: () => void }) {
  const versions = useResumeStore((s) => s.versions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const tree = useRenderTree();
  const { design } = useDesign();
  const { t, fmt } = useI18n();
  const [showPassed, setShowPassed] = useState(false);

  const version = versions.find((v) => v.id === activeVersionId);
  const jobDescription = version?.jobDescription ?? "";

  // The React Compiler memoizes these on their inputs; no manual useMemo.
  const report = analyzeResume(tree.roots, design);
  const keywords = jobDescription.trim() ? matchKeywords(jobDescription, tree.roots) : null;

  const issues = report.checks
    .filter((c) => c.status !== "pass")
    .sort((a, b) => (a.status === b.status ? b.weight - a.weight : a.status === "fail" ? -1 : 1));
  const passed = report.checks.filter((c) => c.status === "pass");
  const { text } = tone(report.score);
  const verdict = report.score >= 85 ? t.ats.great : report.score >= 65 ? t.ats.good : t.ats.low;

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-s border-hairline bg-surface">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-semibold text-ink">{t.ats.title}</h3>
          <p className="truncate text-[11.5px] text-ink-faint">
            {fmt(t.ats.subtitle, { name: version?.name ?? "" })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
          aria-label={t.ats.close}
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex items-center gap-4 rounded-2xl bg-sunken/60 p-4">
          <div className="relative">
            <ScoreRing score={report.score} />
            <span
              className={`absolute inset-0 flex items-center justify-center text-[19px] font-bold tabular-nums ${text}`}
            >
              {report.score}
            </span>
          </div>
          <div>
            <p className={`text-[14px] font-semibold ${text}`}>{verdict}</p>
            <p className="mt-0.5 text-[11.5px] text-ink-faint">
              {fmt(t.ats.words, { n: report.wordCount })}
            </p>
          </div>
        </div>

        {/* ------------------------------ keywords ------------------------------ */}
        <div className="rounded-2xl border border-hairline p-4">
          <p className="text-[12.5px] font-semibold text-ink">{t.ats.keywordsTitle}</p>
          {keywords ? (
            <>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sunken">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${keywords.coverage}%`, background: tone(keywords.coverage).ring }}
                />
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
                {fmt(t.ats.coverage, { coverage: keywords.coverage })}
              </p>
              {keywords.missing.length > 0 && (
                <>
                  <p className="mt-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
                    {t.ats.missing}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {keywords.missing.map((k) => (
                      <span
                        key={k}
                        dir="auto"
                        className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">{t.ats.missingHint}</p>
                </>
              )}
              {keywords.matched.length > 0 && (
                <>
                  <p className="mt-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
                    {t.ats.found}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {keywords.matched.map((k) => (
                      <span
                        key={k}
                        dir="auto"
                        className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-muted">{t.ats.keywordsEmpty}</p>
              <button
                type="button"
                onClick={onOpenJob}
                className="pressable mt-3 rounded-lg border border-hairline px-2.5 py-1.5 text-[12px] font-medium text-ink transition-colors duration-150 hover:border-hairline-strong hover:bg-sunken"
              >
                {t.ats.addJobDescription}
              </button>
            </>
          )}
        </div>

        {/* ------------------------------- checks ------------------------------- */}
        {issues.length > 0 && (
          <div>
            <p className="mb-1 px-1 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
              {t.ats.toImprove}
            </p>
            <div className="space-y-0.5">
              {issues.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </div>
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setShowPassed((v) => !v)}
            className="pressable flex w-full items-center gap-1 px-1 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint transition-colors duration-150 hover:text-ink-muted"
          >
            <ChevronRightIcon
              className={`size-3 transition-transform rtl:-scale-x-100 ${showPassed ? "rotate-90" : ""}`}
            />
            {t.ats.passed} · {passed.length}
          </button>
          {showPassed && (
            <div className="mt-1 space-y-0.5">
              {passed.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
