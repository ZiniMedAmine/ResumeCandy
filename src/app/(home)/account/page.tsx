import { signOut } from "@/app/actions/auth";
import { FileIcon, LayersIcon, UserIcon } from "@/components/ui/icons";
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
    <div className="rounded-2xl bg-surface p-6 shadow-card">
      <span className="flex size-11 items-center justify-center rounded-xl bg-sunken text-ink-muted [&>svg]:size-5">
        {icon}
      </span>
      <p className="mt-4 text-[27px] font-bold tabular-nums tracking-tight text-ink">{value}</p>
      <p className="text-[15px] text-ink-muted">{label}</p>
    </div>
  );
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default async function AccountPage() {
  const account = await accountSummary();

  return (
    <div className="mx-auto max-w-7xl px-10 py-12">
      <header className="anim-rise mb-11">
        <h1 className="text-[32px] font-bold tracking-tight text-ink">My account</h1>
        <p className="mt-2 text-[17px] leading-relaxed text-ink-muted">
          Who you’re signed in as and what this collection holds.
        </p>
      </header>

      <section className="mb-7 rounded-2xl bg-surface p-7 shadow-card">
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 text-[19px] font-bold text-white shadow-card">
            {initials(account.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[19px] font-semibold text-ink">{account.name}</p>
            <p className="truncate text-[15px] text-ink-muted">{account.email}</p>
            <p className="mt-0.5 text-[13.5px] text-ink-faint">
              Member since {relativeTime(account.memberSince)}
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="pressable shrink-0 rounded-xl border border-hairline px-4 py-2.5 text-[15px] font-medium text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-7 sm:grid-cols-3">
        <Stat icon={<FileIcon />} label="Resumes" value={String(account.resumeCount)} />
        <Stat
          icon={<LayersIcon />}
          label="Versions across all resumes"
          value={String(account.versionCount)}
        />
        <Stat
          icon={<UserIcon />}
          label="Collection age"
          value={relativeTime(account.collectionCreatedAt).replace(" ago", "")}
        />
      </div>
    </div>
  );
}
