"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useResumeStore } from "@/store/resume-store";

/**
 * Create a version: name it, choose what it starts from (the Default or any
 * existing version — "create versions from any existing version").
 */
export function NewVersionDialog({
  open,
  fromVersionId,
  onClose,
}: {
  open: boolean;
  fromVersionId: string | null;
  onClose: () => void;
}) {
  if (!open) return null;
  return <NewVersionInner fromVersionId={fromVersionId} onClose={onClose} />;
}

function NewVersionInner({
  fromVersionId,
  onClose,
}: {
  fromVersionId: string | null;
  onClose: () => void;
}) {
  const versions = useResumeStore((s) => s.versions);
  const createVersion = useResumeStore((s) => s.createVersion);
  const setActiveVersion = useResumeStore((s) => s.setActiveVersion);

  const base = versions.find((v) => v.isBase === 1 || v.isBase === true);
  const [name, setName] = useState("");
  const [from, setFrom] = useState<string>(fromVersionId ?? base?.id ?? "");

  const live = versions.filter((v) => !v.deletedAt && !v.archivedAt);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = createVersion(trimmed, from || null);
    setActiveVersion(id);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title="New version" width="max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4 px-5 py-4"
      >
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            Name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Google, Stripe, Berlin startups…"
            className="w-full rounded-lg border border-hairline px-3 py-2 text-[13.5px] outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            Start from
          </label>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[13.5px] outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
          >
            {live.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {(v.isBase === 1 || v.isBase === true) ? " (Default)" : ""}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] leading-snug text-ink-faint">
            {from === base?.id
              ? "Starts identical to the Default — customize from there."
              : "Copies that version’s customizations as a starting point. Content stays linked to the Default."}
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="pressable rounded-lg px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-sunken "
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="pressable rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-3.5 py-1.5 text-[13px] font-bold text-white shadow-card transition-all duration-150 hover:shadow-card-hover hover:brightness-[1.03] disabled:opacity-40"
          >
            Create version
          </button>
        </div>
      </form>
    </Dialog>
  );
}
