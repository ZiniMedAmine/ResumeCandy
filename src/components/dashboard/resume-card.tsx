"use client";

import Link from "next/link";
import { ResumePreview } from "@/components/preview/resume-preview";
import { PAGE_FORMATS } from "@/lib/design";
import type { ResumeCardData } from "@/lib/data";
import { relativeTime } from "@/lib/relative-time";
import { ResumeCardActions } from "./resume-card-actions";

/**
 * A resume in the grid: a real thumbnail of its Default version, so the card
 * is recognisable at a glance rather than a generic file icon.
 */
export function ResumeCard({ resume }: { resume: ResumeCardData }) {
  const format = PAGE_FORMATS[resume.design.pageFormat];
  const empty = resume.roots.length === 0;

  return (
    <div className="group">
      <Link
        href={`/resume/${resume.id}`}
        className="block overflow-hidden rounded-xl bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
        style={{ aspectRatio: `${format.width} / ${format.height}` }}
        aria-label={`Open ${resume.name}`}
      >
        {empty ? (
          <div className="flex h-full items-center justify-center text-[12px] text-ink-faint">
            Empty resume
          </div>
        ) : (
          <div className="pointer-events-none select-none">
            <ResumePreview tree={{ roots: resume.roots }} design={resume.design} thumbnail />
          </div>
        )}
      </Link>

      <div className="mt-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/resume/${resume.id}`}
            className="block truncate text-[14px] font-semibold text-ink transition-colors duration-150 hover:text-rose-500 hover:underline"
          >
            {resume.name}
          </Link>
          <p className="mt-0.5 truncate text-[12px] text-ink-faint">
            edited {relativeTime(resume.updatedAt)} · {format.name} ·{" "}
            {resume.versionCount} version{resume.versionCount === 1 ? "" : "s"}
          </p>
        </div>
        <ResumeCardActions
          resumeId={resume.id}
          name={resume.name}
          baseVersionId={resume.baseVersionId}
        />
      </div>
    </div>
  );
}
