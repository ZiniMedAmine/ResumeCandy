"use client";

import { useTransition } from "react";
import { setUiLocale } from "@/app/actions/locale";
import { Segmented } from "@/components/ui/segmented";
import { useI18n } from "@/lib/i18n/provider";
import { LOCALE_LIST, type LocaleId } from "@/lib/locale";

/**
 * The interface-language control.
 *
 * Each option is written in its own language — "Français", never "French" —
 * because a language picker whose options are translated is a picker you
 * cannot use once you have landed in a language you do not read.
 *
 * The action writes the account column and the cookie and revalidates the root
 * layout, so the whole page comes back in the new language; the transition is
 * what keeps the control responsive while that round trip happens.
 */
export function LanguagePicker() {
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  const options = LOCALE_LIST.map((l) => ({ label: l.name, value: l.id }));

  const choose = (next: LocaleId) => {
    if (next === locale) return;
    startTransition(async () => {
      await setUiLocale(next);
    });
  };

  return (
    <div className={pending ? "opacity-60 transition-opacity duration-150" : undefined}>
      <p className="mb-2 text-[13px] font-semibold text-ink">{t.account.interfaceLanguage}</p>
      <Segmented options={options} value={locale} onChange={choose} />
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-faint">
        {t.account.interfaceLanguageHint}
      </p>
    </div>
  );
}
