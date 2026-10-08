import Link from "next/link";
import { TailorFlow } from "@/components/tailor/tailor-flow";
import { BookOpenIcon } from "@/components/ui/icons";
import { getProfile } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Tailor to a job: paste a posting, check the fit against the master profile,
 * and generate a resume for it. Without a profile there is nothing truthful
 * to write from, so the page sends the user there first.
 */
export default async function TailorPage() {
  const [profile, { t }] = await Promise.all([getProfile(), getI18n()]);

  return (
    <div className="mx-auto max-w-6xl px-10 py-12">
      <header className="anim-rise mb-9">
        <h1 className="text-[32px] font-bold tracking-tight text-ink">{t.tailor.title}</h1>
        <p className="mt-2 max-w-3xl text-[17px] leading-relaxed text-ink-muted">{t.tailor.subtitle}</p>
      </header>

      {profile.content.trim() ? (
        <TailorFlow />
      ) : (
        <section className="max-w-xl rounded-2xl bg-surface p-8 shadow-card">
          <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-sunken text-ink-muted">
            <BookOpenIcon className="size-5.5" />
          </span>
          <h2 className="text-[19px] font-semibold text-ink">{t.tailor.noProfileTitle}</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{t.tailor.noProfileBody}</p>
          <Link
            href="/profile"
            className="pressable mt-6 inline-flex rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-3 text-[14px] font-semibold text-white shadow-card transition-all duration-150 hover:shadow-card-hover hover:brightness-[1.03]"
          >
            {t.tailor.noProfileCta}
          </Link>
        </section>
      )}
    </div>
  );
}
