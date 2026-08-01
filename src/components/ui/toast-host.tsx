"use client";

import { useI18n } from "@/lib/i18n/provider";
import { useResumeStore } from "@/store/resume-store";
import { CheckIcon, UndoIcon, WarningIcon, XIcon } from "./icons";

/**
 * Bottom-center toast stack fed by the resume store.
 *
 * The store emits `{ message, params }` rather than a sentence, so the wording
 * is resolved here — the one place in the toast path that is a component and
 * can therefore read the interface language.
 */
export function ToastHost() {
  const toasts = useResumeStore((s) => s.toasts);
  const dismiss = useResumeStore((s) => s.dismissToast);
  const { t, fmt } = useI18n();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="anim-lift pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-zinc-900/95 py-2 ps-4 pe-2 text-[13px] text-zinc-50 shadow-pop backdrop-blur dark:bg-zinc-800"
        >
          {toast.kind === "error" ? (
            <WarningIcon className="size-4 shrink-0 text-red-400" />
          ) : toast.kind === "success" ? (
            <CheckIcon className="size-4 shrink-0 text-emerald-400" />
          ) : null}
          <span className="leading-snug">{fmt(t.toast[toast.message], toast.params)}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                dismiss(toast.id);
              }}
              className="pressable flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium text-white transition-colors duration-150 hover:bg-white/20"
            >
              <UndoIcon className="size-3.5" />
              {t.common.undo}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="pressable shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors duration-150 hover:text-white"
            aria-label={t.common.dismiss}
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
