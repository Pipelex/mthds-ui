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

- [x] Add `GraphSpecMode = "dry" | "live" | "static"` and a typed `GraphSpecMeta` to `src/graph/types.ts`; narrow `GraphSpec.meta` from `Record<string, unknown>` to the explicit contract.
- [x] Update `validateGraphSpec` to accept `meta.mode`, reject unknown modes when present, and keep legacy specs without `mode` valid until the checked-in dry/live fixture corpus is regenerated with pipelex's new field.
- [x] Add validator tests for `mode: "static"`, `"dry"`, `"live"`, legacy missing `mode`, and invalid mode.
- [x] Add a tiny helper or local convention for `spec.meta?.mode === "static"` and use it at UI boundaries. No renderer code should duplicate static detection heuristics.
- [x] Thread graph mode into pipe cards: `buildPipeCardPayload`, `buildDataflowGraph`, folded controller cards in `graphFolds`, `PipeCardPayload`, and React `PipeCardData`.
- [x] Keep the static builder assertion for `meta: { format: "mthds", mode: "static" }`; add/keep a direct test that its output validates.
- [x] Decide and test `statusMap` behavior on static specs. If static cards suppress status chrome, status overrides must not make dots reappear; live status overlay onto static graphs remains a separate experiment unless explicitly started.

### CHECKPOINT 2a - mode contract lands

- [x] Ritual steps 1-4
- [x] Cold-start notes updated with compatibility status for legacy dry/live fixtures

## Phase 2b - Static display chrome

- [x] In `PipeCardBase`, suppress the status dot, pulse animation, status title, and scheduled-looking runtime chrome when `graphMode === "static"`.
- [x] Ensure folded controller cards inherit the same static display mode.
- [x] In `PipeDetailPanel`, hide the run-centric status/duration row for static specs. Do not show `scheduled` as though a run is pending.
- [x] Hide runtime-only detail sections in static mode: generic execution-data dumps, metrics, timing-derived values, and any detail row whose meaning depends on an actual run. Keep authored blueprint sections, IO, concept links, descriptions, errors/diagnostics if present, and useful static tags.
- [x] Add focused tests for card payload propagation, static card rendering, static detail panel rendering, and non-static regression.
- [x] Visually verify static vs dry/live in Storybook: static cards should look authored/structural, dry/live should keep runtime status affordances.

### CHECKPOINT 2b - static chrome lands

- [x] Ritual steps 1-4
- [x] Cold-start notes updated with the final "static mode hides X, keeps Y" contract

## Phase 2c - Authored-structure annotations

- [x] Condition outcome labels: surface the outcome value already recorded on static children (`tags.outcome`) and/or `contains` edge labels. Choose one primary presentation (child badge or labeled edge), document it, and test it.
- [x] Batch multiplicity badge: show `xN` / `xmany` on the representative static batch branch or batch card, derived from the list input's declared multiplicity. Define the fallback for unknown multiplicity.
- [x] Combined-output role quirk: producer-less combined stuff currently looks like an input. Use `parallel_combine` target digests to classify it as combined/intermediate instead. This applies to dry and static graphs; cover both in tests.
- [x] `PipeSignature` audit: `PipeSignature` is already in `PipeType`, `KNOWN_PIPE_TYPES`, card badges, and detail dispatch. Verify the visual treatment and detail copy are still correct, add a focused signature story, and only add code if the audit finds a real gap.
- [x] Add regression tests for condition labels, batch badge data, combined-output role classification, and signature rendering.

### CHECKPOINT 2c - static annotations land

- [x] Ritual steps 1-4
- [x] Cold-start notes updated with any display policy choices

## Phase 2d - Static fixture catalog, stories, and snapshots

- [x] Add a `STATIC_*` fixture catalog next to `DRY_*` / `LIVE_*`, built in-repo from `.mthds` raw imports through `buildStaticGraphSpecFromToml`. No CLI, no gateway key, no Python.
- [x] Export a `STATIC_RUN_CATALOG` shape parallel to the dry/live catalogs so tests and stories can enumerate it.
- [x] Promote the Phase-1 dev static stories into catalog-backed stories. Keep the real WIP/partially-broken bundle story as an explicit best-effort example.
- [x] Add side-by-side stories for static vs live on representative pipelines: simple sequence, condition, batch, CV screening, deep nesting, and one wide parallel.
- [x] Add a signatures story that exercises `PipeSignature` without relying on a dry run.
- [x] Add fixture consistency tests: selected static catalog entries validate, have `meta.mode === "static"`, and cover the intended live catalog counterparts.
- [x] Add deterministic snapshot coverage for static specs/layout output. Static snapshots should not need re-baselining from regenerated runtime ids; updates should signal real behavior changes.

### CHECKPOINT 2d - static fixture surface lands

- [x] Ritual steps 1-4
- [x] Cold-start notes updated with catalog coverage and any remaining visual gaps

## Phase 2e - Docs and release readiness

- [x] Add `docs/static-graph.md`: purpose, API, `meta.mode` contract, static-vs-dry-vs-live behavior, best-effort policy, and known limitations.
- [x] Update `CLAUDE.md` project structure for `src/static-graph/` and the static story/test workflow.
- [x] Update `README.md` only if the static entry point is considered public for this package.
- [x] Update `wip/static-graph-design.md` to match implemented Phase 2 behavior and the decision that the builder stays in this repo.
- [x] Review stale comments in static stories/tests that still say "Phase 2 later" and either remove or update them.
- [x] Final Storybook pass across static, dry, and live stories at multiple viewport sizes; confirm static mode did not regress dry/live runtime graph rendering.

### CHECKPOINT 2 - static graphs first-class

- [x] Ritual steps 1-4
- [x] Cold-start notes updated with final feature state, remaining known limitations, and release recommendation

## Cold-start notes

_Updated at every checkpoint. A fresh session should be able to resume from here + the design doc + the Phase 1 archive._

_Updated 2026-07-08 - Phase 2 complete._

- Static GraphSpecs are now first-class renderer inputs keyed only by `meta.mode === "static"`. `GraphSpec.meta.mode` accepts `"dry"`, `"live"`, and `"static"`; legacy runtime specs without `mode` remain valid, and checked-in dry/live fixtures are now stamped explicitly. Static `statusMap` overlays are ignored so runtime dots do not reappear on static cards.
- Static UI contract: pipe cards hide runtime status dot/title/pulse; detail panels hide status, duration, metrics, and generic execution-data dumps. Static detail panels keep authored blueprint sections, IO, concept links, descriptions, errors, tags, and blueprint-not-available diagnostics. Dry detail panels keep status/timing chrome but hide generated mock payload data and metrics.
- Annotation policy: condition outcomes render as child-card badges from `tags.outcome`. Static batches render `xN`, `xmany`, or `x?` from declared list multiplicity; expanded graphs show the badge on the representative branch, folded batch cards keep it on the card. `parallel_combine` target stuff is classified as `combined` for both dry and static graphs.
- Catalog/story state: `STATIC_*` specs and `STATIC_RUN_CATALOG` live next to dry/live catalogs and are built from raw `.mthds` imports through `buildStaticGraphSpecFromToml`. Static dev stories are catalog-backed, the WIP/broken bundle remains an explicit best-effort story, and `StaticVsLive.stories.tsx` covers simple sequence, condition, batch, CV screening, deep nesting, and wide parallel. A static signature story covers `PipeSignature`.
- Docs are current: [`docs/static-graph.md`](docs/static-graph.md), [`README.md`](README.md), [`CLAUDE.md`](CLAUDE.md), and [`wip/static-graph-design.md`](wip/static-graph-design.md) describe the implemented Phase 2 behavior and the decision to keep the builder in this repo. There is still no planned extraction to `mthds-js`.
- Verification at completion: `make check` passed; `make test` passed with loopback escalation for Vitest/Storybook infrastructure (`116` files, `1607` tests). Storybook visual sweep passed across `34` static/dry/live checks at desktop `1280x720` and mobile `390x844`, including CV screening, condition, batch, deep nesting, WIP/broken static, signatures, and static-vs-live comparisons. A fresh no-context sub-agent code review found no issues; Sonnet-5 was requested by the ritual but was not available in this session's sub-agent tool, so the available independent agent was used instead.
- Release recommendation: Phase 2 is ready to ship after the normal PR/merge process. Known limitation remains that live-status overlay onto static graphs is a separate experiment requiring an identity-mapping design; static mode deliberately ignores status overlays today.
