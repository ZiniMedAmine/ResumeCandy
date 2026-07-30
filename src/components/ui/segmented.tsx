"use client";

import type { SegmentOption } from "@/lib/design";

/** Segmented control: equal-width options, one active. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex w-full rounded-xl bg-sunken p-1">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`pressable flex-1 rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition-all duration-150 ${
            opt.value === value
              ? "bg-surface text-ink shadow-card"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
