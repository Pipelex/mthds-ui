# Follow-up: audit `Pipe*Blueprint` types for nullability drift vs the pipelex runtime

Status: deferred follow-up. Found during the Checkpoint 1a code review on `feature/Static-graph` (commit d4aa4c3).

## What was found

`PipeExtractBlueprint.document_stuff_name` in `src/graph/types.ts` was typed `string`, but the pipelex runtime model (`pipelex/pipelex/pipe_operators/extract/pipe_extract.py`) declares both `image_stuff_name: str | None` and `document_stuff_name: str | None`, and its factory sets **exactly one** of the two depending on whether the (single) input concept is image-compatible or document-compatible. An image-based extract therefore serializes `document_stuff_name: null` into the GraphSpec `pipe_registry` — a payload the old type misdescribed. None of our checked-in fixtures happened to contain an image-based extract, which is why the drift went unnoticed.

Already done (in d4aa4c3): the field was loosened to `string | null` and noted as breaking in the CHANGELOG Unreleased section; `PipeExtractDetail.tsx` already tolerated null via its `KV` row.

## Deferred work

0. **Two more instances found, both in PR #63** (pipelex 0.41.0 sweep) — evidence that this audit is worth doing rather than deferring further. `PipeLLMBlueprint.llm_prompt_spec.templating_style` and `PipeParallelBlueprint.combined_output` were both declared **required** while 0.41.0 dumps omit them entirely. Both surfaced only from diffing the bundled JSON Schema, not from any failing check — internal casts (`as unknown as GraphSpec`) hide the whole class from our own typecheck, so the breakage lands on external consumers of the published package. The `combined_output` half has an open product question attached: [`pr-63-review-notes.md`](./pr-63-review-notes.md).

1. **Systematic audit of the registry blueprint types.** The `Pipe*Blueprint` interfaces in `src/graph/types.ts` were written from observed `model_dump()` payloads in the dry-run fixtures, not from the runtime model declarations. Any field whose "always present" appearance is an artifact of what our fixtures happen to exercise can carry the same class of bug. Cross-check every field of every `PipeBlueprintUnion` member against the corresponding pydantic model in `pipelex/` (optionality, `| None`, union arms like `llm_choice: str | LLMSetting`), and fix drift found.
2. **Fixture gap:** add an image-based `PipeExtract` pipeline to `data/pipelines/` (and regenerate via `make fixtures`) so the registry payload with `document_stuff_name: null` / `image_stuff_name` set is actually exercised by validation, stories, and — once Phase 1c lands — the static-graph parity harness.
3. **Consider a drift detector.** These types have no mechanical link to the pipelex models. Options: generate them from a pipelex-emitted schema for the registry payloads (the authoring-surface `mthds_schema.json` under `data/schema/` does not cover the runtime-serialized registry shapes), or at minimum a checked-in sample-payload test per pipe type. Decide when the static-graph work stabilizes — if drift keeps biting, escalate from audit (item 1) to codegen; that decision belongs with the open "schema sync mechanism" question in `wip/static-graph-design.md`.
