/** Editor view state encoded in the URL — shared by server routing and the client store. */

export type EditorTab = "content" | "customize";

export function editorUrl(resumeId: string, versionId: string, tab: EditorTab = "content") {
  return tab === "customize"
    ? `/resume/${resumeId}/${versionId}/customize`
    : `/resume/${resumeId}/${versionId}`;
}

/** Parse the catch-all segments after /resume/[resumeId]/. */
export function parseView(segments: string[]): { versionId: string | null; tab: EditorTab } {
  return {
    versionId: segments[0] ?? null,
    tab: segments[1] === "customize" ? "customize" : "content",
  };
}
