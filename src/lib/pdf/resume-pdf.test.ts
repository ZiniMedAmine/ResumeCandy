import { describe, expect, it } from "vitest";
import { DESIGN_DEFAULTS } from "@/lib/design";
import { createResumePdf, safeFileName } from "./resume-pdf";
import type { ResolvedNode } from "@/lib/resume/types";

const node = (kind: ResolvedNode["kind"], data: Record<string, unknown>, children: ResolvedNode[] = []): ResolvedNode => ({
  id: `${kind}-${Math.random()}`,
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

describe("resume PDF export", () => {
  it("sanitizes a portable download filename", () => {
    expect(safeFileName('  Ada: CV / 2026?  ')).toBe("Ada CV 2026");
  });

  it("writes Classic resume content as PDF text instead of an image", async () => {
    const header = node("header", {
      fullName: "Ada Lovelace",
      headline: "Software Engineer",
      email: "ada@example.com",
    });
    const experience = node("experience", {
      title: "Engineer",
      company: "Analytical Engines",
      startDate: "2024",
      endDate: "Present",
    }, [node("bullet", { text: "Built a semantic PDF exporter." })]);
    const section = node("section", { title: "Experience", sectionType: "experience" }, [experience]);

    const pdf = await createResumePdf({
      tree: { roots: [header, section] },
      design: DESIGN_DEFAULTS,
      resumeName: "Ada CV",
      versionName: "Default",
      isBaseVersion: true,
    });
    const pageContent = (pdf.internal.pages as unknown as string[][])[1].join("\n");

    expect(pdf.getNumberOfPages()).toBe(1);
    expect(pageContent).toContain("Ada Lovelace");
    expect(pageContent).toContain("Analytical Engines");
    expect(pageContent).toContain("semantic PDF exporter");
    expect(pageContent).not.toContain("/Image");
  });

  it("creates a Modern PDF with a real two-column content stream", async () => {
    const roots = [
      node("header", { fullName: "Grace Hopper", email: "grace@example.com" }),
      node("section", { title: "Experience", sectionType: "experience" }, [
        node("experience", { title: "Computer Scientist", company: "Navy" }),
      ]),
      node("section", { title: "Skills", sectionType: "skills" }, [
        node("skillGroup", { name: "Languages" }, [node("skill", { name: "COBOL" })]),
      ]),
    ];
    const pdf = await createResumePdf({
      tree: { roots },
      design: { ...DESIGN_DEFAULTS, template: "modern", fontFamily: "sans" },
      resumeName: "Grace CV",
      versionName: "Default",
      isBaseVersion: true,
    });
    const pageContent = (pdf.internal.pages as unknown as string[][])[1].join("\n");

    expect(pageContent).toContain("Computer Scientist");
    expect(pageContent).toContain("COBOL");
    expect(pageContent).not.toContain("/Image");
  });
});

/* --------------------------------- RTL ------------------------------------ */

/**
 * Where each run of text was placed: its x in PDF points, in draw order.
 *
 * NUL bytes are stripped from the text. Under the base-14 fallback these tests
 * run on, characters the font cannot encode come out padded with them — a
 * fallback artifact, not something the embedded Arabic TTF produces.
 */
function placements(pdf: Awaited<ReturnType<typeof createResumePdf>>) {
  const stream = (pdf.internal.pages as unknown as string[][])[1].join("\n");
  const found: { x: number; text: string }[] = [];
  const re = /([\d.]+) [\d.]+ Td\n\(([^)]*)\) Tj/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(stream))) {
    found.push({ x: Number(match[1]), text: match[2].replace(/\0/g, "") });
  }
  return found;
}

/**
 * x of the bullet dot. Circles are the only paths drawn with bezier curves,
 * which is what tells them apart from the straight section rule.
 */
function bulletDotX(pdf: Awaited<ReturnType<typeof createResumePdf>>) {
  const stream = (pdf.internal.pages as unknown as string[][])[1].join("\n");
  return Number(/([\d.]+) [\d.]+ m\n[^\n]+ c/.exec(stream)?.[1]);
}

const rtlRoots = [
  node("header", { fullName: "Ada", headline: "Engineer", email: "a@b.co" }),
  node("section", { title: "Experience", sectionType: "experience" }, [
    node(
      "experience",
      { title: "Engineer", company: "Acme", startDate: "2022-03", endDate: "Present" },
      [node("bullet", { text: "Did a thing" })],
    ),
  ]),
];

const render = (language: "en" | "ar") =>
  createResumePdf({
    tree: { roots: rtlRoots },
    design: { ...DESIGN_DEFAULTS, language },
    resumeName: "CV",
    versionName: "Default",
    isBaseVersion: true,
  });

/**
 * These assert the mirroring geometry, not glyphs: Node has no asset origin so
 * the exporter falls back to a base-14 face with no Arabic in it. Whether the
 * letters actually join is a question about the embedded TTF and is verified
 * in the browser instead.
 */
describe("right-to-left export", () => {
  it("starts body text at the left margin in English and the right in Arabic", async () => {
    const ltr = placements(await render("en"));
    const rtl = placements(await render("ar"));

    const leftMargin = ltr.find((p) => p.text === "EXPERIENCE")!.x;
    const mirrored = rtl.find((p) => p.text === "EXPERIENCE")!.x;

    expect(leftMargin).toBeCloseTo(30, 0);
    // Right-aligned, so the reported x is the run's left edge — it still has to
    // land well past the middle of the sheet.
    expect(mirrored).toBeGreaterThan(300);
  });

  it("swaps the entry's date column to the opposite edge", async () => {
    const dateX = (runs: { x: number; text: string }[]) =>
      runs.find((p) => p.text.includes("2022"))!.x;

    // The date sits opposite the entry title: far right in English…
    expect(dateX(placements(await render("en")))).toBeGreaterThan(300);
    // …and hard against the left margin in Arabic.
    expect(dateX(placements(await render("ar")))).toBeCloseTo(30, 0);
  });

  it("puts the bullet dot on the side the text starts from", async () => {
    const ltr = await render("en");
    const rtl = await render("ar");
    const bulletX = (pdf: Awaited<ReturnType<typeof createResumePdf>>) =>
      placements(pdf).find((p) => p.text.includes("thing"))?.x ?? NaN;

    // The dot leads its text in reading order, so it flips sides with it.
    expect(bulletDotX(ltr)).toBeLessThan(bulletX(ltr));
    expect(bulletDotX(rtl)).toBeGreaterThan(bulletX(rtl));
  });

  it("leaves the section rule spanning the full content width either way", async () => {
    const rule = (pdf: Awaited<ReturnType<typeof createResumePdf>>) =>
      /([\d.]+) [\d.]+ m\n([\d.]+) [\d.]+ l/
        .exec((pdf.internal.pages as unknown as string[][])[1].join("\n"))
        ?.slice(1, 3);
    // Symmetric about the centre, so mirroring must be a no-op for it.
    expect(rule(await render("en"))).toEqual(rule(await render("ar")));
  });

  it("tells readers to page right-to-left, and only for Arabic", async () => {
    const catalog = (pdf: Awaited<ReturnType<typeof createResumePdf>>) =>
      Buffer.from(pdf.output("datauristring").split(",")[1], "base64").toString("latin1");
    expect(catalog(await render("ar"))).toContain("/Direction /R2L");
    expect(catalog(await render("en"))).not.toContain("/Direction");
  });

  it("writes dates in the CV's language", async () => {
    const ltr = placements(await render("en"));
    expect(ltr.some((p) => p.text.includes("Mar 2022"))).toBe(true);
    expect(ltr.some((p) => p.text.includes("Present"))).toBe(true);
  });
});
