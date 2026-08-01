"use client";

import { useEffect } from "react";
import { useT } from "@/lib/i18n/provider";
import { MoonIcon, SunIcon } from "./icons";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  resolvedTheme,
  storedPreference,
} from "@/lib/theme";

/**
 * Light/dark switch.
 *
 * Which icon shows is decided in CSS off the same `data-theme` attribute the
 * head script sets, not from React state — so the button is correct in the
 * very first painted frame and there is no state for hydration to disagree
 * with. The click handler only writes: flip the attribute, save the choice.
 *
 * Until someone clicks, no preference is stored and the theme follows the OS,
 * including when the OS flips while the tab is open.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const t = useT();

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (storedPreference() === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    const next = resolvedTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing with storage blocked — the theme still applies for
      // this page view, it just will not be remembered.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={t.common.themeToggle}
      aria-label={t.common.themeToggle}
      className={`pressable rounded-lg p-2 text-ink-faint transition-colors duration-150 hover:bg-sunken hover:text-ink ${className}`}
    >
      <SunIcon className="size-4.5 dark:hidden" />
      <MoonIcon className="hidden size-4.5 dark:block" />
    </button>
  );
}
