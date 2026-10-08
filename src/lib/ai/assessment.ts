/**
 * Job eligibility: what Claude reports about a posting, and the verdict
 * ResumeCandy draws from it.
 *
 * Claude classifies each requirement; the arithmetic and the verdict are done
 * here, deterministically. A model asked to "score the fit" drifts with its
 * mood, while the same statuses always give the same number — and the
 * thresholds stay something a person can read and argue with.
 */

export type RequirementCategory = "hard" | "nice" | "soft";
export type RequirementStatus = "match" | "partial" | "mitigable" | "gap";
export type Verdict = "greenlit" | "borderline" | "notAdvised";

export interface Requirement {
  requirement: string;
  category: RequirementCategory;
  status: RequirementStatus;
  /** Where the profile shows it, or what is missing. One sentence. */
  evidence: string;
}

/** Claude's half: the reading of the posting against the profile. */
export interface AssessmentReport {
  jobTitle: string;
  company: string;
  /** Language the posting is written in. */
  postingLanguage: "en" | "fr" | "ar" | "other";
  requirements: Requirement[];
  strengths: string[];
  /** How to present partial / learnable requirements truthfully. */
  framing: string[];
  summary: string;
}

/** The report plus ResumeCandy's scoring. */
export interface Assessment extends AssessmentReport {
  /** 0–1, hard requirements only. */
  hardScore: number;
  /** 0–1, every requirement, hard weighted double and soft at half. */
  overallScore: number;
  verdict: Verdict;
}

export const STATUS_POINTS: Record<RequirementStatus, number> = {
  match: 1,
  partial: 0.7,
  mitigable: 0.4,
  gap: 0,
};

const CATEGORY_WEIGHT: Record<RequirementCategory, number> = { hard: 2, nice: 1, soft: 0.5 };

/** Hard score at or above this: apply. */
export const GREENLIT_AT = 0.8;
/** Hard score at or above this (and below GREENLIT_AT): your call. */
export const BORDERLINE_AT = 0.65;

function average(items: { points: number; weight: number }[]): number {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  if (total === 0) return 0;
  return items.reduce((sum, i) => sum + i.points * i.weight, 0) / total;
}

export function scoreAssessment(report: AssessmentReport): Assessment {
  const reqs = report.requirements;
  const hard = reqs.filter((r) => r.category === "hard");
  const hardScore = average(hard.map((r) => ({ points: STATUS_POINTS[r.status], weight: 1 })));
  const overallScore = average(
    reqs.map((r) => ({ points: STATUS_POINTS[r.status], weight: CATEGORY_WEIGHT[r.category] })),
  );
  // A posting with no hard requirements at all is judged on everything it asks.
  const basis = hard.length > 0 ? hardScore : overallScore;
  const verdict: Verdict =
    basis >= GREENLIT_AT ? "greenlit" : basis >= BORDERLINE_AT ? "borderline" : "notAdvised";
  return { ...report, hardScore: hard.length > 0 ? hardScore : overallScore, overallScore, verdict };
}

/* --------------------------------- schema --------------------------------- */

const str = { type: "string" } as const;
const strings = { type: "array", items: str } as const;

export const ASSESSMENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["jobTitle", "company", "postingLanguage", "requirements", "strengths", "framing", "summary"],
  properties: {
    jobTitle: str,
    company: str,
    postingLanguage: { type: "string", enum: ["en", "fr", "ar", "other"] },
    requirements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["requirement", "category", "status", "evidence"],
        properties: {
          requirement: str,
          category: { type: "string", enum: ["hard", "nice", "soft"] },
          status: { type: "string", enum: ["match", "partial", "mitigable", "gap"] },
          evidence: str,
        },
      },
    },
    strengths: strings,
    framing: strings,
    summary: str,
  },
} as const;

/* ------------------------------- validation ------------------------------- */

const s = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown, max = 12) =>
  Array.isArray(v) ? v.map((x) => s(x, 600)).filter(Boolean).slice(0, max) : [];
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;

/** Coerces whatever came back into a well-formed report. */
export function sanitizeAssessment(raw: unknown): AssessmentReport {
  const r = (raw ?? {}) as Record<string, unknown>;
  const requirements = Array.isArray(r.requirements) ? r.requirements : [];
  return {
    jobTitle: s(r.jobTitle, 200),
    company: s(r.company, 200),
    postingLanguage: oneOf(r.postingLanguage, ["en", "fr", "ar", "other"] as const, "other"),
    requirements: requirements
      .map((x) => {
        const q = (x ?? {}) as Record<string, unknown>;
        return {
          requirement: s(q.requirement, 300),
          category: oneOf(q.category, ["hard", "nice", "soft"] as const, "nice"),
          status: oneOf(q.status, ["match", "partial", "mitigable", "gap"] as const, "gap"),
          evidence: s(q.evidence, 600),
        };
      })
      .filter((q) => q.requirement)
      .slice(0, 30),
    strengths: list(r.strengths),
    framing: list(r.framing),
    summary: s(r.summary, 1500),
  };
}
