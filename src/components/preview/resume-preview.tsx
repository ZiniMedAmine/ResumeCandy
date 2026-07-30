"use client";

import { createContext, useContext } from "react";
import type { DesignSettings } from "@/lib/design";
import { ClassicTemplate } from "./templates/classic";
import { ModernTemplate } from "./templates/modern";
import type { PreviewTree } from "./shared";

export interface PreviewMode {
  /**
   * Renders a single, clipped page and skips the measuring pass entirely —
   * a dashboard card only ever shows the top of page one.
   */
  thumbnail: boolean;
  /**
   * Lays the pages out edge to edge at full size, with no gap, shadow or
   * screen furniture, so each rendered page maps exactly onto one sheet of
   * paper when the browser prints.
   */
  print: boolean;
}

const PreviewModeContext = createContext<PreviewMode>({ thumbnail: false, print: false });

export function usePreviewMode() {
  return useContext(PreviewModeContext);
}

/**
 * The rendered resume ("paper") — dispatches to the template selected in the
 * version's effective design settings. Pure function of tree + design, so it
 * re-renders instantly on version switches and Customize tweaks alike.
 */
export function ResumePreview({
  tree,
  design,
  markCustomized = false,
  thumbnail = false,
  print = false,
}: {
  tree: PreviewTree;
  design: DesignSettings;
  markCustomized?: boolean;
  thumbnail?: boolean;
  print?: boolean;
}) {
  const props = { tree, design, markCustomized };
  const body = design.template === "modern" ? <ModernTemplate {...props} /> : <ClassicTemplate {...props} />;
  return (
    <PreviewModeContext.Provider value={{ thumbnail, print }}>{body}</PreviewModeContext.Provider>
  );
}
