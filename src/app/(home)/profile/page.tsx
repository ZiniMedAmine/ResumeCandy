import { ProfileEditor } from "@/components/profile/profile-editor";
import { getProfile } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * The master profile: one long markdown document per account, the only
 * source tailored resumes may draw facts from.
 */
export default async function ProfilePage() {
  const [profile, { t }] = await Promise.all([getProfile(), getI18n()]);

  return (
    <div className="mx-auto max-w-7xl px-10 py-12">
      <header className="anim-rise mb-9">
        <h1 className="text-[32px] font-bold tracking-tight text-ink">{t.profile.title}</h1>
        <p className="mt-2 max-w-3xl text-[17px] leading-relaxed text-ink-muted">{t.profile.subtitle}</p>
      </header>
      <ProfileEditor initialContent={profile.content} />
    </div>
  );
}
