/**
 * Page-break planning.
 *
 * The preview renders one continuous content flow; this decides where that
 * flow crosses a page edge and how far each offending block must be pushed
 * down to land on the next page instead of being sliced in half.
 *
 * Pure geometry over measured blocks, so the rules are unit-testable and
 * behave identically wherever they run.
 */

export interface MeasuredBlock {
  id: string;
  /**
   * Independent vertical flow. A block only ever pushes later blocks in its
   * own flow — that keeps a two-column template's sidebar from moving when
   * the main column breaks.
   */
  flow: string;
  /** Natural offset from the top of the content area, before any pushes. */
  top: number;
  height: number;
  /** Never strand this block at the foot of a page without the block after it. */
  keepWithNext: boolean;
  /** Margin the block already has, so a push adds to it rather than replacing it. */
  naturalMarginTop: number;
}

export interface PageLayout {
  /** Block id → inline margin-top that carries it onto the next page. */
  margins: Map<string, number>;
  pageCount: number;
}

/** Absorbs sub-pixel rounding from getBoundingClientRect. */
const TOLERANCE = 1;

export const ROOT_FLOW = "root";

export function computePageLayout(
  blocks: MeasuredBlock[],
  opts: { contentHeight: number; pageBreakOffset: number },
): PageLayout {
  const { contentHeight, pageBreakOffset } = opts;
  const margins = new Map<string, number>();
  if (contentHeight <= 0 || blocks.length === 0) return { margins, pageCount: 1 };

  // Group per flow, preserving document order within each.
  const flows = new Map<string, MeasuredBlock[]>();
  for (const block of blocks) {
    const list = flows.get(block.flow) ?? [];
    list.push(block);
    flows.set(block.flow, list);
  }

  let contentBottom = 0;

  /**
   * Walks one flow in two coordinate systems at once. `shift` tracks the
   * continuous flow the page maths works in; `page` tracks how many page
   * edges have been crossed, since every crossing also costs the visual gap
   * between sheets — whether the block was pushed there or simply landed
   * there on its own.
   */
  const runFlow = (
    list: MeasuredBlock[],
    initialShift: number,
    initialPage: number,
  ): { shift: number; page: number } => {
    let shift = initialShift;
    let previousPage = initialPage;

    for (let i = 0; i < list.length; i++) {
      const block = list[i];
      const top = block.top + shift;
      let page = Math.floor((top + TOLERANCE) / contentHeight);
      const pageEnd = (page + 1) * contentHeight;

      let bottom = top + block.height;
      const next = list[i + 1];
      if (block.keepWithNext && next) {
        // A section heading or an entry's title line travels with what
        // follows it — but only when the pair could fit on one page at all.
        const pairBottom = next.top + shift + next.height;
        if (pairBottom - top <= contentHeight) bottom = Math.max(bottom, pairBottom);
      }

      // A block taller than a whole page cannot be rescued by moving it, so
      // leave it where it is instead of pushing it forever.
      const fitsOnAPage = block.height <= contentHeight + TOLERANCE;
      let push = 0;
      if (bottom > pageEnd + TOLERANCE && fitsOnAPage) {
        push = pageEnd - top;
        shift += push;
        page += 1;
      }

      const pagesCrossed = Math.max(0, page - previousPage);
      const extra = push + pagesCrossed * pageBreakOffset;
      if (extra > 0) margins.set(block.id, block.naturalMarginTop + extra);

      previousPage = page;
      contentBottom = Math.max(contentBottom, block.top + shift + block.height);
    }
    return { shift, page: previousPage };
  };

  // The root flow sits above any columns, so its pushes displace them too:
  // sub-flows continue from where the root left off, in both coordinates.
  const root = flows.get(ROOT_FLOW);
  const rootEnd = root ? runFlow(root, 0, 0) : { shift: 0, page: 0 };
  for (const [flow, list] of flows) {
    if (flow === ROOT_FLOW) continue;
    runFlow(list, rootEnd.shift, rootEnd.page);
  }

  const pageCount = Math.max(1, Math.ceil((contentBottom - TOLERANCE) / contentHeight));
  return { margins, pageCount };
}

/** Cheap structural equality so re-measuring doesn't churn React state. */
export function sameLayout(a: PageLayout, b: PageLayout): boolean {
  if (a.pageCount !== b.pageCount || a.margins.size !== b.margins.size) return false;
  for (const [id, value] of a.margins) {
    const other = b.margins.get(id);
    // An absent id must count as different: comparing against NaN would
    // silently report "unchanged" and freeze a stale layout on screen.
    if (other === undefined || Math.abs(other - value) > 0.5) return false;
  }
  return true;
}
