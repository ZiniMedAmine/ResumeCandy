"use client";

import { EyeIcon, EyeOffIcon, GripIcon } from "@/components/ui/icons";
import type { ResolvedNode } from "@/lib/resume/types";
import { useResumeStore } from "@/store/resume-store";
import { entrySummary } from "./entry-fields";
import { LocalBadge } from "./node-controls";
import { dragClasses, type DropEdge } from "./use-drag-reorder";

/**
 * One entry as a single line: bold title, muted qualifier, and nothing else
 * competing for attention. The whole row is a drag handle for reordering, and
 * the eye toggles whether this version shows the entry — everything else lives
 * behind the click that opens the editor.
 */
export function EntryRow({
  node,
  onEdit,
  dragProps,
  dragging = false,
  edge = null,
}: {
  node: ResolvedNode;
  onEdit: () => void;
  dragProps?: React.HTMLAttributes<HTMLElement> & { draggable?: boolean };
  dragging?: boolean;
  edge?: DropEdge;
}) {
  const setHidden = useResumeStore((s) => s.setHidden);
  const { title, subtitle } = entrySummary(node);
  const isLocal = node.status === "local";
  const hidden = node.hidden;

  return (
    <div
      {...dragProps}
      className={`group/row flex cursor-grab items-center gap-1 rounded-xl px-1.5 py-1 transition-colors duration-150 select-none hover:bg-sunken/70 active:cursor-grabbing ${dragClasses(dragging, edge)}`}
    >
      <span className="flex size-7 shrink-0 items-center justify-center" aria-hidden>
        <GripIcon className="size-4 text-ink-faint/50 transition-colors duration-150 group-hover/row:text-ink-faint" />
      </span>

      <button
        type="button"
        onClick={onEdit}
        className="pressable flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left"
        title="Edit entry"
      >
        <span className={`min-w-0 truncate text-[13.5px] ${hidden ? "text-ink-faint" : "text-ink"}`}>
          <span className="font-semibold">{title}</span>
          {subtitle && (
            <span className={hidden ? "" : "text-ink-muted"}>
              {", "}
              {subtitle}
            </span>
          )}
        </span>
        {node.status === "customized" && (
          <span
            className="size-1.5 shrink-0 rounded-full bg-amber-400"
            title="Customized in this version"
          />
        )}
        {isLocal && <LocalBadge />}
      </button>

      {!isLocal && (
        <button
          type="button"
          onClick={() => setHidden(node.id, !hidden)}
          className="pressable shrink-0 rounded-lg p-2 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
          title={hidden ? "Show in this version" : "Hide in this version"}
          aria-label={hidden ? "Show in this version" : "Hide in this version"}
        >
          {hidden ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </button>
      )}
    </div>
  );
}
