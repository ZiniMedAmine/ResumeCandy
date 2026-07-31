import type { CSSProperties } from "react";

/**
 * Inline style that staggers an `.anim-rise` entrance by position in a list.
 *
 * The cap matters more than the step: past a handful of items a stagger stops
 * reading as choreography and starts reading as the page being slow, so
 * everything after the cap arrives together.
 */
export function enterDelay(index: number, step = 40, max = 320): CSSProperties {
  return { "--enter-delay": `${Math.min(index * step, max)}ms` } as CSSProperties;
}
