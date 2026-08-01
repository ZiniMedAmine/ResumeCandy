"use client";

import { useState } from "react";
import { ChevronRightIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { PAGE_FORMATS } from "@/lib/design";
import { useT } from "@/lib/i18n/provider";

/**
 * The create tile. It stays a single quiet target until clicked, then asks for
 * the one thing a new resume needs — what career it is for — and hands off to
 * the template step. A plain GET form, so the name travels in the URL and the
 * chooser can be linked or reloaded safely.
 */
export function NewResumeTile() {
  const [naming, setNaming] = useState(false);
  const format = PAGE_FORMATS.a4;
  const t = useT();

  return (
    <div>
      <div
        className="rounded-2xl border border-dashed border-hairline-strong transition-all duration-150 hover:border-rose-300 hover:-translate-y-0.5"
        style={{ aspectRatio: `${format.width} / ${format.height}` }}
      >
        {naming ? (
          <form
            method="get"
            action="/new"
            className="anim-fade flex h-full flex-col justify-center gap-3 p-6"
          >
            <label
              htmlFor="new-resume-name"
              className="text-[13px] font-semibold uppercase tracking-[0.07em] text-ink-faint"
            >
              {t.dashboard.careerOrRole}
            </label>
            <input
              id="new-resume-name"
              name="name"
              required
              autoFocus
              dir="auto"
              placeholder={t.dashboard.rolePlaceholder}
              className="w-full rounded-lg border border-hairline bg-surface px-3.5 py-2.5 text-[17px] text-ink outline-none transition-colors duration-150 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
            />
            <button
              type="submit"
              className="pressable flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 px-3.5 py-2.5 text-[16px] font-semibold text-white shadow-card transition-all duration-150 hover:brightness-[1.03]"
            >
              {t.dashboard.chooseTemplate}
              <ChevronRightIcon className="size-4.5 rtl:-scale-x-100" />
            </button>
            <button
              type="button"
              onClick={() => setNaming(false)}
              className="pressable flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-[15px] font-medium text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
            >
              <XIcon className="size-4.5" />
              {t.common.cancel}
            </button>
            <p className="text-[14px] leading-relaxed text-ink-faint">{t.dashboard.tileHint}</p>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="pressable group/new flex h-full w-full flex-col items-center justify-center gap-3 text-ink-faint transition-colors duration-150 hover:text-rose-500"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-sunken transition-colors duration-150 group-hover/new:bg-rose-50 dark:group-hover/new:bg-rose-500/10">
              <PlusIcon className="size-6" />
            </span>
            <span className="text-[17px] font-semibold">{t.dashboard.newResume}</span>
          </button>
        )}
      </div>
      <div className="mt-4 h-[48px]" aria-hidden />
    </div>
  );
}
