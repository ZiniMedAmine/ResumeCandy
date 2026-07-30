import { FileIcon, LayersIcon, UserIcon, WarningIcon } from "@/components/ui/icons";
import { accountSummary } from "@/lib/data";
import { relativeTime } from "@/lib/relative-time";

export const dynamic = "force-dynamic";

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-card">
      <span className="flex size-9 items-center justify-center rounded-xl bg-sunken text-ink-muted [&>svg]:size-4">
        {icon}
      </span>
      <p className="mt-3 text-[22px] font-bold tabular-nums tracking-tight text-ink">{value}</p>
      <p className="text-[12.5px] text-ink-muted">{label}</p>
    </div>
  );
}

export default function AccountPage() {
  const account = accountSummary();

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-9">
        <h1 className="text-[26px] font-bold tracking-tight text-ink">My account</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
          Who you’re signed in as and what this collection holds.
        </p>
      </header>

      <section className="mb-6 rounded-2xl bg-surface p-6 shadow-card">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-card">
            <UserIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-ink">{account.userId}</p>
            <p className="text-[12.5px] text-ink-muted">
              Collection created {relativeTime(account.createdAt)}
            </p>
          </div>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-6 sm:grid-cols-3">
        <Stat icon={<FileIcon />} label="Resumes" value={String(account.resumeCount)} />
        <Stat icon={<LayersIcon />} label="Versions across all resumes" value={String(account.versionCount)} />
      </div>

      <section className="flex items-start gap-3 rounded-2xl border border-hairline bg-surface p-5">
        <WarningIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <div>
          <p className="text-[13.5px] font-semibold text-ink">Sign-in isn’t wired up yet</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
            This build runs as a single local user, and everything is stored in a database file on
            this machine. The data model already scopes collections per user, so adding real
            accounts later won’t require moving your resumes.
          </p>
        </div>
      </section>
    </div>
  );
}
