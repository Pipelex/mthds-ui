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

export { RunPanel } from "./RunPanel";
export type { RunPanelProps, UploadedFile } from "./RunPanel";

// The submit path, React-free and re-exported for hosts that run the gate
// outside a panel (a toolbar button, a keyboard shortcut).
export { runSubmitGate, summarizeVerdict, defaultValidationTranslate } from "@form/runGate";
export type { RunGateOutcome, RunPanelMessageKey, RunPanelTranslate } from "@form/runGate";
