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
} from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToastHost } from "@/components/ui/toast-host";
import { useI18n, useT } from "@/lib/i18n/provider";
import { downloadResumePdf } from "@/lib/pdf/resume-pdf";
import { CopyCustomizationsDialog, CopyFieldDialog } from "@/components/versions/copy-dialog";
import { CustomizationsPanel } from "@/components/versions/customizations-panel";
import { NewVersionDialog } from "@/components/versions/new-version-dialog";
import { VersionManager } from "@/components/versions/version-manager";
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
  const saving = pending > 0;
  const t = useT();
  return (
    <span
      className="flex items-center gap-1.5 text-[11.5px] text-ink-faint"
      title={saving ? t.editor.saving : t.editor.allSaved}
    >
      {/* Swapping the element is what replays the entrance, so every save ends
          on a small green beat instead of a silent icon change. */}
      {saving ? (
        <CloudSyncIcon key="saving" className="anim-fade size-4 animate-pulse" />
      ) : (
        <CloudCheckIcon key="saved" className="anim-pop size-4 text-emerald-500/70" />
      )}
      <span className="hidden xl:inline">{saving ? t.editor.saving : t.editor.saved}</span>
    </span>
  );
}

const TABS: { id: EditorTab; icon: React.ReactNode }[] = [
  { id: "content", icon: <FileIcon /> },
  { id: "customize", icon: <PaletteIcon /> },
];

/**
 * The primary mode switch. One pill slides between the tabs rather than two
 * pills blinking on and off — the movement is what tells you the two views are
 * the same surface seen two ways.
 */
function TabSwitch() {
  const tab = useResumeStore((s) => s.tab);
  const setTab = useResumeStore((s) => s.setTab);
  const { t, dir } = useI18n();
  const index = Math.max(0, TABS.findIndex((item) => item.id === tab));

  return (
    <nav
      className="absolute left-1/2 grid -translate-x-1/2 grid-cols-2 rounded-xl bg-sunken p-1"
      role="tablist"
    >
      {/* Equal columns are what let the pill travel exactly 100% of itself.
          The travel is physical, so RTL has to send it the other way — the
          second tab sits to the *left* of the first there. */}
      <span
        aria-hidden
        className="absolute inset-y-1 start-1 w-[calc(50%-4px)] rounded-lg bg-surface shadow-card transition-transform duration-300 ease-[var(--ease-entrance)]"
        style={{ transform: `translateX(${index * (dir === "rtl" ? -100 : 100)}%)` }}
      />
      {TABS.map((item) => {
        const active = item.id === tab;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setTab(item.id)}
            className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors duration-200 ${
              active ? "text-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            <span
              className={`transition-colors duration-200 [&>svg]:size-4 ${active ? "text-rose-500" : "text-ink-faint"}`}
            >
              {item.icon}
            </span>
            {t.editor[item.id]}
          </button>
        );
      })}
    </nav>
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
  const versions = useResumeStore((s) => s.versions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const isBase = activeVersion?.isBase === 1 || activeVersion?.isBase === true;
  const count = useCustomizationCount(activeVersionId);
  const renderTree = useRenderTree();
  const { design } = useDesign();
  const toast = useResumeStore((s) => s.toast);
  const { t, fmt } = useI18n();
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (!activeVersion || downloading) return;
    setDownloading(true);
    try {
      await downloadResumePdf({
        tree: renderTree,
        design,
        resumeName,
        versionName: activeVersion.name,
        isBaseVersion: isBase,
      });
      toast({ message: "pdfStarted", kind: "success" });
    } catch (error) {
      console.error(error);
      toast({ message: "pdfFailed", kind: "error" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-2 border-b border-hairline bg-surface px-4">
      <Link
        href="/"
        className="pressable flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
      >
        <ArrowLeftIcon className="size-4 shrink-0 text-ink-faint rtl:-scale-x-100" />
        <span className="max-w-40 truncate">{resumeName}</span>
      </Link>

      <TabSwitch />

      <div className="flex-1" />

      <SaveIndicator />

      {!isBase && count > 0 && (
        <button
          type="button"
          onClick={ui.openCustomizations}
          className="pressable hidden rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 transition-colors duration-150 hover:bg-amber-100 md:block dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
          title={t.editor.seeDifferences}
        >
          {fmt(t.editor.customizationCount, { n: count })}
        </button>
      )}

      <button
        type="button"
        onClick={ui.openSwitcher}
        className="pressable ms-1 flex items-center gap-2 rounded-lg border border-hairline bg-surface py-1.5 ps-2.5 pe-2 text-[13px] font-medium text-ink shadow-card transition-colors duration-150 hover:border-hairline-strong"
        title={t.editor.switchVersion}
      >
        <span className={`size-1.5 rounded-full ${isBase ? "bg-ink-faint" : "bg-rose-500"}`} />
        <span className="max-w-36 truncate">{activeVersion?.name}</span>
        <ChevronDownIcon className="size-3.5 text-ink-faint" />
      </button>

      <div className="mx-0.5 h-6 w-px bg-hairline" />

      <IconButton onClick={ui.openManager} title={t.editor.manageVersions}>
        <LayersIcon />
      </IconButton>
      <ThemeToggle />

      <button
        type="button"
        onClick={download}
        disabled={downloading}
        className="pressable ms-1 flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-2 text-[12.5px] font-semibold text-ink shadow-card transition-colors duration-150 hover:border-hairline-strong disabled:opacity-60"
        title={fmt(t.editor.downloadAsPdf, { name: activeVersion?.name ?? "" })}
      >
        <DownloadIcon className="size-3.5 text-ink-faint" />
        {downloading ? t.editor.preparingPdf : t.editor.download}
      </button>

      <button
        type="button"
        onClick={() => ui.openNewVersion(null)}
        className="pressable flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-card transition-all duration-150 hover:shadow-card-hover hover:brightness-[1.03]"
      >
        <PlusIcon className="size-3.5" />
        {t.editor.newVersion}
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
      <div className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-3xl">
          {tab === "customize" ? <CustomizePanel /> : <EditorPanels tree={editorTree} />}
        </div>
      </div>
      <div className="hidden w-[46%] min-w-0 shrink-0 overflow-y-auto border-s border-hairline bg-sunken px-8 py-6 lg:block">
        <ResumePreview tree={renderTree} design={design} markCustomized={!isBase} />
      </div>
    </>
  );
}
