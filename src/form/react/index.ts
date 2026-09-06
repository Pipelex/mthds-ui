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
/**
 * The kernel's own utilities, shipped beside its code.
 *
 * A Tailwind host is meant to generate these by scanning the kernel, and does
 * not: content globs stop at the host's own source and node_modules is off the
 * sweep, so the host gets exactly the classes it happens to use elsewhere and
 * silently misses the rest. The result grid's arbitrary column template is the
 * one that shows - without it a record renders as a stack of labels each above
 * its own value instead of two aligned columns - but the gap is not limited to
 * that class, and nothing reports it.
 *
 * Imported HERE rather than left to the host for the same reason the graph
 * imports its own: a stylesheet a host must remember to add is one that will be
 * missing somewhere.
 *
 * It goes through `../../styles/form-kernel.css`, which pulls the kernel's
 * sheet into a cascade LAYER, and that indirection is the whole point: the
 * kernel ships a complete unscoped Tailwind build, so injected raw it wins
 * every tie against a host's own utilities purely by loading later. Read that
 * file for what it broke and why the layer settles it.
 */
import "../../styles/form-kernel.css";

export * from "@pipelex/mthds-form/react";

export { RunPanel } from "./RunPanel";
export type { RunPanelProps, UploadedFile } from "./RunPanel";

// The submit path, React-free and re-exported for hosts that run the gate
// outside a panel (a toolbar button, a keyboard shortcut).
export { runSubmitGate, summarizeVerdict, defaultValidationTranslate } from "@form/runGate";
export type { RunGateOutcome, RunPanelMessageKey, RunPanelTranslate } from "@form/runGate";
