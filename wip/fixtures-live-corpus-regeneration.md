# `make fixtures-live` over the whole corpus is now impossible

## What happens

`make fixtures-live` with no `ONLY=` walks the pipelines in sorted order, writing each `live_run_graph_spec.json` as it goes. It now reaches `pipeline_32` and dies: a `PipeLLM` outputting `Date`, `Date[]`, or `Time` fails pydantic validation on a real model response (`pipelex/wip/native-date-time-live-run.md`). `generateSpec` calls `die()` → `process.exit(1)`, with no skip path.

So a full live sweep rewrites the earlier pipelines' spec JSONs, then aborts partway, leaving a half-swept tree. `make fixtures-live-missing` — the documented recovery for a partial or failed run — selects exactly `pipeline_32` and `pipeline_33` and dies immediately.

The partial-write property is not new: any live failure (network, quota, a provider hiccup) has always left the pipelines before it rewritten. What is new is a **deterministic** failure that makes the full command unusable rather than flaky.

## Why it was not fixed alongside the bundles

Two of the three obvious fixes are cheap but wrong, and the third is a real design call:

- **Skip list in the generator.** Small, but it hard-codes "these pipelines have no live data" in a place nobody re-reads. When pipelex is fixed, the entries become silent lies — the pipelines still get skipped and nobody notices they could now run.
- **`--continue-on-error`.** Turns a genuine credential or quota failure into a warning, which is exactly the failure mode fixture generation must not have.
- **Derive it from the corpus.** A pipeline whose bundle contains a native the runtime cannot produce is knowable, but encoding "which natives are live-broken" in this repo duplicates a pipelex bug into the consumer, and it goes stale the same way a skip list does.

There is also a real question of whether a full live sweep should be a supported operation at all. `TODOS.md` already forbids it for a different reason: the committed corpus was generated on pipelex 0.41.0 and the local CLI is 0.42.0, so a bare `make fixtures-live` would sweep every fixture onto a new pipelex version inside whatever change happens to be in flight. The house rule is already "always pass `ONLY=`". If that rule is right, the fix may be to make the full-corpus form _refuse_ rather than to make it succeed.

## Recommended shape

Make the failure loud and early instead of half-way, and keep the decision in one place:

1. On a write run with no `--only`/`--missing`, refuse up front — a deliberate corpus sweep is its own change and should be asked for explicitly (`--all` or similar), not be the default spelling.
2. If a full sweep is kept, generate into a staging area and commit the spec JSONs only after every pipeline succeeds, so an abort never leaves a mixed-version tree. This also fixes the pre-existing flaky-failure case, which the skip list does not.

Neither is required by the native-concepts work; both are worth doing before the next deliberate corpus regeneration, which is when this will actually bite.

## Related — `scripts/` has no lint or format coverage

`make lint` is `eslint src/` and `make format-check` is `prettier --check "src/**/*.{ts,tsx}"`, so nothing checks `scripts/generate-fixtures.mjs` at all — eslint cannot even parse it, since it is outside the tsconfig project. A dead `let` that should have been `const` survived a rework here and was only caught by review.

Extending coverage to `scripts/` is not free: the file is a CLI and legitimately writes to stdout, so it needs a `no-console` override, which is a repo-tooling decision rather than part of any one change. Worth doing, worth deciding deliberately.

## Meanwhile

`ONLY=` works correctly for every pipeline that can run live, and the barrel is now derived from the split modules on disk, so a partial run no longer drops the omitted pipelines' exports. `pipeline_32` and `pipeline_33` carry placeholder LIVE splits; `make fixtures-live ONLY=pipeline_32` is the regression check for the upstream fix.
