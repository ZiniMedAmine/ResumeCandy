import { describe, expect, it } from "vitest";
import { analyzeResume, extractKeywords, matchKeywords, mentions } from "./ats";
import { DESIGN_DEFAULTS } from "./design";
import type { ResolvedNode } from "./resume/types";

let seq = 0;
const node = (kind: ResolvedNode["kind"], data: Record<string, unknown>, children: ResolvedNode[] = []): ResolvedNode => ({
  id: `n${++seq}`,
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

const longText = (words: number) => Array.from({ length: words }, (_, i) => `word${i}`).join(" ");

function strongResume(): ResolvedNode[] {
  return [
    node(
      "header",
      {
        fullName: "Ada Lovelace",
        email: "ada@example.com",
        phone: "+44 20 0000 0000",
        location: "London, UK",
        summary: "Engineer building analytical engines and the programs that run on them.",
      },
      [node("contact", { type: "linkedin", value: "linkedin.com/in/ada", label: "" })],
    ),
    node("section", { title: "Professional Experience", sectionType: "experience" }, [
      node("experience", { title: "Engineer", company: "Engines Ltd", startDate: "2020-01", endDate: "Present" }, [
        node("bullet", { text: `Built the first TypeScript compiler. ${longText(160)}` }),
      ]),
    ]),
    node("section", { title: "Education", sectionType: "education" }, [
      node("education", { school: "Cambridge", degree: "BSc", startDate: "2015", endDate: "2019" }),
    ]),
    node("section", { title: "Technical Skills", sectionType: "skills", column: "main" }, [
      node("skillGroup", { name: "Languages" }, [node("skill", { name: "TypeScript" }), node("skill", { name: "Go" })]),
    ]),
  ];
}

const check = (roots: ResolvedNode[], id: string, design = DESIGN_DEFAULTS) =>
  analyzeResume(roots, design).checks.find((c) => c.id === id)!;

describe("ATS readiness", () => {
  it("passes a complete single-column resume", () => {
    const report = analyzeResume(strongResume(), DESIGN_DEFAULTS);
    expect(report.checks.filter((c) => c.status !== "pass").map((c) => c.id)).toEqual(["bulletLength"]);
    expect(report.score).toBeGreaterThan(90);
  });

  it("fails without a name or email", () => {
    const roots = strongResume();
    roots[0] = { ...roots[0], data: { ...roots[0].data, fullName: "", email: "" } };
    expect(check(roots, "name").status).toBe("fail");
    expect(check(roots, "email").status).toBe("fail");
  });

  it("warns on a malformed email", () => {
    const roots = strongResume();
    roots[0] = { ...roots[0], data: { ...roots[0].data, email: "ada at example" } };
    expect(check(roots, "email").status).toBe("warn");
  });

  it("flags headings a parser will not recognise", () => {
    const roots = strongResume();
    roots[1] = { ...roots[1], data: { ...roots[1].data, title: "Where I've Been" } };
    const c = check(roots, "headings");
    expect(c.status).toBe("warn");
    expect(c.params?.titles).toContain("Where I've Been");
  });

  it("recognises standard headings in French and Arabic too", () => {
    const roots = strongResume();
    roots[1] = { ...roots[1], data: { ...roots[1].data, title: "Expérience Professionnelle" } };
    roots[2] = { ...roots[2], data: { ...roots[2].data, title: "التعليم" } };
    expect(check(roots, "headings").status).toBe("pass");
  });

  it("counts undated entries and roles without bullets", () => {
    const roots = strongResume();
    roots[1] = {
      ...roots[1],
      children: [...roots[1].children, node("experience", { title: "Intern", company: "Mill" })],
    };
    expect(check(roots, "dates").params?.n).toBe(1);
    expect(check(roots, "bullets").params?.n).toBe(1);
  });

  it("warns about a sidebar only when one is actually used", () => {
    expect(check(strongResume(), "columns", { ...DESIGN_DEFAULTS, columns: "two" }).status).toBe("pass");
    const roots = strongResume();
    roots[3] = { ...roots[3], data: { ...roots[3].data, column: "side" } };
    expect(check(roots, "columns", { ...DESIGN_DEFAULTS, columns: "two" }).status).toBe("warn");
  });

  it("warns when links print as names only", () => {
    expect(check(strongResume(), "linkText", { ...DESIGN_DEFAULTS, linkText: "name" }).status).toBe("warn");
  });

  it("does not count photo data as words", () => {
    const roots = strongResume();
    roots[0] = { ...roots[0], data: { ...roots[0].data, photo: "data:image/jpeg;base64,AAAA BBBB CCCC" } };
    expect(analyzeResume(roots, DESIGN_DEFAULTS).wordCount).toBe(analyzeResume(strongResume(), DESIGN_DEFAULTS).wordCount);
  });
});

describe("keyword match", () => {
  const posting = `
    We are looking for a Senior Backend Engineer with strong experience in Go and Kubernetes.
    You will design distributed systems, own CI/CD pipelines and mentor engineers.
    Experience with distributed systems at scale is required. Kubernetes and Terraform a plus.
    Knowledge of C++ or C# is nice to have.`;

  it("keeps recurring phrases and drops boilerplate", () => {
    const keywords = extractKeywords(posting);
    expect(keywords).toContain("distributed systems");
    expect(keywords).toContain("kubernetes");
    expect(keywords).toContain("ci/cd");
    expect(keywords).toContain("c++");
    expect(keywords).toContain("c#");
    expect(keywords).not.toContain("experience");
    expect(keywords).not.toContain("strong");
    // Covered by the phrase, so not listed again on its own.
    expect(keywords).not.toContain("systems");
  });

  it("matches whole words only", () => {
    expect(mentions("javascript developer", "java")).toBe(false);
    expect(mentions("java, kotlin", "java")).toBe(true);
    expect(mentions("c++ and rust", "c++")).toBe(true);
  });

  it("reports what the resume covers and what it misses", () => {
    const report = matchKeywords(posting, strongResume());
    expect(report.matched).toContain("go");
    expect(report.missing).toContain("kubernetes");
    expect(report.coverage).toBeGreaterThan(0);
    expect(report.coverage).toBeLessThan(100);
  });
});
