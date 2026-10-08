"use client";

import type { DesignSettings } from "@/lib/design";
import { createResumePdf, type ResumePdfInput } from "./resume-pdf";

/**
 * Fit a résumé onto one page by tightening its type and spacing a step at a
 * time — the way a person would — until the exported PDF is a single sheet.
 *
 * The PDF itself is the measure, not the on-screen preview: it is what gets
 * sent, and it is laid out by its own engine, so it is the only page count
 * that can be promised. Each step trims every dimension a little rather than
 * one dimension a lot, which keeps the page balanced; the floors are where
 * text stops being comfortable to read, and past them the honest answer is
 * "cut content", not "shrink further".
 */

export type FitPatch = Partial<Pick<DesignSettings, "fontSize" | "lineHeight" | "sectionSpacing" | "marginX" | "marginY">>;

export interface FitResult {
  /** Settings to apply; empty when the résumé already fits. */
  patch: FitPatch;
  /** Pages at the returned settings. */
  pages: number;
  fitted: boolean;
}

const FLOOR = { fontSize: 11, lineHeight: 1.25, sectionSpacing: 0.7, marginX: 28, marginY: 26 };
const STEP = { fontSize: 0.5, lineHeight: 0.05, sectionSpacing: 0.05, marginX: 2, marginY: 2 };
const MAX_STEPS = 14;

const round = (v: number, step: number) => Math.round(v / step) * step;

/** The design `steps` notches tighter than `start`, never past the floors. */
export function tightened(start: DesignSettings, steps: number): FitPatch {
  const next = (key: keyof typeof FLOOR) =>
    Math.max(Math.min(start[key], FLOOR[key]), round(start[key] - STEP[key] * steps, STEP[key]));
  return {
    fontSize: next("fontSize"),
    lineHeight: Number(next("lineHeight").toFixed(2)),
    sectionSpacing: Number(next("sectionSpacing").toFixed(2)),
    marginX: next("marginX"),
    marginY: next("marginY"),
  };
}

export async function fitToOnePage(input: ResumePdfInput): Promise<FitResult> {
  const pagesAt = async (design: DesignSettings) => (await createResumePdf({ ...input, design })).getNumberOfPages();

  const initial = await pagesAt(input.design);
  if (initial <= 1) return { patch: {}, pages: initial, fitted: true };

  let patch: FitPatch = {};
  let pages = initial;
  for (let step = 1; step <= MAX_STEPS; step++) {
    const candidate = tightened(input.design, step);
    if (JSON.stringify(candidate) === JSON.stringify(patch)) break; // every floor reached
    patch = candidate;
    pages = await pagesAt({ ...input.design, ...candidate });
    if (pages <= 1) return { patch, pages, fitted: true };
  }
  return { patch, pages, fitted: false };
}

/**
 * Session-storage key holding the id of a version to fit on its first open —
 * set when a tailored résumé is generated, consumed once by the editor.
 */
export const AUTOFIT_KEY = "resumecandy:autofit";
