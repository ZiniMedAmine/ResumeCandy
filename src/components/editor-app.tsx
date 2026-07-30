"use client";

import { EditorShell } from "@/components/editor-shell";
import type { ResumePayload } from "@/lib/payload";
import type { EditorTab } from "@/lib/view";
import { ResumeStoreProvider } from "@/store/resume-store";

export function EditorApp({
  payload,
  initialVersionId,
  initialTab,
}: {
  payload: ResumePayload;
  initialVersionId: string;
  initialTab: EditorTab;
}) {
  return (
    <ResumeStoreProvider
      key={payload.resume.id}
      payload={payload}
      initialVersionId={initialVersionId}
      initialTab={initialTab}
    >
      <EditorShell />
    </ResumeStoreProvider>
  );
}
