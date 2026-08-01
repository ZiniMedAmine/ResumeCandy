"use client";

import { useMemo, useState } from "react";
import { inheritingVersionCount } from "@/lib/resume/patch";
import type { ResolvedNode } from "@/lib/resume/types";
import { flattenOverrides, useResumeStore } from "@/store/resume-store";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { CopyIcon, UndoIcon, UploadIcon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/provider";
import { useEditorUI } from "./editor-ui-context";

/** True when this version overrides the field (rather than inheriting it). */
export function useIsCustomized(node: ResolvedNode, field: string): boolean {
  return node.status !== "local" && node.customizedFields.includes(field);
}

/**
 * The label row shared by every editable field: caption, the amber
 * "Customized" chip with its reset / push / copy actions, and the
 * "Updates N of M versions" counter shown while editing the Default.
 *
 * Controls (text input, date picker, …) plug in as children so they all
 * inherit identical provenance behaviour.
 */
export function FieldFrame({
  node,
  field,
  label,
  focused,
  className = "",
  children,
}: {
  node: ResolvedNode;
  field: string;
  label?: string;
  /** Drives the counter; the control owns its own focus state. */
  focused: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const resetField = useResumeStore((s) => s.resetField);
  const pushFieldToBase = useResumeStore((s) => s.pushFieldToBase);
  const versions = useResumeStore((s) => s.versions);
  const overrides = useResumeStore((s) => s.overrides);
  const activeVersionId = useResumeStore((s) => s.activeVersionId);
  const ui = useEditorUI();
  const { t, fmt } = useI18n();

  const activeVersion = versions.find((v) => v.id === activeVersionId);
  const onBase = activeVersion?.isBase === 1 || activeVersion?.isBase === true;
  const customized = useIsCustomized(node, field);
  const value = typeof node.data[field] === "string" ? (node.data[field] as string) : "";

  const counter = useMemo(() => {
    if (!onBase || !focused) return null;
    const activeIds = versions.filter((v) => !v.deletedAt && !v.archivedAt).map((v) => v.id);
    if (activeIds.length <= 1) return null;
    return inheritingVersionCount(activeIds, activeVersionId, flattenOverrides(overrides), node.id, field);
  }, [onBase, focused, versions, overrides, activeVersionId, node.id, field]);

  return (
    <div className={`group/field relative ${className}`}>
      {(label || customized) && (
        <div className="mb-1.5 flex h-4 items-center justify-between gap-2">
          {label && (
            <label className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
              {label}
            </label>
          )}
          {customized && (
            <Menu
              align="end"
              trigger={
                <button
                  type="button"
                  className="pressable flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 transition-colors duration-150 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                  title={t.provenance.customizedField}
                >
                  <span className="size-1.5 rounded-full bg-amber-400" />
                  {t.provenance.customized}
                </button>
              }
            >
              <MenuItem icon={<UndoIcon />} onSelect={() => resetField(node.id, field)}>
                {t.provenance.resetToDefault}
              </MenuItem>
              <MenuItem icon={<UploadIcon />} onSelect={() => pushFieldToBase(node.id, field)}>
                {t.provenance.pushToDefault}
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={<CopyIcon />} onSelect={() => ui.openCopyField(node.id, field, value)}>
                {t.provenance.copyToVersions}
              </MenuItem>
            </Menu>
          )}
        </div>
      )}
      {children}
      {counter && (
        <div className="pointer-events-none absolute -bottom-5 start-0 z-10 rounded-full bg-ink px-2 py-0.5 text-[10.5px] font-medium text-canvas shadow-card">
          {fmt(t.provenance.updatesVersions, {
            inheriting: counter.inheriting,
            total: counter.total,
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Shared input chrome, so text fields and the date control look identical.
 * `padded: false` lets a composite control (like the date picker, which packs
 * its own buttons inside) own the inner spacing.
 */
export function fieldControlClass(customized: boolean, extra = "", padded = true): string {
  return `w-full rounded-lg border bg-surface text-[13.5px] leading-relaxed text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint/60 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10 dark:focus:border-rose-500/50 ${
    padded ? "px-3 py-2" : ""
  } ${
    customized
      ? "border-amber-200/90 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/[0.06]"
      : "border-hairline hover:border-hairline-strong"
  } ${extra}`;
}

/**
 * A text field that knows where its value comes from. Inherited fields look
 * plain; customized fields carry the amber marker with reset / push / copy
 * actions.
 */
export function ProvenanceField({
  node,
  field,
  label,
  placeholder,
  multiline = false,
  rows = 3,
  className = "",
  inputClassName = "",
}: {
  node: ResolvedNode;
  field: string;
  label?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  inputClassName?: string;
}) {
  const editField = useResumeStore((s) => s.editField);
  const [focused, setFocused] = useState(false);

  const customized = useIsCustomized(node, field);
  const value = typeof node.data[field] === "string" ? (node.data[field] as string) : "";

  const sharedProps = {
    value,
    placeholder,
    // Each field follows its own content rather than the CV's language: an
    // Arabic resume still has a Latin email address and Latin URLs, and
    // forcing those RTL would render them backwards while typing.
    dir: "auto" as const,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      editField(node.id, field, e.target.value),
    className: fieldControlClass(customized, inputClassName),
  };

  return (
    <FieldFrame node={node} field={field} label={label} focused={focused} className={className}>
      {multiline ? <textarea rows={rows} {...sharedProps} /> : <input type="text" {...sharedProps} />}
    </FieldFrame>
  );
}
