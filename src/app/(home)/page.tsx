import { NewResumeTile } from "@/components/dashboard/new-resume-tile";
import { ResumeCard } from "@/components/dashboard/resume-card";
import { listResumeCards } from "@/lib/data";
import { enterDelay } from "@/lib/motion";

export const dynamic = "force-dynamic";

export default async function ResumesPage() {
  const resumes = await listResumeCards();

  return (
    <div className="mx-auto max-w-7xl px-10 py-12">
      <header className="anim-rise mb-11">
        <h1 className="text-[32px] font-bold tracking-tight text-ink">My resumes</h1>
        <p className="mt-2 text-[17px] leading-relaxed text-ink-muted">
          One resume per career, with unlimited tailored versions inside each.
        </p>
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
