# PipeStructure detail panel — code review findings

Review of the staged `PipeStructureDetail.tsx` changes (adds the PipeStructure case to the detail panel's blueprint + execution-data dispatch).

**Context:** The new `PipeStructureDetail.tsx` faithfully follows the existing pattern used by `PipeLLMDetail`, `PipeSearchDetail`, `PipeImgGenDetail`, and `PipeExtractDetail` — all five `*ExecutionData` components are identical no-ops because their runtime data is merged into the corresponding `*Section`. The diff itself is clean and idiomatic; the findings below are really about that shared design, which this change extends to a sixth case. Nothing here blocks the merge.

## 1. Unresolved blueprint drops all runtime data (PLAUSIBLE, pre-existing, family-wide)

**Where:** `src/graph/react/detail/sections/PipeStructureDetail.tsx:47` (`StructureExecutionData`), interacting with `src/graph/react/detail/PipeDetailPanel.tsx:178` and `:292`.

`StructureExecutionData` is a no-op (`return null`). All PipeStructure runtime data is rendered by `PipeStructureSection`, which only mounts when a blueprint resolves (`PipeDetailPanel.tsx:178` gates on `blueprint &&`). So a PipeStructure node that has `execution_data` but whose `pipe_code` isn't in `spec.pipe_registry` shows only "Blueprint not available" and drops `resolved_model`, `rendered_user_prompt`, etc.

The asymmetry is real in the code: an **unknown** `pipe_type` falls to `default → GenericExecutionData` and _does_ render the raw data, so a recognized-but-unresolved pipe shows strictly _less_ than an unrecognized one.

Caveats that lower its priority:

- **PLAUSIBLE, not confirmed** — it only bites if pipelex actually emits `execution_data` for a PipeStructure node whose blueprint won't resolve (partial/streaming graph, missing registry). That combination was not confirmed to occur.
- **Not introduced here** — `PipeLLM` / `Search` / `ImgGen` / `Extract` already have the same gap. This change adds a sixth instance consistent with the five existing ones, so it is not a regression.

**Proper fix (family-level, if we want this robust):** dispatch the merged-data types to `GenericExecutionData` as a fallback when the blueprint is absent, rather than to a per-type no-op. Belongs at the dispatcher (`ExecutionDataSection`), not just for PipeStructure.

## 2. `Structuring: structure` is always a constant row (CONFIRMED cleanup)

**Where:** `src/graph/react/detail/sections/PipeStructureDetail.tsx:33`.

The `<KV label="Structuring" value={structuringPath} />` row was copied from `PipeLLMDetail`, where `structuring_path` is meaningfully one of `text` / `object_direct` / `object_list`. pipelex's `pipe_structure.py` hardcodes `execution_data['structuring_path'] = 'structure'` for every run — so this row always renders the uninformative `Structuring: structure`.

**Fix:** drop the row (or confirm the value can actually vary before keeping it).

## 3. Sixth identical no-op boilerplate component (CONFIRMED cleanup)

**Where:** `src/graph/react/detail/sections/PipeStructureDetail.tsx:47` (and the four sibling `*ExecutionData` no-ops).

There are now five identical `*ExecutionData` no-ops (LLM, Search, ImgGen, Extract, Structure), each requiring an export + barrel re-export + dispatcher case. A single shared `NoExecutionData` — or just `return null` directly in the `ExecutionDataSection` switch for these merged-into-blueprint types — would collapse the lot.

**Fix:** broader refactor than this change, but the natural place to note it since the change adds another copy.

---

_Generated from an xhigh workflow code review (6 finders + independent verify pass). Findings #2 and #3 confirmed; #1 plausible and pre-existing._
