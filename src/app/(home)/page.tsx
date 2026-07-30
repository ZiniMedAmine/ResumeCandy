import { NewResumeTile } from "@/components/dashboard/new-resume-tile";
import { ResumeCard } from "@/components/dashboard/resume-card";
import { listResumeCards } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function ResumesPage() {
  const resumes = listResumeCards();

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-9">
        <h1 className="text-[26px] font-bold tracking-tight text-ink">My resumes</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
          One resume per career, with unlimited tailored versions inside each.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
        <NewResumeTile />
        {resumes.map((resume) => (
          <ResumeCard key={resume.id} resume={resume} />
        ))}
      </div>
    </div>
  );
}
