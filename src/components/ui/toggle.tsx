"use client";

import { CheckIcon } from "./icons";

/** A labelled checkbox row — the shape every on/off design setting uses. */
export function Toggle({
  label,
  checked,
  onChange,
  hint,
  trailing,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="pressable group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 text-left"
      >
        <span
          className={`flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150 ${
            checked
              ? "border-rose-500 bg-rose-500 text-white"
              : "border-hairline-strong bg-surface text-transparent group-hover:border-ink-faint"
          }`}
        >
          <CheckIcon className="size-3" strokeWidth={3} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] text-ink">{label}</span>
          {hint && <span className="block truncate text-[11px] text-ink-faint">{hint}</span>}
        </span>
      </button>
      {trailing}
    </div>
  );
}
