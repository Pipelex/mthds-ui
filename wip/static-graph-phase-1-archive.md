# Static Method Graph - Phase 1 Archive

Archived from [`TODOS.md`](../TODOS.md) on 2026-07-08 when the active plan was narrowed to Phase 2 UI work.

Design doc: [`static-graph-design.md`](static-graph-design.md). Branch: `feature/Static-graph`.

Phase 1 goal was an all-TypeScript static graph builder: `.mthds` TOML text in, `GraphSpec` with `meta.mode: "static"` out, incubated in this repo as a pure module and rendered by the existing `GraphViewer`.

Final Phase 1 state: complete through checkpoint 1c. Parser, builder, Storybook smoke stories, and parity harness landed. The static builder output passes `validateGraphSpec`, emits deterministic ids/digests, and matches every checked-in dry-run fixture with an empty per-pipeline divergence allowlist.

## Phase 1a - module scaffolding + TOML to blueprint parsing

- [x] Add `smol-toml` to `dependencies`
- [x] Create `src/static-graph/` entry point: tsup entry, declarations, aliases, barrel export
- [x] Check in `mthds_schema.json` under `data/schema/` with `make schema-refresh`
- [x] Reuse existing `Pipe*Blueprint` / `PipeBlueprintUnion` types from `src/graph/types.ts`; add only bundle-level parsed shapes
- [x] Implement `parseMthdsBundle(tomlText)` with lenient narrowing, diagnostics, and no content throws
- [x] Implement `mergeBundles(bundles)` with same-domain namespace merge and keep-first duplicate handling
- [x] Unit tests for happy path, bad TOML, partial pipes, duplicate codes, dotted input names, and multiplicity suffix parsing

### CHECKPOINT 1a - parser lands

- [x] `make check && make test`
- [x] Code review pass and triage
- [x] Phase committed
- [x] Cold-start notes updated

## Phase 1b - the static walk: blueprint to GraphSpec

- [x] Invocation-path node ids and deterministic raw stuff digests
- [x] Reference resolution for bare refs, `domain.code`, and opaque dependency-alias leaves
- [x] Scope-based input binding with dotted-prefix matching and dangling-input minting
- [x] Controller recursion for `PipeSequence`, `PipeParallel`, `PipeCondition`, `PipeBatch`, and operators
- [x] Controller transparency: controller outputs reuse the internal producer's digest
- [x] Cycle guard: repeated pipe refs on the stack render as leaves
- [x] Best-effort policies: no elaboration, unresolved refs skipped without throw, unused results still get stuff nodes, signatures render as leaves
- [x] GraphSpec assembly: `meta.format: "mthds"`, `meta.mode: "static"`, scheduled node status, pipeline ref, registries, `contains` edges, no `data` edges
- [x] Direct validation test via `validateGraphSpec`
- [x] Unit tests for minimal bundles, every controller type, nesting, cycles, dangling inputs, opaque refs, and repeated pipe invocations

### CHECKPOINT 1b - builder lands

- [x] `make check && make test`
- [x] Storybook smoke with raw `.mthds` fixture imports into `GraphViewer`
- [x] Code review pass and triage
- [x] Phase committed
- [x] Cold-start notes updated

## Phase 1c - parity harness against dry-run fixtures

- [x] Vitest suite builds every `data/pipelines/pipeline_NN/bundle.mthds` and compares to the checked-in `dry_run_graph_spec.json`
- [x] Normalization layer: invocation-structure id mapping, dry-run batch fan-out collapse, runtime field stripping, no elaboration collapse until needed
- [x] Comparison over node multiset, containment tree, and producer/consumer relation per stuff via `buildDataflowAnalysis`
- [x] Explicit `combined_output` direct test, because current pipelex rejects authored `combined_output` even though the spec/schema still document it
- [x] Accepted divergences documented in `wip/static-graph-design.md`

### CHECKPOINT 1c - parity proven

- [x] `make check && make test`
- [x] Code review pass and triage
- [x] Phase committed
- [x] Cold-start notes updated

## Final checkpoint notes

### Checkpoint 1c - 2026-07-04

- **Parity report:** every fixture pipeline matches its dry-run GraphSpec with an empty per-pipeline allowlist (`ACCEPTED_DIVERGENCES = {}` in `src/static-graph/__tests__/parity.test.ts`). The only standing lenient rule is corpus-wide: dry-side `concept=Anything` is treated as a wildcard because runtime batch aggregates lose the declared concept while the static side keeps it.
- **Harness shape:** `parityHarness.ts` exports `collapseBatchFanOut`, `canonicalizeGraph`, and `compareParity`. Canonical node identity is the containment path from `pipe_code` segments with `#k` suffixes for same-code siblings. Stuff identity is a relation signature: producer path, name, concept, and sorted consumer paths.
- **Runtime-parity semantics forced by the harness:** shared working memory for sequence scopes; condition children carry the condition invocation's `resultName`; condition outcomes dedupe by target pipe and join outcome labels; controller `io.outputs` expose transparent child outputs under the invoking slot name.
- **`combined_output` finding:** pipelex deleted `combined_output` upstream in #1014 after the fixture corpus was generated. Current pipelex rejects the field on authored bundles, while the MTHDS spec and `data/schema/mthds_schema.json` still document it. The static builder keeps supporting it and pins renderer behavior with a direct test.
- **Fixture corpus warning:** the corpus is pinned to pre-#1014 pipelex generation. Regenerating with pipelex >= 0.36 will shift parallel graph semantics and needs a dedicated task. Do not casually run `make fixtures`.
- **Phase 2 not started at checkpoint 1c:** rendering gaps carried forward were status dots/run-centric details on static cards, condition outcome labels, batch multiplicity badge, and the producer-less combined-output role quirk.

### Checkpoint 1b - 2026-07-03

- `src/static-graph/buildStaticGraphSpec.ts` exports `buildStaticGraphSpec(mergedSet, options?)` and `buildStaticGraphSpecFromToml(tomlText | tomlText[], options?)`, returning `{ spec, diagnostics }`.
- Every fixture bundle in `data/pipelines/` builds a validator-clean deterministic GraphSpec.
- Dev stories under `Graph - static/Valid` feed raw bundle imports through the builder into `GraphViewer`.
- Builder API frozen for parity: node ids are invocation paths; stuff digests are raw `producer_node_id:name` / `input:name`; edge ids are `static:edge_<n>`.
- Decisions recorded: raw digest strings, synthetic PipeBatch nodes for inline batching, no `data` edges, runtime-style output-name fallback, condition representative output policy, static edge id namespace, and `PipeSignature` as the opaque dependency leaf type.
- Code-review triage fixed conflicting dangling input concept warnings, distinct inline-batch registry entries, alias stripping for synthetic batch codes, and stale story-count wording.

### Checkpoint 1a - 2026-07-03

- `src/static-graph/` exists as a pure TypeScript entry point (`@pipelex/mthds-ui/static-graph` export and `@static-graph/*` alias).
- Module contents: `types.ts`, `conceptRefs.ts`, `normalizePipe.ts`, `parseMthdsBundle.ts`, and `mergeBundles.ts`.
- Tests cover parsing and fixture sweep with zero error diagnostics.
- Parsed pipes normalize directly to runtime registry shapes (`PipeBlueprintUnion`) at parse time.
- Concepts normalize to `ConceptInfo` with best-effort JSON schema display data.
- Native concept catalog mirrors pipelex `NativeConceptCode`.
- Referenced-but-undeclared concepts become current-domain stubs and can be enriched by sibling bundle files.
- Missing domains parse under `UNKNOWN_DOMAIN = "unknown"` with a warning.
- Missing/uninterpretable pipe outputs become `native.Anything` with a warning; pipes are dropped only for missing/unknown type.
- No codegen from `mthds_schema.json`; the checked-in schema is a reference contract.
- Duplicate codes within a file are TOML parse errors; duplicates across files are keep-first warnings from `mergeBundles`.
