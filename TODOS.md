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

New pure-TS module, its own entry point (like `shiki/`): no React, no imports from `graph/react/`. Layout: `src/static-graph/` with `toml` parsing, blueprint narrowing, and the builder; barrel at `src/static-graph/index.ts`.

- [x] Add `smol-toml` to `dependencies` (isomorphic, zero-dep; already proven in mthds-js)
- [x] Create `src/static-graph/` entry point: tsup entry + declarations, path alias if needed (follow the `@graph/*` pattern), barrel export
- [x] Check in a copy of `mthds_schema.json` (from `pipelex/derived/`) under `data/schema/`, with a `make schema-refresh` target that re-copies it — reference contract, not a runtime dependency
- [x] **Reuse, don't duplicate, blueprint types**: the `Pipe*Blueprint` / `PipeBlueprintUnion` types already exist in `src/graph/types.ts` (pipe_registry payloads). The parsed-TOML shape should narrow to these. Only add what's missing (bundle-level shape: `domain`, `description`, `main_pipe`, `concept` map, `pipe` map). No codegen unless drift actually bites (record decision if that changes)
- [x] `parseMthdsBundle(tomlText: string): { bundle: ParsedBundle; diagnostics: Diagnostic[] }` — smol-toml parse + **lenient** narrowing in the `validateGraphSpec` house style: tolerate missing/partial sections, skip what can't be interpreted, collect non-fatal diagnostics, never throw on content (only on unparseable TOML — and even that becomes a diagnostic at the API boundary)
- [x] `mergeBundles(bundles: ParsedBundle[]): MergedMethodSet` — same-domain namespace merge (duplicate codes → diagnostic, keep-first)
- [x] Unit tests co-located in `src/static-graph/__tests__/`: happy path, empty/garbage TOML, partial pipes, duplicate codes, dotted input names, multiplicity suffix parsing (`Concept`, `Concept[]`, `Concept[N]`, `domain.Concept`)

### CHECKPOINT 1a — parser lands

- [x] Ritual steps 1–4 (no Storybook check needed yet — pure logic only)
- [x] Cold-start notes updated: parser API surface frozen enough to build on? open naming questions resolved (`src/static-graph/` vs `src/mthds/`)?

## Phase 1b — the static walk: blueprint → GraphSpec

The algorithm as specified in the design doc ("The static graph algorithm"). Pure functions, no React.

- [x] Identity scheme: invocation-path node ids (`screening.process_cv/step_2/…`), deterministic stuff digests (**raw strings** `<producer_node_id>:<name>`; external inputs `input:<name>` — sha1 dropped, see design doc)
- [x] Reference resolution: bare → current bundle → same-domain; `domain.code` → package domain; `alias->…` → **opaque leaf card** (phase-1 policy)
- [x] Scope-based input binding with dotted-prefix matching (`a.b` satisfied by binding for `a`); dangling input → minted input stuff (UI classifies producer-less stuff as role `input`)
- [x] Controller recursion:
  - [x] PipeSequence — ordered steps, `result` binding, inline `batch_over`/`batch_as` (materialized as a synthetic PipeBatch node `<pipe>_batch`, mirroring the runtime)
  - [x] PipeParallel — all branches, `add_each_output` bindings, `combined_output` stuff + `parallel_combine` edges
  - [x] PipeCondition — all outcomes + `default_outcome` (skip `fail`/`continue`), `add_alias_from_expression_to` binding; outcome value recorded per child (`tags.outcome` + `contains` edge label)
  - [x] PipeBatch — one representative branch, `batch_item` edge (list → item), `batch_aggregate` edge (branch output → output list)
  - [x] Operators — leaf output stuff from declared `output` concept, honoring the invoking step's `nb_output`/`multiple_output` override
- [x] **Controller transparency**: a controller's `io.outputs` carries its internal producing operator's digest, never a fresh one (the UI only takes producers from non-controller nodes)
- [x] Cycle guard: repeated pipe-ref on the recursion stack → render as leaf, stop expansion
- [x] Policies from the design doc: no elaboration (as-authored), best-effort on unresolvable refs (emit referencing node, skip missing child, never throw), unused `result`s still get stuff nodes, PipeSignature as leaf (renders today — `PipeSignature` is already in `KNOWN_PIPE_TYPES`; the distinct card treatment stays Phase 2)
- [x] GraphSpec assembly: `meta.format: "mthds"`, `meta.mode: "static"`, `status: "scheduled"` on all nodes, `pipeline_ref`, populated `pipe_registry`/`concept_registry` from parsed entries, `contains` edges; **decision: no `data` edges** (UI ignores them — recorded in design doc)
- [x] Output must pass `validateGraphSpec` — direct test
- [x] Unit tests: minimal bundle, each controller type, nesting, cycles, dangling inputs, opaque cross-package ref, repeated invocation of the same pipe code (two nodes, distinct digests)

### CHECKPOINT 1b — builder lands (natural handoff point)

- [x] Ritual steps 1–4, including first Storybook smoke: one dev story feeding a built-from-TOML spec (`?raw` import of a fixture bundle) into `GraphViewer`, visually verified via `/browse`
- [x] Cold-start notes updated: builder API frozen, known rendering gaps listed

## Phase 1c — parity harness against dry-run fixtures

The acceptance test and permanent Python↔TS drift detector. No Python at test time — the Python side is already checked in.

- [x] Vitest suite: run the builder on every `data/pipelines/pipeline_NN/bundle.mthds`, compare against the corresponding dry-run GraphSpec (`dry_run_graph_spec.json` — same generator output as `_generated.dry.ts`, no React-side import needed)
- [x] Normalization layer (documented rules): map ids by invocation structure, collapse dry-run batch fan-out to one branch, strip runtime fields (elaboration collapse documented as not-implemented — no fixture uses `preliminary_text`, parity fails loudly if one appears)
- [x] Comparison over: node multiset, containment tree, producer/consumer relation per stuff (via the renderer's own `buildDataflowAnalysis`)
- [x] Explicitly verify the `combined_output` case — pinned by a direct test (producer-less on both paths, `parallel_combine` stuff-edges carry the dataflow, renderer handles it; cosmetic role-`input` quirk noted for Phase 2). End-to-end fixture impossible: pipelex deleted `combined_output` upstream (#1014) after the corpus was generated — see design doc
- [x] Document any legitimate, accepted divergences in `wip/static-graph-design.md`

### CHECKPOINT 1c — parity proven

- [x] Ritual steps 1–4
- [x] Cold-start notes: parity report summary (which pipelines match, which diverge and why)

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

_Checkpoint 1c (2026-07-04) — Phase 1c complete._

- **Parity report: every fixture pipeline matches its dry-run GraphSpec with an EMPTY per-pipeline allowlist** (`ACCEPTED_DIVERGENCES = {}` in `src/static-graph/__tests__/parity.test.ts`). The only standing lenient rule is corpus-wide, not per-pipeline: dry-side `concept=Anything` is a wildcard (the runtime types batch aggregates as `Anything`; the static side keeps the declared concept — richer, accepted). Full normalization rules live in the `parityHarness.ts` header and the design doc's "Parity harness" section.
- **Harness shape:** `parityHarness.ts` (test-only helper) exports `collapseBatchFanOut`, `canonicalizeGraph`, `compareParity`. Canonical node identity = containment paths from `pipe_code` segments (`#k` suffix for same-code siblings); stuff identity = relation signature (producer path, name, concept, sorted consumer paths) computed with the renderer's own `buildDataflowAnalysis`; signatures compared as multisets, divergences returned as readable lines. Dry side loads `data/pipelines/pipeline_NN/dry_run_graph_spec.json` via fs — no React-side imports. Sensitivity is self-tested (dropped node / rewired consumer must diverge; batch collapse proven on the batch fixture).
- **Builder semantics changed at 1c to match the runtime** (all four verified against dry fixtures, behavior-tested in `buildStaticGraphSpec.test.ts` under "Runtime-parity semantics"): (1) shared working memory — sequence steps mutate the caller's scope object (so nested sub-sequence results are visible to later ancestor steps) while parallel/batch branches and condition outcome children get copies; (2) condition children all carry the condition invocation's `resultName` as their output stuff name; (3) condition outcomes dedupe by _target pipe_ — outcomes routing to the same pipe (incl. `default_outcome`) merge into one child node, `tags.outcome`/edge label = values joined with `" | "`, id = `outcome_<first value>` (or `/default` if default-only); (4) controller io exposes transparent outputs under the invoking slot name (`ioItem(stuff, slotName)`) while leaves keep local names — first-occurrence-wins in the UI registry then renders the outermost alias, same as dry.
- **`combined_output` finding (upstream surprise):** pipelex deleted `combined_output` in #1014 ("PipeParallel always combines", adds `native.Composite`) — the installed pipelex 0.36.0 _rejects_ the field on authored bundles, while the MTHDS spec and `data/schema/mthds_schema.json` still document it. So no end-to-end fixture is possible; the semantics are pinned by a direct test in `parity.test.ts` instead (combined stuff is producer-less on both paths, consumed by digest, fed by `parallel_combine` stuff-edges). Cosmetic quirk for Phase 2: producer-less stuff is role-classified `input` in `graphBuilders.ts`, so combined stuff wears an input-style label (applies to dry too).
- **Fixture corpus is pinned to the pre-#1014 pipelex generation.** Regenerating with pipelex ≥ 0.36 will shift every parallel graph to always-combine semantics — a dedicated follow-up task (regenerate corpus + adapt builder + re-verify stories), do NOT casually run `make fixtures`. Related: `.pipelex/pipelex.toml` was stripped of config sections pipelex 0.36.0 rejects (`temporal`, `cogt.tenacity_config`, `tracing_config.temporal_dynamodb`) so the CLI can run at all in this repo.
- **Phase 2 not started.** Rendering gaps carried over from 1b (status dots, outcome labels, batch badge) plus the new role-`input` quirk above.

_Checkpoint 1b (2026-07-03) — Phase 1b complete._

- **Current state:** the static walk exists and is visually verified. `src/static-graph/buildStaticGraphSpec.ts` exports `buildStaticGraphSpec(mergedSet, options?)` and `buildStaticGraphSpecFromToml(tomlText | tomlText[], options?)`, both returning `{ spec, diagnostics }`; barrel-exported with `StaticGraphOptions` / `StaticGraphResult`. Every fixture bundle in `data/pipelines/` builds a validator-clean, deterministic GraphSpec (sweep test `buildFixtureGraphs.test.ts` asserts zero error diagnostics + build-twice equality). Behavior tests in `buildStaticGraphSpec.test.ts` cover all controller types, nesting, cycles, best-effort paths, entry selection, multi-domain refs. Dev stories under `Graph - static/Valid` feed `?raw` bundle imports through the builder into `GraphViewer` — CV screening, batch, condition, deep nesting, plus a WIP/broken inline bundle; all of them visually verified via /browse, no console errors, and static CV screening lays out identically to its dry-run counterpart (status dots aside). `src/mthds-raw.d.ts` declares the `*.mthds?raw` module type. Phase 1c (parity harness) not started.
- **Builder API considered frozen for 1c:** node ids = invocation paths (`domain.code`, `…/step_N`, `…/branch_N`, `…/outcome_<value>`, `…/default`, `…/batch_branch`); stuff digests = raw `producer_node_id:name` / `input:name`; edge ids = `static:edge_<n>`.
- **Decisions taken at 1b** (recorded in the design doc):
  - Digests are raw strings, not sha1 — collision-free, readable, no crypto dependency.
  - Inline `batch_over` steps materialize a synthetic PipeBatch node (`<pipe>_batch`, "Batch processing for <pipe>", registered in `pipe_registry`) — mirrors the runtime (verified against the pipeline_08 dry fixture), not the edge-only wrapping the design first sketched.
  - No `data` edges emitted — the UI ignores them; revisit only for non-mthds-ui consumers.
  - Stuff-name fallback when no `result` names an output: `snake_case(concept code)` (runtime behavior, verified against dry fixtures).
  - Condition representative output = default branch, else first producing outcome; parallel without `combined_output` exposes all branch outputs and binds the last as primary.
  - Edge ids MUST be namespaced (`static:edge_<n>`): bare `edge_<n>` collides with the renderer's synthesized dataflow edge ids (`graphBuilders.ts`) — React silently dropped edges (found visually: missing `exit_combine → final` edge, duplicate-key console errors).
  - `PipeSignature` already passes validation (it's in `KNOWN_PIPE_TYPES`); opaque `alias->…` leaves reuse it as their `pipe_type`. Entry selection: explicit `entryPipe` option > `main_pipe` > unreferenced-root heuristic (warning diagnostic).
- **Code-review triage at 1b** (fresh Sonnet sub-agent, /code-review on the working tree): fixed (1) same-named dangling inputs share one `input:<name>` stuff by design (one missing working-memory entry), but a concept conflict between their declarations now emits a `conflicting-input-concept` warning instead of silently keeping the first; (2) repeated inline batches over the same pipe get distinct registry entries (`x_batch`, `x_batch_2`, …) — the detail panel resolves blueprints by `domain.pipe_code`, so a shared key showed the first invocation's `batch_params` on every node; identical repeats still reuse one entry; (3) an inline batch over a dependency-alias ref (`helpers->clean`) now strips the alias from the synthetic code (`clean_batch`, not `helpers->clean_batch`); (4) de-hardcoded a story count in these notes. All four accepted — no push-backs this round.
- **Known rendering gaps (Phase 2 material):** status dots show on static cards (no `meta.mode` handling yet); condition outcome labels (`tags.outcome`, `contains` label) not surfaced by the UI; no batch ×N badge; signature cards already render with a dashed treatment via the existing PipeSignature support.

_Checkpoint 1a (2026-07-03) — Phase 1a complete._

- **Current state:** Phase 1a landed. `src/static-graph/` exists as its own pure-TS entry point (`@pipelex/mthds-ui/static-graph` export, `@static-graph/*` alias wired in tsconfig/tsup/vitest/storybook, tsup entry + dts). Module contents: `types.ts` (Diagnostic, ParsedBundle, MergedMethodSet, narrowing helpers), `conceptRefs.ts` (concept-ref parsing + resolution + native concept catalog), `normalizePipe.ts` (authored TOML shape → `PipeBlueprintUnion` registry shape, per pipe type), `parseMthdsBundle.ts` (smol-toml parse + lenient narrowing, never throws — even TOML parse errors become `error` diagnostics), `mergeBundles.ts` (per-domain namespace merge, keep-first duplicates, cross-file concept enrichment). Tests in `src/static-graph/__tests__/` including a sweep that parses every `data/pipelines/pipeline_NN/bundle.mthds` with zero error diagnostics. Static module coverage ~99% stmts / ~93% branches; `make check && make test` green. Nothing of Phase 1b exists yet (no walk, no GraphSpec output).
- **Decisions taken at 1a:**
  - Module named `src/static-graph/` (`src/mthds/` rejected — the parser moves to mthds-js in Phase 3 anyway).
  - **Parsed pipes normalize all the way to the runtime registry shapes** (`PipeBlueprintUnion` from `@graph/types`) at parse time — `steps` → `sequential_sub_pipes`, `model` → `llm_choices`/`*_choice` strings, `prompt` → `TemplateBlueprint`, `outcomes` → `outcome_map`, batch fields → `batch_params` — so Phase 1b can drop them into `pipe_registry` verbatim. Runtime-only fields we cannot know statically are set to honest defaults (null / false / `[]`).
  - Concepts normalize to `ConceptInfo` (no parallel type) with a **best-effort derived `json_schema`** from `[concept.X.structure]` (simpler than pydantic's output — display data, not contract). `refines` is qualified like the runtime registry (`Text` → `native.Text`).
  - Native concept catalog mirrored from pipelex `NativeConceptCode` (Dynamic, Text, Image, Document, Html, TextAndImages, Number, Page, JSON, SearchResult, Anything, Composite; `<Code>Content` structure class names). Descriptions are our own display stand-ins, not runtime wording.
  - Referenced-but-undeclared concepts become current-domain stubs (empty description) — pipelex's implicit-concept behavior, approximated; `mergeBundles` re-points stubs at declarations contributed by sibling files (same or other domain).
  - Bundles without `domain` parse under `UNKNOWN_DOMAIN = "unknown"` with a warning diagnostic.
  - Missing/uninterpretable pipe `output` → `native.Anything` + warning. A pipe is dropped entirely only for a missing/unknown `type` (error diagnostic).
  - No codegen from `mthds_schema.json` — checked in under `data/schema/` (refresh via `make schema-refresh`) as the reference contract; hand-rolled lenient narrowing per the house style.
  - Duplicate codes: within one file = TOML parse error (smol-toml throws → error diagnostic); across files = `mergeBundles` keep-first + warning.
- **Code-review triage at 1a** (fresh Sonnet sub-agent, /code-review on the working tree): fixed (1) PipeExtract now classifies its input as image-like vs document-like mirroring the runtime factory (`image_stuff_name` derived; `document_stuff_name` loosened to `string | null` in `graph/types.ts` — pre-existing type inaccuracy, noted in CHANGELOG); (2) `normalizeOutput` reuses `nativeConceptInfo("Anything")` instead of a hand-written literal; (3) inline PipeCompose template tables keep `extra_context`; (4) synthetic structure class names replace dots in hierarchical domains with interpuncts (`qualifiedStructureClassName`, mirroring pipelex `make_qualified_structure_class_name`). Pushed back on: flagging the fixture test's 3-level `path.resolve` — it is filesystem resolution, not a module import, so the alias rule doesn't apply.
- **Parser API considered frozen for 1b:** `parseMthdsBundle(tomlText) → { bundle, diagnostics }`, `mergeBundles(bundles) → MergedMethodSet` (`domains[domain].{concepts,pipes}`, `mainDomain`, `mainPipe`, `description`, `diagnostics`).
- **Open questions (tracked in design doc):** elaboration display flag, schema sync mechanism (checked-in copy chosen for now, drift risk accepted), cross-package expansion depth, live-status overlay mapping, mthds-js extraction trigger.
