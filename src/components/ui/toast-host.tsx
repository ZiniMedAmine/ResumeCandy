"use client";

import { useResumeStore } from "@/store/resume-store";
import { CheckIcon, UndoIcon, WarningIcon, XIcon } from "./icons";

/** Bottom-center toast stack fed by the resume store. */
export function ToastHost() {
  const toasts = useResumeStore((s) => s.toasts);
  const dismiss = useResumeStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="anim-lift pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-zinc-900/95 py-2 pl-4 pr-2 text-[13px] text-zinc-50 shadow-pop backdrop-blur dark:bg-zinc-800"
        >
          {t.kind === "error" ? (
            <WarningIcon className="size-4 shrink-0 text-red-400" />
          ) : t.kind === "success" ? (
            <CheckIcon className="size-4 shrink-0 text-emerald-400" />
          ) : null}
          <span className="leading-snug">{t.message}</span>
          {t.undo && (
            <button
              type="button"
              onClick={() => {
                t.undo?.();
                dismiss(t.id);
              }}
              className="pressable flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium text-white transition-colors duration-150 hover:bg-white/20"
            >
              <UndoIcon className="size-3.5" />
              {t.undoLabel ?? "Undo"}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="pressable shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors duration-150 hover:text-white"
            aria-label="Dismiss"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
