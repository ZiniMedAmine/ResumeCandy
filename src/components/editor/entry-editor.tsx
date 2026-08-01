"use client";

import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import {
  CheckIcon,
  CopyIcon,
  DotsIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  UndoIcon,
  UploadIcon,
} from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/provider";
import { nodeLabel, type ResolvedNode } from "@/lib/resume/types";
import { useResumeStore } from "@/store/resume-store";
import { useEditorUI } from "./editor-ui-context";
import { EntryFields, entryKindLabel } from "./entry-fields";
import { LocalBadge } from "./node-controls";

/**
 * The focused editing surface for a single entry: it replaces the section's
 * list while open, so the fields get the full width and there is exactly one
 * thing to do. Version actions (hide, reset, copy, delete) sit in the header,
 * and Done returns to the list.
 */
export function EntryEditor({ node, onDone }: { node: ResolvedNode; onDone: () => void }) {
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
  const iconBtn =
    "pressable rounded-lg p-2 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink";

  const confirmBaseDelete = () =>
    ui.confirm({
      title: fmt(t.entry.deleteTitle, { name: nodeLabel(node.kind, node.data, t.kind) }),
      body: t.entry.deleteBody,
      confirmLabel: t.section.deleteEverywhere,
      danger: true,
      onConfirm: () => {
        deleteNodeHard(node.id);
        onDone();
      },
    });

  return (
    <div>
      <div className="flex items-center gap-2 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">{t.entry.editTitle}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-faint">
            {entryKindLabel(node, t)}
            {node.status === "customized" && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <span className="size-1.5 rounded-full bg-amber-400" />
                {t.entry.customizedHere}
              </span>
            )}
          </p>
        </div>

        {isLocal && <LocalBadge />}

        {!isLocal && (
          <button
            type="button"
            onClick={() => setHidden(node.id, !node.hidden)}
            className={iconBtn}
            title={node.hidden ? t.entry.showInVersion : t.entry.hideInVersion}
            aria-label={node.hidden ? t.entry.showInVersion : t.entry.hideInVersion}
          >
            {node.hidden ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        )}

        {(isLocal || onBase) && (
          <button
            type="button"
            onClick={() => {
              if (isLocal) {
                deleteNodeHard(node.id);
                onDone();
              } else {
                confirmBaseDelete();
              }
            }}
            className={`${iconBtn} hover:!text-red-500`}
            title={isLocal ? t.entry.removeLocal : t.entry.deleteFromAll}
            aria-label={t.entry.deleteEntry}
          >
            <TrashIcon className="size-4" />
          </button>
        )}

        {(node.status === "customized" || isLocal) && (
          <Menu
            align="end"
            trigger={
              <button type="button" className={iconBtn} title={t.entry.moreOptions}>
                <DotsIcon className="size-4" />
              </button>
            }
          >
            {node.status === "customized" && (
              <>
                <MenuItem icon={<UndoIcon />} onSelect={() => resetNode(node.id)}>
                  {t.entry.resetToDefault}
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
                <MenuItem
                  icon={<TrashIcon />}
                  danger
                  onSelect={() => {
                    deleteNodeHard(node.id);
                    onDone();
                  }}
                >
                  {t.entry.removeFromVersion}
                </MenuItem>
              </>
            )}
          </Menu>
        )}
      </div>

      <div className="border-t border-hairline px-5 py-5">
        <EntryFields node={node} />
      </div>

      <div className="flex justify-center border-t border-hairline px-5 py-4">
        <button
          type="button"
          onClick={onDone}
          className="pressable flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-8 py-2.5 text-[13.5px] font-semibold text-white shadow-card transition-all duration-150 hover:shadow-card-hover hover:brightness-[1.03]"
        >
          <CheckIcon className="size-4" />
          {t.common.done}
        </button>
      </div>
    </div>
  );
}
