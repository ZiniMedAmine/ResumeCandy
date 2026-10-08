import Link from "next/link";
import { NewResumeTile } from "@/components/dashboard/new-resume-tile";
import { ResumeCard } from "@/components/dashboard/resume-card";
import { SparkleIcon } from "@/components/ui/icons";
import { listResumeCards } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { enterDelay } from "@/lib/motion";

export const dynamic = "force-dynamic";

export default async function ResumesPage() {
  const [resumes, { t }] = await Promise.all([listResumeCards(), getI18n()]);

  return (
    <div className="mx-auto max-w-7xl px-10 py-12">
      <header className="anim-rise mb-11 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-ink">{t.dashboard.title}</h1>
          <p className="mt-2 text-[17px] leading-relaxed text-ink-muted">{t.dashboard.subtitle}</p>
        </div>
        <Link
          href="/tailor"
          className="pressable inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-3 text-[14px] font-semibold text-white shadow-card transition-all duration-150 hover:shadow-card-hover hover:brightness-[1.03]"
        >
          <SparkleIcon className="size-4.5" />
          {t.sidebar.tailor}
        </Link>
      </header>

      {/* The grid deals itself in, ~40ms apart, so the page lands instead of
          appearing. Capped so a long shelf never feels like it is loading. */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
        <div className="anim-rise" style={enterDelay(0)}>
          <NewResumeTile />
        </div>
        {resumes.map((resume, i) => (
          <div key={resume.id} className="anim-rise" style={enterDelay(i + 1)}>
            <ResumeCard resume={resume} />
          </div>
        ))}
      </div>
    </div>
  );
}
