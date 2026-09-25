"use client";

/**
 * The `./form/react` entry — the run-form panel over `@pipelex/mthds-form`.
 *
 * The kernel is a DEPENDENCY of this package, so this entry is no longer the
 * only one allowed to import it. It stayed an optional peer while it powered
 * only this run form; it stopped being optional the moment the graph's detail
 * panel began rendering results through it, because a viewer whose detail
 * panel cannot show data is not a viewer. See `docs/stuff-result-panel.md`.
 */

/**
 * No form kernel stylesheet is imported here, on purpose: the host styles the
 * kernel's controls in the way its kind of host needs. A host with Tailwind 4
 * compiles the kernel's classes itself, with
 * `@import "@pipelex/mthds-ui/tailwind.css"` in place of the `@source` line of
 * the kernel's documented setup; a host without Tailwind imports
 * `@pipelex/mthds-ui/form-kernel.css` once. The README's "Styling the form
 * controls" section is the host's side of it.
 *
 * Do not put an import back. v0.20.0 made the kernel's sheet this entry's job,
 * because Tailwind 3 hosts kept forgetting a content glob into `node_modules`
 * and silently lost the classes only the kernel uses (the result grid's column
 * template was the one that showed). v0.21.0 wrapped the sheet in a cascade
 * layer after the raw copy beat the host's own responsive variants. Neither
 * arrangement works, because the sheet is a complete Tailwind build whose two
 * halves need different places in a Tailwind 4 host's cascade: appended, the
 * layer outranked every variant the host wrote; named first, the host's
 * preflight stripped the kernel's utilities. In a host without Tailwind, the
 * preflight reset every browser default on the page the moment a panel
 * mounted. `docs/run-form-panel.md` has the full account.
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
