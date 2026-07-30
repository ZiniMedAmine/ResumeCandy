import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintDocument } from "@/components/print/print-document";
import { loadResumePayload } from "@/lib/data";
import { resolveDesign, type DesignSettings } from "@/lib/design";
import { resolveVersion } from "@/lib/resume/resolve";

export const dynamic = "force-dynamic";

interface PrintParams {
  params: Promise<{ resumeId: string; versionId: string }>;
  searchParams: Promise<{ auto?: string }>;
}

/**
 * Named versions carry their name; the Default is just the resume, since
 * "Software Engineer — Default" reads oddly on a job application.
 */
function documentTitle(resumeName: string, versionName: string, isBase: boolean): string {
  return isBase ? resumeName : `${resumeName} — ${versionName}`;
}

/**
 * Browsers use the document title as the suggested PDF filename, so it has to
 * come from metadata — a title set in an effect gets overwritten by the
 * framework's own.
 */
export async function generateMetadata(props: PrintParams): Promise<Metadata> {
  const { resumeId, versionId } = await props.params;
  const payload = loadResumePayload(resumeId);
  const version = payload?.versions.find((v) => v.id === versionId);
  if (!payload || !version) return { title: "Resume" };
  const isBase = version.isBase === 1 || version.isBase === true;
  return { title: documentTitle(payload.resume.name, version.name, isBase) };
}

/**
 * The printable view of one version: just the paper, no application chrome.
 *
 * It sits on its own path rather than under the editor's catch-all so that
 * printing is a plain, linkable URL — handy for checking a PDF directly and
 * for the hidden frame the download button uses.
 */
export default async function PrintPage(props: PrintParams) {
  const { resumeId, versionId } = await props.params;
  const { auto } = await props.searchParams;

  const payload = loadResumePayload(resumeId);
  if (!payload) notFound();

  const version = payload.versions.find((v) => v.id === versionId && !v.deletedAt);
  if (!version) notFound();

  const tree = resolveVersion(payload.nodes, payload.overrides, version.id);
  const isBase = version.isBase === 1 || version.isBase === true;
  const design: DesignSettings = resolveDesign(
    payload.resume.settings as Partial<DesignSettings> | null,
    isBase ? null : payload.settingsPatches[version.id],
  );

  return <PrintDocument tree={{ roots: tree.roots }} design={design} auto={auto === "1"} />;
}
