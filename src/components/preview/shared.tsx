"use client";

import type { DesignSettings } from "@/lib/design";
import type { ResolvedNode, ResolvedTree } from "@/lib/resume/types";
import { GlobeIcon, MailIcon, PhoneIcon, PinIcon } from "@/components/ui/icons";
import { blockProps, useBlockMargins } from "./paged-paper";

/**
 * Templates only ever walk the tree's roots. Asking for just that keeps them
 * renderable from a server component, where a resolved tree's `byId` Map
 * cannot cross the boundary.
 */
export type PreviewTree = Pick<ResolvedTree, "roots">;

export interface TemplateProps {
  tree: PreviewTree;
  design: DesignSettings;
  /** Show amber provenance dots on customized/local nodes (editor preview). */
  markCustomized: boolean;
}

export function s(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * Wraps a rendered node: carries data-node-id and the provenance dot for
 * customized/version-local content, and optionally acts as a pagination
 * block. Shared by every template.
 */
export function Marked({
  node,
  markCustomized,
  blockId,
  keepWithNext,
  children,
  className = "",
}: {
  node: ResolvedNode;
  markCustomized: boolean;
  /** Set to make this element atomic for page breaks. */
  blockId?: string;
  keepWithNext?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const margins = useBlockMargins();
  const customized = markCustomized && (node.status === "customized" || node.status === "local");
  const paging = blockId ? blockProps(margins, blockId, keepWithNext) : undefined;
  return (
    <div data-node-id={node.id} className={`relative ${className}`} {...paging}>
      {customized && (
        <span
          className="absolute -left-[0.9em] top-[0.45em] size-[0.42em] rounded-full bg-amber-400"
          title={node.status === "local" ? "Only in this version" : "Customized in this version"}
        />
      )}
      {children}
    </div>
  );
}

/** Contact entries with their icons, in display order. */
export function contactEntries(data: Record<string, unknown>) {
  return [
    { key: "email", icon: MailIcon, value: s(data.email) },
    { key: "phone", icon: PhoneIcon, value: s(data.phone) },
    { key: "location", icon: PinIcon, value: s(data.location) },
    { key: "website", icon: GlobeIcon, value: s(data.website) },
  ].filter((e) => e.value);
}

/** Date range "09/2021 – 06/2024" from startDate/endDate fields. */
export function dateRange(data: Record<string, unknown>): string {
  const start = s(data.startDate);
  const end = s(data.endDate);
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

export function visibleBullets(nodes: ResolvedNode[]): ResolvedNode[] {
  return nodes.filter((n) => n.kind === "bullet" && s(n.data.text));
}

/** Block id for a section's heading (the node id itself belongs to its body). */
export function titleBlockId(nodeId: string): string {
  return `${nodeId}:title`;
}
