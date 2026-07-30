"use client";

import { useState } from "react";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  AwardIcon,
  BriefcaseIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  DotsIcon,
  EyeOffIcon,
  FolderIcon,
  GradCapIcon,
  PencilIcon,
  PlusIcon,
  PuzzleIcon,
  TrashIcon,
  UndoIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { isHiddenFlag, type NodeKind, type ResolvedNode, type SectionType } from "@/lib/resume/types";
import { useResumeStore } from "@/store/resume-store";
import { useEditorUI } from "./editor-ui-context";
import { EntryEditor } from "./entry-editor";
import { EntryRow } from "./entry-row";
import { HiddenGhost } from "./node-controls";
import { ProvenanceField } from "./provenance-field";

const CHILD_KIND: Record<SectionType, NodeKind> = {
  experience: "experience",
  education: "education",
  projects: "project",
  skills: "skillGroup",
  certifications: "certification",
  references: "reference",
};

const ADD_LABEL: Record<SectionType, string> = {
  experience: "Add entry",
  education: "Add entry",
  projects: "Add project",
  skills: "Add skill group",
  certifications: "Add certificate",
  references: "Add reference",
};

export const SECTION_ICONS: Record<SectionType, React.ComponentType<{ className?: string }>> = {
  experience: BriefcaseIcon,
  education: GradCapIcon,
  projects: FolderIcon,
  skills: PuzzleIcon,
  certifications: AwardIcon,
  references: UsersIcon,
};

/**
 * A section: a heading, a list of one-line entries, and an add button. Opening
 * an entry swaps the card into its editor so editing never happens in a
 * cramped inline strip.
 */
export function SectionCard({ node }: { node: ResolvedNode }) {
  const addNode = useResumeStore((s) => s.addNode);
  const moveNode = useResumeStore((s) => s.moveNode);
  const setHidden = useResumeStore((s) => s.setHidden);
  const deleteNodeHard = useResumeStore((s) => s.deleteNodeHard);
  const resetScope = useResumeStore((s) => s.resetScope);
  const versions = useResumeStore((s) => s.versions);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const overrides = useResumeStore((s) => s.overrides);
  const nodes = useResumeStore((s) => s.nodes);
  const ui = useEditorUI();

  const [collapsed, setCollapsed] = useState(false);
  const [editingHeading, setEditingHeading] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const onBase = activeVersion?.isBase === 1 || activeVersion?.isBase === true;
  const sectionType = (node.data.sectionType as SectionType) ?? "experience";
  const Icon = SECTION_ICONS[sectionType] ?? BriefcaseIcon;

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
      <section className="rounded-2xl bg-surface shadow-card">
        <EntryEditor node={editingEntry} onDone={() => setEditingEntryId(null)} />
      </section>
    );
  }

  const iconBtn =
    "pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink";
  const visibleCount = node.children.filter((c) => !c.hidden).length;

  return (
    <section className="group/section rounded-2xl bg-surface shadow-card transition-shadow duration-200 hover:shadow-card-hover">
      <div className="flex items-center gap-3 px-5 py-4">
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
              Done
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-ink">
              {String(node.data.title ?? "")}
            </h3>
            <button
              type="button"
              onClick={() => setEditingHeading(true)}
              className="pressable flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1 text-[11.5px] font-medium text-ink-muted opacity-0 transition-all duration-150 hover:bg-sunken hover:text-ink group-hover/section:opacity-100"
            >
              <PencilIcon className="size-3" />
              Edit heading
            </button>
            {collapsed && (
              <span className="shrink-0 text-[11.5px] text-ink-faint">
                {visibleCount === 0 ? "Empty" : `${visibleCount} entr${visibleCount === 1 ? "y" : "ies"}`}
                {hasCustomizations && <span className="ml-1.5 text-amber-500">· customized</span>}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/section:opacity-100">
          <button type="button" className={iconBtn} title="Move section up" onClick={() => moveNode(node.id, -1)}>
            <ArrowUpIcon className="size-4" />
          </button>
          <button type="button" className={iconBtn} title="Move section down" onClick={() => moveNode(node.id, 1)}>
            <ArrowDownIcon className="size-4" />
          </button>
          <Menu
            align="end"
            trigger={
              <button type="button" className={iconBtn} title="Section options">
                <DotsIcon className="size-4" />
              </button>
            }
          >
            <MenuItem icon={<EyeOffIcon />} onSelect={() => setHidden(node.id, true)}>
              Hide in this version
            </MenuItem>
            {hasCustomizations && (
              <>
                <MenuItem icon={<UndoIcon />} onSelect={() => resetScope(node.id)}>
                  Reset section to Default
                </MenuItem>
                <MenuItem
                  icon={<CopyIcon />}
                  onSelect={() =>
                    ui.openCopyCustomizations(Object.keys(forVersion).filter((nid) => subtreeIds.has(nid)))
                  }
                >
                  Copy section customizations…
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
                      title: `Delete section “${String(node.data.title)}”?`,
                      body: (
                        <>
                          The section and everything inside it will be deleted from the Default{" "}
                          <strong>and every version</strong>. This cannot be scoped to one version —
                          hide it there instead.
                        </>
                      ),
                      confirmLabel: "Delete everywhere",
                      danger: true,
                      onConfirm: () => deleteNodeHard(node.id),
                    })
                  }
                >
                  Delete from all versions
                </MenuItem>
              </>
            )}
          </Menu>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="pressable shrink-0 rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
          aria-label={collapsed ? "Expand section" : "Collapse section"}
        >
          <ChevronDownIcon className={`size-4.5 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
        </button>
      </div>

      {!collapsed && (
        <div className="border-t border-hairline px-3.5 py-3">
          <div className="divide-y divide-hairline">
            {node.children.map((child) => (
              <EntryRow key={child.id} node={child} onEdit={() => setEditingEntryId(child.id)} />
            ))}
          </div>

          <div className="flex justify-center pt-3">
            <button
              type="button"
              onClick={() => {
                // A new entry is empty, so open its editor straight away.
                const id = addNode(node.id, CHILD_KIND[sectionType]);
                setEditingEntryId(id);
              }}
              className="pressable flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-5 py-2 text-[13px] font-semibold text-ink shadow-card transition-all duration-150 hover:border-rose-300 hover:text-rose-500"
            >
              <PlusIcon className="size-4" />
              {ADD_LABEL[sectionType] ?? "Add entry"}
              {!onBase && (
                <span className="text-[11px] font-normal text-ink-faint">(only in this version)</span>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
