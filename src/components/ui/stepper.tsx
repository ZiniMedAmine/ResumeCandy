"use client";

import { clampToRange, type StepperRange } from "@/lib/design";
import { useI18n } from "@/lib/i18n/provider";
import { MinusIcon, PlusIcon } from "./icons";

/**
 * A value on a tick track with −/+ buttons either side.
 *
 * The track is clickable as well as the buttons: the ticks make the range
 * legible at a glance, and clicking one jumps straight there, which beats
 * holding "+" eleven times to cross a wide range.
 */
export function Stepper({
  label,
  range,
  value,
  onChange,
  trailing,
}: {
  label: string;
  range: StepperRange;
  value: number;
  onChange: (value: number) => void;
  /** Rendered opposite the label — usually the override/reset marker. */
  trailing?: React.ReactNode;
}) {
  const { dir } = useI18n();
  const steps = Math.round((range.max - range.min) / range.step);
  // A tick per step is unreadable on a wide range; ~8 segments always reads.
  const ticks = Math.min(8, steps);
  const filled = Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)));
  const atMin = value <= range.min + 1e-6;
  const atMax = value >= range.max - 1e-6;

  const btn =
    "pressable flex size-8 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface text-ink-muted transition-colors duration-150 hover:border-hairline-strong hover:text-ink disabled:opacity-35 disabled:hover:border-hairline";

  return (
    <div>
      <div className="mb-2 flex h-4 items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
          {label}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tabular-nums text-ink-muted">
            {range.format(value)}
          </span>
          {trailing}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={range.min}
          aria-valuemax={range.max}
          aria-valuenow={value}
          onKeyDown={(e) => {
            // Left and right are physical keys but a value track is read the
            // way the page is, so RTL swaps which of them means "less".
            const back = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
            const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
            if (e.key === back || e.key === "ArrowDown") {
              e.preventDefault();
              onChange(clampToRange(range, value - range.step));
            } else if (e.key === forward || e.key === "ArrowUp") {
              e.preventDefault();
              onChange(clampToRange(range, value + range.step));
            }
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const offset = e.clientX - rect.left;
            const ratio = (dir === "rtl" ? rect.width - offset : offset) / rect.width;
            onChange(clampToRange(range, range.min + ratio * (range.max - range.min)));
          }}
          className="relative h-8 flex-1 cursor-pointer overflow-hidden rounded-lg bg-sunken"
        >
          <div
            className="absolute inset-y-0 start-0 rounded-lg bg-rose-500/85 transition-[width] duration-150"
            style={{ width: `${filled * 100}%` }}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-around">
            {Array.from({ length: ticks - 1 }, (_, i) => (
              <span key={i} className="h-2.5 w-px bg-ink-faint/25" />
            ))}
          </div>
        </div>

        <button
          type="button"
          className={btn}
          disabled={atMin}
          onClick={() => onChange(clampToRange(range, value - range.step))}
          aria-label={`Decrease ${label}`}
        >
          <MinusIcon className="size-3.5" />
        </button>
        <button
          type="button"
          className={btn}
          disabled={atMax}
          onClick={() => onChange(clampToRange(range, value + range.step))}
          aria-label={`Increase ${label}`}
        >
          <PlusIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
