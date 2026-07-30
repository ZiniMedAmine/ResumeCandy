"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { isHiddenFlag, nodeLabel } from "@/lib/resume/types";
import { useResolvedTree, useResumeStore } from "@/store/resume-store";

function VersionTargetList({
  excludeIds,
  includeBase,
  selected,
  onToggle,
}: {
  excludeIds: string[];
  includeBase: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const versions = useResumeStore((s) => s.versions);
  const targets = versions.filter((v) => {
    if (v.deletedAt) return false;
    if (excludeIds.includes(v.id)) return false;
    const base = v.isBase === 1 || v.isBase === true;
    return includeBase || !base;
  });

  return (
    <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-lg border border-hairline p-1.5">
      {targets.length === 0 && (
        <p className="px-2 py-3 text-center text-[12px] text-ink-faint">No other versions yet.</p>
      )}
      {targets.map((v) => {
        const base = v.isBase === 1 || v.isBase === true;
        return (
          <label
            key={v.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-sunken"
          >
            <input
              type="checkbox"
              checked={selected.has(v.id)}
              onChange={() => onToggle(v.id)}
              className="size-3.5 accent-rose-600"
            />
            <span className="flex-1 text-[13px] text-ink">
              {v.name}
              {base && <span className="ml-1.5 text-[10.5px] font-semibold uppercase text-ink-faint">default</span>}
              {v.archivedAt && <span className="ml-1.5 text-[10.5px] uppercase text-ink-faint">archived</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/**
 * Copy selected customizations (overrides + version-local items) from the
 * current version into other versions.
 */
export function CopyCustomizationsDialog({
  open,
  preselect,
  onClose,
}: {
  open: boolean;
  preselect: string[] | null;
  onClose: () => void;
}) {
  if (!open) return null;
  return <CopyCustomizationsInner preselect={preselect} onClose={onClose} />;
}

function CopyCustomizationsInner({
  preselect,
  onClose,
}: {
  preselect: string[] | null;
  onClose: () => void;
}) {
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const versions = useResumeStore((s) => s.versions);
  const overrides = useResumeStore((s) => s.overrides);
  const nodes = useResumeStore((s) => s.nodes);
  const copyCustomizations = useResumeStore((s) => s.copyCustomizations);
  const tree = useResolvedTree(activeVersionId);

  const overrideItems = useMemo(() => {
    const forVersion = overrides[activeVersionId] ?? {};
    return Object.entries(forVersion)
      .filter(
        ([, o]) => (o.patch && Object.keys(o.patch).length > 0) || isHiddenFlag(o.hidden) || o.rank != null,
      )
      .map(([nodeId]) => nodeId);
  }, [overrides, activeVersionId]);

  const localRootItems = useMemo(
    () =>
      Object.values(nodes)
        .filter(
          (n) =>
            n.ownerVersionId === activeVersionId &&
            (!n.parentId || nodes[n.parentId]?.ownerVersionId !== activeVersionId),
        )
        .map((n) => n.id),
    [nodes, activeVersionId],
  );

  const [targets, setTargets] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<Set<string>>(
    () => new Set(preselect ?? [...overrideItems, ...localRootItems]),
  );

  const labelOf = (nodeId: string) => {
    const n = tree.byId.get(nodeId);
    return n ? nodeLabel(n.kind, n.data) : "(removed item)";
  };

  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const allItems = [...overrideItems.map((id) => ({ id, local: false })), ...localRootItems.map((id) => ({ id, local: true }))];

  const apply = () => {
    const chosenOverrides = overrideItems.filter((id) => items.has(id));
    const chosenLocals = localRootItems.filter((id) => items.has(id));
    copyCustomizations(activeVersionId, [...targets], chosenOverrides, chosenLocals);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={`Copy from “${activeVersion?.name}”`} width="max-w-lg">
      <div className="space-y-4 px-5 py-4">
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            What to copy
          </p>
          <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-lg border border-hairline p-1.5">
            {allItems.length === 0 && (
              <p className="px-2 py-3 text-center text-[12px] text-ink-faint">
                This version has no customizations to copy.
              </p>
            )}
            {allItems.map(({ id, local }) => (
              <label
                key={id}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-sunken"
              >
                <input
                  type="checkbox"
                  checked={items.has(id)}
                  onChange={() =>
                    setItems((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    })
                  }
                  className="size-3.5 accent-rose-600"
                />
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                  {labelOf(id)}
                </span>
                {local && (
                  <span className="shrink-0 rounded-full bg-violet-100/80 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                    item
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            Into versions
          </p>
          <VersionTargetList
            excludeIds={[activeVersionId]}
            includeBase={false}
            selected={targets}
            onToggle={(id) =>
              setTargets((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
          />
          <p className="mt-1.5 text-[11.5px] leading-snug text-ink-faint">
            To apply a customization to the Default itself, use “Push to Default” on the field instead.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="pressable rounded-lg px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-sunken "
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={targets.size === 0 || items.size === 0}
            onClick={apply}
            className="pressable rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 px-3.5 py-2 text-[13px] font-semibold text-white shadow-card transition-all duration-150 hover:brightness-[1.03] disabled:opacity-40"
          >
            Copy to {targets.size || "…"} version{targets.size === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/** Copy one field's current value into chosen versions (Default allowed). */
export function CopyFieldDialog({
  open,
  payload,
  onClose,
}: {
  open: boolean;
  payload: { nodeId: string; field: string; value: unknown } | null;
  onClose: () => void;
}) {
  if (!open || !payload) return null;
  return <CopyFieldInner payload={payload} onClose={onClose} />;
}

function CopyFieldInner({
  payload,
  onClose,
}: {
  payload: { nodeId: string; field: string; value: unknown };
  onClose: () => void;
}) {
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const copyFieldTo = useResumeStore((s) => s.copyFieldTo);
  const [targets, setTargets] = useState<Set<string>>(new Set());

  return (
    <Dialog open onClose={onClose} title="Copy value to versions" width="max-w-md">
      <div className="space-y-4 px-5 py-4">
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-[12.5px] leading-snug text-ink-muted">
          “{String(payload.value ?? "")}”
        </p>
        <VersionTargetList
          excludeIds={[activeVersionId]}
          includeBase
          selected={targets}
          onToggle={(id) =>
            setTargets((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
        />
        <p className="text-[11.5px] leading-snug text-ink-faint">
          Copying into the Default changes the value every inheriting version sees.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="pressable rounded-lg px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-sunken "
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={targets.size === 0}
            onClick={() => {
              copyFieldTo(payload.nodeId, payload.field, payload.value, [...targets]);
              onClose();
            }}
            className="pressable rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 px-3.5 py-2 text-[13px] font-semibold text-white shadow-card transition-all duration-150 hover:brightness-[1.03] disabled:opacity-40"
          >
            Copy value
          </button>
        </div>
      </div>
    </Dialog>
  );
}
