/**
 * The `./form` entry — the form kernel's React-free surface, re-exported.
 *
 * ## Why this exists at all
 *
 * A host that renders MTHDS methods needs both halves of this workspace's UI:
 * the graph, and the form kernel that describes what a pipe's inputs and
 * outputs ARE. Making it name two packages to get them was an artifact of how
 * they were built, not something a consumer should have to know — and it forced
 * the awkward middle state where an app declared `@pipelex/mthds-form` in its
 * manifest solely to satisfy a peer it never meant to think about.
 *
 * So `@pipelex/mthds-form` is a real DEPENDENCY of this package now, and this
 * entry re-exports it. A host installs `@pipelex/mthds-ui` and imports
 * everything from it.
 *
 * ## A dependency, and why that is safe here
 *
 * The usual objection to depending (rather than peer-depending) on a package
 * carrying React context is duplication: two copies means two context
 * identities, and a host's provider silently fails to resolve inside our
 * components. That objection applies when the HOST also declares the package —
 * two ranges, possibly incompatible, possibly nested.
 *
 * A host that declares nothing cannot produce a second copy: there is exactly
 * one, ours. The rule that keeps it that way is the one this file enforces by
 * existing — **a consumer should import the kernel through here, never
 * directly.** `make smoke-pack` checks the single-copy property from outside.
 *
 * ## React-free, deliberately
 *
 * This entry is the mirror of the kernel's own `.` entry: the descriptor
 * vocabulary, the derivation, the readiness rules, the run gate, the value
 * plumbing. No React, so it is importable from a server action, a CLI or a
 * worker — which is exactly where a host's validate action and run gate live.
 * The controls are behind `./form/react`.
 */

export * from "@pipelex/mthds-form";
