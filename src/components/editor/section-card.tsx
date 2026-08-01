"use client";

import { useState } from "react";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  DotsIcon,
  EyeOffIcon,
  GripIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UndoIcon,
} from "@/components/ui/icons";
import { sectionIcon } from "@/components/ui/section-icons";
import { useI18n } from "@/lib/i18n/provider";
import { sectionPreset } from "@/lib/sections";
import { isHiddenFlag, type ResolvedNode, type SectionType } from "@/lib/resume/types";
import { useResumeStore } from "@/store/resume-store";
import { useEditorUI } from "./editor-ui-context";
import { EntryEditor } from "./entry-editor";
import { EntryRow } from "./entry-row";
import { HiddenGhost } from "./node-controls";
import { ProvenanceField } from "./provenance-field";
import { dragClasses, useDragReorder, type DropEdge } from "./use-drag-reorder";

/**
 * A section: a heading, a list of one-line entries, and an add button. Opening
 * an entry swaps the card into its editor so editing never happens in a
 * cramped inline strip.
 */
export function SectionCard({
  node,
  dragProps,
  handleProps,
  dragging = false,
  edge = null,
}: {
  node: ResolvedNode;
  dragProps?: React.HTMLAttributes<HTMLElement> & { draggable?: boolean };
  /** Arms the section drag — the card is inert until the grip is pressed. */
  handleProps?: React.HTMLAttributes<HTMLElement>;
  dragging?: boolean;
  edge?: DropEdge;
}) {
  const addNode = useResumeStore((s) => s.addNode);
  const moveNodeTo = useResumeStore((s) => s.moveNodeTo);
  const setHidden = useResumeStore((s) => s.setHidden);
  const deleteNodeHard = useResumeStore((s) => s.deleteNodeHard);
  const resetScope = useResumeStore((s) => s.resetScope);
  const versions = useResumeStore((s) => s.versions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const overrides = useResumeStore((s) => s.overrides);
  const nodes = useResumeStore((s) => s.nodes);
  const ui = useEditorUI();
  const { t, fmt } = useI18n();

  const [collapsed, setCollapsed] = useState(false);
  const [editingHeading, setEditingHeading] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const entryDrag = useDragReorder(moveNodeTo);

  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const onBase = activeVersion?.isBase === 1 || activeVersion?.isBase === true;
  const sectionType = (node.data.sectionType as SectionType) ?? "experience";
  const preset = sectionPreset(sectionType);
  const Icon = sectionIcon(sectionType);

  if (node.hidden) return <HiddenGhost node={node} />;

  // Does this section subtree carry any divergence in the active version?
  const subtreeIds = new Set<string>();
  const collect = (n: ResolvedNode) => {
    subtreeIds.add(n.id);
    n.children.forEach(collect);
  };
  collect(node);
  const forVersion = overrides[activeVersionId] ?? {};
  const hasCustomizations =
    !onBase &&
    (Object.entries(forVersion).some(
      ([nid, o]) =>
        subtreeIds.has(nid) &&
        ((o.patch && Object.keys(o.patch).length > 0) || isHiddenFlag(o.hidden) || o.rank != null),
    ) ||
      Object.values(nodes).some((n) => n.ownerVersionId === activeVersionId && subtreeIds.has(n.id)));

  const editingEntry = editingEntryId ? node.children.find((c) => c.id === editingEntryId) : undefined;

  // While an entry is open it owns the whole card.
  if (editingEntry) {
    return (
      <section className="anim-fade rounded-2xl bg-surface shadow-card">
        <EntryEditor node={editingEntry} onDone={() => setEditingEntryId(null)} />
      </section>
    );
  }

  const iconBtn =
    "pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink";
  const visibleCount = node.children.filter((c) => !c.hidden).length;

  return (
    <section
      {...dragProps}
      className={`group/section rounded-2xl bg-surface shadow-card transition-shadow duration-200 hover:shadow-card-hover ${dragClasses(dragging, edge)}`}
    >
      <div className="flex items-center gap-3 px-5 py-4">
        {/* Pressing the grip is what makes the card draggable at all. */}
        <span
          {...handleProps}
          className="-ms-2 flex size-6 shrink-0 cursor-grab items-center justify-center text-ink-faint/40 transition-colors duration-150 select-none group-hover/section:text-ink-faint active:cursor-grabbing"
          title={t.section.dragToReorder}
        >
          <GripIcon className="size-4" />
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sunken text-ink-muted">
          <Icon className="size-4.5" />
        </span>

        {editingHeading ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ProvenanceField
              node={node}
              field="title"
              className="min-w-0 flex-1"
              inputClassName="text-[15px] font-semibold tracking-tight"
            />
            <button
              type="button"
              onClick={() => setEditingHeading(false)}
              className="pressable flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
            >
              <CheckIcon className="size-3.5" />
              {t.common.done}
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {/* The heading is résumé content, so it follows the document's
                own direction rather than the interface's. */}
            <h3 dir="auto" className="truncate text-[15px] font-semibold tracking-tight text-ink">
              {String(node.data.title ?? "")}
            </h3>
            <button
              type="button"
              onClick={() => setEditingHeading(true)}
              className="pressable flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1 text-[11.5px] font-medium text-ink-muted opacity-0 transition-all duration-150 hover:bg-sunken hover:text-ink group-hover/section:opacity-100"
            >
              <PencilIcon className="size-3" />
              {t.section.editHeading}
            </button>
            {collapsed && (
              <span className="shrink-0 text-[11.5px] text-ink-faint">
                {visibleCount === 0
                  ? t.section.empty
                  : fmt(t.section.entryCount, { n: visibleCount })}
                {hasCustomizations && (
                  <span className="ms-1.5 text-amber-500">· {t.section.customized}</span>
                )}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/section:opacity-100">
          <Menu
            align="end"
            trigger={
              <button type="button" className={iconBtn} title={t.section.options}>
                <DotsIcon className="size-4" />
              </button>
            }
          >
            <MenuItem icon={<EyeOffIcon />} onSelect={() => setHidden(node.id, true)}>
              {t.section.hideInVersion}
            </MenuItem>
            {hasCustomizations && (
              <>
                <MenuItem icon={<UndoIcon />} onSelect={() => resetScope(node.id)}>
                  {t.section.resetToDefault}
                </MenuItem>
                <MenuItem
                  icon={<CopyIcon />}
                  onSelect={() =>
                    ui.openCopyCustomizations(Object.keys(forVersion).filter((nid) => subtreeIds.has(nid)))
                  }
                >
                  {t.section.copyCustomizations}
                </MenuItem>
              </>
            )}
            {onBase && (
              <>
                <MenuSeparator />
                <MenuItem
                  danger
                  icon={<TrashIcon />}
                  onSelect={() =>
                    ui.confirm({
                      title: fmt(t.section.deleteTitle, { name: String(node.data.title ?? "") }),
                      body: t.section.deleteBody,
                      confirmLabel: t.section.deleteEverywhere,
                      danger: true,
                      onConfirm: () => deleteNodeHard(node.id),
                    })
                  }
                >
                  {t.section.deleteFromAll}
                </MenuItem>
              </>
            )}
          </Menu>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="pressable shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
          aria-label={collapsed ? t.section.expand : t.section.collapse}
        >
          <ChevronDownIcon className={`size-4.5 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
        </button>
      </div>

      {!collapsed && (
        <div className="border-t border-hairline px-3.5 py-3">
          <div className="divide-y divide-hairline">
            {node.children.map((child, i) => (
              <EntryRow
                key={child.id}
                node={child}
                onEdit={() => setEditingEntryId(child.id)}
                dragProps={entryDrag.itemProps(child.id, i)}
                dragging={entryDrag.draggingId === child.id}
                edge={entryDrag.dropEdge(i, node.children.length)}
              />
            ))}
          </div>

          <div className="flex justify-center pt-3">
            <button
              type="button"
              onClick={() => {
                // A new entry is empty, so open its editor straight away.
                const id = addNode(node.id, preset.childKind);
                setEditingEntryId(id);
              }}
              className="pressable flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-5 py-2 text-[13px] font-semibold text-ink shadow-card transition-all duration-150 hover:border-rose-300 hover:text-rose-500"
            >
              <PlusIcon className="size-4" />
              {t.sections.add[preset.addKey]}
              {!onBase && (
                <span className="text-[11px] font-normal text-ink-faint">
                  {t.section.onlyInThisVersion}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
