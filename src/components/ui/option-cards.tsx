"use client";

/**
 * A row of picture-first choices: a little diagram of what the option does,
 * with its name underneath. Used wherever a word alone would be ambiguous —
 * "Mix" columns, "Split" dates, heading styles — because the shape of the
 * result is the thing being chosen.
 */
export function OptionCards<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: { value: T; label: string; preview: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`pressable rounded-xl border p-2 text-center transition-all duration-150 ${
              active
                ? "border-rose-400 bg-rose-50/50 ring-4 ring-rose-500/10 dark:bg-rose-500/[0.07]"
                : "border-hairline hover:border-hairline-strong"
            }`}
          >
            <span
              className={`flex h-11 items-center justify-center rounded-lg px-2 ${
                active ? "text-rose-500" : "text-ink-faint"
              }`}
            >
              {opt.preview}
            </span>
            <span
              className={`mt-1 block truncate text-[11.5px] font-medium ${
                active ? "text-ink" : "text-ink-muted"
              }`}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------- little diagram parts -------------------------- */

/** A stack of lines standing in for text. */
export function Lines({ count = 3, width = "100%" }: { count?: number; width?: string }) {
  return (
    <span className="flex flex-col gap-[3px]" style={{ width }}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="block h-[3px] rounded-full bg-current opacity-60"
          style={{ width: i === count - 1 ? "70%" : "100%" }}
        />
      ))}
    </span>
  );
}

/** Two line stacks side by side, for the column pickers. */
export function TwoUp({ ratio = "1fr 1fr" }: { ratio?: string }) {
  return (
    <span className="grid w-full gap-[5px]" style={{ gridTemplateColumns: ratio }}>
      <Lines count={3} />
      <Lines count={3} />
    </span>
  );
}
