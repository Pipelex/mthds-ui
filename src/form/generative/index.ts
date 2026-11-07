"use client";

/**
 * The `./form/generative` entry — the form kernel's `./generative` entry,
 * re-exported.
 *
 * A host that shows a method's form or its result as a designed page reaches
 * the kernel's generative layer here: `GenerativePage` renders a stored layout
 * over the kernel's own controls, `specFromJsonl` compiles the JSONL a layout
 * is stored as, and `validateAgainstCatalog`, `layoutFits` and `PROMPT_HASH`
 * are the three checks a host runs before it renders one, falling back to the
 * kernel's plain form when any fails. The same entry carries what a producer
 * hands the designer method: the catalog as data (`designerCatalog`), the brief
 * projected from the descriptor (`inputBrief`, `resultBrief`) and the concepts
 * each travels under. The method itself is a file rather than code, shipped
 * beside this entry as `@pipelex/mthds-ui/form/layout-design.mthds`.
 *
 * It is its own entry rather than part of `./form/react` because the kernel
 * keeps it apart from its `./react` entry: it brings json-render and zod, which
 * a host rendering only the plain form never loads. It renders, so it is a
 * client module, as the kernel's entry is. Re-exported wholesale, it follows
 * the kernel from release to release with nothing to edit here.
 *
 * The rule `./form` states holds here too: a host imports the kernel through
 * this package, never directly, so its tree holds one copy of it — and with it
 * one copy of the React contexts a produced page and the plain form share.
 *
 * What the entry carries, the method file and why it is a copy are described
 * in `docs/generative-layout.md`.
 */

export * from "@pipelex/mthds-form/generative";
