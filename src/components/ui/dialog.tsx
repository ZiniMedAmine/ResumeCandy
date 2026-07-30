"use client";

import React, { useEffect } from "react";
import { XIcon } from "./icons";

export function Dialog({
  open,
  onClose,
  title,
  width = "max-w-lg",
  children,
  hideClose = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  width?: string;
  children: React.ReactNode;
  hideClose?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[8vh]">
      <div className="fixed inset-0 bg-zinc-950/30 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal
        className={`relative w-full ${width} overflow-hidden rounded-2xl border border-hairline bg-surface shadow-pop`}
      >
        {(title || !hideClose) && (
          <div className="flex items-center justify-between gap-4 border-b border-hairline px-6 py-4">
            <h2 className="text-[14px] font-semibold tracking-tight text-ink">{title}</h2>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                className="pressable rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink"
                aria-label="Close"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} width="max-w-md">
      <div className="px-6 py-5 text-[13.5px] leading-relaxed text-ink-muted">{body}</div>
      <div className="flex justify-end gap-2 border-t border-hairline px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="pressable rounded-lg px-3.5 py-2 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`pressable rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white shadow-card transition-all duration-150 hover:shadow-card-hover ${
            danger
              ? "bg-red-500 hover:bg-red-500/90"
              : "bg-gradient-to-r from-rose-500 to-orange-400 hover:brightness-[1.03]"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
