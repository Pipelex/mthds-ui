# Static Method Graph — Design

Status: draft for discussion. Branch: `feature/Static-graph`.

> **Revision note.** An earlier draft of this document placed the builder in pipelex (Python), reasoning that the language semantics shouldn't be forked into a second implementation. That option is now off the table by an explicit product constraint (below): the graph must be derivable from the `.mthds` TOML **without any Python runtime-based utility** — no pipelex CLI, no pipelex API call. This revision designs the all-TypeScript path.

## Motivation

Today the only way to display a method graph is to run it. `GraphViewer` consumes a `GraphSpec`, and the only producer of a `GraphSpec` is the pipelex tracer (`pipelex/pipelex/graph/graph_tracer.py`) observing an actual execution — live or dry. The dry run is great for what it was designed for (validating that the method's logic actually executes end-to-end with mocked data), but as a _display_ path it has real costs:

- **Latency and weight.** A dry run pays full runtime setup: library load, working-memory mocking, controller orchestration, event-log assembly. For "just show me the method" that's all overhead.
- **Fragile on broken methods.** A dry run needs the bundle to load and wire: an unresolvable pipe reference or any other validation/runtime failure aborts the run, so nothing can be displayed. (`PipeSignature` placeholders are _not_ the problem — the dry run executes them fine, generating contract-shaped mock output.) A static path can best-effort render whatever parses, which matters when showing the graph _while the method is being built_ (the build chatbot in pipelex-app, the VS Code extension, `/mthds-build`).
- **Non-deterministic shape.** Node ids are run-order sequence numbers (`{graph_id}:node_{seq}`), stuff digests are random 5-char shortuuids minted per run (`StuffFactory.make_stuff_code()`), and batch fan-out depends on mock list length (hardcoded 3). This is why our snapshot tests need re-baselining after every `make fixtures` and why layouts jitter between runs of the same method.
- **Run-shaped, not method-shaped.** A dry-run graph is a _simulated execution trace_. A batch over a 3-item mock list produces 3 branch subtrees. When the intent is "display the method", we want one representative branch, not a sample execution.

**Positioning: this is an additional, experimental display path.** The dry-run graph stays exactly where it is — including as `/validate`'s `graph_spec` — and is not being replaced, even if the static path works out well. The goal is to build the static graph, play with it side by side with the dry-run graph, and learn what each view is best at.

## Constraint: no Python in the display path

The method exists in its TOML-based syntax, and every display consumer is TypeScript: pipelex-app, playroom, hub, the vscode-pipelex extension, and mthds-ui itself. Requiring a pipelex round trip (CLI or API) just to _see_ a method couples display to a Python runtime that several of these consumers don't otherwise need. The static graph must therefore be computed in TypeScript, from the raw `.mthds` text.

This is feasible because of two facts established below: MTHDS dataflow is fully determined by the declared structure (no runtime-only wiring information exists), and the rendering pipeline needs only structural fields. The cost is a second implementation of a _subset_ of the language semantics — parsing shape, reference resolution, name-matching — with the MTHDS spec (`mthds/docs/spec/mthds-format.md`) as the normative source for both implementations, and a parity harness (below) as the drift detector.

## What the research established

### The renderer needs less than the GraphSpec carries

`validateGraphSpec` (mthds-ui `src/graph/validateGraphSpec.ts`) hard-requires: `meta.format === "mthds"`; per node a non-empty `id`, `kind ∈ {controller, operator}`, `pipe_code`, `pipe_type ∈ KNOWN_PIPE_TYPES`, `description`, `domain_code`, and a valid `status`; per edge an `id`, `source`, `target`, and known `kind`. Everything else — `timing`, `error`, `metrics`, `execution_data`, `data*`, `preview`, `pipe_registry`, `concept_registry` — is optional, and the detail panels already degrade cleanly when it's absent (structure-only concept panel, blueprint-only pipe sections).

The load-bearing finding is **how dataflow is wired**: the rendering pipeline never reads `data`-kind edges. `buildDataflowAnalysis` (`src/graph/graphAnalysis.ts`) derives stuff nodes, producers, and consumers entirely from **shared `digest` values on `io.inputs[]`/`io.outputs[]`** of non-controller nodes, then synthesizes producer→stuff→consumer edges itself. The only GraphSpec edges consumed are `contains` (containment tree — a "controller" for analysis purposes is any node that sources a `contains` edge), plus `batch_item`, `batch_aggregate`, and `parallel_combine` (gated on their `source_stuff_digest`/`target_stuff_digest` existing in the registry). `data`, `control`, and `selected_outcome` edges are validated but ignored.

So the static builder's real job is: **emit pipe nodes, `contains` edges, and consistent synthetic digests on io items** — plus the three special edge kinds where applicable. Digests are treated as opaque unique keys by the UI; they don't need to be content hashes.

### The MTHDS text fully determines the graph

The semantics live in the spec (`mthds/docs/spec/mthds-format.md`, `docs/language/working-memory.md`) and are mirrored by the pipelex blueprint layer (`pipelex/pipelex/core/pipes/pipe_blueprint.py`), which serves here as a semantics reference, not a dependency:

- Every pipe declares `inputs: {name → concept spec}` and `output: concept spec` (concept spec = `Concept`, `domain.Concept`, optional `[]`/`[N]` multiplicity).
- Controllers expose their sub-pipe references in the TOML itself: `PipeSequence.steps` (ordered sub-pipe entries: `pipe`, `result`, `nb_output`, `multiple_output`, `batch_over`, `batch_as`), `PipeParallel.branches` + `add_each_output`/`combined_output`, `PipeCondition.outcomes`/`default_outcome` (minus special `fail`/`continue`), `PipeBatch.branch_pipe_code`/`input_list_name`/`input_item_name`.
- **There is no explicit input-mapping syntax anywhere in the language.** A sequence step names only the pipe to call and the `result` name for its output. Input wiring is implicit: the runtime matches the called pipe's declared input _names_ against working-memory entries (prior `result`s, the enclosing pipe's own inputs, `batch_as`/`input_item_name` items, `add_alias_from_expression_to` aliases), with dotted-path prefix matching (`a.b` is satisfied by a binding for `a`). This means dataflow edges are _fully derivable_ from the parsed TOML — the dry run discovers at runtime what a static walker can compute directly.
- **One divergence to own: elaboration.** The pipelex interpreter rewrites the blueprint before execution — a `PipeLLM` with `structuring_method = "preliminary_text"` becomes a synthetic 2-step sequence (draft `PipeLLM` + `PipeStructure`). Parsing raw TOML, the static path sees the method _as authored_, one node. That is arguably the right display for a method view, but it differs from what dry-run graphs show; the parity harness must normalize for it, and the display policy is an open question.
- `pipelex/derived/mthds_schema.json` is a JSON Schema of the authoring surface, generated from the pipelex blueprint models. It is the machine-readable contract the TS types can be generated from.

### What the dry run adds that static cannot

Honest inventory of what we give up in a static graph, and why it's acceptable for the display use case:

| Dry-run artifact                                                  | Static equivalent                        | Impact                                                                                                   |
| ----------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Execution proof (the method actually runs)                        | None — static renders broken methods too | That's a _feature_ for the build-time display; validation stays a separate concern                       |
| Mock data content in stuff nodes (`data_text` etc.)               | Absent                                   | UI already renders structure-only concept panels                                                         |
| `execution_data` (rendered prompts, resolved models, item counts) | Absent                                   | Detail panels fall back to blueprint sections (this is exactly what commit 966a39f hardened)             |
| Per-node `status`                                                 | Placeholder                              | See "Status" below                                                                                       |
| Batch fan-out × mock-list-length                                  | One representative branch                | Arguably better for display; can badge "×N" later                                                        |
| Condition: dry runs _all_ outcomes                                | Same — all outcomes shown                | No divergence (and static can additionally label edges with outcome values, which the tracer never does) |
| Elaborated view (`preliminary_text` expansion)                    | As-authored view                         | Divergence by design; see open questions                                                                 |

## The all-TypeScript pipeline

```
.mthds TOML text
  → parse TOML              smol-toml (proven in mthds-js, isomorphic, zero-dep)
  → blueprint-shaped object lenient narrowing; TS types generated from mthds_schema.json
  → static walk             the algorithm below
  → GraphSpec               meta.mode = "static"
  → GraphViewer             unchanged
```

### Browser or server? Both — it's a pure library

The whole pipeline is pure computation: TOML string in, GraphSpec object out. No file system, no network. Code like that is _isomorphic_ — it runs identically in the browser and in Node.js — so "server-side vs browser-side" is not an architecture decision for the library; it's a call-site decision made per consumer:

- **pipelex-app**: browser-side, re-rendering the graph instantly as the build chatbot edits the `.mthds` text — no round trip.
- **vscode-pipelex**: in the TS extension host, rendering method graphs with zero backend — a consumer the Python path could never serve cheaply.
- **hub**: server-side (Next.js) at publish/render time for pre-rendered method previews.
- **mthds-ui itself**: at test/story time, generating fixture graphs with no CLI and no gateway key.

The one discipline this requires: the core module accepts TOML **strings**, never file paths. Any `node:fs` usage (as in mthds-js's current bundle scanner) stays at the caller's edge.

### Where the code lives

| Option                                             | For                                                                                                                                                             | Against                                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1. Incubate in mthds-ui (own pure entry point)     | Fastest play loop: fixture bundles, dry-run GraphSpecs, Storybook, and the parity vitest suite all live here. No cross-repo friction while the design is fluid. | A rendering library takes on language parsing — a layering violation if it stays.     |
| 2. mthds-js from day one                           | The architecturally correct home: parsing MTHDS is language-level (MTHDS brand), and `smol-toml` + `[pipe.*]` scanning precedent already exist there.           | Cross-repo iteration overhead exactly when the design needs rapid iteration.          |
| 3. Incubate in mthds-ui, extract to mthds-js later | Both of the above, sequenced.                                                                                                                                   | Requires the discipline to actually extract (pure module, no `@graph/react` imports). |

**Recommendation: option 3.** Build it as a self-contained pure module in mthds-ui (its own entry point, like `shiki/` — no React, no imports from the rendering layer except shared types), play with it in Storybook, and extract to mthds-js once the shape stabilizes. The pure-module discipline makes the extraction mechanical.

### Output format: GraphSpec

The builder emits a `GraphSpec` (with `meta.mode = "static"`), not mthds-ui's internal `GraphNode`/`GraphEdge` types. Three reasons: `GraphViewer` needs zero changes; the output stays consumable by anything that already speaks GraphSpec; and — decisive for testing — it makes the parity harness possible, because the dry-run side of the comparison is also a GraphSpec.

### Lenient parsing, schema as reference contract

Best-effort rendering of half-written methods is the point, so the builder must **not** hard-validate input at runtime. Follow the `validateGraphSpec` house pattern: hand-rolled narrowing that tolerates missing/partial sections and skips what it can't interpret (collecting non-fatal notes for diagnostics).

> **Decision (checkpoint 1a): no codegen.** An earlier draft proposed generating TS types from `mthds_schema.json` (e.g. via `json-schema-to-typescript`). Implementation showed the parsed shape should not be the authoring shape at all: the parser normalizes each `[pipe.*]` table straight into the `PipeBlueprintUnion` registry shapes that already exist in `src/graph/types.ts` (`steps` → `sequential_sub_pipes`, `model` → choice strings, `prompt` → `TemplateBlueprint`, …), so parsed pipes can feed a GraphSpec `pipe_registry` verbatim and no second type universe exists to generate. `mthds_schema.json` is checked in under `data/schema/` (`make schema-refresh` re-copies it from `pipelex/derived/`) as the human/agent reference contract for the authoring surface; codegen is reconsidered only if drift actually bites. The schema-sync mechanism (checked-in copy vs published artifact) stays an open question.

## The static graph algorithm

The builder walks pipe _invocations_, not pipe definitions: the same `pipe_code` referenced from two steps yields two nodes. The walk maintains a **scope** — the static mirror of working memory: a map `name → stuff` where a stuff is `{digest, name, concept, multiplicity}`.

### Identity scheme (deterministic)

- **Node id** = invocation path: the root is the target pipe ref (e.g. `screening.process_cv`), children append the structural position — `…/step_2`, `…/branch_1`, `…/outcome_urgent`, `…/default`, `…/batch_branch`. Stable across runs, mostly stable across edits, human-readable in snapshots.
- **Stuff digest** = the raw string `<producer_node_id>:<variable_name>`. Method-level external inputs use the pseudo-producer `input`, i.e. `input:<name>`. **Decision (checkpoint 1b):** the sha1 truncation the first draft proposed was dropped — the UI treats digests as opaque unique keys, and the raw string is collision-free by construction, dependency-free (no crypto in the browser path), and human-readable in snapshots. Deterministic digests end the snapshot re-baselining churn and give consumers stable node identity for layout caching.
- **Edge id** = `static:edge_<n>` in emission order. The `static:` namespace is load-bearing: the rendering pipeline synthesizes its own dataflow edges named `edge_<n>` (`graphBuilders.ts`), so bare `edge_<n>` GraphSpec ids collide in the ReactFlow key space (React then silently drops edges — found visually at checkpoint 1b).

### Walk

`build(pipe_ref, scope, parent_node_id) → node`:

1. Resolve `pipe_ref` to its parsed pipe entry (bare → current bundle → same-domain bundles; `domain.code` → package domain; `alias->…` → dependency exports — the resolution rules from the spec's namespace-resolution section).
2. Emit the pipe node: `kind` (controller vs operator, from the `type` value), `pipe_type` = `type`, `pipe_code`, `description`, `domain_code`. Emit a `contains` edge from `parent_node_id` when there is one.
3. **Bind inputs:** for each declared input name of the pipe, look it up in `scope` using dotted-prefix matching (`a.b` is satisfied by a binding for `a`). Found → attach that stuff (its digest) to the node's `io.inputs`. Not found → this is a _dangling_ input: mint an input stuff (digest `input:<name>`) with the declared concept and write it into the scope; at the method root these are exactly the method's external inputs, and the UI already classifies producer-less stuff as role `input`. **Scope model (checkpoint 1c):** working memory is ONE flat namespace shared across the run (verified against dry fixtures — a result produced inside a nested sub-sequence is consumed by a later step of an ancestor sequence). Sequence steps see and mutate the caller's scope *object*; parallel/batch branches and condition outcome children each get a *copy* — branches because the runtime forks memory per branch and merges back only declared outputs, condition outcomes because they are mutually exclusive alternatives.
4. **Recurse per controller type:**
   - **PipeSequence** — steps run against the caller's scope object (shared working memory, see step 3). For each step in order: recurse into `step.pipe`; bind the child's output stuff into scope under `step.result` (when set). A step with `batch_over`/`batch_as` becomes a **synthetic PipeBatch node** (`<pipe>_batch`, "Batch processing for <pipe>", registered in `pipe_registry`) wrapping the invoked pipe — **decision (checkpoint 1b):** this mirrors the runtime, which materializes exactly this controller for inline batching (verified against the pipeline_08 dry fixture), rather than the edge-only wrapping an earlier draft proposed. The sequence's own output = the last producing step's stuff, **same digest** (see "controller transparency").
   - **PipeParallel** — recurse into every branch, each with its own *copy* of the inherited scope (branches are independent). `add_each_output` → each branch's output binds under its `result` in the enclosing sequence's scope. `combined_output` → mint a combined stuff (concept = the parallel's declared output) and emit `parallel_combine` edges from each branch's output stuff to it; the combined stuff is the controller's output. Without `combined_output`, the controller's `io.outputs` carries **all** branch outputs (same digests — matches the dry tracer) under their branch slot names, and the primary output (what a `result` binds to) is the last producing branch's stuff.
   - **PipeCondition** — one child per distinct *target pipe*, not per outcome value (checkpoint 1c, mirrors the runtime tracer): outcomes routing to the same pipe — typically one value plus `default_outcome` — merge into a single child whose `tags.outcome` / `contains`-edge label carries all routing values joined with `" | "` (skip `fail`/`continue` — outcome actions, not pipe refs; the default route is tracked as a flag so an authored outcome value literally named "default" cannot collide with the synthetic `/default` id segment). Each child recurses with a *copy* of the inherited scope (mutually exclusive alternatives), and every child carries the condition invocation's `result` as its output stuff name (the runtime stores whichever branch runs under that slot name). The controller's representative output = the default route's stuff when present, else the first producing outcome's.
   - **PipeBatch** — the list input is `inputs[input_list_name]`. Mint one item stuff for `input_item_name` (element concept of the list), emit a `batch_item` edge (source digest = list stuff, target digest = item stuff), recurse **once** into `branch_pipe_code` with the item bound, then emit a `batch_aggregate` edge from the branch's output stuff to the batch's minted output-list stuff. One representative branch, not N. Stuff-name fallback everywhere: when no `result` names an output, the name is `snake_case(concept code)` (the runtime's fallback, verified against dry fixtures).
   - **Operators** — leaf: mint the output stuff from the declared `output` concept (honoring the invoking step's `nb_output`/`multiple_output` override), attach to `io.outputs`.
5. **Controller transparency:** mthds-ui's analysis only takes producers/consumers from non-controller nodes, mirroring the runtime where a controller's output _is_ its last child's Stuff (same `stuff_code`). The static builder must do the same: a controller's `io.outputs` carries the digest minted by its internal producing operator, never a fresh one, so downstream consumers wire straight to the real producer.
6. **Cycle guard:** track the pipe-ref stack during recursion; on a cycle, stop expansion and render the repeated reference as a leaf node (same treatment as opaque refs below).

### Edge cases and policies

- **PipeSignature:** render as a leaf node from its declared IO contract. (The dry run also handles signatures — it executes them and generates contract-shaped mock output — so this is parity, not a static-only differentiator.) Needs a `pipe_type` the UI accepts; see UI adjustments.
- **No elaboration:** the static path renders the method as authored — a `preliminary_text` PipeLLM stays one node. If mirroring the runtime's expanded view ever matters, the rewrite rule is small enough to add behind a flag; default is as-authored.
- **Cross-package references:** phase 1 renders a pipe from a dependency as an opaque leaf card built from whatever the reference tells us (name, and concept info when the dependency's `.mthds` sources are provided to the builder). Full transitive expansion requires feeding the dependency bundles in — a later decision.
- **Unresolvable references / invalid bundles:** best-effort — emit the referencing node, skip the missing child, never throw. The whole point is rendering WIP methods; validation verdicts are a separate concern (and a separate tool).
- **Multi-file bundles:** same-domain `.mthds` files merge into one namespace. The builder accepts a list of TOML strings and merges before walking; single-string is the trivial case.
- **Unused scope entries:** a `result` no downstream step consumes still gets its stuff node (role `intermediate` with no consumers) — faithful to the method as written.

### Parity harness

**Implemented at checkpoint 1c** (`src/static-graph/__tests__/parityHarness.ts` + `parity.test.ts`): the acceptance test and the permanent drift detector between the TS implementation and the Python runtime's view. The vitest suite runs the TS builder on every fixture bundle in `data/pipelines/pipeline_NN/bundle.mthds` and compares against the checked-in dry-run GraphSpec (`dry_run_graph_spec.json`, the same generator output as `_generated.dry.ts`). No CLI, no gateway key, no Python at test time. **All fixture pipelines match with an empty per-pipeline allowlist.**

Both sides normalize to a canonical structural form, and the comparison runs over exactly what the renderer consumes — node multiset, containment tree (encoded in canonical paths), and the producer/consumer relation per stuff, derived with the renderer's own `buildDataflowAnalysis` (so "producer" means what it means on screen: operators only, never controllers). Normalization rules:

1. **Batch fan-out collapse (dry side).** A dry run expands a PipeBatch into one child per mock list item; every child subtree after the first is dropped. The static side already emits one representative branch.
2. **Id normalization.** Run-scoped node ids and static invocation paths are both replaced by canonical containment paths (`root/child/...` from `pipe_code` segments, `#k` suffix for same-code siblings).
3. **Runtime-field stripping (implicit).** The canonical form only reads structural fields; `timing`, `metrics`, `execution_data`, previews and payloads never enter the comparison.
4. **Elaboration collapse — not implemented.** No fixture bundle uses `structuring_method = "preliminary_text"`, so there is no `__draft_text` expansion in the corpus to collapse. If a future fixture introduces one, parity fails loudly and the rule needs implementing.
5. **Dry-side `concept=Anything` is a wildcard.** The runtime loses the concept on stuff it assembles itself (batch aggregates are typed `Anything` in dry graphs); the static side keeps the declared concept — strictly richer, accepted.

Stuff identity across sides: digests are not comparable (random dry strings vs deterministic static strings), so a stuff is identified by its relation signature — producer path (or none), name, concept, sorted consumer paths — compared as multisets. Harness sensitivity is itself tested (a dropped node or rewired consumer must produce divergences), so the suite cannot pass vacuously.

**Builder semantics the harness forced into alignment with the runtime** (all verified against dry fixtures, landed at 1c):

- **Shared working memory.** Working memory is ONE flat namespace across the run: a result produced inside a nested sub-sequence is visible to later steps of ancestor sequences. Sequence steps now see and mutate the caller's scope object; parallel/batch branches and condition outcome children each get a copy (branches because the runtime forks memory per branch and merges back only declared outputs; condition outcomes because they are mutually exclusive alternatives).
- **Condition slot naming.** The runtime stores whichever branch runs under the condition's own slot name (the invoking step's `result`), and the dry tracer applies it to every branch — so the static walk propagates the condition invocation's `resultName` into all outcome children.
- **Condition outcome dedupe.** One child node per distinct *target pipe*, not per outcome value, mirroring the runtime tracer; outcomes routing to the same pipe (typically one value plus `default_outcome`) merge into a single child whose `tags.outcome` / `contains` label carries all routing values joined with `" | "`.
- **Controller io slot naming.** A controller exposes a transparent output on its own io under the slot name its invocation binds (`ioItem(stuff, slotName)`); the producing operator keeps the local name. Since the UI's stuff registry is first-occurrence-wins and controllers precede their children in node order, the outermost slot alias is what renders — identical on both paths.

**`combined_output` — resolved, with an upstream surprise.** The known question (the dry run registers the _controller_ as the combined stuff's producer, but mthds-ui only takes producers from non-controller nodes) is now pinned by an explicit test: on BOTH paths the combined stuff is producer-less in the analysis, consumed downstream by digest, and fed by `parallel_combine` stuff-to-stuff edges — the renderer handles this correctly; the only quirk is cosmetic (producer-less stuff gets role `input`, so a combined stuff wears an input-style label; a Phase-2 candidate fix in `graphBuilders` role classification, applying equally to dry and static). No fixture bundle could be added to exercise it end-to-end because **pipelex deleted `combined_output` upstream** (pipelex #1014, "PipeParallel always combines: required main stuff invariant", adds `native.Composite`) *after* the fixture corpus was generated: pipelex 0.36.0 rejects the field on authored bundles while the MTHDS spec (`mthds/docs/spec/`) still documents it. Consequences, tracked as follow-up:

- The fixture corpus is pinned to the pre-#1014 pipelex generation. Regenerating it with pipelex ≥ 0.36 will shift every parallel graph to always-combine semantics — a dedicated task that includes adapting the static builder (and possibly `graph/types.ts` blueprint types, see the blueprint-nullability audit note) to the new PipeParallel model.
- `data/schema/mthds_schema.json` (and the mthds spec) still carry `combined_output`; the static builder keeps supporting it — the MTHDS spec is its normative source, and spec-vs-pipelex divergence is an upstream question to settle in the `mthds/` repo, not here.

## GraphSpec mapping decisions

| Field                                                              | Static value                    | Notes                                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `meta.format`                                                      | `"mthds"`                       | Hard validator gate, unchanged                                                                                                                                                                                 |
| `meta.mode`                                                        | `"static"` (new, additive)      | Lets the UI adapt chrome (status dots, run-centric panels) without a new format                                                                                                                                |
| `status`                                                           | `scheduled` on every node       | Semantically honest ("not run"); avoids touching the `PipeStatus` union. Alternative — a new `not_run` status — rejected for now: it ripples through every exhaustiveness map for little gain over `meta.mode` |
| `io[].digest`                                                      | Deterministic scheme above      | The actual wiring mechanism                                                                                                                                                                                    |
| `io[].concept`, `name`, `content_type`                             | From declarations               | `content_type` derivable from native-concept refinement where known                                                                                                                                            |
| `timing`, `error`, `metrics`, `execution_data`, `data*`, `preview` | Absent                          | UI degrades cleanly (verified)                                                                                                                                                                                 |
| `pipe_registry`, `concept_registry`                                | **Populate**                    | Trivial statically — they are the parsed TOML entries — and it's what makes detail panels rich; the dry-run path often ships them empty                                                                        |
| `pipeline_ref`                                                     | `domain`, `main_pipe`           | As today (`entrypoint` omitted)                                                                                                                                                                                |
| `data`-kind edges                                                  | **Not emitted** (checkpoint 1b) | The UI derives dataflow from io digests and ignores `data` edges; emitting them would duplicate the wiring in a second, unconsumed encoding. Revisit only if a non-mthds-ui GraphSpec consumer needs them      |

## UI adjustments in mthds-ui

Strictly required for rendering: **none** — a spec built as above passes `validateGraphSpec` and renders through the existing pipeline untouched. Worth doing anyway:

1. **Static display mode.** When `meta.mode === "static"` (or a `GraphViewer` prop), suppress status dots and run-centric detail rows (timing, metrics, execution-data dump). Small, contained change in `PipeCardBase` / `PipeDetailPanel`.
2. **`PipeSignature` as a known pipe type.** First verify what `pipe_type` the tracer emits today when a dry run executes a signature — if it's already `PipeSignature`, then dry-run graphs containing signatures fail `validateGraphSpec` right now, a pre-existing gap worth fixing regardless of this design. Then add it to the `PipeType` union with its own badge ("Signature") and a visually distinct card treatment (e.g. dashed border) — the exhaustiveness maps in `types.ts`, `PipeCardBase.tsx`, `PipeDetailPanel.tsx` will enforce completeness.
3. **Condition outcome labels.** Static generation knows which outcome value maps to which child (the tracer never emitted this). Surface it — outcome badge on the child card or a labeled edge. Pure win over both dry and live graphs.
4. **Batch multiplicity badge.** A "×N / ×many" tag on the representative batch branch, from the list input's declared multiplicity.
5. **Static fixture catalog.** A third `STATIC_*` catalog next to `DRY_*`/`LIVE_*` in the stories — generated in-repo by the builder itself at test time, no CLI, no gateway key, deterministic snapshots.

## Coexistence: static vs dry vs live

These are three views of one method, on one wire format, through one renderer:

- **Static** — the method as written. Instant, deterministic, best-effort even on broken bundles, computable anywhere TypeScript runs. This is the new, additional view this design introduces; where it earns a place (method pages, build chatbot, hub previews, VS Code) is exactly what the experiment is meant to reveal.
- **Dry** — the method as simulated. Remains the reference display path and `/validate`'s `graph_spec`, unchanged; also the executability check and the preview of realistic fan-out with mock data.
- **Live** — the method as executed, with statuses streaming in. Unchanged. Open follow-up: since node ids differ between a static graph and a run graph, live status overlay onto a static graph needs a mapping (the existing `statusMap` prop keys by `pipe_code`, which already partially decouples this — but repeated invocations of one pipe are ambiguous). Worth a small design pass when we get to "start from static, animate the run".

## Phasing

**Phase 1 — parser + builder, incubated in mthds-ui.** New pure-TS module (own entry point, no React): smol-toml parse, lenient blueprint narrowing with schema-generated types, the walk, GraphSpec output. Parity vitest suite against the checked-in dry-run fixtures. Exit criteria: all fixture bundles produce a GraphSpec that passes `validateGraphSpec` and renders; parity report vs dry-run documented.

> **Checkpoint 1.** Static GraphSpecs render in Storybook next to their dry-run counterparts. Decisions to revisit with real output in hand: `data`-edge emission, `combined_output` parity quirk, elaboration display policy, how `mthds_schema.json` is synced into the repo. Good handoff point.

**Phase 2 — UI adaptations.** `meta.mode` handling, `PipeSignature` support, condition-outcome labels, batch badge, `STATIC_*` fixture catalog.

> **Checkpoint 2.** Static graphs are first-class in Storybook, including a WIP/partially-broken bundle story exercising the best-effort path. Consumer experiments (pipelex-app live re-render, vscode-pipelex, hub previews) can proceed independently per repo, if and when the experiment earns it.

**Phase 3 — extraction to mthds-js.** Once the module shape stabilizes and a second consumer wants it, move the parser+builder to mthds-js (language-level home; `smol-toml` already there); mthds-ui goes back to being a pure renderer that depends on it. The parity harness moves with it.

## Open questions

1. **Elaboration display policy** — as-authored (proposed default) vs mirroring the runtime's `preliminary_text` expansion behind a flag. Affects parity normalization either way.
2. **How `mthds_schema.json` reaches this repo** for type generation: checked-in copy refreshed by a script (simple, drifts silently) vs published artifact from pipelex releases (correct, more plumbing).
3. **Cross-package expansion depth** — opaque leaf (proposed), or accept dependency bundle sources as extra inputs and expand. Interacts with graph size for hub-published methods.
4. **Live-status overlay on static graphs** — is `pipe_code`-keyed `statusMap` good enough short-term, or do we need the run to echo static invocation paths? (The latter suggests the runtime tracer could _adopt_ the static id scheme, which would also make dry/live graphs deterministic — attractive but a bigger change.)
5. **Extraction trigger for mthds-js** — what concretely gates the move (second consumer? API freeze? first release?), so incubation doesn't become the permanent home by inertia.
