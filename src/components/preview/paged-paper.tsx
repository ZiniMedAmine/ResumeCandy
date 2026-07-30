"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { pageFormatOf, type DesignSettings } from "@/lib/design";
import {
  computePageLayout,
  sameLayout,
  ROOT_FLOW,
  type MeasuredBlock,
  type PageLayout,
} from "@/lib/pagination";
import { usePreviewMode } from "./resume-preview";

/** Visual gap between page cards. */
const PAGE_GAP = 24;

const EMPTY_MARGINS: ReadonlyMap<string, number> = new Map();

const BlockMarginContext = createContext<ReadonlyMap<string, number>>(EMPTY_MARGINS);

/** Push offsets for the current render (empty while measuring). */
export function useBlockMargins() {
  return useContext(BlockMarginContext);
}

/**
 * Props that turn an element into a pagination block — an atomic unit that
 * is never sliced by a page edge. Spread onto the element itself so no extra
 * wrapper divs appear in the rendered resume.
 */
export function blockProps(
  margins: ReadonlyMap<string, number>,
  id: string,
  keepWithNext = false,
) {
  const pushTop = margins.get(id);
  return {
    "data-block": id,
    "data-keep": keepWithNext ? "1" : undefined,
    // Delivered as padding, not margin: a box's top margin is zeroed by the
    // browser's own print pagination whenever it lands exactly on a page
    // break (CSS Fragmentation's "margins collapse to 0 at a break"), which
    // silently ate this exact push in the printed PDF. Padding isn't subject
    // to that rule, so it survives — `marginTop: 0` clears the class-based
    // natural margin so it doesn't also apply on top of it (it's already
    // folded into pushTop).
    style: pushTop == null ? undefined : { marginTop: 0, paddingTop: pushTop },
  };
}

/** CSS custom properties + typography every template renders inside. */
export function contentVars(design: DesignSettings): React.CSSProperties {
  return {
    fontSize: `${design.fontSize}px`,
    lineHeight: design.lineHeight,
    "--accent": design.accentColor,
    "--sec-gap": `${Math.round(18 * design.sectionSpacing)}px`,
    "--item-gap": `${Math.round(10 * design.sectionSpacing)}px`,
  } as React.CSSProperties;
}

/** Read the laid-out DOM into the geometry the planner needs. */
function measureBlocks(root: HTMLElement): MeasuredBlock[] {
  const rootTop = root.getBoundingClientRect().top;
  return Array.from(root.querySelectorAll<HTMLElement>("[data-block]")).map((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const flowEl = el.parentElement?.closest<HTMLElement>("[data-flow]");
    return {
      id: el.dataset.block!,
      flow: flowEl?.dataset.flow ?? ROOT_FLOW,
      top: rect.top - rootTop,
      height: rect.height,
      keepWithNext: el.dataset.keep === "1",
      naturalMarginTop: Number.parseFloat(style.marginTop) || 0,
    };
  });
}

/**
 * Lays a template's content out on real pages.
 *
 * The content is rendered once off-screen to measure every block in its
 * natural flow, the planner decides which blocks must move, and the visible
 * copy re-renders with those push margins applied. Page cards sit behind the
 * content and masks cover the gaps, so the flow reads as a stack of sheets
 * rather than one endless strip.
 */
export function PagedPaper({
  design,
  fontClass,
  backdropClass = "bg-sunken",
  children,
}: {
  design: DesignSettings;
  fontClass: string;
  backdropClass?: string;
  children: React.ReactNode;
}) {
  const { thumbnail, print } = usePreviewMode();

  const format = pageFormatOf(design);
  const margin = design.pageMargins;
  const contentWidth = format.width - margin * 2;
  const contentHeight = format.height - margin * 2;
  // On paper the sheets butt up against each other, so page N+1 starts exactly
  // one page height down and the browser's page breaks land on ours.
  const gap = print ? 0 : PAGE_GAP;
  // Crossing a page edge costs the current page's bottom margin, the gap and
  // the next page's top margin.
  const pageBreakOffset = margin * 2 + gap;

  const measureRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<PageLayout>({ margins: new Map(), pageCount: 1 });
  const [available, setAvailable] = useState(0);

  const remeasure = useCallback(() => {
    const el = measureRef.current;
    if (!el) return;
    const next = computePageLayout(measureBlocks(el), { contentHeight, pageBreakOffset });
    setLayout((prev) => (sameLayout(prev, next) ? prev : next));
  }, [contentHeight, pageBreakOffset]);

  // The measuring copy never sees the push margins, so its layout is stable:
  // running after every render converges in one extra pass at most.
  useLayoutEffect(() => {
    if (!thumbnail) remeasure();
  });

  // Fonts finishing, images decoding — anything that resizes content later.
  useEffect(() => {
    const el = measureRef.current;
    if (thumbnail || !el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(remeasure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [remeasure, thumbnail]);

  // Scale the page down to whatever width the preview pane offers.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => setAvailable(el.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Printing renders at true size; on screen the page scales to the pane.
  const scale = print ? 1 : available > 0 ? Math.min(1, available / format.width) : 1;
  const pageCount = thumbnail ? 1 : layout.pageCount;
  const totalHeight = pageCount * format.height + (pageCount - 1) * gap;
  const offsetLeft = print ? 0 : Math.max(0, (available - format.width * scale) / 2);
  const pages = Array.from({ length: pageCount }, (_, i) => i);

  return (
    <div ref={outerRef} className="relative w-full">
      {/* Off-screen measuring copy: same width and typography, zero pushes. */}
      {!thumbnail && (
        <div className="pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden>
          <div ref={measureRef} className={fontClass} style={{ width: contentWidth, ...contentVars(design) }}>
            <BlockMarginContext.Provider value={EMPTY_MARGINS}>{children}</BlockMarginContext.Provider>
          </div>
        </div>
      )}

      <div style={{ height: totalHeight * scale }}>
        <div
          className={fontClass}
          style={{
            position: "absolute",
            top: 0,
            left: offsetLeft,
            width: format.width,
            height: totalHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            ...contentVars(design),
          }}
        >
          {pages.map((i) => (
            <div
              key={`page-${i}`}
              data-page={i + 1}
              className={`absolute left-0 bg-white ${print ? "" : "rounded-[3px] shadow-paper"}`}
              style={{ top: i * (format.height + gap), width: format.width, height: format.height }}
            />
          ))}

          <div
            className={`absolute text-zinc-800 ${thumbnail ? "overflow-hidden" : ""}`}
            style={{
              left: margin,
              top: margin,
              width: contentWidth,
              // A thumbnail shows the top of page one and nothing more.
              ...(thumbnail ? { height: contentHeight } : null),
            }}
          >
            <BlockMarginContext.Provider value={layout.margins}>{children}</BlockMarginContext.Provider>
          </div>

          {/* Masks cut the flow at every page edge (nothing to cut on paper). */}
          {!print &&
            pages.slice(1).map((i) => (
              <div
                key={`gap-${i}`}
                className={`absolute left-0 z-20 ${backdropClass}`}
                style={{ top: i * (format.height + gap) - gap, width: format.width, height: gap }}
              />
            ))}

          {!print &&
            pageCount > 1 &&
            pages.map((i) => (
              <div
                key={`label-${i}`}
                className="pointer-events-none absolute left-0 z-10 flex items-center justify-center text-[10px] text-zinc-300"
                style={{
                  top: i * (format.height + gap) + format.height - margin,
                  width: format.width,
                  height: margin,
                }}
              >
                {i + 1} / {layout.pageCount}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
