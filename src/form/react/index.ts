"use client";

/**
 * The `./form/react` entry — the run-form panel over `@pipelex/mthds-form`.
 *
 * This entry, and only this entry, may import the form kernel: it is an
 * OPTIONAL peer dependency, so `./graph/react` must keep resolving with the
 * kernel absent. The eslint `no-restricted-imports` block in
 * `eslint.config.mjs` pins that boundary (design Decision B,
 * `wip/adopt-form/design.md`).
 */

export { RunPanel } from "./RunPanel";
export type { RunPanelProps, UploadedFile } from "./RunPanel";

// The submit path, React-free and re-exported for hosts that run the gate
// outside a panel (a toolbar button, a keyboard shortcut).
export { runSubmitGate, summarizeVerdict, defaultValidationTranslate } from "@form/runGate";
export type { RunGateOutcome, RunPanelMessageKey, RunPanelTranslate } from "@form/runGate";
