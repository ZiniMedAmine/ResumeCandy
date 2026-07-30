"use client";

import { useEffect, useState } from "react";
import { ResumePreview } from "@/components/preview/resume-preview";
import type { PreviewTree } from "@/components/preview/shared";
import { pageFormatOf, type DesignSettings } from "@/lib/design";

/**
 * A resume rendered for paper and nothing else.
 *
 * Export goes through the browser's own print pipeline rather than a canvas
 * screenshot: the text stays real text, so the PDF is selectable, searchable
 * and readable by the applicant tracking systems that parse resumes.
 */
export function PrintDocument({
  tree,
  design,
  auto,
}: {
  tree: PreviewTree;
  design: DesignSettings;
  /** Open the print dialog once the layout has settled. */
  auto: boolean;
}) {
  const format = pageFormatOf(design);
  const [status, setStatus] = useState<"preparing" | "ready">("preparing");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Fonts change line breaks, which changes where pages break.
      if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          /* fall through — worst case we wait on the poll below */
        }
      }

      // Pagination settles a render or two after mount. Page count alone can
      // go stable before the per-block push offsets (margins/paddings that
      // carry content onto the next page) finish converging, which let this
      // fire on a snapshot whose page breaks didn't match what the preview
      // eventually settled on — so wait for that layout signature too.
      const signature = () =>
        document.querySelectorAll("[data-page]").length +
        "|" +
        Array.from(document.querySelectorAll<HTMLElement>("[data-block]"))
          .map((el) => el.style.paddingTop || "0")
          .join(",");

      let last = "";
      let stable = 0;
      for (let i = 0; i < 60 && !cancelled && stable < 3; i++) {
        await new Promise((r) => setTimeout(r, 80));
        const current = signature();
        if (current === last) stable += 1;
        else {
          last = current;
          stable = 0;
        }
      }
      if (cancelled) return;

      setStatus("ready");
      if (!auto) return;

      window.print();
      // Let whoever opened this frame tidy up once the dialog is dismissed.
      window.parent?.postMessage({ type: "vibecv:printed" }, window.location.origin);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [auto]);

  return (
    <>
      <style>{`
        @page { size: ${format.cssSize}; margin: 0; }
        html, body { margin: 0; padding: 0; background: #ffffff; }
        /* Keep accent colours and rules in the PDF instead of dropping them. */
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print { .screen-only { display: none !important; } }
      `}</style>

      {status === "preparing" && (
        <p className="screen-only fixed left-4 top-4 z-50 rounded-lg bg-zinc-900/90 px-3 py-1.5 text-[12px] font-medium text-white">
          Preparing document…
        </p>
      )}

      <div style={{ width: format.width, margin: "0 auto" }}>
        <ResumePreview tree={tree} design={design} print />
      </div>
    </>
  );
}
