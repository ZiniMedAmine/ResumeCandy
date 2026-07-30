"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CustomizePanel } from "@/components/customize/customize-panel";
import { EditorPanels } from "@/components/editor/editor-panels";
import {
  EditorUIContext,
  type ConfirmOptions,
  type EditorUI,
} from "@/components/editor/editor-ui-context";
import { ResumePreview } from "@/components/preview/resume-preview";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  CloudCheckIcon,
  CloudSyncIcon,
  DownloadIcon,
  FileIcon,
  LayersIcon,
  PaletteIcon,
  PlusIcon,
  SparkleIcon,
} from "@/components/ui/icons";
import { ToastHost } from "@/components/ui/toast-host";
import { printResumeVersion } from "@/lib/print-resume";
import { CopyCustomizationsDialog, CopyFieldDialog } from "@/components/versions/copy-dialog";
import { CustomizationsPanel } from "@/components/versions/customizations-panel";
import { NewVersionDialog } from "@/components/versions/new-version-dialog";
import { VersionManager } from "@/components/versions/version-manager";
import { VersionRail } from "@/components/versions/version-rail";
import { VersionSwitcher } from "@/components/versions/version-switcher";
import {
  useCustomizationCount,
  useDesign,
  useRenderTree,
  useResolvedTree,
  useResumeStore,
  type EditorTab,
} from "@/store/resume-store";

function SaveIndicator() {
  const pending = useResumeStore((s) => s.pendingSaves);
  return (
    <span
      className={`flex items-center gap-1.5 text-[11.5px] ${pending > 0 ? "text-ink-faint" : "text-ink-faint"}`}
      title={pending > 0 ? "Saving…" : "All changes saved"}
    >
      {pending > 0 ? (
        <CloudSyncIcon className="size-4 animate-pulse" />
      ) : (
        <CloudCheckIcon className="size-4 text-emerald-500/70" />
      )}
      <span className="hidden xl:inline">{pending > 0 ? "Saving…" : "Saved"}</span>
    </span>
  );
}

function TabButton({ tab, label, icon }: { tab: EditorTab; label: string; icon: React.ReactNode }) {
  const active = useResumeStore((s) => s.tab) === tab;
  const setTab = useResumeStore((s) => s.setTab);
  return (
    <button
      type="button"
      onClick={() => setTab(tab)}
      className={`pressable flex items-center gap-2 rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
        active
          ? "bg-surface text-ink shadow-card"
          : "text-ink-muted hover:text-ink"
      }`}
    >
      <span className={`[&>svg]:size-4 ${active ? "text-rose-500" : "text-ink-faint"}`}>{icon}</span>
      {label}
    </button>
  );
}

/** Quiet icon button used across the top bar. */
function IconButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="pressable rounded-lg p-2 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink [&>svg]:size-4.5"
    >
      {children}
    </button>
  );
}

function TopBar({ ui }: { ui: EditorUI }) {
  const resumeName = useResumeStore((s) => s.resumeName);
  const resumeId = useResumeStore((s) => s.resumeId);
  const versions = useResumeStore((s) => s.versions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const isBase = activeVersion?.isBase === 1 || activeVersion?.isBase === true;
  const count = useCustomizationCount(activeVersionId);

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-2 border-b border-hairline bg-surface px-4">
      <Link
        href="/"
        className="pressable flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
      >
        <ArrowLeftIcon className="size-4 shrink-0 text-ink-faint" />
        <span className="max-w-40 truncate">{resumeName}</span>
      </Link>

      {/* Center tabs — the primary mode switch. */}
      <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-sunken p-1">
        <TabButton tab="content" label="Content" icon={<FileIcon />} />
        <TabButton tab="customize" label="Customize" icon={<PaletteIcon />} />
      </nav>

      <div className="flex-1" />

      <SaveIndicator />

      {!isBase && count > 0 && (
        <button
          type="button"
          onClick={ui.openCustomizations}
          className="pressable hidden rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 transition-colors duration-150 hover:bg-amber-100 md:block dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
          title="See what differs from the Default"
        >
          {count} customization{count === 1 ? "" : "s"}
        </button>
      )}

      <button
        type="button"
        onClick={ui.openSwitcher}
        className="pressable ml-1 flex items-center gap-2 rounded-lg border border-hairline bg-surface py-1.5 pl-2.5 pr-2 text-[13px] font-medium text-ink shadow-card transition-colors duration-150 hover:border-hairline-strong"
        title="Switch version (Ctrl+K)"
      >
        <span className={`size-1.5 rounded-full ${isBase ? "bg-ink-faint" : "bg-rose-500"}`} />
        <span className="max-w-36 truncate">{activeVersion?.name}</span>
        <ChevronDownIcon className="size-3.5 text-ink-faint" />
      </button>

      <div className="mx-0.5 h-6 w-px bg-hairline" />

      <IconButton onClick={ui.openCustomizations} title="Differences from the Default">
        <SparkleIcon />
      </IconButton>
      <IconButton onClick={ui.openManager} title="Manage versions">
        <LayersIcon />
      </IconButton>

      <button
        type="button"
        onClick={() => printResumeVersion(resumeId, activeVersionId)}
        className="pressable ml-1 flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-2 text-[12.5px] font-semibold text-ink shadow-card transition-colors duration-150 hover:border-hairline-strong"
        title={`Download ${activeVersion?.name} as PDF`}
      >
        <DownloadIcon className="size-3.5 text-ink-faint" />
        Download
      </button>

      <button
        type="button"
        onClick={() => ui.openNewVersion(null)}
        className="pressable flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-card transition-all duration-150 hover:shadow-card-hover hover:brightness-[1.03]"
      >
        <PlusIcon className="size-3.5" />
        New version
      </button>
    </header>
  );
}

export function EditorShell() {
  const tab = useResumeStore((s) => s.tab);

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [customizationsOpen, setCustomizationsOpen] = useState(false);
  const [newVersion, setNewVersion] = useState<{ open: boolean; from: string | null }>({ open: false, from: null });
  const [copyCustomizations, setCopyCustomizations] = useState<{ open: boolean; preselect: string[] | null }>({
    open: false,
    preselect: null,
  });
  const [copyField, setCopyField] = useState<{ nodeId: string; field: string; value: unknown } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);

  const ui = useMemo<EditorUI>(
    () => ({
      confirm: (opts) => setConfirmState(opts),
      openCopyField: (nodeId, field, value) => setCopyField({ nodeId, field, value }),
      openCopyCustomizations: (preselect) => setCopyCustomizations({ open: true, preselect: preselect ?? null }),
      openCustomizations: () => setCustomizationsOpen(true),
      openSwitcher: () => setSwitcherOpen(true),
      openManager: () => setManagerOpen(true),
      openNewVersion: (from) => setNewVersion({ open: true, from: from ?? null }),
    }),
    [],
  );

  // Global shortcut: Cmd/Ctrl+K opens the switcher.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSwitcherOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <EditorUIContext.Provider value={ui}>
      <div className="flex h-dvh flex-col bg-canvas">
        <TopBar ui={ui} />
        <div className="flex min-h-0 flex-1">
          <VersionRail />
          <MainAndPreview tab={tab} />
          {customizationsOpen && <CustomizationsPanel open onClose={() => setCustomizationsOpen(false)} />}
        </div>
      </div>

      <VersionSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <VersionManager open={managerOpen} onClose={() => setManagerOpen(false)} />
      <NewVersionDialog
        open={newVersion.open}
        fromVersionId={newVersion.from}
        onClose={() => setNewVersion({ open: false, from: null })}
      />
      <CopyCustomizationsDialog
        open={copyCustomizations.open}
        preselect={copyCustomizations.preselect}
        onClose={() => setCopyCustomizations({ open: false, preselect: null })}
      />
      <CopyFieldDialog open={copyField !== null} payload={copyField} onClose={() => setCopyField(null)} />
      <ConfirmDialog
        open={confirmState !== null}
        onClose={() => setConfirmState(null)}
        onConfirm={() => confirmState?.onConfirm()}
        title={confirmState?.title ?? ""}
        body={confirmState?.body}
        confirmLabel={confirmState?.confirmLabel}
        danger={confirmState?.danger}
      />
      <ToastHost />
    </EditorUIContext.Provider>
  );
}

function MainAndPreview({ tab }: { tab: EditorTab }) {
  const versions = useResumeStore((s) => s.versions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const isBase = activeVersion?.isBase === 1 || activeVersion?.isBase === true;

  const editorTree = useResolvedTree();
  const renderTree = useRenderTree();
  const { design } = useDesign();

  return (
    <>
      <div className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl">
          {tab === "customize" ? <CustomizePanel /> : <EditorPanels tree={editorTree} />}
        </div>
      </div>
      <div className="hidden w-[46%] min-w-0 shrink-0 overflow-y-auto border-l border-hairline bg-sunken px-8 py-6 lg:block">
        <ResumePreview tree={renderTree} design={design} markCustomized={!isBase} />
      </div>
    </>
  );
}
