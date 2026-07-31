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
