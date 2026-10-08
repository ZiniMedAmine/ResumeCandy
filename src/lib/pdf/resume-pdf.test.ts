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

  it("prints bold keywords in the bold face and never prints the marks", async () => {
    const roots = [
      node("header", { fullName: "Ada Lovelace", summary: "Engineer focused on **data quality** and tests." }),
      node("section", { title: "Experience", sectionType: "experience" }, [
        node("experience", { title: "Engineer", company: "Engines" }, [
          node("bullet", { text: "Built **Kafka** streaming ingestion with sub-minute latency across many sources." }),
        ]),
      ]),
    ];
    const pdf = await createResumePdf({
      tree: { roots },
      design: DESIGN_DEFAULTS,
      resumeName: "Ada CV",
      versionName: "Default",
      isBaseVersion: true,
    });
    const pageContent = (pdf.internal.pages as unknown as string[][])[1].join("\n");

    expect(pageContent).toContain("Kafka");
    expect(pageContent).toContain("data quality");
    expect(pageContent).toContain("streaming ingestion");
    expect(pageContent).not.toContain("**");
    // The keyword is drawn in a different font resource than the words around it.
    const kafka = pageContent.match(/\/(F\d+) [\d.]+ Tf[^/]*?\(Kafka\)/);
    const rest = pageContent.match(/\/(F\d+) [\d.]+ Tf[^/]*?\( streaming ingestion/);
    expect(kafka?.[1]).toBeTruthy();
    expect(rest?.[1]).toBeTruthy();
    expect(kafka?.[1]).not.toBe(rest?.[1]);
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

/* ------------------------- links, layouts, coverage ------------------------ */

const fullRoots = () => [
  node(
    "header",
    {
      fullName: "Ada Lovelace",
      headline: "Engineer",
      email: "ada@example.com",
      phone: "+44 20 0000",
      summary: "Writes programs for engines.",
    },
    [
      node("contact", { type: "linkedin", value: "linkedin.com/in/ada", label: "" }),
      node("contact", { type: "github", value: "ada", label: "" }),
      node("contact", { type: "nationality", value: "British", label: "" }),
    ],
  ),
  node("section", { title: "Experience", sectionType: "experience" }, [
    node("experience", { title: "Engineer", company: "Engines Ltd", url: "engines.example", startDate: "2020" }, [
      node("bullet", { text: "Shipped the first program." }),
    ]),
  ]),
  node("section", { title: "Languages", sectionType: "languages" }, [
    node("language", { name: "French", level: "C1" }),
  ]),
  node("section", { title: "Declaration", sectionType: "declaration" }, [
    node("text", { text: "I confirm the above is true." }),
  ]),
  node("section", { title: "Certificates", sectionType: "certifications" }, [
    node("certification", { name: "CKA", issuer: "CNCF", date: "2023", url: "credly.com/badges/123" }),
  ]),
  node("section", { title: "Skills", sectionType: "skills" }, [
    node("skillGroup", { name: "Languages" }, [node("skill", { name: "Go" }), node("skill", { name: "Rust" })]),
  ]),
];

const renderWith = (design: Partial<typeof DESIGN_DEFAULTS>) =>
  createResumePdf({
    tree: { roots: fullRoots() },
    design: { ...DESIGN_DEFAULTS, ...design },
    resumeName: "CV",
    versionName: "Default",
    isBaseVersion: true,
  });

const allText = (pdf: Awaited<ReturnType<typeof createResumePdf>>) =>
  Array.from({ length: pdf.getNumberOfPages() }, (_, i) =>
    (pdf.internal.pages as unknown as string[][])[i + 1].join("\n"),
  ).join("\n");

const rawPdf = (pdf: Awaited<ReturnType<typeof createResumePdf>>) =>
  Buffer.from(pdf.output("arraybuffer")).toString("latin1");

describe("links and coverage", () => {
  it("prints languages and free paragraphs, which used to be dropped", async () => {
    const text = allText(await renderWith({}));
    expect(text).toContain("French");
    expect(text).toContain("C1");
    expect(text).toContain("I confirm the above is true.");
  });

  it("prints profile links as readable addresses and makes them clickable", async () => {
    const pdf = await renderWith({});
    const text = allText(pdf);
    expect(text).toContain("linkedin.com/in/ada");
    // A bare handle is expanded into its profile URL.
    expect(text).toContain("github.com/ada");
    expect(text).toContain("Nationality: ");
    const raw = rawPdf(pdf);
    expect(raw).toContain("/URI (https://linkedin.com/in/ada)");
    expect(raw).toContain("/URI (https://github.com/ada)");
    expect(raw).toContain("/URI (mailto:ada@example.com)");
    expect(raw).toContain("/URI (https://engines.example)");
    expect(raw).toContain("/URI (https://credly.com/badges/123)");
  });

  it("prints names instead of addresses when asked, keeping the link", async () => {
    const pdf = await renderWith({ linkText: "name" });
    const text = allText(pdf);
    expect(text).toContain("LinkedIn");
    expect(text).not.toContain("linkedin.com/in/ada");
    expect(rawPdf(pdf)).toContain("/URI (https://linkedin.com/in/ada)");
  });

  it.each(["stacked", "split", "banner"] as const)("renders the %s header", async (headerLayout) => {
    const text = allText(await renderWith({ headerLayout }));
    expect(text).toContain("Ada Lovelace");
    expect(text).toContain("ada@example.com");
  });

  it.each(["inline", "chips", "list"] as const)("writes %s skills as text", async (skillStyle) => {
    const text = allText(await renderWith({ skillStyle }));
    expect(text).toContain("Go");
    expect(text).toContain("Rust");
  });

  it("splits sections into two flows when a sidebar is in use", async () => {
    const pdf = await renderWith({ columns: "two" });
    const runs = placements(pdf);
    const main = runs.find((p) => p.text === "EXPERIENCE")!.x;
    const side = runs.find((p) => p.text === "SKILLS")!.x;
    expect(side).toBeGreaterThan(main + 200);
  });

  it("prints a footer with page numbers on every page", async () => {
    const text = allText(await renderWith({ footerPageNumbers: true }));
    expect(text).toContain("1 / 1");
  });
});

describe("regressions", () => {
  const PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  it.each(["circle", "rounded", "square"] as const)("embeds a %s photo", async (photoShape) => {
    const roots = fullRoots();
    roots[0] = { ...roots[0], data: { ...roots[0].data, photo: PNG } };
    const pdf = await createResumePdf({
      tree: { roots },
      design: { ...DESIGN_DEFAULTS, showPhoto: true, photoShape },
      resumeName: "CV",
      versionName: "Default",
      isBaseVersion: true,
    });
    const page = allText(pdf);
    expect(page).toContain("/I");
    // Round shapes clip the image; a square one has nothing to clip.
    if (photoShape === "square") expect(page).not.toMatch(/\nW\nn\n/);
    else expect(page).toMatch(/\nW\nn\n/);
  });

  it("links the subtitle, not the title, on a same-line split head", async () => {
    const pdf = await renderWith({ datePosition: "split", subtitlePlacement: "sameLine" });
    const raw = rawPdf(pdf);
    expect(raw).toContain("/URI (https://engines.example)");
    expect(allText(pdf)).toContain("Engines Ltd");
  });

  it("keeps every skill when a skill line wraps", async () => {
    const many = Array.from({ length: 40 }, (_, i) => `Skill${i}`);
    const roots = [
      node("section", { title: "Skills", sectionType: "skills" }, [
        node("skillGroup", { name: "Tools" }, many.map((name) => node("skill", { name }))),
      ]),
    ];
    const pdf = await createResumePdf({
      tree: { roots },
      design: DESIGN_DEFAULTS,
      resumeName: "CV",
      versionName: "Default",
      isBaseVersion: true,
    });
    const text = placements(pdf).map((p) => p.text).join(" ");
    for (const skill of many) expect(text).toContain(skill);
    expect(text.match(/Skill39/g)).toHaveLength(1);
  });
});
