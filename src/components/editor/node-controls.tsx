"use client";

import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import {
  CopyIcon,
  DotsIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  UndoIcon,
  UploadIcon,
} from "@/components/ui/icons";
import { useI18n, useT } from "@/lib/i18n/provider";
import { nodeLabel, type ResolvedNode } from "@/lib/resume/types";
import { useResumeStore } from "@/store/resume-store";
import { useEditorUI } from "./editor-ui-context";

/**
 * The hover control strip for an item row. Which controls appear encodes the
 * layering rules:
 *  - hide/show: base nodes, any version (incl. Default);
 *  - delete: local nodes anywhere; base nodes only from the Default (destructive);
 *  - reset / add-to-Default: divergence management on named versions.
 */
export function NodeControls({ node, compact = false }: { node: ResolvedNode; compact?: boolean }) {
  const setHidden = useResumeStore((s) => s.setHidden);
  const deleteNodeHard = useResumeStore((s) => s.deleteNodeHard);
  const resetNode = useResumeStore((s) => s.resetNode);
  const promoteLocalNode = useResumeStore((s) => s.promoteLocalNode);
  const versions = useResumeStore((s) => s.versions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const ui = useEditorUI();
  const { t, fmt } = useI18n();

  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const onBase = activeVersion?.isBase === 1 || activeVersion?.isBase === true;
  const isLocal = node.status === "local";
  const label = nodeLabel(node.kind, node.data, t.kind);

  const btn =
    "pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink";
  const iconCls = compact ? "size-3.5" : "size-4";

  const confirmBaseDelete = () =>
    ui.confirm({
      title: fmt(t.entry.deleteTitle, { name: label }),
      body: t.entry.deleteBody,
      confirmLabel: t.section.deleteEverywhere,
      danger: true,
      onConfirm: () => deleteNodeHard(node.id),
    });

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-surface/80 p-0.5 backdrop-blur-sm">
      {!isLocal && (
        <button
          type="button"
          className={btn}
          title={node.hidden ? t.entry.showInVersion : t.entry.hideInVersion}
          onClick={() => setHidden(node.id, !node.hidden)}
        >
          {node.hidden ? <EyeOffIcon className={iconCls} /> : <EyeIcon className={iconCls} />}
        </button>
      )}

      {(isLocal || onBase) && (
        <button
          type="button"
          className={`${btn} hover:!text-red-500`}
          title={isLocal ? t.entry.removeLocal : t.entry.deleteFromAll}
          onClick={() => {
            if (isLocal) deleteNodeHard(node.id);
            else confirmBaseDelete();
          }}
        >
          <TrashIcon className={iconCls} />
        </button>
      )}

      {(node.status === "customized" || isLocal) && (
        <Menu
          align="end"
          trigger={
            <button type="button" className={btn} title={t.entry.more}>
              <DotsIcon className={iconCls} />
            </button>
          }
        >
          {node.status === "customized" && (
            <>
              <MenuItem icon={<UndoIcon />} onSelect={() => resetNode(node.id)}>
                {t.entry.resetItemToDefault}
              </MenuItem>
              <MenuItem icon={<CopyIcon />} onSelect={() => ui.openCopyCustomizations([node.id])}>
                {t.entry.copyCustomization}
              </MenuItem>
            </>
          )}
          {isLocal && (
            <>
              <MenuItem icon={<UploadIcon />} onSelect={() => promoteLocalNode(node.id)}>
                {t.entry.addToDefault}
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={<TrashIcon />} danger onSelect={() => deleteNodeHard(node.id)}>
                {t.entry.removeFromVersion}
              </MenuItem>
            </>
          )}
        </Menu>
      )}
    </div>
  );
}

/** Collapsed ghost row for a node hidden in the current version. */
export function HiddenGhost({ node }: { node: ResolvedNode }) {
  const setHidden = useResumeStore((s) => s.setHidden);
  const t = useT();
  const label = nodeLabel(node.kind, node.data, t.kind);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-hairline-strong bg-canvas/50 px-3.5 py-2.5">
      <div className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-faint">
        <EyeOffIcon className="size-3.5 shrink-0" />
        <span dir="auto" className="truncate line-through decoration-ink-faint/50">{label}</span>
        <span className="shrink-0 text-[11px]">{t.entry.hiddenInThisVersion}</span>
      </div>
      <button
        type="button"
        onClick={() => setHidden(node.id, false)}
        className="pressable shrink-0 rounded-lg px-2.5 py-1 text-[11.5px] font-medium text-rose-500 transition-colors duration-150 hover:bg-rose-50 dark:hover:bg-rose-500/10"
      >
        {t.common.show}
      </button>
    </div>
  );
}

/** Badge for nodes that exist only in the current version. */
export function LocalBadge() {
  const t = useT();
  return (
    <span
      className="rounded-full bg-violet-100/80 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
      title={t.entry.onlyHereTitle}
    >
      {t.entry.onlyHere}
    </span>
  );
}
