# Static Method Graph - Phase 2 TODOs

Design doc: [`wip/static-graph-design.md`](wip/static-graph-design.md). Phase 1 archive: [`wip/static-graph-phase-1-archive.md`](wip/static-graph-phase-1-archive.md). Branch: `feature/Static-graph`.

Goal: make static `GraphSpec`s a first-class input to the existing `GraphViewer`. Phase 1 is done: `.mthds` TOML parses and builds deterministic static specs, and the parity harness matches the checked-in dry-run fixtures. This plan is only for the renderer, stories, tests, and docs.

Pipelex is adding an explicit graph generation mode:

```ts
meta: {
  format: "mthds";
  mode: "dry" | "live" | "static";
}
```

Rendering rule: static UI behavior must key on `meta.mode === "static"` only. Do not infer static-ness from missing timing, missing execution data, deterministic ids, `status: "scheduled"`, or populated registries. A missing `mode` is a legacy runtime graph, not a static graph.

Out of scope: moving the static graph builder to `mthds-js`. There is no Phase 3 in this plan.

## Checkpoint ritual

At each `CHECKPOINT` below, before starting the next phase:

1. **Verify progress.** `make check && make test` green. If the phase touched graph rendering or stories, visually verify Storybook (`make storybook`, port 6006) with static, dry, and live examples. Include at least CV screening, condition, batch, deep nesting, and a WIP/broken static bundle when relevant.
2. **Update docs for cold start.** Tick completed boxes here. Record decisions, deviations, open questions, and exact current state in "Cold-start notes". Update `wip/static-graph-design.md` and repo `docs/` if behavior changed.
3. **Fan out `/code-review`.** Spawn a Sonnet-5 sub-agent with no inherited context to review only the phase changes (commit SHA, diff range, or file list). Triage findings yourself, fix confirmed issues, then re-run step 1.
4. **Commit** the phase. Do not merge a PR without explicit confirmation.

## Phase 2a - Mode contract, validation, and plumbing

- [ ] Add `GraphSpecMode = "dry" | "live" | "static"` and a typed `GraphSpecMeta` to `src/graph/types.ts`; narrow `GraphSpec.meta` from `Record<string, unknown>` to the explicit contract.
- [ ] Update `validateGraphSpec` to accept `meta.mode`, reject unknown modes when present, and keep legacy specs without `mode` valid until the checked-in dry/live fixture corpus is regenerated with pipelex's new field.
- [ ] Add validator tests for `mode: "static"`, `"dry"`, `"live"`, legacy missing `mode`, and invalid mode.
- [ ] Add a tiny helper or local convention for `spec.meta?.mode === "static"` and use it at UI boundaries. No renderer code should duplicate static detection heuristics.
- [ ] Thread graph mode into pipe cards: `buildPipeCardPayload`, `buildDataflowGraph`, folded controller cards in `graphFolds`, `PipeCardPayload`, and React `PipeCardData`.
- [ ] Keep the static builder assertion for `meta: { format: "mthds", mode: "static" }`; add/keep a direct test that its output validates.
- [ ] Decide and test `statusMap` behavior on static specs. If static cards suppress status chrome, status overrides must not make dots reappear; live status overlay onto static graphs remains a separate experiment unless explicitly started.

### CHECKPOINT 2a - mode contract lands

- [ ] Ritual steps 1-4
- [ ] Cold-start notes updated with compatibility status for legacy dry/live fixtures

## Phase 2b - Static display chrome

- [ ] In `PipeCardBase`, suppress the status dot, pulse animation, status title, and scheduled-looking runtime chrome when `graphMode === "static"`.
- [ ] Ensure folded controller cards inherit the same static display mode.
- [ ] In `PipeDetailPanel`, hide the run-centric status/duration row for static specs. Do not show `scheduled` as though a run is pending.
- [ ] Hide runtime-only detail sections in static mode: generic execution-data dumps, metrics, timing-derived values, and any detail row whose meaning depends on an actual run. Keep authored blueprint sections, IO, concept links, descriptions, errors/diagnostics if present, and useful static tags.
- [ ] Add focused tests for card payload propagation, static card rendering, static detail panel rendering, and non-static regression.
- [ ] Visually verify static vs dry/live in Storybook: static cards should look authored/structural, dry/live should keep runtime status affordances.

### CHECKPOINT 2b - static chrome lands

- [ ] Ritual steps 1-4
- [ ] Cold-start notes updated with the final "static mode hides X, keeps Y" contract

## Phase 2c - Authored-structure annotations

- [ ] Condition outcome labels: surface the outcome value already recorded on static children (`tags.outcome`) and/or `contains` edge labels. Choose one primary presentation (child badge or labeled edge), document it, and test it.
- [ ] Batch multiplicity badge: show `xN` / `xmany` on the representative static batch branch or batch card, derived from the list input's declared multiplicity. Define the fallback for unknown multiplicity.
- [ ] Combined-output role quirk: producer-less combined stuff currently looks like an input. Use `parallel_combine` target digests to classify it as combined/intermediate instead. This applies to dry and static graphs; cover both in tests.
- [ ] `PipeSignature` audit: `PipeSignature` is already in `PipeType`, `KNOWN_PIPE_TYPES`, card badges, and detail dispatch. Verify the visual treatment and detail copy are still correct, add a focused signature story, and only add code if the audit finds a real gap.
- [ ] Add regression tests for condition labels, batch badge data, combined-output role classification, and signature rendering.

### CHECKPOINT 2c - static annotations land

- [ ] Ritual steps 1-4
- [ ] Cold-start notes updated with any display policy choices

## Phase 2d - Static fixture catalog, stories, and snapshots

- [ ] Add a `STATIC_*` fixture catalog next to `DRY_*` / `LIVE_*`, built in-repo from `.mthds` raw imports through `buildStaticGraphSpecFromToml`. No CLI, no gateway key, no Python.
- [ ] Export a `STATIC_RUN_CATALOG` shape parallel to the dry/live catalogs so tests and stories can enumerate it.
- [ ] Promote the Phase-1 dev static stories into catalog-backed stories. Keep the real WIP/partially-broken bundle story as an explicit best-effort example.
- [ ] Add side-by-side stories for static vs dry on representative pipelines: simple sequence, condition, batch, CV screening, deep nesting, and one wide parallel.
- [ ] Add a signatures story that exercises `PipeSignature` without relying on a dry run.
- [ ] Add fixture consistency tests: selected static catalog entries validate, have `meta.mode === "static"`, and cover the intended dry catalog counterparts.
- [ ] Add deterministic snapshot coverage for static specs/layout output. Static snapshots should not need re-baselining from regenerated runtime ids; updates should signal real behavior changes.

### CHECKPOINT 2d - static fixture surface lands

- [ ] Ritual steps 1-4
- [ ] Cold-start notes updated with catalog coverage and any remaining visual gaps

## Phase 2e - Docs and release readiness

- [ ] Add `docs/static-graph.md`: purpose, API, `meta.mode` contract, static-vs-dry-vs-live behavior, best-effort policy, and known limitations.
- [ ] Update `CLAUDE.md` project structure for `src/static-graph/` and the static story/test workflow.
- [ ] Update `README.md` only if the static entry point is considered public for this package.
- [ ] Update `wip/static-graph-design.md` to match implemented Phase 2 behavior and the decision that the builder stays in this repo.
- [ ] Review stale comments in static stories/tests that still say "Phase 2 later" and either remove or update them.
- [ ] Final Storybook pass across static, dry, and live stories at multiple viewport sizes; confirm static mode did not regress dry/live runtime graph rendering.

### CHECKPOINT 2 - static graphs first-class

- [ ] Ritual steps 1-4
- [ ] Cold-start notes updated with final feature state, remaining known limitations, and release recommendation

## Cold-start notes

_Updated at every checkpoint. A fresh session should be able to resume from here + the design doc + the Phase 1 archive._

_Updated 2026-07-08 - Phase 2 plan reset._

- Phase 1 completed work moved to [`wip/static-graph-phase-1-archive.md`](wip/static-graph-phase-1-archive.md). It includes the parser/builder/parity checklist and the checkpoint notes through 1c.
- Static builder already emits `meta: { format: "mthds", mode: "static" }` and has a test asserting it. Current `GraphSpec.meta` is still typed as `Record<string, unknown>` and `validateGraphSpec` only enforces `meta.format`.
- `PipeSignature` is not a from-scratch Phase 2 task anymore: it already exists in `PipeType`, `KNOWN_PIPE_TYPES`, `PipeCardBase` badges, signature CSS class plumbing, and `PipeDetailPanel` dispatch. Phase 2 should audit/verify it and add a story.
- Existing static stories: `StaticGraphDev.stories.tsx` builds selected valid fixture bundles from raw `.mthds`; `StaticGraphInvalid.stories.tsx` renders a real invalid/WIP bundle from `data/static/`. Phase 2d should turn this into a proper `STATIC_*` catalog.
- There is no planned extraction to `mthds-js`. Keep the static graph module in this repo for this plan.
