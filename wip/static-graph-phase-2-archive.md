# Static Method Graph - Phase 2 Archive

Archived from [`TODOS.md`](../TODOS.md) on 2026-08-09 — Phase 2 (and with it, the whole static-graph plan) is complete. Phase 1 archive: [`static-graph-phase-1-archive.md`](static-graph-phase-1-archive.md). Design doc: [`static-graph-design.md`](static-graph-design.md). Branch: `feature/Static-graph`.

Goal: make static `GraphSpec`s a first-class input to the existing `GraphViewer`. Phase 1 (archived separately) built the all-TypeScript `.mthds` TOML → static `GraphSpec` parser/builder with parity against dry-run fixtures. This plan covered only the renderer, stories, tests, and docs on top of that builder.

Pipelex's explicit graph generation mode:

```ts
meta: {
  format: "mthds";
  mode: "dry" | "live" | "static";
}
```

Rendering rule: static UI behavior keys on `meta.mode === "static"` only — never inferred from missing timing, missing execution data, deterministic ids, `status: "scheduled"`, or populated registries. A missing `mode` is a legacy runtime graph, not a static graph.

Out of scope: moving the static graph builder to `mthds-js`. There was no Phase 3.

## Phase 2a - Mode contract, validation, and plumbing

- [x] Add `GraphSpecMode = "dry" | "live" | "static"` and a typed `GraphSpecMeta` to `src/graph/types.ts`; narrow `GraphSpec.meta` from `Record<string, unknown>` to the explicit contract.
- [x] Update `validateGraphSpec` to accept `meta.mode`, reject unknown modes when present, and keep legacy specs without `mode` valid until the checked-in dry/live fixture corpus is regenerated with pipelex's new field.
- [x] Add validator tests for `mode: "static"`, `"dry"`, `"live"`, legacy missing `mode`, and invalid mode.
- [x] Add a tiny helper or local convention for `spec.meta?.mode === "static"` and use it at UI boundaries. No renderer code duplicates static detection heuristics.
- [x] Thread graph mode into pipe cards: `buildPipeCardPayload`, `buildDataflowGraph`, folded controller cards in `graphFolds`, `PipeCardPayload`, and React `PipeCardData`.
- [x] Keep the static builder assertion for `meta: { format: "mthds", mode: "static" }`; add/keep a direct test that its output validates.
- [x] Decide and test `statusMap` behavior on static specs. Static cards suppress status chrome; status overrides do not make dots reappear. Live status overlay onto static graphs remains a separate experiment.

### CHECKPOINT 2a - mode contract lands

- [x] Ritual steps 1-4
- [x] Cold-start notes updated with compatibility status for legacy dry/live fixtures

## Phase 2b - Static display chrome

- [x] In `PipeCardBase`, suppress the status dot, pulse animation, status title, and scheduled-looking runtime chrome when `graphMode === "static"`.
- [x] Ensure folded controller cards inherit the same static display mode.
- [x] In `PipeDetailPanel`, hide the run-centric status/duration row for static specs. No `scheduled` shown as though a run is pending.
- [x] Hide runtime-only detail sections in static mode: generic execution-data dumps, metrics, timing-derived values, and any detail row whose meaning depends on an actual run. Keep authored blueprint sections, IO, concept links, descriptions, errors/diagnostics if present, and useful static tags.
- [x] Add focused tests for card payload propagation, static card rendering, static detail panel rendering, and non-static regression.
- [x] Visually verify static vs dry/live in Storybook: static cards look authored/structural, dry/live keep runtime status affordances.

### CHECKPOINT 2b - static chrome lands

- [x] Ritual steps 1-4
- [x] Cold-start notes updated with the final "static mode hides X, keeps Y" contract

## Phase 2c - Authored-structure annotations

- [x] Condition outcome labels: surface the outcome value already recorded on static children (`tags.outcome`). Presentation chosen and tested: child-card badge.
- [x] Batch multiplicity badge: `xN` / `xmany` / `x?` on the representative static batch branch or folded batch card, derived from the list input's declared multiplicity.
- [x] Combined-output role quirk: producer-less combined stuff classified via `parallel_combine` target digests as combined/intermediate instead of looking like an input. Applies to dry and static graphs; covered by tests in both.
- [x] `PipeSignature` audit: visual treatment and detail copy verified correct; a focused signature story added; no further code changes needed beyond the audit.
- [x] Regression tests for condition labels, batch badge data, combined-output role classification, and signature rendering.

### CHECKPOINT 2c - static annotations land

- [x] Ritual steps 1-4
- [x] Cold-start notes updated with any display policy choices

## Phase 2d - Static fixture catalog, stories, and snapshots

- [x] `STATIC_*` fixture catalog next to `DRY_*` / `LIVE_*`, built in-repo from `.mthds` raw imports through `buildStaticGraphSpecFromToml`. No CLI, no gateway key, no Python.
- [x] `STATIC_RUN_CATALOG` shape parallel to the dry/live catalogs for tests and stories to enumerate.
- [x] Phase-1 dev static stories promoted into catalog-backed stories. The real WIP/partially-broken bundle kept as an explicit best-effort example.
- [x] Side-by-side stories for static vs live on representative pipelines: simple sequence, condition, batch, CV screening, deep nesting, and one wide parallel.
- [x] A signatures story exercising `PipeSignature` without relying on a dry run.
- [x] Fixture consistency tests: selected static catalog entries validate, have `meta.mode === "static"`, and cover the intended live catalog counterparts.
- [x] Deterministic snapshot coverage for static specs/layout output. Static snapshots don't need re-baselining from regenerated runtime ids.

### CHECKPOINT 2d - static fixture surface lands

- [x] Ritual steps 1-4
- [x] Cold-start notes updated with catalog coverage and any remaining visual gaps

## Phase 2e - Docs and release readiness

- [x] `docs/static-graph.md`: purpose, API, `meta.mode` contract, static-vs-dry-vs-live behavior, best-effort policy, and known limitations.
- [x] `CLAUDE.md` project structure updated for `src/static-graph/` and the static story/test workflow.
- [x] `README.md` — no change needed (static entry point not treated as a separate public callout beyond existing structure).
- [x] `wip/static-graph-design.md` updated to match implemented Phase 2 behavior and the decision that the builder stays in this repo.
- [x] Stale "Phase 2 later" comments in static stories/tests reviewed and cleared.
- [x] Final Storybook pass across static, dry, and live stories at multiple viewport sizes; static mode did not regress dry/live runtime graph rendering.

### CHECKPOINT 2 - static graphs first-class

- [x] Ritual steps 1-4
- [x] Cold-start notes updated with final feature state, remaining known limitations, and release recommendation

## Final state at archival (2026-08-09)

- Static GraphSpecs are first-class renderer inputs keyed only by `meta.mode === "static"`. `GraphSpec.meta.mode` accepts `"dry"`, `"live"`, and `"static"`; legacy runtime specs without `mode` remain valid, and checked-in dry/live fixtures are stamped explicitly. Static `statusMap` overlays are ignored so runtime dots do not reappear on static cards.
- Static UI contract: pipe cards hide runtime status dot/title/pulse; detail panels hide status, duration, metrics, and generic execution-data dumps. Static detail panels keep authored blueprint sections, IO, concept links, descriptions, errors, tags, and blueprint-not-available diagnostics. Dry detail panels keep status/timing chrome but hide generated mock payload data and metrics.
- Annotation policy: condition outcomes render as child-card badges from `tags.outcome`. Static batches render `xN`, `xmany`, or `x?` from declared list multiplicity; expanded graphs show the badge on the representative branch, folded batch cards keep it on the card. `parallel_combine` target stuff is classified as `combined` for both dry and static graphs.
- Catalog/story state: `STATIC_*` specs and `STATIC_RUN_CATALOG` live next to dry/live catalogs and are built from raw `.mthds` imports through `buildStaticGraphSpecFromToml`. Static dev stories are catalog-backed, the WIP/broken bundle remains an explicit best-effort story, and `StaticVsLive.stories.tsx` covers simple sequence, condition, batch, CV screening, deep nesting, and wide parallel. A static signature story covers `PipeSignature`.
- Docs are current: [`docs/static-graph.md`](../docs/static-graph.md), [`README.md`](../README.md), [`CLAUDE.md`](../CLAUDE.md), and [`static-graph-design.md`](static-graph-design.md) describe the implemented Phase 2 behavior and the decision to keep the builder in this repo. There is still no planned extraction to `mthds-js`.
- Verification at completion: `make check` passed; `make test` passed (116 test files, 1607 tests, with loopback escalation for Vitest/Storybook infrastructure). Storybook visual sweep passed across 34 static/dry/live checks at desktop 1280x720 and mobile 390x844, including CV screening, condition, batch, deep nesting, WIP/broken static, signatures, and static-vs-live comparisons. A fresh no-context sub-agent code review found no issues (Sonnet-5 was requested by the ritual but unavailable in-session; the available independent agent was used instead).
- Known limitation carried forward: live-status overlay onto static graphs is a separate experiment requiring an identity-mapping design; static mode deliberately ignores status overlays today.
- Release status at archival: Phase 2 was ready to ship pending the normal PR/merge process. Check `git log`/open PRs for whether it has since merged.
