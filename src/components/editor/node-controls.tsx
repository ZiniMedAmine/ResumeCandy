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

  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const onBase = activeVersion?.isBase === 1 || activeVersion?.isBase === true;
  const isLocal = node.status === "local";
  const label = nodeLabel(node.kind, node.data);

  const btn =
    "pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink";
  const iconCls = compact ? "size-3.5" : "size-4";

  const confirmBaseDelete = () =>
    ui.confirm({
      title: `Delete “${label}”?`,
      body: (
        <>
          This deletes it from the Default <strong>and every version</strong> of this resume,
          including any per-version customizations of it. Versions that only need it gone from
          themselves should hide it instead.
        </>
      ),
      confirmLabel: "Delete everywhere",
      danger: true,
      onConfirm: () => deleteNodeHard(node.id),
    });

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-surface/80 p-0.5 backdrop-blur-sm">
      {!isLocal && (
        <button
          type="button"
          className={btn}
          title={node.hidden ? "Show in this version" : "Hide in this version"}
          onClick={() => setHidden(node.id, !node.hidden)}
        >
          {node.hidden ? <EyeOffIcon className={iconCls} /> : <EyeIcon className={iconCls} />}
        </button>
      )}

      {(isLocal || onBase) && (
        <button
          type="button"
          className={`${btn} hover:!text-red-500`}
          title={isLocal ? "Remove (only exists in this version)" : "Delete from all versions"}
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
            <button type="button" className={btn} title="More">
              <DotsIcon className={iconCls} />
            </button>
          }
        >
          {node.status === "customized" && (
            <>
              <MenuItem icon={<UndoIcon />} onSelect={() => resetNode(node.id)}>
                Reset item to Default
              </MenuItem>
              <MenuItem icon={<CopyIcon />} onSelect={() => ui.openCopyCustomizations([node.id])}>
                Copy customization to versions…
              </MenuItem>
            </>
          )}
          {isLocal && (
            <>
              <MenuItem icon={<UploadIcon />} onSelect={() => promoteLocalNode(node.id)}>
                Add to Default (all versions)
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={<TrashIcon />} danger onSelect={() => deleteNodeHard(node.id)}>
                Remove from this version
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
  const label = nodeLabel(node.kind, node.data);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-hairline-strong bg-canvas/50 px-3.5 py-2.5">
      <div className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-faint">
        <EyeOffIcon className="size-3.5 shrink-0" />
        <span className="truncate line-through decoration-ink-faint/50">{label}</span>
        <span className="shrink-0 text-[11px]">hidden in this version</span>
      </div>
      <button
        type="button"
        onClick={() => setHidden(node.id, false)}
        className="pressable shrink-0 rounded-lg px-2.5 py-1 text-[11.5px] font-medium text-rose-500 transition-colors duration-150 hover:bg-rose-50 dark:hover:bg-rose-500/10"
      >
        Show
      </button>
    </div>
  );
}

/** Badge for nodes that exist only in the current version. */
export function LocalBadge() {
  return (
    <span
      className="rounded-full bg-violet-100/80 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
      title="This item exists only in this version"
    >
      Only here
    </span>
  );
}
