"use server";

import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { runStructured } from "@/lib/ai/claude";
import { AiError, type AiErrorCode } from "@/lib/ai/result";
import { ASSESSMENT_SCHEMA, sanitizeAssessment, scoreAssessment, type Assessment } from "@/lib/ai/assessment";
import {
  COVER_LETTER_SCHEMA,
  assessmentPrompt,
  assessmentSystem,
  coverLetterPrompt,
  coverLetterSystem,
  tailorPrompt,
  tailorSystem,
} from "@/lib/ai/prompts";
import { TAILORED_SCHEMA, sanitizeTailored, tailoredToNodes, tailoredToText } from "@/lib/ai/tailored";
import { resumeText } from "@/lib/ats";
import { requireUser } from "@/lib/auth/dal";
import { getCollection, getProfile, loadResumePayload } from "@/lib/data";
import { TEMPLATE_IDS, resolveDesign, type TemplateId } from "@/lib/design";
import { getI18n } from "@/lib/i18n/server";
import { LOCALE_LIST, type LocaleId } from "@/lib/locale";
import { resolveVersion } from "@/lib/resume/resolve";
import { assertOwnsVersion } from "@/lib/server/mutations";

const { nodes, profiles, resumes, versions } = tables;

const MAX_PROFILE = 100_000;
const MAX_JOB_DESCRIPTION = 20_000;

/**
 * Tailoring: the master profile, the fit check, and generating a résumé (and
 * cover letter) for one posting.
 *
 * The Claude calls can fail for reasons that are nobody's bug — the CLI is not
 * installed, its sign-in expired, a usage limit was hit — so those come back
 * as values the page can explain, not as thrown errors.
 */

export type AiFailure = { ok: false; error: AiErrorCode | "no-profile" | "no-job"; message: string };

function failure(error: unknown): AiFailure {
  if (error instanceof AiError) return { ok: false, error: error.code, message: error.message };
  console.error(error);
  return { ok: false, error: "failed", message: error instanceof Error ? error.message : String(error) };
}

async function requireProfile(): Promise<string | AiFailure> {
  const { content } = await getProfile();
  if (!content.trim()) return { ok: false, error: "no-profile", message: "The master profile is empty." };
  return content;
}

function cleanJob(text: unknown): string {
  return String(text ?? "").trim().slice(0, MAX_JOB_DESCRIPTION);
}

/* --------------------------------- profile -------------------------------- */

export async function saveProfile(input: { content: string }) {
  const user = await requireUser();
  const content = String(input.content ?? "").slice(0, MAX_PROFILE);
  const updatedAt = Date.now();
  db.insert(profiles)
    .values({ userId: user.id, content, updatedAt })
    .onConflictDoUpdate({ target: profiles.userId, set: { content, updatedAt } })
    .run();
  return { ok: true as const, updatedAt };
}

/* ------------------------------- assessment ------------------------------- */

export async function assessJob(input: {
  jobDescription: string;
}): Promise<{ ok: true; assessment: Assessment } | AiFailure> {
  const jobDescription = cleanJob(input.jobDescription);
  if (!jobDescription) return { ok: false, error: "no-job", message: "Paste the job description first." };
  const profile = await requireProfile();
  if (typeof profile !== "string") return profile;
  const { locale } = await getI18n();

  try {
    const raw = await runStructured<unknown>({
      system: assessmentSystem(locale),
      prompt: assessmentPrompt(profile, jobDescription),
      schema: ASSESSMENT_SCHEMA,
    });
    return { ok: true, assessment: scoreAssessment(sanitizeAssessment(raw)) };
  } catch (error) {
    return failure(error);
  }
}

/* -------------------------------- generate -------------------------------- */

export interface GenerateInput {
  jobDescription: string;
  jobUrl: string;
  template: string;
  /** A CV language, or "auto" to follow the posting. */
  language: string;
  coverLetter: boolean;
  /** The fit check, when one was run: keeps the CV consistent with it. */
  assessment: Assessment | null;
}

export async function generateTailoredResume(
  input: GenerateInput,
): Promise<{ ok: true; resumeId: string; versionId: string; notes: string[] } | AiFailure> {
  const jobDescription = cleanJob(input.jobDescription);
  if (!jobDescription) return { ok: false, error: "no-job", message: "Paste the job description first." };
  const profile = await requireProfile();
  if (typeof profile !== "string") return profile;
  const { locale: uiLocale } = await getI18n();

  const template = TEMPLATE_IDS.find((id) => id === input.template) as TemplateId | undefined;
  const requested = LOCALE_LIST.find((l) => l.id === input.language)?.id;
  const language: LocaleId | "auto" = requested ?? "auto";
  const jobUrl = String(input.jobUrl ?? "").trim().slice(0, 2048);
  const assessment = input.assessment ? sanitizeAssessment(input.assessment) : null;

  try {
    const raw = await runStructured<unknown>({
      system: tailorSystem({ language, uiLocale }),
      prompt: tailorPrompt(profile, jobDescription, assessment),
      schema: TAILORED_SCHEMA,
    });
    const content = sanitizeTailored(raw, requested ?? "en");
    if (!content.header.fullName && content.experience.length === 0) {
      throw new AiError("bad-output", "Claude returned an empty résumé.");
    }

    let coverLetter: string | null = null;
    if (input.coverLetter) {
      const letter = await runStructured<{ letter?: unknown }>({
        system: coverLetterSystem(content.language),
        prompt: coverLetterPrompt(profile, jobDescription, tailoredToText(content)),
        schema: COVER_LETTER_SCHEMA,
      });
      coverLetter = typeof letter.letter === "string" ? letter.letter.trim() || null : null;
    }

    const collection = await getCollection();
    const resumeId = nanoid();
    const versionId = nanoid();
    const role = assessment?.jobTitle || content.header.headline || "Tailored resume";
    const name = (assessment?.company ? `${role} · ${assessment.company}` : role).slice(0, 120);
    const settings: Record<string, unknown> = { language: content.language };
    if (template) settings.template = template;
    const links = /^https?:\/\//i.test(jobUrl)
      ? [{ id: nanoid(10), kind: "posting", label: role.slice(0, 120), url: jobUrl }]
      : [];

    db.transaction((tx) => {
      tx.insert(resumes)
        .values({ id: resumeId, collectionId: collection.id, name, slug: slugify(name), settings })
        .run();
      tx.insert(versions)
        .values({
          id: versionId,
          resumeId,
          name: "Default",
          isBase: 1,
          lastOpenedAt: Date.now(),
          jobDescription,
          coverLetter,
          links,
        })
        .run();
      const rows = tailoredToNodes(content, () => nanoid());
      if (rows.length) {
        tx.insert(nodes)
          .values(rows.map((n) => ({ ...n, resumeId, ownerVersionId: null })))
          .run();
      }
    });

    return { ok: true, resumeId, versionId, notes: content.notes };
  } catch (error) {
    return failure(error);
  }
}

/* ------------------------------ cover letter ------------------------------ */

/** Writes a cover letter for an existing version, against its job description. */
export async function writeCoverLetter(input: {
  versionId: string;
  /** What the panel shows, which may be ahead of the debounced save. */
  jobDescription?: string;
}): Promise<{ ok: true; letter: string } | AiFailure> {
  const resumeId = await assertOwnsVersion(input.versionId);
  const payload = await loadResumePayload(resumeId);
  const version = payload?.versions.find((v) => v.id === input.versionId);
  if (!payload || !version) return { ok: false, error: "failed", message: "Version not found." };
  const jobDescription = cleanJob(input.jobDescription ?? version.jobDescription);
  if (!jobDescription) return { ok: false, error: "no-job", message: "Attach the job description first." };
  const profile = await requireProfile();
  if (typeof profile !== "string") return profile;

  const isBase = version.isBase === 1 || version.isBase === true;
  const design = resolveDesign(
    payload.resume.settings,
    isBase ? null : (payload.settingsPatches[version.id] ?? null),
  );
  const tree = resolveVersion(payload.nodes, payload.overrides, version.id);

  try {
    const result = await runStructured<{ letter?: unknown }>({
      system: coverLetterSystem(design.language),
      prompt: coverLetterPrompt(profile, jobDescription, resumeText(tree.roots)),
      schema: COVER_LETTER_SCHEMA,
    });
    const letter = typeof result.letter === "string" ? result.letter.trim() : "";
    if (!letter) throw new AiError("bad-output", "Claude returned an empty letter.");
    db.update(versions)
      .set({ coverLetter: letter, updatedAt: Date.now() })
      .where(eq(versions.id, version.id))
      .run();
    return { ok: true, letter };
  } catch (error) {
    return failure(error);
  }
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "resume"
  );
}
