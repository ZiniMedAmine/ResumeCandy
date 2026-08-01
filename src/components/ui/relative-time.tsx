"use client";

import { useI18n } from "@/lib/i18n/provider";
import { elapsedTime, relativeTime } from "@/lib/relative-time";

/**
 * A timestamp rendered as "5 minutes ago", in the interface language.
 *
 * `suppressHydrationWarning` is load-bearing rather than decorative. The label
 * is derived from `Date.now()`, so the server renders "now" and the browser
 * hydrates a moment later and computes "1 minute ago" — a guaranteed mismatch
 * that has nothing to do with the markup being wrong. Without the suppression
 * React discards the whole surrounding tree and re-renders it on the client;
 * with it, React keeps what is already in the DOM.
 *
 * The wrapping `<time>` carries the machine-readable instant, so screen
 * readers and crawlers get the exact timestamp whatever the fuzzy label says.
 */
export function RelativeTime({
  ms,
  /** Render the duration alone ("3 days") — for labels like "Collection age". */
  elapsed = false,
}: {
  ms: number | null | undefined;
  elapsed?: boolean;
}) {
  const { locale } = useI18n();
  const label = elapsed ? elapsedTime(ms, locale) : relativeTime(ms, locale);

  return (
    <time dateTime={ms ? new Date(ms).toISOString() : undefined} suppressHydrationWarning>
      {label}
    </time>
  );
}
