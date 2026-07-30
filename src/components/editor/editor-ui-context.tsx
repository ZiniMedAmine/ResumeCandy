"use client";

import { createContext, useContext } from "react";

export interface ConfirmOptions {
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

/** Shell-level UI services shared by deep editor components. */
export interface EditorUI {
  confirm(opts: ConfirmOptions): void;
  openCopyField(nodeId: string, field: string, value: unknown): void;
  openCopyCustomizations(preselectNodeIds?: string[]): void;
  openCustomizations(): void;
  openSwitcher(): void;
  openManager(): void;
  openNewVersion(fromVersionId?: string | null): void;
}

export const EditorUIContext = createContext<EditorUI | null>(null);

export function useEditorUI(): EditorUI {
  const ctx = useContext(EditorUIContext);
  if (!ctx) throw new Error("useEditorUI must be used inside the editor shell");
  return ctx;
}
