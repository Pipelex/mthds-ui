/**
 * The `./form/generative/headless` entry — the form kernel's
 * `./generative/headless` entry, re-exported.
 *
 * A host that produces a designed page, or checks a stored one, on its server
 * reaches the half of the generative layer that renders nothing here: the
 * designer's catalog as data and the frames' vocabularies (`designerCatalog`,
 * `frameCatalog`), the brief projected from the descriptor (`inputBrief`,
 * `resultBrief`), the concepts the designer's inputs travel under, the prompt
 * pin (`PROMPT_HASH`), `seedLine`, the JSONL compiler (`specFromJsonl`,
 * `specToJsonl`), the checks (`validateAgainstCatalog`, `layoutFits`,
 * `layoutProblems`, `layoutCheckProblems`, `REPAIR_ATTEMPTS`) and the check on
 * a sample the designer wrote for itself (`writtenSampleOf`).
 *
 * It is its own entry, with no `"use client"` directive, because the kernel
 * keeps it apart from its `./generative` entry for exactly that reason. In a
 * host running React Server Components, every export of `./form/generative`,
 * its plain functions included, reaches the server as a client reference that
 * throws when called, so a server component or a server action that builds a
 * brief or checks a layout imports these from here instead. It has no React,
 * so it also runs in a script or a worker with nothing else installed. Nothing
 * a client imports moves: `./form/generative` still carries all of it beside
 * the page that renders a layout.
 *
 * Re-exported wholesale, it follows the kernel from release to release with
 * nothing to edit here. The rule `./form` states holds here too: a host imports
 * the kernel through this package, never directly, so its tree holds one copy
 * of it.
 *
 * Which half a host imports where, and what each check refuses, are described
 * in `docs/generative-layout.md`.
 */

export * from "@pipelex/mthds-form/generative/headless";
