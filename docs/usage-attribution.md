# Per-node usage attribution

A pipelex GraphSpec carries the run's inference usage attributed to graph position: `node.usage` on every node, `spec.usage` for the run. This page is about how this repo renders it — and, more importantly, about the ways a naive rendering states something false about money.

The producing side is documented in pipelex: `docs/under-the-hood/per-node-usage-attribution.md`.

## Where it lives

| File                                               | Role                                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/graph/types.ts`                               | `GraphSpecNodeUsage`, `GraphSpecUsage` — the mirror of pipelex's models, with the invariants on the type |
| `src/graph/validateGraphSpec.ts`                   | The boundary gate: `usage` present must be well-formed, `cost` must be `number \| null`                  |
| `src/graph/usageFormat.ts`                         | Pure presentation rules — scope, state, formatting. No React                                             |
| `src/graph/react/detail/sections/UsageSection.tsx` | The inline cost and its expanded diagnostics                                                             |
| `src/graph/react/detail/PipeDetailPanel.tsx`       | Places the cost on the status line and owns the disclosure state                                         |

## Cost lives on the status line, and only there

Cost appears in the side panel, beside the status and the duration, formatted exactly like them:

```
● Succeeded   23.57s   $0.0138  ⌄
```

Those are three facts of the same kind about the same run, so they share a line. A thin chevron — deliberately quieter than the number it follows — expands the diagnostics below: inference calls, priced calls, total tokens, the per-category breakdown, and the node's own figures alongside its branch's.

**Nothing about cost is ever rendered on a graph card.** The card is for structure; a price tag on every node turns the graph into a spreadsheet.

| Situation          | Encoding                    | Shown       |
| ------------------ | --------------------------- | ----------- |
| no usage collected | `usage === undefined`       | nothing     |
| dry run            | graph `meta.mode === "dry"` | nothing     |
| ran no inference   | `inference_calls === 0`     | nothing     |
| unrated            | `cost === null`, calls > 0  | nothing     |
| partial            | `calls > rated > 0`         | `≥ $0.0043` |
| rated              | `rated === calls > 0`       | `$0.0043`   |

Three things the design refuses to do:

- **Render `null` as `$0.00`.** `null` means nothing in that call was priced. A zero is a measurement; `null` is the absence of one. Where there is no price, the panel shows nothing at all rather than a `0` or a `—`, each of which implies something.
- **Render a partial cost as complete.** When only some calls were priced, `cost` is a lower bound, and the `≥` is what says so.
- **Render a dry run's numbers.** A dry run executes nothing. Its usage record exists (one synthetic call per would-be inference, zero tokens, `cost: null`), but presenting those counts as measurements is a fabrication — so the cost is gated on a real run.

That last point is why the fixture generator deliberately does **not** pass `--mock-usage`: that flag makes a dry run report invented token counts, which is precisely the thing not to put on screen.

## Why no token counts anywhere

`GraphSpecNodeUsage` carries token figures and this repo renders none of them. That is deliberate.

Extract, search and image generation are billed **per request**, and pipelex encodes that price through the token field: rates are configured per million tokens, so putting exactly `1_000_000` in each category makes `1_000_000 x rate/1e6` reproduce the per-request price verbatim (`linkup_extract_worker.py`, `linkup_search_worker.py`, `gateway_extract_worker.py` — each says so in a comment). A one-page extract therefore reports **2,000,000 "tokens"**, which is a scaled request counter, not a measurement.

It does not stay contained: a controller's `subtree_total_tokens` sums those sentinels together with real LLM tokens, so no token figure is trustworthy at any level of a graph. `cost` is the number that survives the encoding, so cost is the only thing shown. The warning lives on `ScopedUsage` in `usageFormat.ts` so the next person does not render them.

(There is also a subtler rule that would apply if tokens were ever shown: **never sum `nb_tokens_by_category`** — `input_cached` is a subset of `input`, not additive.)

## Which model actually ran

A GraphSpec names a model at three rungs of one ladder, and the panel used to show whichever it happened to have under a single `Model` label:

| Rung                  | Where                                   | Example                                   |
| --------------------- | --------------------------------------- | ----------------------------------------- |
| Authored choice       | blueprint `llm_choices.for_text`        | `$writing-factual`                        |
| Requested handle      | `execution_data.resolved_model`         | `@default-premium` — often still an alias |
| **What actually ran** | `usage.by_model[].inference_model_name` | `claude-4.6-sonnet`                       |

`ModelRows` (in `sections/shared.tsx`) shows the bottom rung as `Model`, and adds a `Requested` row **only when the handle differs** — so a pipe that named its model directly gets one row, not two identical ones. When a node used several models (a `PipeLLM`'s text pass and object pass resolve separately) each gets a row with its call count, since collapsing them would put one model's name on another's work.

With no usage collected — a dry or static graph — it falls back to the requested handle alone, which is all such a graph can honestly claim.

## Own vs subtree

Every usage object has two halves: the node's own inference, and the node plus every descendant (`subtree_*`, rolled up by pipelex so no consumer re-derives it).

A controller (`PipeSequence`, `PipeParallel`, `PipeCondition`, `PipeBatch`) runs no inference itself — its own numbers are always zero. So the inline cost reads the **subtree** half for a controller and the **own** half for an operator; get this backwards and every controller reports nothing. The tooltip names the scope ("This pipe and everything below it"), and the expanded view lists both halves.

## The LIVE corpus carries real costs; the DRY corpus carries none

Every `live_run_graph_spec.json` was regenerated against real models and carries real prices — that is what the `Live Run` stories show. The DRY corpus is, correctly, priceless, so no cost appears in a `Dry Run` story at all.

Regenerating LIVE costs real money (the last full sweep was **$2.85** across 32 pipelines) and the output is not stable: a live model produces different content each run, so batch fan-outs change width and parallel branches get numbered in either order. Expect a handful of `snapshots.test.ts` fingerprints to shift and re-baseline them with `vitest -u`; verify first that node and edge _counts_ are unchanged, since a changed count is a real content difference rather than relabeling.

Prefer per-pipeline invocations over the full sweep — `make fixtures-live ONLY=pipeline_11` — since the full sweep has no skip path and a mid-run failure leaves a half-swept tree.

`assertValid` in the generator gates freshly generated specs on the attribution shape: graph usage present, every node carrying a usage object, an empty `unattributed` bucket, and each CONTAINS parent's subtree covering its children's. There is deliberately no token assertion — zero tokens is the correct result of a dry run, not a symptom. Specs reused from disk are exempt from the whole gate, since they may predate usage attribution.

## Fixture regeneration is not bit-stable

Unrelated to usage, but you will hit it here: regenerating the DRY corpus can shift a few snapshot fingerprints and, for a pipeline whose `PipeCondition` branches on mock-generated text (`pipeline_11`), can route to a different branch than the checked-in spec. `snapshots.test.ts` documents this and prescribes `vitest -u` after a `make fixtures`. Regenerate the **whole** corpus rather than a subset when re-baselining, so the fixtures stay coherent with each other.
