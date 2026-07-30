import Link from "next/link";
import { TemplateChooser } from "@/components/dashboard/template-chooser";
import { ArrowLeftIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

/**
 * Step two of creating a resume. The name arrives from the dashboard tile as
 * a query param; landing here without one (a shared or edited URL) falls back
 * to asking for it rather than erroring.
 */
export default async function NewResumePage(props: {
  searchParams: Promise<{ name?: string }>;
}) {
  const { name } = await props.searchParams;
  const trimmed = (name ?? "").trim();

  if (!trimmed) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:text-ink"
        >
          <ArrowLeftIcon className="size-4 text-ink-faint" />
          Back to resumes
        </Link>

        <header className="mb-8">
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-rose-500">
            Step 1 of 2
          </p>
          <h1 className="text-[26px] font-bold tracking-tight text-ink">Name your resume</h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
            Name it after the career or role it targets — you’ll pick a template next.
          </p>
        </header>

        <form method="get" action="/new" className="max-w-sm">
          <label
            htmlFor="name"
            className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint"
          >
            Career or role
          </label>
          <input
            id="name"
            name="name"
            required
            autoFocus
            placeholder="e.g. Product Manager"
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[13.5px] text-ink outline-none transition-colors duration-150 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
          />
          <button
            type="submit"
            className="mt-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-card transition-all duration-150 hover:shadow-card-hover hover:brightness-[1.03]"
          >
            Continue
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <TemplateChooser name={trimmed} />
    </div>
  );
}
