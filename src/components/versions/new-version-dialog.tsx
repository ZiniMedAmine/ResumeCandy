"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { LOCALE_OPTIONS, resolveDesign, type DesignSettings } from "@/lib/design";
import { useT } from "@/lib/i18n/provider";
import type { LocaleId } from "@/lib/locale";
import { useResumeStore } from "@/store/resume-store";

/**
 * Create a version: name it, choose what it starts from (the Default or any
 * existing version — "create versions from any existing version"), and pick
 * the language it is written in.
 *
 * The language field is what turns this dialog into the translation flow: a
 * version is already "a variant that differs in specific fields", which is
 * exactly what a translation is, so picking a different language here starts
 * one — untouched headings arrive translated and every field you then rewrite
 * shows up as an override, i.e. as translation progress.
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
  const setLanguage = useResumeStore((s) => s.setLanguage);
  const baseSettings = useResumeStore((s) => s.baseSettings);
  const settingsPatches = useResumeStore((s) => s.settingsPatches);
  const t = useT();

  const base = versions.find((v) => v.isBase === 1 || v.isBase === true);
  const [name, setName] = useState("");
  const [from, setFrom] = useState<string>(fromVersionId ?? base?.id ?? "");

  // Defaults to whatever the source is written in, so creating an ordinary
  // version is never a silent language change.
  const sourceIsBase = from === base?.id;
  const sourceLanguage = resolveDesign(
    baseSettings as Partial<DesignSettings> | null,
    sourceIsBase ? null : (settingsPatches[from] ?? null),
  ).language;
  const [language, setLanguageDraft] = useState<LocaleId | null>(null);
  const chosen = language ?? sourceLanguage;

  const live = versions.filter((v) => !v.deletedAt && !v.archivedAt);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = createVersion(trimmed, from || null);
    setActiveVersion(id);
    // After the switch, so it applies to the version just created: this also
    // corrects the font and translates untouched headings.
    if (chosen !== sourceLanguage) setLanguage(chosen);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={t.versions.newTitle} width="max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4 px-5 py-4"
      >
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            {t.versions.name}
          </label>
          <input
            autoFocus
            value={name}
            dir="auto"
            onChange={(e) => setName(e.target.value)}
            placeholder={t.versions.namePlaceholder}
            className="w-full rounded-lg border border-hairline px-3 py-2 text-[13.5px] outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            {t.versions.startFrom}
          </label>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[13.5px] outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
          >
            {live.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {(v.isBase === 1 || v.isBase === true) ? t.versions.defaultSuffix : ""}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] leading-snug text-ink-faint">
            {sourceIsBase ? t.versions.fromDefaultHint : t.versions.fromVersionHint}
          </p>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            {t.versions.language}
          </label>
          <Segmented options={LOCALE_OPTIONS} value={chosen} onChange={setLanguageDraft} />
          <p className="mt-1.5 text-[12px] leading-snug text-ink-faint">
            {chosen === sourceLanguage ? t.versions.sameLanguageHint : t.versions.newLanguageHint}
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="pressable rounded-lg px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-sunken "
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="pressable rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-3.5 py-1.5 text-[13px] font-bold text-white shadow-card transition-all duration-150 hover:shadow-card-hover hover:brightness-[1.03] disabled:opacity-40"
          >
            {t.versions.create}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
