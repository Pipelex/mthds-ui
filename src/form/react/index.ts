"use client";

/**
 * The `./form/react` entry — the run-form panel over `@pipelex/mthds-form`.
 *
 * The kernel is a REQUIRED peer of this package now, so this entry is no longer
 * the only one allowed to import it. It stayed optional while it powered only
 * this run form; it stopped being optional the moment the graph's detail panel
 * began rendering results through it, because a viewer whose detail panel
 * cannot show data is not a viewer. See `docs/stuff-result-panel.md`.
 */

/**
 * The kernel's React surface, re-exported. A host imports its controls from
 * here rather than naming `@pipelex/mthds-form` itself — see `../index.ts` for
 * why that indirection is the point rather than ceremony, and why importing the
 * kernel directly beside this package is the one thing that can reintroduce the
 * two-context-identities bug.
 */
export * from "@pipelex/mthds-form/react";

export { RunPanel } from "./RunPanel";
export type { RunPanelProps, UploadedFile } from "./RunPanel";

// The submit path, React-free and re-exported for hosts that run the gate
// outside a panel (a toolbar button, a keyboard shortcut).
export { runSubmitGate, summarizeVerdict, defaultValidationTranslate } from "@form/runGate";
export type { RunGateOutcome, RunPanelMessageKey, RunPanelTranslate } from "@form/runGate";
