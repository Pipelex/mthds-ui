# Deferred: a strings contract for `RunPanel`'s own chrome

**Raised:** 2026-08-23, during K2 Phase 2 (`wip/adopt-form/design.md`). **Status:** deliberately not built.

## What is English-only today

`RunPanel` renders four strings it owns outright, with no way for a host to replace them:

- the Run button, `"Run"` and `"Running…"`;
- the readiness line, `"{ready} of {total} ready — still needed: {names}"`;
- the missing-inputs summary prefix, `"Missing required fields in: …"` (in `runGate.ts`);
- the no-inputs line, `"This pipe takes no inputs."`.

Everything else already has a seam. The controls' strings are the kernel's, injected by wrapping the panel in its `FieldStringsProvider`. The validation messages go through the panel's `translate` prop, which defaults to English wording matching `pipelex-app`'s `en.json` and takes the kernel's typed `Translate` otherwise. The panel header is the host's `title`.

## Why it was left

Building the seam is easy — a `RunPanelStrings` interface with defaults, a prop or a provider — and that is exactly why it does not need to be built in advance. The shape a host actually wants is not yet observable:

- a host on the kernel's provider pattern would expect a `RunPanelStringsProvider` for symmetry;
- a host on next-intl would rather pass a single `t` and have the panel name its keys;
- a host that only wants a different button label wants one `runLabel` prop and nothing else.

Guessing among those produces a surface we then have to keep. No consumer has asked yet: K2's own gate is about fields, readiness and the wire payload, and the first adopters (playroom, pipelex-app, the VS Code webview) are M2.

## What would settle it

The first host that needs a non-English panel, or a different Run label. At that point pick the shape from what that host already does rather than from symmetry — and note that `translate` is the precedent to extend, since it is already a host-injected function with kernel-typed keys.
