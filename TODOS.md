# Static Method Graph — Implementation TODOs

Design doc: [`wip/static-graph-design.md`](wip/static-graph-design.md). Branch: `feature/Static-graph`.

Goal: an all-TypeScript static graph builder — `.mthds` TOML text in, `GraphSpec` (`meta.mode: "static"`) out — incubated in this repo as a pure module, rendered by the existing `GraphViewer` untouched. No Python anywhere in the path.

## Checkpoint ritual (mandatory — the agent MUST stop at every checkpoint)

At each `CHECKPOINT` below, before starting the next phase:

1. **Verify progress.** `make check && make test` green. If the phase touched graph rendering or stories, visually verify in Storybook (`make storybook`, port 6006) using the `/browse` skill — multiple pipelines, including complex ones (CV screening, nested controllers, wide parallels). Do not claim visual behavior works from tests alone.
2. **Update this file and linked docs for cold start.** Tick completed boxes; record decisions taken, open questions, deviations from plan, and the exact current state of the code (what exists, what's stubbed, what's failing) in the "Cold-start notes" section at the bottom — enough that a fresh session can resume efficiently without re-deriving context. Update `wip/static-graph-design.md` if the design shifted, and the repo `docs/` for shipped surfaces.
3. **Fan out `/code-review`.** Spawn a **Sonnet-5 sub-agent with NO inherited context** (fresh agent, not a fork) to run the `/code-review` skill on the phase's changes. Hand it **only a pointer to the changes under review** — the phase's commit SHA, a `git diff <base>..HEAD` range, or the working-tree file list — never the plan, the design rationale, or your own conclusions. Review goal: clean, solid software — flag over-engineering as readily as bugs. Triage the findings yourself (fix confirmed correctness issues; push back on speculative complexity), then re-run step 1.
4. **Commit** the phase (house rule: never merge a PR without explicit confirmation; committing and pushing the branch is fine).

## Phase 1a — module scaffolding + TOML → blueprint parsing

New pure-TS module, its own entry point (like `shiki/`): no React, no imports from `graph/react/`. Proposed layout: `src/static/` with `toml` parsing, blueprint narrowing, and the builder; barrel at `src/static/index.ts`.

- [ ] Add `smol-toml` to `dependencies` (isomorphic, zero-dep; already proven in mthds-js)
- [ ] Create `src/static/` entry point: tsup entry + declarations, path alias if needed (follow the `@graph/*` pattern), barrel export
- [ ] Check in a copy of `mthds_schema.json` (from `pipelex/derived/`) under `data/schema/`, with a `make schema-refresh` target that re-copies it — reference contract, not a runtime dependency
- [ ] **Reuse, don't duplicate, blueprint types**: the `Pipe*Blueprint` / `PipeBlueprintUnion` types already exist in `src/graph/types.ts` (pipe_registry payloads). The parsed-TOML shape should narrow to these. Only add what's missing (bundle-level shape: `domain`, `description`, `main_pipe`, `concept` map, `pipe` map). No codegen unless drift actually bites (record decision if that changes)
- [ ] `parseMthdsBundle(tomlText: string): { bundle: ParsedBundle; diagnostics: Diagnostic[] }` — smol-toml parse + **lenient** narrowing in the `validateGraphSpec` house style: tolerate missing/partial sections, skip what can't be interpreted, collect non-fatal diagnostics, never throw on content (only on unparseable TOML — and even that becomes a diagnostic at the API boundary)
- [ ] `mergeBundles(bundles: ParsedBundle[]): MergedMethodSet` — same-domain namespace merge (duplicate codes → diagnostic, keep-first)
- [ ] Unit tests co-located in `src/static/__tests__/`: happy path, empty/garbage TOML, partial pipes, duplicate codes, dotted input names, multiplicity suffix parsing (`Concept`, `Concept[]`, `Concept[N]`, `domain.Concept`)

### CHECKPOINT 1a — parser lands

- [ ] Ritual steps 1–4 (no Storybook check needed yet — pure logic only)
- [ ] Cold-start notes updated: parser API surface frozen enough to build on? open naming questions resolved (`src/static/` vs `src/mthds/`)?

## Phase 1b — the static walk: blueprint → GraphSpec

The algorithm as specified in the design doc ("The static graph algorithm"). Pure functions, no React.

- [ ] Identity scheme: invocation-path node ids (`screening.process_cv/step_2/…`), deterministic stuff digests (`sha1(producer_node_id + ":" + name)[:8]`; external inputs `sha1("input:" + name)`)
- [ ] Reference resolution: bare → current bundle → same-domain; `domain.code` → package domain; `alias->…` → **opaque leaf card** (phase-1 policy)
- [ ] Scope-based input binding with dotted-prefix matching (`a.b` satisfied by binding for `a`); dangling input → minted input stuff (UI classifies producer-less stuff as role `input`)
- [ ] Controller recursion:
  - [ ] PipeSequence — ordered steps, `result` binding, inline `batch_over`/`batch_as` (item stuff + `batch_item`/`batch_aggregate` edges)
  - [ ] PipeParallel — all branches, `add_each_output` bindings, `combined_output` stuff + `parallel_combine` edges
  - [ ] PipeCondition — all outcomes + `default_outcome` (skip `fail`/`continue`), `add_alias_from_expression_to` binding; record outcome value per child for later UI use
  - [ ] PipeBatch — one representative branch, `batch_item` edge (list → item), `batch_aggregate` edge (branch output → output list)
  - [ ] Operators — leaf output stuff from declared `output` concept, honoring the invoking step's `nb_output`/`multiple_output` override
- [ ] **Controller transparency**: a controller's `io.outputs` carries its internal producing operator's digest, never a fresh one (the UI only takes producers from non-controller nodes)
- [ ] Cycle guard: repeated pipe-ref on the recursion stack → render as leaf, stop expansion
- [ ] Policies from the design doc: no elaboration (as-authored), best-effort on unresolvable refs (emit referencing node, skip missing child, never throw), unused `result`s still get stuff nodes, PipeSignature as leaf (pipe_type handling deferred to Phase 2 — exclude signature bundles from validation-dependent tests until then)
- [ ] GraphSpec assembly: `meta.format: "mthds"`, `meta.mode: "static"`, `status: "scheduled"` on all nodes, `pipeline_ref`, populated `pipe_registry`/`concept_registry` from parsed entries, `contains` edges; decide and record whether to also emit `data` edges (UI ignores them)
- [ ] Output must pass `validateGraphSpec` — direct test
- [ ] Unit tests: minimal bundle, each controller type, nesting, cycles, dangling inputs, opaque cross-package ref, repeated invocation of the same pipe code (two nodes, distinct digests)

### CHECKPOINT 1b — builder lands (natural handoff point)

- [ ] Ritual steps 1–4, including first Storybook smoke: one dev story feeding a built-from-TOML spec (`?raw` import of a fixture bundle) into `GraphViewer`, visually verified via `/browse`
- [ ] Cold-start notes updated: builder API frozen, known rendering gaps listed

## Phase 1c — parity harness against dry-run fixtures

The acceptance test and permanent Python↔TS drift detector. No Python at test time — the Python side is already checked in.

- [ ] Vitest suite: run the builder on every `data/pipelines/pipeline_NN/bundle.mthds`, compare against the corresponding `_generated.dry.ts` GraphSpec
- [ ] Normalization layer (documented rules): map ids by invocation structure, collapse dry-run batch fan-out (3 branches) to one, collapse elaboration expansion (`<code>__draft_text` + synthetic PipeStructure → authored PipeLLM), strip runtime fields
- [ ] Comparison over: node multiset, containment tree, producer/consumer relation per stuff
- [ ] Explicitly verify the `combined_output` case — the dry run registers the _controller_ as producer while the UI only accepts non-controller producers; if this exposes a real rendering quirk, document it here and (if the root cause is in pipelex) write a bugfix brief in `pipelex/wip/` — do not edit the pipelex repo
- [ ] Document any legitimate, accepted divergences in `wip/static-graph-design.md`

### CHECKPOINT 1c — parity proven

- [ ] Ritual steps 1–4
- [ ] Cold-start notes: parity report summary (which pipelines match, which diverge and why)

## Phase 2 — UI adaptations

Rendering works without any of this; these make static graphs first-class.

- [ ] `meta.mode === "static"` display mode: suppress status dots and run-centric detail rows (timing, metrics, execution-data dump) in `PipeCardBase` / `PipeDetailPanel`; `validateGraphSpec` accepts the new meta field
- [ ] `PipeSignature` as a known `pipe_type`: add to the `PipeType` union + badge + distinct card treatment (dashed border); let the exhaustiveness maps in `types.ts`, `PipeCardBase.tsx`, `PipeDetailPanel.tsx` drive completeness. First check what the pipelex tracer emits for signatures in dry runs — if dry-run graphs with signatures already fail `validateGraphSpec`, write a brief in `pipelex/wip/` (pre-existing gap, cross-repo)
- [ ] Condition outcome labels: surface the outcome value recorded per child (badge on child card or labeled edge)
- [ ] Batch multiplicity badge: "×N / ×many" on the representative branch, from the list input's declared multiplicity
- [ ] `STATIC_*` fixture catalog next to `DRY_*`/`LIVE_*`: generated in-repo by the builder at story/test time from the `.mthds` bundles (`?raw` imports) — no CLI, no gateway key
- [ ] Stories: static vs dry side-by-side for a few pipelines; a WIP/partially-broken bundle story exercising the best-effort path; a signatures story
- [ ] Snapshot tests over static specs (deterministic ids — these should never need re-baselining)
- [ ] Repo docs: add `docs/static-graph.md` (module purpose, API, policies, parity harness); update `CLAUDE.md` project structure + `README.md` if the public entry point ships

### CHECKPOINT 2 — static graphs first-class (natural handoff point)

- [ ] Ritual steps 1–4 — the Storybook visual pass here is the big one: all static stories at multiple pipelines, plus confirm dry/live stories are unregressed
- [ ] Cold-start notes: feature state summary; remaining open questions from the design doc resolved or re-confirmed (elaboration policy, `data`-edge emission, schema sync mechanism)
- [ ] Decide with the user: release now (`/release`) or continue to consumer experiments

## Phase 3 — extraction & rollout (gated, not started without explicit go)

- [ ] Extraction to mthds-js once the module shape stabilizes and a second consumer wants it (parity harness moves with it); mthds-ui returns to pure renderer
- [ ] Consumer experiments, each in its own repo: pipelex-app live re-render while the build chatbot edits; vscode-pipelex zero-backend rendering; hub server-side previews

## Cold-start notes

_Updated at every checkpoint. A fresh session should be able to resume from here + the design doc alone._

- **Current state:** nothing implemented yet — design doc complete (`wip/static-graph-design.md`), plan written, no code changes on the branch.
- **Decisions taken so far:** all-TS path (no Python utilities anywhere); incubate in mthds-ui, extract to mthds-js later; output = GraphSpec with `meta.mode: "static"`; lenient runtime parsing, schema as reference contract only; no elaboration (as-authored display); deterministic invocation-path ids + hashed digests; batch = one representative branch; statuses = `scheduled`.
- **Open questions (tracked in design doc):** elaboration display flag, schema sync mechanism, cross-package expansion depth, live-status overlay mapping, mthds-js extraction trigger.
