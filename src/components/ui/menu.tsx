"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

const MenuContext = createContext<{ close: () => void } | null>(null);

/**
 * Minimal dropdown: trigger + floating panel, closed on outside click,
 * Escape, or item selection. No portal — parents must not clip overflow.
 */
export function Menu({
  trigger,
  align = "end",
  className = "",
  children,
}: {
  trigger: React.ReactNode;
  align?: "start" | "end";
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <span
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex"
      >
        {trigger}
      </span>
      {open && (
        <MenuContext.Provider value={{ close: () => setOpen(false) }}>
          <div
            className={`anim-pop absolute top-full z-40 mt-1.5 min-w-52 overflow-hidden rounded-xl border border-hairline bg-surface p-1.5 shadow-pop ${
              align === "end"
                ? "end-0 origin-top-right rtl:origin-top-left"
                : "start-0 origin-top-left rtl:origin-top-right"
            }`}
            role="menu"
          >
            {children}
          </div>
        </MenuContext.Provider>
      )}
    </div>
  );
}

export function MenuItem({
  onSelect,
  icon,
  danger = false,
  disabled = false,
  children,
}: {
  onSelect: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const ctx = useContext(MenuContext);
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        ctx?.close();
        onSelect();
      }}
      className={`pressable flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-[13px] transition-colors duration-150 disabled:opacity-40 ${
        danger ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" : "text-ink hover:bg-sunken"
      }`}
    >
      {icon && (
        <span className={`size-4 shrink-0 [&>svg]:size-4 ${danger ? "" : "text-ink-faint"}`}>{icon}</span>
      )}
      <span className="flex-1">{children}</span>
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1.5 h-px bg-hairline" />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
      {children}
    </div>
  );
}
