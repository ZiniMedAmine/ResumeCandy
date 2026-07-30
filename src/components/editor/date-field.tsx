"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "@/components/ui/icons";
import {
  MONTHS,
  PRESENT,
  formatDateValue,
  initialPickerYear,
  parseDateValue,
} from "@/lib/date-value";
import type { ResolvedNode } from "@/lib/resume/types";
import { useResumeStore } from "@/store/resume-store";
import { FieldFrame, fieldControlClass, useIsCustomized } from "./provenance-field";

/** Roughly the popover's height — used to decide whether to open upward. */
const POPOVER_HEIGHT = 290;

function MonthPicker({
  value,
  allowPresent,
  onPick,
  onClose,
  openUp,
}: {
  value: string;
  allowPresent: boolean;
  onPick: (next: string) => void;
  onClose: () => void;
  openUp: boolean;
}) {
  const parsed = parseDateValue(value);
  const [year, setYear] = useState(() => initialPickerYear(value));
  const [customDraft, setCustomDraft] = useState(parsed.custom ?? "");

  return (
    <div
      className={`absolute z-40 w-64 rounded-xl border border-hairline bg-surface p-3 shadow-pop ${
        openUp ? "bottom-full mb-2" : "top-full mt-2"
      } left-0`}
      role="dialog"
      aria-label="Choose a date"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setYear((y) => y - 1)}
          className="pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
          aria-label="Previous year"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <span className="text-[13.5px] font-semibold tabular-nums text-ink">{year}</span>
        <button
          type="button"
          onClick={() => setYear((y) => y + 1)}
          className="pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
          aria-label="Next year"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {MONTHS.map((label, i) => {
          const month = i + 1;
          const selected = !parsed.present && parsed.year === year && parsed.month === month;
          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                onPick(formatDateValue({ year, month, present: false, custom: null }));
                onClose();
              }}
              className={`pressable rounded-lg py-1.5 text-[12.5px] font-medium transition-colors duration-150 ${
                selected
                  ? "bg-rose-500 text-white"
                  : "text-ink-muted hover:bg-sunken hover:text-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-hairline pt-2.5">
        <button
          type="button"
          onClick={() => {
            onPick(formatDateValue({ year, month: null, present: false, custom: null }));
            onClose();
          }}
          className={`pressable rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors duration-150 ${
            !parsed.present && parsed.year === year && parsed.month == null
              ? "bg-rose-500 text-white"
              : "bg-sunken text-ink-muted hover:text-ink"
          }`}
          title="Use the year without a month"
        >
          {year} only
        </button>
        {allowPresent && (
          <button
            type="button"
            onClick={() => {
              onPick(PRESENT);
              onClose();
            }}
            className={`pressable rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors duration-150 ${
              parsed.present ? "bg-rose-500 text-white" : "bg-sunken text-ink-muted hover:text-ink"
            }`}
          >
            {PRESENT}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            onPick("");
            onClose();
          }}
          className="pressable rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
        >
          Clear
        </button>
      </div>

      {/* Escape hatch for anything the calendar can't express ("Summer 2023"). */}
      <form
        className="mt-2.5 border-t border-hairline pt-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          onPick(customDraft.trim());
          onClose();
        }}
      >
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
          Custom text
        </label>
        <input
          value={customDraft}
          onChange={(e) => setCustomDraft(e.target.value)}
          placeholder="e.g. Summer 2023"
          className="w-full rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none transition-colors duration-150 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
        />
      </form>
    </div>
  );
}

/**
 * A date field backed by a month/year calendar instead of free typing. The
 * stored value stays exactly what the resume prints, so what you pick is what
 * appears on the page; provenance (customized chip, reset, push, copy) works
 * the same as on any other field.
 */
export function DateField({
  node,
  field,
  label,
  placeholder,
  allowPresent = false,
}: {
  node: ResolvedNode;
  field: string;
  label?: string;
  placeholder?: string;
  allowPresent?: boolean;
}) {
  const editField = useResumeStore((s) => s.editField);
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const customized = useIsCustomized(node, field);
  const value = typeof node.data[field] === "string" ? (node.data[field] as string) : "";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <FieldFrame node={node} field={field} label={label} focused={open}>
      <div ref={rootRef} className="relative">
        <div
          className={fieldControlClass(
            customized,
            "flex items-center focus-within:border-rose-300 focus-within:ring-4 focus-within:ring-rose-500/10",
            false,
          )}
        >
          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              const rect = triggerRef.current?.getBoundingClientRect();
              if (rect) setOpenUp(window.innerHeight - rect.bottom < POPOVER_HEIGHT);
              setOpen((o) => !o);
            }}
            className="pressable flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
          >
            <CalendarIcon className="size-4 shrink-0 text-ink-faint" />
            <span className={`truncate ${value ? "text-ink" : "text-ink-faint/60"}`}>
              {value || placeholder || "Pick a date"}
            </span>
          </button>
          {value && (
            <button
              type="button"
              onClick={() => editField(node.id, field, "")}
              className="pressable mr-1.5 shrink-0 rounded-md p-1 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
              aria-label="Clear date"
              title="Clear date"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
        {open && (
          <MonthPicker
            value={value}
            allowPresent={allowPresent}
            openUp={openUp}
            onPick={(next) => editField(node.id, field, next)}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    </FieldFrame>
  );
}
