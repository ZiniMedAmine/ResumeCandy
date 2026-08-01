"use server";

import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { db, tables } from "@/db";
import { getCollection } from "@/lib/data";
import { assertOwnsResume } from "@/lib/server/mutations";
import { TEMPLATE_IDS, type TemplateId } from "@/lib/design";
import { LOCALE_LIST, sectionTitle } from "@/lib/locale";
import { ranksBetween } from "@/lib/resume/rank";

const { nodes, resumes, versions } = tables;

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "resume"
  );
}

/**
 * Create a resume with its Default version and a standard skeleton:
 * header + the common sections, ready to fill in.
 *
 * Optional `template` and `language` fields carry the choices made before
 * creation; they become the resume's base design, which every version then
 * inherits. The skeleton's headings are written in that language from the
 * start, so an Arabic resume never opens full of English to translate.
 */
export async function createResume(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim() || "Untitled resume";
  const requested = String(formData.get("template") ?? "");
  const template = TEMPLATE_IDS.find((id) => id === requested) as TemplateId | undefined;
  const requestedLocale = String(formData.get("language") ?? "");
  const language = LOCALE_LIST.find((l) => l.id === requestedLocale)?.id;
  const skeletonLocale = language ?? "en";
  const collection = await getCollection();
  const resumeId = nanoid();
  const versionId = nanoid();

  const settings: Record<string, unknown> = {};
  if (template) settings.template = template;
  if (language) settings.language = language;

  db.transaction((tx) => {
    tx.insert(resumes)
      .values({
        id: resumeId,
        collectionId: collection.id,
        name,
        slug: slugify(name),
        settings: Object.keys(settings).length ? settings : null,
      })
      .run();
    tx.insert(versions)
      .values({ id: versionId, resumeId, name: "Default", isBase: 1, lastOpenedAt: Date.now() })
      .run();

    const ranks = ranksBetween(null, null, 5);
    tx.insert(nodes)
      .values([
        {
          id: nanoid(),
          resumeId,
          parentId: null,
          kind: "header",
          rank: ranks[0],
          data: {
            fullName: "",
            headline: "",
            email: "",
            phone: "",
            location: "",
            website: "",
            summary: "",
          },
          ownerVersionId: null,
        },
        ...(["experience", "education", "skills", "projects"] as const).map((sectionType, i) => ({
          id: nanoid(),
          resumeId,
          parentId: null,
          kind: "section" as const,
          rank: ranks[i + 1],
          data: { title: sectionTitle(sectionType, skeletonLocale), sectionType },
          ownerVersionId: null,
        })),
      ])
      .run();
  });

  redirect(`/resume/${resumeId}/${versionId}`);
}

/** Merge keys into the resume's base design settings (null deletes a key). */
export async function setResumeSettings(input: {
  resumeId: string;
  patch: Record<string, unknown>;
}) {
  await assertOwnsResume(input.resumeId);
  const resume = db.select().from(resumes).where(eq(resumes.id, input.resumeId)).all()[0];
  if (!resume) throw new Error("Resume not found");
  const merged = { ...(resume.settings ?? {}), ...input.patch };
  for (const key of Object.keys(merged)) {
    if (merged[key] === null) delete merged[key];
  }
  db.update(resumes)
    .set({ settings: Object.keys(merged).length ? merged : null, updatedAt: Date.now() })
    .where(eq(resumes.id, input.resumeId))
    .run();
  return { ok: true as const };
}

export async function renameResume(input: { resumeId: string; name: string }) {
  await assertOwnsResume(input.resumeId);
  const name = input.name.trim();
  if (!name) throw new Error("Resume name cannot be empty");
  db.update(resumes)
    .set({ name, slug: slugify(name), updatedAt: Date.now() })
    .where(eq(resumes.id, input.resumeId))
    .run();
  return { ok: true as const };
}

/** Deletes the resume with all versions, nodes and overrides (FK cascade). */
export async function deleteResume(input: { resumeId: string }) {
  await assertOwnsResume(input.resumeId);
  db.delete(resumes).where(eq(resumes.id, input.resumeId)).run();
  return { ok: true as const };
}
