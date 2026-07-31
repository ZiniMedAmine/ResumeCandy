import { notFound, redirect } from "next/navigation";
import { EditorApp } from "@/components/editor-app";
import { defaultVersionId, loadResumePayload } from "@/lib/data";
import { editorUrl, parseView } from "@/lib/view";

export const dynamic = "force-dynamic";

/**
 * One segment serves the whole editor surface: /resume/x/<versionId> is the
 * Content tab, /resume/x/<versionId>/customize the Customize tab. Both mount
 * the same client app, so switching versions or tabs is a pushState +
 * in-memory re-resolve — no server round trip, regardless of version count.
 */
export default async function ResumePage(props: {
  params: Promise<{ resumeId: string; view?: string[] }>;
}) {
  const { resumeId, view = [] } = await props.params;
  const payload = await loadResumePayload(resumeId);
  if (!payload) notFound();

  const { versionId, tab } = parseView(view);
  const exists = versionId
    ? payload.versions.some((v) => v.id === versionId && !v.deletedAt)
    : false;
  if (!exists) {
    const target = defaultVersionId(resumeId);
    if (!target) notFound();
    redirect(editorUrl(resumeId, target));
  }

  return <EditorApp payload={payload} initialVersionId={versionId!} initialTab={tab} />;
}
