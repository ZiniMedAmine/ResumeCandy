"use client";

import { useState } from "react";
import { ChevronRightIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { PAGE_FORMATS } from "@/lib/design";

/**
 * The create tile. It stays a single quiet target until clicked, then asks for
 * the one thing a new resume needs — what career it is for — and hands off to
 * the template step. A plain GET form, so the name travels in the URL and the
 * chooser can be linked or reloaded safely.
 */
export function NewResumeTile() {
  const [naming, setNaming] = useState(false);
  const format = PAGE_FORMATS.a4;

  return (
    <div>
      <div
        className="rounded-xl border border-dashed border-hairline-strong transition-all duration-150 hover:border-rose-300 hover:-translate-y-0.5"
        style={{ aspectRatio: `${format.width} / ${format.height}` }}
      >
        {naming ? (
          <form method="get" action="/new" className="flex h-full flex-col justify-center gap-2.5 p-5">
            <label
              htmlFor="new-resume-name"
              className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint"
            >
              Career or role
            </label>
            <input
              id="new-resume-name"
              name="name"
              required
              autoFocus
              placeholder="e.g. Product Manager"
              className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[13.5px] text-ink outline-none transition-colors duration-150 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
            />
            <button
              type="submit"
              className="pressable flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 px-3 py-2 text-[13px] font-semibold text-white shadow-card transition-all duration-150 hover:brightness-[1.03]"
            >
              Choose template
              <ChevronRightIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setNaming(false)}
              className="pressable flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
            >
              <XIcon className="size-3.5" />
              Cancel
            </button>
            <p className="text-[11px] leading-relaxed text-ink-faint">
              A separate identity with its own content and versions.
            </p>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="pressable group/new flex h-full w-full flex-col items-center justify-center gap-2.5 text-ink-faint transition-colors duration-150 hover:text-rose-500"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-sunken transition-colors duration-150 group-hover/new:bg-rose-50 dark:group-hover/new:bg-rose-500/10">
              <PlusIcon className="size-5" />
            </span>
            <span className="text-[13.5px] font-semibold">New resume</span>
          </button>
        )}
      </div>
      <div className="mt-3 h-[38px]" aria-hidden />
    </div>
  );
}
