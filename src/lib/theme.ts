export const THEME_STORAGE_KEY = "resumecandy-theme";

export type ThemePreference = "light" | "dark" | "system";

/**
 * Runs synchronously in <head>, before the browser paints, so the saved theme
 * is on <html> by the time any pixel is drawn — no flash of the wrong palette.
 *
 * It stamps a concrete "light" or "dark" rather than passing "system" through,
 * because Tailwind's `dark:` variant is wired to this attribute: leaving it
 * unresolved would mean utilities and CSS variables disagreeing about which
 * theme is in force.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
var d=p==="dark"||((!p||p==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.setAttribute("data-theme",d?"dark":"light");
}catch(e){}})()`.replace(/\n/g, "");

/** The theme actually in force right now, read off the DOM. */
export function resolvedTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function applyTheme(preference: ThemePreference) {
  const dark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

export function storedPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}
