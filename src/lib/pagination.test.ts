import { describe, expect, it } from "vitest";
import { computePageLayout, sameLayout, type MeasuredBlock } from "./pagination";

const CONTENT_H = 1000;
const BREAK_OFFSET = 100; // 2 × page margin + inter-page gap

function block(partial: Partial<MeasuredBlock> & { id: string; top: number; height: number }): MeasuredBlock {
  return {
    flow: "root",
    keepWithNext: false,
    naturalMarginTop: 0,
    ...partial,
  };
}

/** Lay blocks out back-to-back, each `height` tall. */
function stack(heights: number[], opts: { flow?: string; keepWithNext?: (i: number) => boolean } = {}) {
  let top = 0;
  return heights.map((height, i) => {
    const b = block({
      id: `b${i}`,
      top,
      height,
      flow: opts.flow ?? "root",
      keepWithNext: opts.keepWithNext?.(i) ?? false,
    });
    top += height;
    return b;
  });
}

const layout = (blocks: MeasuredBlock[], contentHeight = CONTENT_H) =>
  computePageLayout(blocks, { contentHeight, pageBreakOffset: BREAK_OFFSET });

describe("computePageLayout", () => {
  it("leaves content that fits on one page untouched", () => {
    const result = layout(stack([200, 300, 200]));
    expect(result.margins.size).toBe(0);
    expect(result.pageCount).toBe(1);
  });

  it("pushes a block that would straddle the page edge onto the next page", () => {
    // 900 + 200 = 1100 → the second block crosses the 1000px boundary.
    const result = layout(stack([900, 200]));
    expect(result.pageCount).toBe(2);
    // Push = remaining space on page 1 (100), plus the inter-page offset.
    expect(result.margins.get("b1")).toBe(100 + BREAK_OFFSET);
    expect(result.margins.has("b0")).toBe(false);
  });

  it("accumulates shift so later blocks account for earlier pushes", () => {
    // b0 900, b1 200 (pushed to page 2 at y=1000), b2 900 → crosses into page 3.
    const result = layout(stack([900, 200, 900]));
    expect(result.margins.get("b1")).toBe(100 + BREAK_OFFSET);
    // b1 now occupies 1000–1200, so b2 starts at 1200 and must move to 2000.
    expect(result.margins.get("b2")).toBe(800 + BREAK_OFFSET);
    expect(result.pageCount).toBe(3);
  });

  it("still offsets a block that lands on the next page without needing a push", () => {
    // b0 fills page 1 exactly, so b1 starts past the edge on its own. It needs
    // no push, but it does need the gap between the two sheets.
    const result = layout(stack([1000, 200]));
    expect(result.margins.get("b1")).toBe(BREAK_OFFSET);
    expect(result.pageCount).toBe(2);
  });

  it("charges the gap once per page an oversized block spans", () => {
    // A block taller than two pages isn't moved, but what follows it starts
    // two page edges further down.
    const result = layout(stack([2400, 100]));
    expect(result.margins.has("b0")).toBe(false);
    expect(result.margins.get("b1")).toBe(2 * BREAK_OFFSET);
    expect(result.pageCount).toBe(3);
  });

  it("does not push a block that is taller than a page", () => {
    // An oversized block can never fit, so moving it just wastes a page.
    const result = layout(stack([900, 1500]));
    expect(result.margins.has("b1")).toBe(false);
  });

  it("carries a keep-with-next block along with the one after it", () => {
    // b1 is a section heading at 950–980: it fits, but its first item does not.
    const blocks = [
      block({ id: "body", top: 0, height: 950 }),
      block({ id: "heading", top: 950, height: 30, keepWithNext: true }),
      block({ id: "item", top: 980, height: 120 }),
    ];
    const result = layout(blocks);
    // The heading moves even though it fits, so it isn't orphaned.
    expect(result.margins.get("heading")).toBe(50 + BREAK_OFFSET);
    // The item follows naturally, needing no push of its own.
    expect(result.margins.has("item")).toBe(false);
    expect(result.pageCount).toBe(2);
  });

  it("ignores keep-with-next when the pair could never share a page", () => {
    const blocks = [
      block({ id: "body", top: 0, height: 900 }),
      block({ id: "heading", top: 900, height: 50, keepWithNext: true }),
      block({ id: "huge", top: 950, height: 1200 }),
    ];
    const result = layout(blocks);
    // Heading alone fits on page 1; dragging it along would gain nothing.
    expect(result.margins.has("heading")).toBe(false);
  });

  it("adds a push on top of the block's existing margin", () => {
    const blocks = [
      block({ id: "b0", top: 0, height: 900 }),
      block({ id: "b1", top: 920, height: 200, naturalMarginTop: 20 }),
    ];
    const result = layout(blocks);
    expect(result.margins.get("b1")).toBe(20 + 80 + BREAK_OFFSET);
  });

  it("keeps flows independent so a column break does not move its neighbour", () => {
    const blocks = [
      ...stack([900, 200], { flow: "main" }),
      ...stack([300, 300], { flow: "side" }).map((b) => ({ ...b, id: `s${b.id}` })),
    ];
    const result = layout(blocks);
    expect(result.margins.get("b1")).toBe(100 + BREAK_OFFSET); // main column breaks
    expect(result.margins.has("sb0")).toBe(false); // sidebar untouched
    expect(result.margins.has("sb1")).toBe(false);
  });

  it("displaces sub-flows by the shift the root flow accumulated", () => {
    const blocks = [
      // Root header breaks onto page 2, carrying the columns below it.
      block({ id: "h0", top: 0, height: 900, flow: "root" }),
      block({ id: "h1", top: 900, height: 200, flow: "root" }),
      // Column content starts right after the header in natural coordinates.
      block({ id: "m0", top: 1100, height: 300, flow: "main" }),
    ];
    const result = layout(blocks);
    expect(result.margins.get("h1")).toBe(100 + BREAK_OFFSET);
    // h1 ends at 1200 on page 2; m0 starts at 1100 + 100 shift = 1200, fits.
    expect(result.margins.has("m0")).toBe(false);
    expect(result.pageCount).toBe(2);
  });

  it("counts pages from the tallest flow", () => {
    const blocks = [
      ...stack([400], { flow: "main" }),
      ...stack([1400], { flow: "side" }).map((b) => ({ ...b, id: "side0" })),
    ];
    expect(layout(blocks).pageCount).toBe(2);
  });

  it("handles exact-fit content without spilling to a second page", () => {
    const result = layout(stack([500, 500]));
    expect(result.pageCount).toBe(1);
    expect(result.margins.size).toBe(0);
  });

  it("returns a single page for empty content", () => {
    expect(layout([])).toEqual({ margins: new Map(), pageCount: 1 });
  });
});

describe("sameLayout", () => {
  const base = { margins: new Map([["a", 10]]), pageCount: 2 };

  it("matches identical layouts", () => {
    expect(sameLayout(base, { margins: new Map([["a", 10]]), pageCount: 2 })).toBe(true);
  });

  it("tolerates sub-pixel drift", () => {
    expect(sameLayout(base, { margins: new Map([["a", 10.2]]), pageCount: 2 })).toBe(true);
  });

  it("detects changed page counts, values and sizes", () => {
    expect(sameLayout(base, { margins: new Map([["a", 10]]), pageCount: 3 })).toBe(false);
    expect(sameLayout(base, { margins: new Map([["a", 40]]), pageCount: 2 })).toBe(false);
    expect(sameLayout(base, { margins: new Map(), pageCount: 2 })).toBe(false);
  });

  it("detects a break that moved to a different block", () => {
    // Same number of breaks, different block — changing the page size does
    // exactly this, and treating it as unchanged would freeze the old layout.
    expect(sameLayout(base, { margins: new Map([["b", 10]]), pageCount: 2 })).toBe(false);
  });
});
