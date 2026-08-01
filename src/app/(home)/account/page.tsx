import { signOut } from "@/app/actions/auth";
import { LanguagePicker } from "@/components/account/language-picker";
import { FileIcon, LayersIcon, UserIcon } from "@/components/ui/icons";
import { accountSummary } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { RelativeTime } from "@/components/ui/relative-time";

export const dynamic = "force-dynamic";

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
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
  const [account, { t, fmt }] = await Promise.all([accountSummary(), getI18n()]);

  return (
    <div className="mx-auto max-w-7xl px-10 py-12">
      <header className="anim-rise mb-11">
        <h1 className="text-[32px] font-bold tracking-tight text-ink">{t.account.title}</h1>
        <p className="mt-2 text-[17px] leading-relaxed text-ink-muted">{t.account.subtitle}</p>
      </header>

      <section className="mb-7 rounded-2xl bg-surface p-7 shadow-card">
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 text-[19px] font-bold text-white shadow-card">
            {initials(account.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[19px] font-semibold text-ink">{account.name}</p>
            {/* An address is Latin whatever the interface language is. */}
            <p dir="ltr" className="truncate text-start text-[15px] text-ink-muted">
              {account.email}
            </p>
            <p className="mt-0.5 text-[13.5px] text-ink-faint">
              {t.account.memberSince} <RelativeTime ms={account.memberSince} />
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="pressable shrink-0 rounded-xl border border-hairline px-4 py-2.5 text-[15px] font-medium text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
            >
              {t.sidebar.signOut}
            </button>
          </form>
        </div>
      </section>

      <section className="mb-7 max-w-md rounded-2xl bg-surface p-7 shadow-card">
        <LanguagePicker />
      </section>

      <div className="grid grid-cols-2 gap-7 sm:grid-cols-3">
        <Stat
          icon={<FileIcon />}
          label={t.account.resumes}
          value={fmt("{n}", { n: account.resumeCount })}
        />
        <Stat
          icon={<LayersIcon />}
          label={t.account.versionsAcross}
          value={fmt("{n}", { n: account.versionCount })}
        />
        <Stat
          icon={<UserIcon />}
          label={t.account.collectionAge}
          value={<RelativeTime ms={account.collectionCreatedAt} elapsed />}
        />
      </div>
    </div>
  );
}
