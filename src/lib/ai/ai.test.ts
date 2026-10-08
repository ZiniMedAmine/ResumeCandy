import { describe, expect, it } from "vitest";
import { sanitizeAssessment, scoreAssessment, type Requirement } from "./assessment";
import { AiError, parseResult } from "./result";
import { normalizeDate, sanitizeTailored, tailoredToNodes } from "./tailored";

const req = (category: Requirement["category"], status: Requirement["status"]): Requirement => ({
  requirement: `${category} ${status}`,
  category,
  status,
  evidence: "",
});

const report = (requirements: Requirement[]) =>
  sanitizeAssessment({ jobTitle: "Engineer", company: "Acme", postingLanguage: "en", requirements });

describe("scoreAssessment", () => {
  it("greenlights when hard requirements are met", () => {
    const a = scoreAssessment(report([req("hard", "match"), req("hard", "match"), req("hard", "partial"), req("nice", "gap")]));
    expect(a.hardScore).toBeCloseTo(0.9);
    expect(a.verdict).toBe("greenlit");
  });

  it("is borderline between 65% and 80% on hard requirements", () => {
    const a = scoreAssessment(report([req("hard", "match"), req("hard", "partial"), req("hard", "partial"), req("hard", "partial")]));
    expect(a.hardScore).toBeCloseTo(0.775);
    expect(a.verdict).toBe("borderline");
  });

  it("advises against when hard requirements are missing", () => {
    const a = scoreAssessment(report([req("hard", "match"), req("hard", "gap"), req("hard", "mitigable")]));
    expect(a.verdict).toBe("notAdvised");
  });

  it("weights hard double and soft at half in the overall score", () => {
    const a = scoreAssessment(report([req("hard", "match"), req("soft", "gap")]));
    // (1×2 + 0×0.5) / 2.5
    expect(a.overallScore).toBeCloseTo(0.8);
  });

  it("falls back to the overall score when the posting lists no hard requirement", () => {
    const a = scoreAssessment(report([req("nice", "match"), req("soft", "match")]));
    expect(a.verdict).toBe("greenlit");
  });
});

describe("sanitizeAssessment", () => {
  it("coerces unknown values instead of trusting them", () => {
    const r = sanitizeAssessment({
      postingLanguage: "de",
      requirements: [{ requirement: "Go", category: "must", status: "great" }, { requirement: "" }],
      strengths: ["a", 3, ""],
    });
    expect(r.postingLanguage).toBe("other");
    expect(r.requirements).toEqual([{ requirement: "Go", category: "nice", status: "gap", evidence: "" }]);
    expect(r.strengths).toEqual(["a"]);
  });
});

describe("normalizeDate", () => {
  it("keeps canonical forms and converts common ones", () => {
    expect(normalizeDate("2022-03")).toBe("2022-03");
    expect(normalizeDate("2019")).toBe("2019");
    expect(normalizeDate("3/2021")).toBe("2021-03");
    expect(normalizeDate("Présent")).toBe("Present");
    expect(normalizeDate("current")).toBe("Present");
    expect(normalizeDate("Summer 2020")).toBe("Summer 2020");
    expect(normalizeDate(undefined)).toBe("");
  });
});

describe("tailoredToNodes", () => {
  const content = sanitizeTailored(
    {
      language: "fr",
      header: { fullName: "Ada Lovelace", headline: "Ingénieure", summary: "Spécialiste **Python**." },
      contacts: [
        { type: "linkedin", value: "linkedin.com/in/ada" },
        { type: "myspace", value: "nope" },
      ],
      sectionOrder: ["education", "experience"],
      experience: [
        { title: "Engineer", company: "Engines", startDate: "2022-01", endDate: "present", bullets: ["Built **Kafka** ingestion", "Led a team"] },
      ],
      education: [{ degree: "MSc", school: "Uni", startDate: "2018", endDate: "2020", bullets: [] }],
      skills: [{ name: "Data", items: ["Python", "SQL"] }, { name: "Empty", items: [] }],
      languages: [{ name: "Français", level: "Natif" }],
    },
    "en",
  );
  let n = 0;
  const nodes = tailoredToNodes(content, () => `n${++n}`);
  const roots = nodes.filter((x) => x.parentId === null).sort((a, b) => (a.rank < b.rank ? -1 : 1));

  it("puts the header first and follows the requested section order", () => {
    expect(roots.map((r) => r.kind)).toEqual(["header", "section", "section", "section", "section"]);
    expect(roots.slice(1).map((r) => r.data.sectionType)).toEqual(["education", "experience", "skills", "languages"]);
  });

  it("writes section headings in the CV's language", () => {
    expect(roots[1].data.title).toBe("Formation");
  });

  it("keeps only known contact types, as header children", () => {
    const contacts = nodes.filter((x) => x.kind === "contact");
    expect(contacts).toHaveLength(1);
    expect(contacts[0].parentId).toBe(roots[0].id);
    expect(contacts[0].data).toEqual({ type: "linkedin", value: "linkedin.com/in/ada", label: "" });
  });

  it("nests bullets under their entry, in order, with canonical dates", () => {
    const exp = nodes.find((x) => x.kind === "experience")!;
    expect(exp.data.endDate).toBe("Present");
    expect(exp.data).not.toHaveProperty("bullets");
    const bullets = nodes.filter((x) => x.parentId === exp.id).sort((a, b) => (a.rank < b.rank ? -1 : 1));
    expect(bullets.map((b) => b.data.text)).toEqual(["Built **Kafka** ingestion", "Led a team"]);
  });

  it("drops empty skill groups and gives skills their own nodes", () => {
    const groups = nodes.filter((x) => x.kind === "skillGroup");
    expect(groups.map((g) => g.data.name)).toEqual(["Data"]);
    expect(nodes.filter((x) => x.parentId === groups[0].id).map((s) => s.data.name)).toEqual(["Python", "SQL"]);
  });

  it("gives every node a unique id", () => {
    expect(new Set(nodes.map((x) => x.id)).size).toBe(nodes.length);
  });
});

describe("parseResult", () => {
  it("reads structured output from the CLI envelope", () => {
    const out = JSON.stringify({ type: "result", is_error: false, structured_output: { fruits: ["apple"] }, result: "" });
    expect(parseResult<{ fruits: string[] }>(out)).toEqual({ fruits: ["apple"] });
  });

  it("falls back to fenced JSON in the result text", () => {
    const out = JSON.stringify({ type: "result", is_error: false, result: '```json\n{"a":1}\n```' });
    expect(parseResult(out)).toEqual({ a: 1 });
  });

  it("reports a sign-in problem distinctly", () => {
    const out = JSON.stringify({ type: "result", is_error: true, result: "Invalid API key · Please run /login" });
    expect(() => parseResult(out)).toThrow(AiError);
    try {
      parseResult(out);
    } catch (error) {
      expect((error as AiError).code).toBe("not-signed-in");
    }
  });

  it("rejects output that is not JSON", () => {
    expect(() => parseResult("command not found")).toThrow(AiError);
  });
});
