"use client";

import { nanoid } from "nanoid";
import { ExternalLinkIcon, LinkIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { displayUrl, urlHref } from "@/lib/contacts";
import { useI18n } from "@/lib/i18n/provider";
import type { VersionLink, VersionLinkKind } from "@/lib/resume/types";
import { useResumeStore } from "@/store/resume-store";

const KINDS: VersionLinkKind[] = ["posting", "application", "company", "contact", "other"];

/**
 * "Job & links": the application a version belongs to. URLs attached here —
 * the posting it was tailored for, the portal it went through, the recruiter
 * — and the job description the ATS keyword check compares against.
 *
 * This is version metadata, not résumé content: nothing here is printed, and
 * a new version starts with none of it, because a new version is a new
 * application.
 */
export function JobPanel({ onClose }: { onClose: () => void }) {
  const versions = useResumeStore((s) => s.versions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const setVersionLinks = useResumeStore((s) => s.setVersionLinks);
  const setJobDescription = useResumeStore((s) => s.setJobDescription);
  const { t, fmt } = useI18n();

  const version = versions.find((v) => v.id === activeVersionId);
  if (!version) return null;
  const links = version.links ?? [];

  const update = (id: string, patch: Partial<VersionLink>) =>
    setVersionLinks(
      version.id,
      links.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  const remove = (id: string) => setVersionLinks(version.id, links.filter((l) => l.id !== id));
  const add = () =>
    setVersionLinks(version.id, [
      ...links,
      { id: nanoid(10), kind: links.length === 0 ? "posting" : "other", label: "", url: "" },
    ]);

  const field =
    "w-full rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint/60 hover:border-hairline-strong focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10";

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-s border-hairline bg-surface">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-semibold text-ink">{t.jobs.title}</h3>
          <p className="truncate text-[11.5px] text-ink-faint">
            {fmt(t.jobs.subtitle, { name: version.name })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
          aria-label={t.jobs.close}
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <section>
          <p className="mb-2 px-1 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
            {t.jobs.linksTitle}
          </p>
          {links.length === 0 && (
            <p className="mb-3 rounded-xl bg-sunken/60 px-3.5 py-3 text-[11.5px] leading-relaxed text-ink-muted">
              {t.jobs.linksEmpty}
            </p>
          )}
          <div className="space-y-2.5">
            {links.map((link) => {
              const href = urlHref(link.url);
              return (
                <div key={link.id} className="space-y-1.5 rounded-xl border border-hairline p-2.5">
                  <div className="flex items-center gap-1.5">
                    <select
                      value={link.kind}
                      onChange={(e) => update(link.id, { kind: e.target.value as VersionLinkKind })}
                      className="min-w-0 flex-1 cursor-pointer rounded-lg border border-hairline bg-surface px-2 py-1.5 text-[12px] font-medium text-ink outline-none focus:border-rose-300"
                    >
                      {KINDS.map((k) => (
                        <option key={k} value={k}>
                          {t.jobs.kind[k]}
                        </option>
                      ))}
                    </select>
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t.jobs.open}
                        aria-label={t.jobs.open}
                        className="pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
                      >
                        <ExternalLinkIcon className="size-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(link.id)}
                      title={t.jobs.remove}
                      aria-label={t.jobs.remove}
                      className="pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-red-500"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </div>
                  <input
                    value={link.url}
                    dir="ltr"
                    placeholder={t.jobs.urlPlaceholder}
                    onChange={(e) => update(link.id, { url: e.target.value })}
                    // A bare "acme.com/jobs/42" is completed to https on the way
                    // out, so what is saved is always a link that opens.
                    onBlur={() => {
                      const full = urlHref(link.url);
                      if (full && full !== link.url && /^(https?:\/\/|mailto:)/i.test(full)) {
                        update(link.id, { url: full });
                      }
                    }}
                    className={`${field} font-mono text-[11.5px]`}
                  />
                  <input
                    value={link.label}
                    dir="auto"
                    placeholder={href ? displayUrl(href) : t.jobs.labelPlaceholder}
                    onChange={(e) => update(link.id, { label: e.target.value })}
                    className={field}
                  />
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={add}
            className="pressable mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-rose-500"
          >
            <PlusIcon className="size-3.5" />
            {t.jobs.addLink}
          </button>
        </section>

        <section>
          <p className="mb-1 px-1 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
            {t.jobs.descriptionTitle}
          </p>
          <p className="mb-2 px-1 text-[11.5px] leading-relaxed text-ink-faint">{t.jobs.descriptionHint}</p>
          <textarea
            value={version.jobDescription ?? ""}
            dir="auto"
            rows={12}
            placeholder={t.jobs.descriptionPlaceholder}
            onChange={(e) => setJobDescription(version.id, e.target.value)}
            className={`${field} resize-y leading-relaxed`}
          />
        </section>
      </div>
    </aside>
  );
}

/** Small count chip for the top bar: how many URLs this version carries. */
export function JobLinkCount({ count }: { count: number }) {
  const { t, fmt } = useI18n();
  if (count === 0) return null;
  return (
    <span
      className="ms-0.5 inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-1.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
      title={fmt(t.jobs.linkCount, { n: count })}
    >
      <LinkIcon className="size-2.5" />
      {count}
    </span>
  );
}
