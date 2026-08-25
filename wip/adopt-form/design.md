# K2 adoption — a run-form panel over `@pipelex/mthds-form`

**Status:** design written 2026-08-23, before any code. This is the repo-local plan for milestone K2 of the input-form program (workspace `wip/devx/input-form-roadmap.md`, Track K), answering the notification `../wip/inbox/2026-08-21-mthds-ui-form-kernel-published-adopt-in-k2.md`. Work lands on `feature/Adopt-form` per the program assignment, PR into `dev` when done.

**The roadmap gate:** a consumer renders a method form by importing the kernel, deriving nothing locally.

## Where both sides stand

This repo has **no form UI today** — "input" everywhere in the codebase means dataflow, not user entry. The closest existing surfaces are read-only: `ConceptDetailPanel`'s `SchemaTable` (`src/graph/react/detail/ConceptDetailPanel.tsx:96`) displays a concept's `json_schema`, and `StuffViewer` renders input _values_ after the fact. The extension seams a form panel will sit beside are `DetailPanel` (a generic container), `GraphViewer`'s `onNodeSelect`, and `renderDetailExtra`.

The kernel, `@pipelex/mthds-form` (currently 0.2.0), supplies everything below composition: the `RunField` descriptor union, `fieldsForContract`/`buildRunFields` (a pipe's IO-contract inputs in, `RunField[]` out), readiness (`computeReadiness`, `mustBeFilled`), the four-step submit gate (`buildRunInputsSchema` → `prepareRunInputs` → `validateRunInputs` → `apiInputsFromSchemaData`), the wire format with its two documented exceptions, and `FieldRenderer` with one themed control per field kind. Deliberately, the kernel ships **no form container**: the host owns the field loop, the values object, the fold state, and the Run button. That composition is exactly the value this repo adds — once, for every graph host.

Compatibility is clean by construction: both packages are ESM-only, `node >= 22`, React 19 as an optional peer. Note the kernel's `./react` entry is React 19-_only_ in practice (it uses `use(Context)` and the context-as-provider form), and only the specifiers `@pipelex/mthds-form`, `@pipelex/mthds-form/react`, and the two CSS exports are stable — deep `dist/` paths are forbidden.

## The deliverable

A new exported component — working name **`RunPanel`** — behind a new package entry `./form/react`: a side-panel that renders a pipe's input form from its IO contract, tracks readiness on the Run button, runs the submit gate, and hands the wire-ready payload to a host callback. `mthds-ui` stays a rendering library: it never executes a method, never uploads a file, never holds an API client. Execution, uploads, and storage-URL resolution are injected by the host, exactly like the kernel's own `FieldEnv` contract.

Props sketch (final shapes settle at implementation):

```ts
interface RunPanelProps {
  contract: PipeIOContract; // the kernel's type, host-supplied — Decision A
  values: Record<string, unknown>; // fully controlled, host-owned — kernel philosophy
  onValuesChange: (values: Record<string, unknown>) => void;
  onRun: (apiInputs: Record<string, unknown>) => void; // fires only after the gate passes
  running?: boolean;
  env?: FieldEnv; // onDropFile / uploadingIds / resolveUrl passthrough
  title?: string; // panel header — the host names the pipe
  theme?: GraphTheme; // drives the `.dark` class on the container — Decision D
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

The dividing line, stated once: anything that decides what a field _is_ or whether the form _may run_ is imported from the kernel; anything that decides where things sit on screen belongs to this repo. Concretely, the panel never reads `json_schema` to make a rendering decision, never sniffs a value shape, and routes contract→fields exclusively through `fieldsForContract` — which is what keeps the M1 derivation swap (heuristics → wire descriptor, `mthds-form/docs/derivation-swap.md`) invisible to this repo: when the kernel's derivation source changes, nothing here moves.

### D. CSS: the panel styles its chrome; the kernel's control CSS is the host's lane; Tailwind does not enter this repo

This repo is plain CSS under the strict tsup two-place packaging contract (`CLAUDE.md`, "CSS Packaging — MANDATORY"); the kernel's controls are Tailwind classes over shadcn semantic tokens with two mutually exclusive host lanes (compile-with-content-glob, or the prebuilt `theme.css` + `styles.css`). Two options are ruled out:

- **Compiling Tailwind here** — a second build regime in a repo whose kernel-home reply declined exactly that trap-surface doubling.
- **`@import`ing `styles.css` from the package's own CSS** — it carries Tailwind preflight, so this repo would leak global resets into every host, and hosts that compile the classes themselves (pipelex-app) would double-load.

So: a `RunPanel.css` (registered in `tsup.config.ts` in **both** places, per the mandatory rule) styles only the panel chrome with this repo's own tokens, and the control styling is documented as the host's responsibility per its lane — inheriting, verbatim in spirit, the silent-purge trap warning from `pipelex-app/docs/form-kernel-package.md` (Trap 1: a Tailwind host missing the content glob gets a _mostly_-styled form that reads as a design regression, not a missing glob).

Two small bridges we do provide: the panel container toggles the kernel's `.dark` class in step with the graph theme prop, and the container is a documented, stable class hook for hosts that want to scope shadcn token overrides to the panel. A full automatic token bridge (mapping this repo's `--surface-*`/`--text-*` values onto shadcn's raw HSL-triplet tokens) is **deferred as an open question**: it needs runtime hex→HSL conversion, and it is not obvious the form should follow the graph canvas rather than the host app's design system.

Storybook takes the prebuilt lane (`theme.css` + `styles.css` imported in preview). That makes the stories the living exercise of the no-Tailwind path and puts real control styling under the browser play tests — the first consumer anywhere to exercise that lane end to end.

## Plan

**Phase 1 — plumbing.** Add the optional peer (+ devDependency), wire `./form/react` through the package.json exports map, the tsup entries, and dts; check whether the built entry needs the `"use client"` directive re-prepended post-build the way the kernel's own tsup config does it, since esbuild strips directive prologues. Land the import-isolation enforcement from Decision B. Prove the entry resolves in a consumer-shaped smoke test.

**Phase 2 — the panel.** `RunPanel` + `RunPanel.css` (two-place registration), readiness, the four-step gate, the error summary, `env` passthrough. Unit tests over the composition logic (the node vitest project); the kernel's own behavior is not re-tested here.

**★ Checkpoint 1.** Code exists and is unit-green. Update this doc: decisions confirmed or amended, SHAs of landed commits, deviations reconciled into the phases below. Verify the doc is cold-start ready for a fresh session.

**Phase 3 — stories and fixtures.** A contracts fixture produced through the existing fixture machinery (`make fixtures` — fixtures are generated, never hand-written, per repo rule), stories for the panel including one wiring `GraphViewer`'s `onNodeSelect` to the panel via `getPipeIOContract`, browser play tests, and the mandatory visual Storybook verification from the workflow rules.

**Phase 4 — docs and release.** `docs/run-form-panel.md`, a README section, a cross-reference from `docs/theming.md` (the panel's chrome tokens vs the kernel's shadcn tokens), CHANGELOG under `[Unreleased]`. The version bump and release ride the release skill when Louis calls it — this is an additive change (new entry, optional peer), a minor bump.

**★ Checkpoint 2 (close).** The K2 gate is met when a story renders a method form where every field, the readiness verdict, and the wire payload come from kernel imports and the only local code is layout. Record the closure at the workspace roadmap per the program's checkpoint protocol.

## ★ Checkpoint 1 — what landed, and what the code taught us

Phases 1 and 2 are in, `make check && make test` green on both. The tracker is `TODOS.md`; this section is the cold-start brief for whoever picks Phase 3 up.

| Commit    | What                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| `0556e6d` | Phase 1 — the optional peer, the `./form/react` entry, the import-isolation rule, `scripts/smoke-pack.mjs` |
| `ded7bf6` | Phase 2 — `runGate.ts`, `RunPanel.tsx`, `RunPanel.css`, unit tests                                         |
| `5fffd87` | Phase 3 — the contracts fixture pass, the form stories, the graph integration story                        |
| `ebbef28` | Phase 4 — `docs/run-form-panel.md`, README, `docs/theming.md`, `CLAUDE.md`, CHANGELOG                      |

**All four phases are landed and PR #75 is open against `dev`.** What remains is the review loop and Checkpoint 2; `TODOS.md` carries the resume brief. Three things Phase 3 settled that this doc predicted only in outline:

- **Decision D's Storybook question resolved in favour of the global import.** The prebuilt lane (`theme.css` + `styles.css`) is imported in `.storybook/preview.ts` for every story, not scoped to the form ones. Its Tailwind preflight was measured rather than eyeballed — with and without, across CV screening, nested controllers, wide parallel and deep nesting: 0.6–1.7% of pixels differ. **The original write-up called all of that "sub-pixel text-metric shift", and a later pass measured the computed styles directly and found that half wrong.** One preflight rule does the work — `line-height: 1.5` on the root — and it is not sub-pixel: card text moves from `line-height: normal` to a fixed value (`.pipe-card-header` to 24px at a 16px font, about +30%), and a header box grows a few pixels with it. The pixel percentage was low because the canvas is mostly empty, not because the shift was small. What genuinely does not move is the graph: `.react-flow__node` heights are byte-identical, since ELK sizes the boxes and preflight cannot reach that. So the decision stands and needs no deviation — but the honest scope is that Storybook stays authoritative for layout, spacing and edge routing, and is **not** the place to judge whether text fits inside a card, because no consumer of the graph entry loads preflight at all.
- **No pipelex CLI emits `pipe_io_contracts`**, which the plan assumed a validate call would hand over. `scripts/dump_pipe_io_contracts.py` calls the canonical builder through the pipelex venv instead, and deliberately skips the validation sweep — a contract is a projection of what a pipe DECLARES, so routing through `validate_bundles_in_process` would make every contract depend on a current local model deck. Retirement request filed at `../wip/inbox/2026-08-23-pipelex-expose-pipe-io-contracts-in-agent-cli.md`.
- **The pipeline corpus has no optional input at all**, so two vendored MTHDS Test Corpus entries are swept alongside it to give the fold story real data. Nothing is written into the read-only corpus.

**Every decision above survived implementation.** A, B, C and D are confirmed as written; nothing needs amending. What follows are the deviations and the facts the code turned up.

### Deviations from the plan

- **The smoke test is a committed script, not a scratch run.** `scripts/smoke-pack.mjs` (`make smoke-pack`) packs the tarball, installs it into a consumer that deliberately has no kernel, and asserts the export map, the `"use client"` directive, and that no entry other than `./form/react` reaches the kernel. That vantage point is the only one from which any of it is observable, so it was worth keeping rather than doing once.
- **`RunPanel` carries three props the sketch did not name.** `uploadFile` (the host stores the file, the panel owns the busy-marking and the `setValueAtPath` write-back — which is where the sketch's `env` passthrough and the tracker's write-back line met), `translate` (the kernel ships no defaults for its validation-message keys, so the panel names them in English and a localizing host overrides), and `className`. `env` stayed, now specified precisely: **the host's value wins per key, and the panel fills in what the host left undefined.**
- **The panel applies this repo's palette to its own container.** The graph's CSS variables are set inline on the ReactFlow container, so a panel sitting beside the graph inherits none of them. `RunPanel` calls `getPaletteForTheme(theme)` and spreads the result as its own `style`, which is also what makes the `.dark` bridge and the chrome tokens agree without duplicating any colour values.

### Three facts the code turned up

- **tsup's `external` patterns match the import SPECIFIER, not the resolved path.** `RunPanel.tsx` imports `"./RunPanel.css"`, so the pattern must be `/RunPanel\.css$/`; the first attempt used `/form\/react\/RunPanel\.css$/` and the stylesheet was silently dropped from the JS output. CLAUDE.md's CSS rule should say this outright — queued for Phase 4.
- **There is a THIRD registration place for a stylesheet**, and CLAUDE.md's "in BOTH places" is therefore incomplete: `scripts/standaloneCssFiles.mjs`, guarded by `src/standalone/__tests__/cssManifest.test.ts`. For the form entry the correct answer is _exclusion_, not registration — the standalone IIFE has one entry (the graph viewer) and by construction cannot carry the optional peer, so the test now skips `src/form/` with that reason written down. Also queued for Phase 4.
- **The run gate does not catch an empty required text input.** It reaches ajv as `{ text: "" }`, a perfectly valid string. `computeReadiness` is what notices, which is exactly why readiness gates the Run button — and, after review round 9, the submit path too — and why the gate is the last line of defence against a malformed payload rather than the thing that tells you the form is unfinished. Pinned by a test that says so, and that test is what review round 9 cited back at us.

### Kernel behaviour to design fixtures against

`native.Date` renders as **prose** and wraps as `{ text }` — the kernel's own `native-concepts.ts` records this as intended drift, retired in M1. A hand-authored `native.Date` contract therefore does not produce a date picker, and the Phase 2 tests use a custom structured concept (`demo.Booking`) to reach the date control. Phase 3's fixtures come from real `/validate` output, so they will not hit this; hand-written test contracts will.

### Deferred, with the reasoning

- **Panel chrome strings are English-only.** "Run", "Running…", the readiness line and the missing-fields prefix have no strings contract; `translate` covers only the kernel's validation messages. A full panel-level strings provider is not obviously warranted before a host asks for one — see `wip/adopt-form/deferred-panel-strings.md`.
- **The automatic shadcn token bridge** stays deferred exactly as Decision D left it.

## ★ Checkpoint 2 — the gate, and what the review loop actually cost

**The K2 gate is met, and it was checked rather than asserted.** `Form/Graph with RunPanel` clicks a pipe in a `GraphViewer`, looks its contract up with the kernel's `getPipeIOContract`, and renders the form; every field, the readiness verdict and the wire payload come from kernel imports. The half worth verifying is "deriving nothing locally", and it holds: outside the generated fixtures, the only `json_schema` mentions anywhere in `src/form/` are a comment saying the panel does not read it and three test fixtures carrying it because the kernel's type has the field. No production path in this module reads a schema or sniffs a value's shape. Decisions A, B, C and D all survived implementation unamended.

**The whole design was right and the whole cost was somewhere else.** Nine rounds of bot review produced ten defects. Every one of them was in the upload lifecycle — the bookkeeping around "mark the field busy → await the host's transfer → write the result back". Not one was in the composition, the gate orchestration, the packaging, the theming or the fixtures. That is the finding this document should carry forward, because it says where to spend attention on the next adoption: the kernel's boundary is clean, and the danger is entirely in the async loop each host has to build around it.

The ten group into three questions, and the grouping is more useful than the list:

- **What does the write-back write into?** The continuation resolves long after the render that started it, so it must read a mirror rather than the captured snapshot — and it must advance that mirror itself, synchronously, or two uploads settling in one React batch clobber each other.
- **What stops a run going out mid-upload?** Readiness cannot, because a non-gating file input never counts toward it. And the gate must live on the submit **path**, not in the button's `disabled` attribute — `form.requestSubmit()` ignores a disabled submitter entirely.
- **Which form does an in-flight upload belong to?** Five separate ways to get this wrong: the write-back needs a generation check, so does the cleanup, the marker must be written by a **layout** effect (a passive one lags the commit, and an upload settling is a microtask that lands in exactly that lag), it must **count** rather than name the contract (identity is ABA-vulnerable when a host returns to a pipe), and it must advance on **unmount** as well as on a prop change (a keyed remount never changes the prop).

**Three lessons about the review loop itself**, which are the transferable part:

1. **Measure React's ordering; do not reason about it.** Three reproduction harnesses in a row passed against unfixed code before I stopped guessing and wrote a probe. The answer: the microtask window exists only when the update originates **outside** a React event handler. A discrete click and a `startTransition` raised from one both flush passive effects first. Two of my three harnesses were the two cases that cannot fail.
2. **A bot wrong about the mechanism is usually still right that a defect exists.** Every bot finding that was wrong was wrong about _why_, never about _whether_ — twice overstating the harm, once understating it. And two of my own deferrals were overturned, both because I had ruled the defect out on the strength of the only fix I had thought of rather than on the defect itself.
3. **When a fix moves a decision, ask what else was making that decision in the old place.** Round 4 was a fix scoped to the write-back but not the cleanup; round 9 was a fix scoped to one gate term but not its two siblings. Same mistake, made by me, five rounds apart, and visible in the diff both times.

**One obligation leaves this milestone open-ended, deliberately.** The contracts fixtures are pre-S2, and so is the kernel at the pinned `0.2.0` — they agree, which is precisely why nothing here can go red on its own however wrong the pairing becomes. `wip/adopt-form/contracts-fixture-reshape-obligation.md` records that the regeneration is owed in the same change that bumps the kernel and must not precede it.

The closure is recorded workspace-side in `../wip/devx/input-form-roadmap.md` (`↳ K2 in mthds-ui` in the milestone table, plus its own section), and the upload family was filed against `pipelex-app`, which has it independently.

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
- This repo's seams: `src/graph/react/detail/ConceptDetailPanel.tsx:96` (the read-only twin), `src/graph/react/viewer/GraphViewer.tsx:70` (props incl. `onNodeSelect`), `src/static-graph/parseMthdsBundle.ts:65` (`deriveJsonSchema` — what we deliberately do _not_ feed the form).
