# K2 adoption — a run-form panel over `@pipelex/mthds-form`

**Status:** design written 2026-08-23, before any code. This is the repo-local plan for milestone K2 of the input-form program (workspace `wip/devx/input-form-roadmap.md`, Track K), answering the notification `../wip/inbox/2026-08-21-mthds-ui-form-kernel-published-adopt-in-k2.md`. Work lands on `feature/Adopt-form` per the program assignment, PR into `dev` when done.

**The roadmap gate:** a consumer renders a method form by importing the kernel, deriving nothing locally.

## Where both sides stand

This repo has **no form UI today** — "input" everywhere in the codebase means dataflow, not user entry. The closest existing surfaces are read-only: `ConceptDetailPanel`'s `SchemaTable` (`src/graph/react/detail/ConceptDetailPanel.tsx:96`) displays a concept's `json_schema`, and `StuffViewer` renders input *values* after the fact. The extension seams a form panel will sit beside are `DetailPanel` (a generic container), `GraphViewer`'s `onNodeSelect`, and `renderDetailExtra`.

The kernel, `@pipelex/mthds-form` (currently 0.2.0), supplies everything below composition: the `RunField` descriptor union, `fieldsForContract`/`buildRunFields` (a pipe's IO-contract inputs in, `RunField[]` out), readiness (`computeReadiness`, `mustBeFilled`), the four-step submit gate (`buildRunInputsSchema` → `prepareRunInputs` → `validateRunInputs` → `apiInputsFromSchemaData`), the wire format with its two documented exceptions, and `FieldRenderer` with one themed control per field kind. Deliberately, the kernel ships **no form container**: the host owns the field loop, the values object, the fold state, and the Run button. That composition is exactly the value this repo adds — once, for every graph host.

Compatibility is clean by construction: both packages are ESM-only, `node >= 22`, React 19 as an optional peer. Note the kernel's `./react` entry is React 19-*only* in practice (it uses `use(Context)` and the context-as-provider form), and only the specifiers `@pipelex/mthds-form`, `@pipelex/mthds-form/react`, and the two CSS exports are stable — deep `dist/` paths are forbidden.

## The deliverable

A new exported component — working name **`RunPanel`** — behind a new package entry `./form/react`: a side-panel that renders a pipe's input form from its IO contract, tracks readiness on the Run button, runs the submit gate, and hands the wire-ready payload to a host callback. `mthds-ui` stays a rendering library: it never executes a method, never uploads a file, never holds an API client. Execution, uploads, and storage-URL resolution are injected by the host, exactly like the kernel's own `FieldEnv` contract.

Props sketch (final shapes settle at implementation):

```ts
interface RunPanelProps {
  contract: PipeIOContract;                 // the kernel's type, host-supplied — Decision A
  values: Record<string, unknown>;          // fully controlled, host-owned — kernel philosophy
  onValuesChange: (values: Record<string, unknown>) => void;
  onRun: (apiInputs: Record<string, unknown>) => void;  // fires only after the gate passes
  running?: boolean;
  env?: FieldEnv;                           // onDropFile / uploadingIds / resolveUrl passthrough
  title?: string;                           // panel header — the host names the pipe
  theme?: GraphTheme;                       // drives the `.dark` class on the container — Decision D
}
```

Internally: `fieldsForContract(contract)`, a `FieldRenderer` per field with `OptionalToggle` folding empty optionals, `computeReadiness` gating the Run button, and on submit the four-step gate with verdict errors surfaced through `describeValidationError` (falling back to `errors` when `missingInputs` is empty, which is a documented legitimate state). Presentation stays the kernel default (`studio` — this is a builder-facing surface, and the default needs no wrapper); strings stay the kernel's English defaults, and hosts that localize wrap the kernel's own `FieldStringsProvider` above the panel.

## Decisions

### A. The panel is fed the kernel's contract types, not `GraphSpec` — and the static path is deliberately out of scope

The panel takes `contract: PipeIOContract` (with the kernel's `getPipeIOContract(contracts, domain, pipeCode)` available to hosts for lookup — note the argument order; the kernel README currently shows it wrong, filed as `../wip/inbox/2026-08-23-mthds-form-readme-getpipeiocontract-arg-order.md`). Rationale:

- Hosts that can actually run a method (pipelex-app, pipelex-mcp, playroom against the API) already hold `pipe_io_contracts` from the same `/validate` call that produced their dry/live graphspec — handing it over costs them one prop.
- The alternative — an adapter from `GraphSpec`'s `pipe_registry`/`concept_registry` — would require this repo to synthesize array schemas for plural slots from `StuffSpecInfo.multiplicity` and to trust the static parser's `deriveJsonSchema` (`src/static-graph/parseMthdsBundle.ts:65`), which is a deliberately thin local reconstruction. Both are exactly the "deriving locally" the K2 gate forbids.
- The no-network form model for static hosts (the VS Code webview, playroom's TOML lane) is Track E's job, not this repo's: `@pipelex/runtime` already derives the input-form descriptor locally (E1, closed), and its kernel consumption is E2, separately gated. When that lands, it feeds this same panel through the same prop. `mthds-ui` never grows a guesser.

### B. The kernel is an optional peer, isolated behind its own entry point

`@pipelex/mthds-form` joins as an **optional peer dependency** (plus a devDependency for local development), and the panel is exported from a new entry `./form/react` — never from `./graph/react`. Three reasons, in order of force:

- **Context identity.** `FieldStringsProvider` and `FieldPresentationProvider` are React contexts. `pipelex-app` consumes the kernel directly; if this repo carried its own nested copy as a hard dependency, a host provider would not resolve inside the panel. Shared-instance packages are peers — the same rule that already makes `react` an optional peer here, and the same argument this repo made about its own graph stack in the kernel-home reply.
- **Weight.** The kernel's react layer pulls Radix, react-dropzone, lucide-react, and cva. Graph-only consumers must not install any of that.
- **Precedent.** `shiki` is already an optional peer isolated behind `./shiki`; `./form/react` follows the identical pattern, so the packaging story stays uniform.

Graph entries must keep working with the kernel absent. Enforcement: an eslint `no-restricted-imports` rule (or an import-graph test) pinning that only the form module imports from `@pipelex/mthds-form`.

### C. The panel owns composition; the kernel owns meaning

The dividing line, stated once: anything that decides what a field *is* or whether the form *may run* is imported from the kernel; anything that decides where things sit on screen belongs to this repo. Concretely, the panel never reads `json_schema` to make a rendering decision, never sniffs a value shape, and routes contract→fields exclusively through `fieldsForContract` — which is what keeps the M1 derivation swap (heuristics → wire descriptor, `mthds-form/docs/derivation-swap.md`) invisible to this repo: when the kernel's derivation source changes, nothing here moves.

### D. CSS: the panel styles its chrome; the kernel's control CSS is the host's lane; Tailwind does not enter this repo

This repo is plain CSS under the strict tsup two-place packaging contract (`CLAUDE.md`, "CSS Packaging — MANDATORY"); the kernel's controls are Tailwind classes over shadcn semantic tokens with two mutually exclusive host lanes (compile-with-content-glob, or the prebuilt `theme.css` + `styles.css`). Two options are ruled out:

- **Compiling Tailwind here** — a second build regime in a repo whose kernel-home reply declined exactly that trap-surface doubling.
- **`@import`ing `styles.css` from the package's own CSS** — it carries Tailwind preflight, so this repo would leak global resets into every host, and hosts that compile the classes themselves (pipelex-app) would double-load.

So: a `RunPanel.css` (registered in `tsup.config.ts` in **both** places, per the mandatory rule) styles only the panel chrome with this repo's own tokens, and the control styling is documented as the host's responsibility per its lane — inheriting, verbatim in spirit, the silent-purge trap warning from `pipelex-app/docs/form-kernel-package.md` (Trap 1: a Tailwind host missing the content glob gets a *mostly*-styled form that reads as a design regression, not a missing glob).

Two small bridges we do provide: the panel container toggles the kernel's `.dark` class in step with the graph theme prop, and the container is a documented, stable class hook for hosts that want to scope shadcn token overrides to the panel. A full automatic token bridge (mapping this repo's `--surface-*`/`--text-*` values onto shadcn's raw HSL-triplet tokens) is **deferred as an open question**: it needs runtime hex→HSL conversion, and it is not obvious the form should follow the graph canvas rather than the host app's design system.

Storybook takes the prebuilt lane (`theme.css` + `styles.css` imported in preview). That makes the stories the living exercise of the no-Tailwind path and puts real control styling under the browser play tests — the first consumer anywhere to exercise that lane end to end.

## Plan

**Phase 1 — plumbing.** Add the optional peer (+ devDependency), wire `./form/react` through the package.json exports map, the tsup entries, and dts; check whether the built entry needs the `"use client"` directive re-prepended post-build the way the kernel's own tsup config does it, since esbuild strips directive prologues. Land the import-isolation enforcement from Decision B. Prove the entry resolves in a consumer-shaped smoke test.

**Phase 2 — the panel.** `RunPanel` + `RunPanel.css` (two-place registration), readiness, the four-step gate, the error summary, `env` passthrough. Unit tests over the composition logic (the node vitest project); the kernel's own behavior is not re-tested here.

**★ Checkpoint 1.** Code exists and is unit-green. Update this doc: decisions confirmed or amended, SHAs of landed commits, deviations reconciled into the phases below. Verify the doc is cold-start ready for a fresh session.

**Phase 3 — stories and fixtures.** A contracts fixture produced through the existing fixture machinery (`make fixtures` — fixtures are generated, never hand-written, per repo rule), stories for the panel including one wiring `GraphViewer`'s `onNodeSelect` to the panel via `getPipeIOContract`, browser play tests, and the mandatory visual Storybook verification from the workflow rules.

**Phase 4 — docs and release.** `docs/run-form-panel.md`, a README section, a cross-reference from `docs/theming.md` (the panel's chrome tokens vs the kernel's shadcn tokens), CHANGELOG under `[Unreleased]`. The version bump and release ride the release skill when Louis calls it — this is an additive change (new entry, optional peer), a minor bump.

**★ Checkpoint 2 (close).** The K2 gate is met when a story renders a method form where every field, the readiness verdict, and the wire payload come from kernel imports and the only local code is layout. Record the closure at the workspace roadmap per the program's checkpoint protocol.

## Out of scope, and what arrives on its own

- **Host adoptions** (playroom, pipelex-app, the VS Code webview) are M2 material — each host swaps on its next touch, and none is part of this milestone.
- **H3** (rating/quantity presentation for intent hints) lands inside the kernel's controls and reaches the panel as a version bump; the panel renders whatever `FieldRenderer` renders. Handoff filed at `../wip/inbox/2026-08-23-mthds-form-h3-render-intent-hints.md`.
- **M1** (the derivation swap to the wire descriptor) is a kernel-internal change by design; Decision C is what keeps this repo out of its blast radius.
- **E2** (the local-derivation feed for static hosts) is separately gated and tracked in the kernel's repo; when it lands, it feeds the same `contract` prop.

## Kernel facts this design already priced in

Fully controlled values with empty strings normalized to `undefined`; the `id` prop is a dotted path doing double duty for label linkage and upload tracking, written back with `setValueAtPath`; optional and plural inputs never gate, and the wire has two exceptions (blank optionals are omitted entirely; empty plurals ship bare as `[]` without the envelope); `validateRunInputs` can be invalid with an empty `missingInputs`, so error display must fall back to `errors`; the gate's ajv runs with `coerceTypes: true` and mutates the prepared data it validates; uploads are injected, never performed (`onDropFile` + host write-back of `{url, filename}`); and the local dev loop against a tarball needs a re-pack plus a forced install, with any running dev server restarted after.

## References

- Workspace: `wip/devx/input-form-roadmap.md` (Track K, K2 gate), `wip/devx/input-form-projection.md` (the adopted direction), `docs/specs/mthds-input-form-descriptor.md` (the descriptor the kernel will eventually consume).
- The notification: `wip/inbox/2026-08-21-mthds-ui-form-kernel-published-adopt-in-k2.md`; this repo's own kernel-home reply `wip/inbox/2026-08-21-pipelex-app-form-kernel-home-reply.md` (the styling-regime and peers arguments reused here).
- Kernel: `mthds-form/src/core/descriptor.ts` (`RunField`), `src/core/contracts.ts:57` (`getPipeIOContract` signature), `src/core/gate.ts` (the four steps), `src/core/readiness.ts`, `src/react/field-renderer.tsx:18` (`FieldEnv`), `docs/theming.md`, `docs/derivation-swap.md`, `docs/dependency-budget.md`.
- The canonical consumer: `pipelex-app/src/components/method-app/method-app-workspace.tsx` (the full derive → seed → render → gate → run chain) and `pipelex-app/docs/form-kernel-package.md` (both traps).
- This repo's seams: `src/graph/react/detail/ConceptDetailPanel.tsx:96` (the read-only twin), `src/graph/react/viewer/GraphViewer.tsx:70` (props incl. `onNodeSelect`), `src/static-graph/parseMthdsBundle.ts:65` (`deriveJsonSchema` — what we deliberately do *not* feed the form).
