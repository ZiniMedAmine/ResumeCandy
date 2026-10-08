"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { saveProfile } from "@/app/actions/tailor";
import { CheckIcon, CloudSyncIcon, SparkleIcon, UploadIcon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/provider";

const AUTOSAVE_MS = 1200;

/**
 * Writing the master profile. It saves on its own shortly after typing stops,
 * like every other field in the app, and an import replaces the text with a
 * file's — the profile a person already keeps elsewhere comes in as is.
 */
export function ProfileEditor({ initialContent }: { initialContent: string }) {
  const { t, fmt } = useI18n();
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [saving, startSaving] = useTransition();
  const [importError, setImportError] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const dirty = content !== savedContent;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    startSaving(async () => {
      await saveProfile({ content: value });
      setSavedContent(value);
    });
  };

  // A pending save still runs if the page is left: the text is not lost.
  const change = (value: string) => {
    setContent(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(value), AUTOSAVE_MS);
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError(false);
    try {
      const text = await file.text();
      if (!text.trim() || text.includes("\u0000")) throw new Error("not text");
      change(text);
    } catch {
      setImportError(true);
    }
  };

  const status = saving ? t.profile.saving : dirty ? t.profile.unsaved : t.profile.saved;

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="pressable inline-flex items-center gap-2 rounded-xl bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink shadow-card transition-shadow duration-150 hover:shadow-card-hover"
          >
            <UploadIcon className="size-4 text-ink-faint" />
            {t.profile.importFile}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            className="hidden"
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <span className="text-[12.5px] text-ink-faint">{t.profile.importHint}</span>
          <div className="flex-1" />
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-faint">
            {saving ? (
              <CloudSyncIcon className="size-4" />
            ) : !dirty ? (
              <CheckIcon className="size-4 text-emerald-500" />
            ) : null}
            {status} · {fmt(t.profile.words, { n: words })}
          </span>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => save(content)}
            className="pressable rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-card transition-all duration-150 hover:shadow-card-hover disabled:opacity-40"
          >
            {t.profile.save}
          </button>
        </div>
        {importError && (
          <p className="mb-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {t.profile.importFailed}
          </p>
        )}
        <textarea
          value={content}
          onChange={(e) => change(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
              e.preventDefault();
              save(content);
            }
          }}
          placeholder={t.profile.placeholder}
          spellCheck={false}
          dir="auto"
          className="h-[calc(100dvh-280px)] min-h-[420px] w-full resize-y rounded-2xl border border-hairline bg-surface p-6 font-mono text-[13px] leading-relaxed text-ink shadow-card outline-none transition-colors duration-150 placeholder:text-ink-faint/60 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10"
        />
      </div>

      <aside className="space-y-5">
        <section className="rounded-2xl bg-surface p-6 shadow-card">
          <h2 className="mb-3 text-[14px] font-semibold text-ink">{t.profile.tipsTitle}</h2>
          <ul className="space-y-2.5 text-[13px] leading-relaxed text-ink-muted">
            {[t.profile.tip1, t.profile.tip2, t.profile.tip3, t.profile.tip4].map((tip) => (
              <li key={tip} className="flex gap-2.5">
                <span className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-rose-400" />
                {tip}
              </li>
            ))}
          </ul>
        </section>
        <Link
          href="/tailor"
          className="pressable flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-3.5 text-[14px] font-semibold text-white shadow-card transition-all duration-150 hover:shadow-card-hover hover:brightness-[1.03]"
        >
          <SparkleIcon className="size-4.5" />
          {t.profile.tailorCta}
        </Link>
      </aside>
    </div>
  );
}
