import { describe, expect, it } from "vitest";
import { DESIGN_DEFAULTS } from "@/lib/design";
import type { ResolvedNode } from "@/lib/resume/types";
import { fitToOnePage, tightened } from "./fit";

let seq = 0;
const node = (kind: ResolvedNode["kind"], data: Record<string, unknown>, children: ResolvedNode[] = []): ResolvedNode => ({
  id: `${kind}-${++seq}`,
  parentId: null,
  kind,
  rank: "a0",
  data,
  status: "base",
  customizedFields: [],
  hidden: false,
  reordered: false,
  children,
});

const resume = (roles: number, bullets: number) => [
  node("header", { fullName: "Ada Lovelace", headline: "Engineer", summary: "Engineer who ships reliable data products. ".repeat(3) }),
  node(
    "section",
    { title: "Experience", sectionType: "experience" },
    Array.from({ length: roles }, (_, i) =>
      node(
        "experience",
        { title: `Engineer ${i}`, company: "Engines", startDate: "2020", endDate: "Present" },
        Array.from({ length: bullets }, () =>
          node("bullet", { text: "Built streaming ingestion for sensor data with sub-minute latency across sources." }),
        ),
      ),
    ),
  ),
];

const input = (roots: ResolvedNode[]) => ({
  tree: { roots },
  design: DESIGN_DEFAULTS,
  resumeName: "Ada",
  versionName: "Default",
  isBaseVersion: true,
});

describe("tightened", () => {
  it("steps every dimension down and stops at the floors", () => {
    const one = tightened(DESIGN_DEFAULTS, 1);
    expect(one.fontSize).toBe(DESIGN_DEFAULTS.fontSize - 0.5);
    expect(one.marginX).toBe(DESIGN_DEFAULTS.marginX - 2);
    const far = tightened(DESIGN_DEFAULTS, 100);
    expect(far).toEqual({ fontSize: 11, lineHeight: 1.25, sectionSpacing: 0.7, marginX: 28, marginY: 26 });
  });

  it("never loosens a design that is already tighter than a floor", () => {
    expect(tightened({ ...DESIGN_DEFAULTS, fontSize: 10 }, 3).fontSize).toBe(10);
  });
});

describe("fitToOnePage", () => {
  it("leaves a résumé that already fits untouched", async () => {
    const result = await fitToOnePage(input(resume(1, 3)));
    expect(result).toEqual({ patch: {}, pages: 1, fitted: true });
  });

  it("tightens a slightly long résumé onto one page", async () => {
    let roles = 3;
    // Grow until the default design spills onto a second page.
    while ((await fitToOnePage({ ...input(resume(roles, 5)) })).patch.fontSize === undefined) roles += 1;
    const result = await fitToOnePage(input(resume(roles, 5)));
    expect(result.fitted).toBe(true);
    expect(result.pages).toBe(1);
    expect(result.patch.fontSize).toBeLessThan(DESIGN_DEFAULTS.fontSize);
  });

  it("reports when even the tightest design needs more than a page", async () => {
    const result = await fitToOnePage(input(resume(12, 8)));
    expect(result.fitted).toBe(false);
    expect(result.pages).toBeGreaterThan(1);
  });
});
