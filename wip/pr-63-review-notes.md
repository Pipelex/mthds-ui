# PR #63 — deferred review findings

Deferred items from the review-agent triage on [PR #63](https://github.com/Pipelex/mthds-ui/pull/63) (`chore/pipelex-0.41.0-sweep`). Everything else raised on that PR was fixed in the PR itself; this file holds the one item that needs a decision rather than a fix.

---

## `combined_output` in the static builder — resolve the spec-vs-pipelex divergence

**Reporter:** chatgpt-codex-connector (P2), on the `CHANGELOG.md` hunk.
**Status:** open question. The type-level half is fixed; the product half is not.

### What was fixed in PR #63

`PipeParallelBlueprint.combined_output` in `src/graph/types.ts` was declared **required**, but pipelex 0.41.0 removed the field, so no v0.41 registry dump carries it — verified empirically: every `PipeParallel` entry in every committed graph spec has exactly `add_each_output, code, description, domain_code, inputs, output, parallel_sub_pipes, pipe_category, type`. It is now `combined_output?: string | null`, with a compile-time guard in `src/graph/__tests__/validateGraphSpec.test.ts` (an un-cast `: GraphSpec` literal omitting the key).

That was invisible internally because every ingestion path is cast (`as unknown as GraphSpec`), but it broke **external typed consumers** of the published `@pipelex/mthds-ui`.

### The open question

**Should the static builder keep honoring `combined_output` as an authoring key at all?**

`wip/static-graph-design.md:155` recorded a deliberate decision to keep supporting it:

> "`data/schema/mthds_schema.json` (and the mthds spec) still carry `combined_output`; the static builder keeps supporting it — the MTHDS spec is its normative source, and spec-vs-pipelex divergence is an upstream question to settle in the `mthds/` repo, not here."

**PR #63 removed that decision's stated premise.** Refreshing the bundled schema to v0.41.0 dropped `combined_output` from `PipeParallelBlueprint`, and because that definition carries `additionalProperties: false`, the bundled schema now actively **rejects** a `.mthds` authoring the key. The cited normative source no longer says what the decision relied on it saying.

So the divergence is now: **pipelex rejects it, the bundled schema rejects it, the MTHDS spec (`mthds/docs/spec/`) still documents it, and this repo's static builder still honors it.**

### Why it was not resolved in PR #63

Unlike `templating_style` — whose removal was safe precisely because _no component ever read it_ — `combined_output` is read in two live paths, so removing it deletes working behavior rather than dead weight:

| Site                                                                      | Role                                                                                                                                                                                              |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/static-graph/buildStaticGraphSpec.ts:702-703`                        | `blueprint.combined_output ?? inv.resultName ?? snakeCase(...)` — names the minted combined stuff, which is the digest for every `parallel_combine` edge target and the controller's `io.outputs` |
| `src/graph/react/detail/sections/PipeParallelDetail.tsx:27`               | renders a "Combined Output" row in the detail panel                                                                                                                                               |
| `src/static-graph/normalizePipe.ts:255`                                   | emits it from the authored TOML                                                                                                                                                                   |
| `src/graph/react/detail/__stories__/enrichedMockData.ts:1095`, `:3154`    | mock data — `:3154` sits inside an **un-cast** `ENRICHED_SPEC: GraphSpec`, so removal is a compile error there                                                                                    |
| `src/static-graph/__tests__/parity.test.ts:105-197`                       | the long rationale comment + a `combined_output = "insights"` bundle + `describe("combined_output producer semantics")`                                                                           |
| `src/static-graph/__tests__/parseMthdsBundle.test.ts:164`, `:173`         | authored fixture + assertion                                                                                                                                                                      |
| `src/static-graph/__tests__/buildStaticGraphSpec.test.ts:279`, `:300-320` | `combined_output = "combo"` bundle + digest assertion                                                                                                                                             |

Full removal is a 7-file change that also rewrites test assertions — `buildStaticGraphSpec.test.ts` authors `combined_output = "combo"` on a top-level `main_pipe`, so with no `inv.resultName` the fallback yields `snakeCase("Combined")` = `"combined"`, not `"combo"`. Reversing a deliberated decision deserves its own commit and its own reasoning, not a drive-by inside a version sweep whose scope was "make the types match 0.41".

### Recommendation when picked up

1. Settle the divergence in the `mthds/` repo first — does the MTHDS spec still document `combined_output`, or does it follow pipelex #1014 ("PipeParallel always combines: required main stuff invariant", which added `native.Composite`)? The spec is the static builder's normative source, so that answer decides this one.
2. If the spec drops it: do the 7-file removal, delete the now-moot `parity.test.ts:105-118` rationale block, and update `wip/static-graph-design.md:152-155` to record the resolution.
3. If the spec keeps it: leave the current optional-and-honored state and update `wip/static-graph-design.md:155` to cite the MTHDS spec directly rather than the bundled schema copy, which no longer agrees with it.

Related: this is an instance of the drift class tracked in [`followup-blueprint-type-nullability.md`](./followup-blueprint-type-nullability.md) item 1 — `Pipe*Blueprint` types written from observed fixture payloads rather than from the pipelex model declarations.
