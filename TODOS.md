# Tighten mthds-ui GraphSpec interpretation

Goal: stop synthesizing fallback values when required GraphSpec data is missing. The Pipelex runtime guarantees specific fields are always present and non-null; mthds-ui must trust those guarantees and fail loudly when they're violated, instead of hiding upstream bugs behind fabricated content.

## Decisions (from review session)

1. **Single boundary validator.** One `validateGraphSpec()` runs once when a spec is loaded. After that, internal code trusts the data and uses strict types. No inline defensive checks scattered across modules.
2. **Two-tier fixture handling.** Tighten validation immediately. When old fixtures (`cv_batch.json`, `cv_batch_old.json`, `mockGraphSpec.ts`, story specs) fail validation, fix them lazily as their tests break. Regenerate from a real `pipelex run ... --graph` when a source `.mthds` exists; otherwise update or retire the fixture.
3. **Throw on unknown `PipeType`.** When pipelex emits a class name mthds-ui doesn't recognize, the validator throws. Adding a new pipe class in pipelex becomes a forcing function for an mthds-ui update.
4. **Description / domain_code: UNBLOCKED — verified in pipelex 0.28.0.** `NodeSpec.description` and `NodeSpec.domain_code` are in `pipelex/graph/graphspec.py` as of 0.28.0, and the in-process `GraphTracer` populates both on every pipe-call node from `PipeAbstract.description` / `.domain_code` (required `str` fields). Confirmed non-empty on every node across real `--graph` dry-runs. The pipelex `feature/Update-html-mthds-ui` work has shipped. Phase 11 is no longer blocked — the description/domain_code tightening can fold into Phases 2/3/5 alongside the other required-field work instead of running last.

## Pipelex guarantees this plan relies on

Verified against pipelex **0.28.0** — `pipelex/graph/graphspec.py` (model), `graph_tracer.py` (in-process emitter), `core/pipes/pipe_abstract.py` (emission call site), and two real `pipelex run ... --graph` dry-runs. Every node a real run emits has `kind ∈ {"controller", "operator"}`: the tracer sets `NodeKind.CONTROLLER if is_controller else NodeKind.OPERATOR`, so in practice every node is a pipe-call node. The other `NodeKind` values (`pipe_call`, `input`, `output`, `artifact`, `error`) exist in the enum but are only used by the mermaid renderer — they are never serialized into a `graphspec.json`.

Per pipe-call node:

- Always non-null: `id`, `kind`, `status`, `pipe_type`, `pipe_code`, `description`, `domain_code`, `io` (with `inputs[]` / `outputs[]` arrays), `io.inputs[].name`, `io.outputs[].name`.
- Always present per node (may be empty `{}`): `tags`, `metrics`, `execution_data`.

Top level:

- Always present: `graph_id`, `created_at`, `pipeline_ref`, `nodes`, `edges`, `meta`, `pipe_registry`, `concept_registry`.
- `meta.format === "mthds"` is enforced by the `ensure_format_meta` model validator in pipelex, so it is always present on a 0.28.0-generated spec.
- `pipe_registry` / `concept_registry` are populated when the `data_inclusion.pipe_and_concept_registry` flag is on (default for `--graph`); the keys are always present, minimally `{}`.
- ⚠️ **Correction:** `tags`, `metrics`, `execution_data` are **node-level only** — NOT top-level `GraphSpec` fields. The pipelex `GraphSpec` model uses `extra="forbid"`; a top-level validator must not look for them there.

Edges: `id`, `source`, `target`, `kind` always non-null.

Legitimately nullable / optional (keep tolerant): `io.inputs[].concept` (nominally optional), `io.inputs[].digest`, `io.outputs[].digest`, `error` (only on FAILED), `edge.label` (null on `contains`), `edge.source_stuff_digest` / `edge.target_stuff_digest` (only on batch/parallel edges), node `timing` (nullable in the model).

**`PipeType` union is in sync.** pipelex declares exactly 10 pipe `type` literals — operators `PipeLLM, PipeExtract, PipeCompose, PipeImgGen, PipeSearch, PipeFunc`; controllers `PipeSequence, PipeParallel, PipeCondition, PipeBatch` — matching mthds-ui's `PipeType` exactly as of 0.28.0. Phase 8's runtime check has no unknown types to catch today; it is a forcing function for future pipelex additions.

**⚠️ `PipeStatus` gap.** pipelex `NodeStatus` has `scheduled, running, succeeded, failed, skipped, canceled`. mthds-ui `PipeStatus` is missing `"canceled"`. A real run emits `status: "canceled"` for any node still running at teardown — `"canceled"` must be added to the union (see Phase 2).

---

## Phase 0 — Foundation: validator module scaffold

Create the validation surface and its test harness before adding any rules.

- [ ] Add `src/graph/validateGraphSpec.ts` exporting `validateGraphSpec(raw: unknown): GraphSpec` and `class GraphSpecValidationError extends Error`. The error carries a `path: string` (e.g. `nodes[3].io.inputs[0].name`) and a `message`.
- [ ] Add `src/graph/__tests__/validateGraphSpec.test.ts` with one passing happy-path test using a minimal valid spec (build via `makeMinimalSpec()` in `testUtils.ts`).
- [ ] Verify error type has a stable, greppable name: `error.name === "GraphSpecValidationError"`, error message includes the offending path.
- [ ] Add re-export from `src/graph/index.ts`.

---

## Phase 1 — Validate top-level GraphSpec shape

TDD pattern for every item below: red (failing test) → green (validator throws on bad input, accepts good input) → refactor.

- [ ] Test+impl: throw if `raw` is not an object.
- [ ] Test+impl: throw if `nodes` is missing or not an array. Path: `nodes`.
- [ ] Test+impl: throw if `edges` is missing or not an array. Path: `edges`.
- [ ] Test+impl: throw if `meta` is missing or `meta.format !== "mthds"`. Path: `meta.format`. (Catches non-pipelex JSON.)
- [ ] Test+impl: accept missing `pipe_registry` / `concept_registry` (treat as `{}` — these are gated by pipelex `data_inclusion` flag and legitimately empty).
- [ ] Test+impl: when `pipe_registry` is present it must be an object (not array, not null).

---

## Phase 2 — Validate node-level required fields

Each node in `nodes[]`. Path prefix: `nodes[i]`.

- [ ] Test+impl: `id` is a non-empty string.
- [ ] Test+impl: `kind` is one of the `NodeKind` literal values. Throw on unknown.
- [ ] **Prerequisite:** add `"canceled"` to the `PipeStatus` union in `types.ts` — pipelex emits `status: "canceled"` for nodes still running at teardown and it is currently missing, so the validator below would wrongly reject a valid canceled node.
- [ ] Test+impl: `status` is one of the `PipeStatus` literal values. Throw on missing or unknown. (Removes need for `?? "scheduled"` fallback at `pipeCardPayload.ts:66`, `PipeDetailPanel.tsx:72`, `PipeCardBase.tsx:56`.)
- [ ] Test+impl: when `kind ∈ {"controller", "operator"}`, `pipe_code` is a non-empty string. (Removes need for `pipe_code || node.id` fallback at `pipeCardPayload.ts:35`, `graphBuilders.ts:38`, `graphControllers.ts:164`.)
- [ ] Test+impl: when `kind ∈ {"controller", "operator"}`, `pipe_type` is a non-empty string. (See Phase 7 for strict union check.)
- [ ] Test+impl: `io` is an object (default-construct empty `{ inputs: [], outputs: [] }` if missing — pipelex always emits it, but tolerate absent key for forward compat with the model defaults).
- [ ] Test+impl: `io.inputs` is an array if present; same for `io.outputs`.

---

## Phase 3 — Validate IO items

Each entry in `node.io.inputs[]` and `node.io.outputs[]`. Path: `nodes[i].io.inputs[j]`.

- [ ] Test+impl: `name` is a non-empty string. (Removes `i.name ?? ""` at `pipeCardPayload.ts:39-44`, `input.name ?? "unnamed"` at `PipeDetailPanel.tsx:138, 158`.)
- [ ] Keep `concept` optional (pipelex model allows null even though it's populated in practice).
- [ ] Keep `digest` optional (legitimately absent for some IO).

---

## Phase 4 — Validate edges

Each entry in `edges[]`. Path: `edges[i]`.

- [ ] Test+impl: `id` is a non-empty string. (Removes synthetic `edge_${counter}` fallback at `graphBuilders.ts:151/183`.)
- [ ] Test+impl: `source` and `target` are non-empty strings.
- [ ] Test+impl: `kind` is one of the `GraphSpecEdgeKind` values.
- [ ] Keep `label`, `source_stuff_digest`, `target_stuff_digest` optional.

### Checkpoint A — Core validator complete

Status to record here when reached: validator exists, covers all required fields, throws with a clear path. Internal types in `types.ts` can now be tightened (optional → required) for the fields the validator guarantees. Decision point: ready to start removing consumer fallbacks.

---

## Phase 5 — Tighten TypeScript types for guaranteed fields

Now that the validator runs at the boundary, the runtime guarantee can be encoded in the type system. `src/graph/types.ts`:

- [ ] `GraphSpecNode.kind` → required `NodeKind` (was `kind?`).
- [ ] `GraphSpecNode.status` → required `PipeStatus`.
- [ ] `GraphSpecNode.io` → required `GraphSpecNodeIo` (no `?`).
- [ ] `GraphSpecNodeIo.inputs` / `outputs` → required `GraphSpecNodeIoItem[]`.
- [ ] `GraphSpecNodeIoItem.name` → required `string`.
- [ ] `GraphSpecEdge.id` → required `string` (currently `?`).
- [ ] Add a discriminated narrowing: type `PipeCallNode = GraphSpecNode & { kind: "controller" | "operator"; pipe_code: string; pipe_type: PipeType }` for code paths that only render pipe-call nodes.
- [ ] `make check` passes after type tightening (fixes compile errors at every site where the now-required fields are used).

---

## Phase 6 — Remove consumer fallbacks

For each call site, remove the fallback and verify behavior:

- [ ] `src/graph/pipeCardPayload.ts:35` — replace `node.pipe_code || node.id` with `node.pipe_code` (type guarantees presence). Add unit test that a valid spec produces the expected `pipeCode`.
- [ ] `src/graph/pipeCardPayload.ts:39-44` — drop `?? ""` on IO `name`. Keep `?? ""` on `concept` for now (still optional in pipelex).
- [ ] `src/graph/pipeCardPayload.ts:66` — replace `node.status ?? "scheduled"` with `node.status`.
- [ ] `src/graph/react/detail/PipeDetailPanel.tsx:69, 72, 108` — remove `?? "PipeFunc"`, `?? "scheduled"`, `?? "unknown"`. The literal `"unknown"` rendered as pipe code is the most user-visible offender.
- [ ] `src/graph/react/detail/PipeDetailPanel.tsx:138, 158` — drop `input.name ?? "unnamed"` and `output.name ?? "unnamed"`.
- [ ] `src/graph/react/nodes/pipe/PipeCardBase.tsx:56` — `STATUS_CONFIG[data.status]` is now exhaustive after type tightening; drop the `?? STATUS_CONFIG.scheduled` fallback. Compiler enforces all `PipeStatus` cases via `Record<PipeStatus, ...>`.
- [ ] `src/graph/graphBuilders.ts:38` — drop the `node.id.split(":").pop() || node.id` ID-synthesis.
- [ ] `src/graph/graphBuilders.ts:61-62` — drop `stuffInfo.name || "data"`. Keep `concept || ""` (optional in pipelex).
- [ ] `src/graph/graphControllers.ts:164` — drop the `controllerId.split(":").pop() || controllerId` synthesis.
- [ ] `src/graph/graphBuilders.ts:151/183` — drop the `"edge_" + edgeId++` synthesis (validator guarantees `edge.id`).
- [ ] After each removal, run `make test`. Failures in old fixtures are expected and feed Phase 8.

---

## Phase 7 — Tighten standalone loader

The standalone bundle is its own entry point and currently swallows JSON parse errors and silently coerces unknown direction/foldMode.

- [ ] Test+impl: `src/standalone/adapter.ts:23-27` — `parseEmbeddedJson` throws (or surfaces to a visible error UI) on malformed JSON instead of returning `null`. Decide between throw and a visible "config malformed" banner in the rendered page; the spirit of this audit is "loud, not silent" — pick throw + console.error, host page can catch.
- [ ] Test+impl: `src/standalone/viewerProps.ts:17-34` — `parseFoldMode` / `parseDirection` throw on unknown values instead of coercing to defaults. (Note: PR `234f909` already added an allowlist for direction; this step replaces silent coercion with a throw.)
- [ ] Add an end-to-end standalone test that feeds malformed JSON / bad direction and asserts the failure is observable (thrown error / console.error).

### Checkpoint B — Production paths tightened

Status to record: every production load path (library import + standalone bundle) runs through the validator and refuses malformed input. All `pipeCardPayload`, `graphBuilders`, `graphControllers`, `PipeDetailPanel`, `PipeCardBase` fallbacks are gone. Remaining work is fixture cleanup, `PipeType` strictness, `StuffViewer` display labels, and the pipelex-blocked description/domain_code work.

---

## Phase 8 — Throw on unknown PipeType

Pipelex sets `pipe_type` from `self.__class__.__name__`, so any new pipe class lands unrecognized.

- [ ] Test+impl: validator narrows `pipe_type` to the `PipeType` union; throws with a clear message naming the unrecognized class (so the fix in mthds-ui is obvious — add to `PipeOperatorType` or `PipeControllerType`).
- [ ] Add a single `KNOWN_PIPE_TYPES` set in `types.ts` derived from the union (so the runtime check stays in sync with the type).
- [ ] Document in `CLAUDE.md` (this repo's) that adding a new pipelex pipe class requires an mthds-ui update.

---

## Phase 9 — Regenerate fixtures (lazy, driven by test breakage)

Each fixture that breaks under the new validator is fixed individually rather than upfront.

- [ ] When a test fails: identify whether the fixture has a source `.mthds` bundle.
  - If yes: re-run `pipelex run bundle <bundle.mthds> --dry-run --mock-inputs --graph -o ./tmp` and copy the generated `graphspec.json` into the fixture path. (pipelex 0.28.0 names the output file `graphspec.json`, not `graph.json` — it lands under `<output>/<pipe>_output_NN/graphspec.json`.)
  - If no: hand-edit the fixture to satisfy the new contract (fastest for tiny test specs in `testUtils.ts`).
- [ ] Specific fixtures known to be at risk (audit them up front, fix as needed):
  - [ ] `src/graph/react/viewer/__stories__/mockGraphSpec.ts` (DRY_RUN_CATALOG / LIVE_RUN_CATALOG)
  - [ ] `src/graph/react/viewer/__stories__/extremeGraphSpecs.ts`
  - [ ] `src/graph/react/nodes/pipe/__stories__/edge-cases/edgeCaseData.ts`
  - [ ] `src/graph/react/detail/__stories__/_shared.tsx`
  - [ ] `src/graph/__tests__/testUtils.ts` factories (`makeMinimalSpec`, `makeParallelSpec`, `makeBatchSpec`, `makeNestedSpec`)
  - [ ] Any `graph.json` checked into the repo under test data
- [ ] `make test` + `make storybook` (browse a representative selection) clean by end of this phase.

---

## Phase 10 — StuffViewer display label cleanup

Lower severity, but in the same spirit. `src/graph/react/stuff/StuffViewer.tsx` invents user-visible strings (`"Data"`, `"Image content"`, `"stuff.png"`) when `stuff.name` is missing.

- [ ] Decide per call site (each in its own checkbox below) whether to throw or to render an explicit "Unnamed stuff" indicator. The data viewer is a different surface from the graph spec — a missing stuff name during runtime data display is more recoverable than a missing pipe code, so a visible placeholder may be preferable to throwing. Default suggestion: render `"(unnamed stuff)"` for `name`, throw if `digest` is missing.
- [ ] `StuffViewer.tsx:170` — JSON serialization catch returning `"[Unable to serialize data]"`. Replace with a typed error state rendered as a distinct UI block (not as if it were content).
- [ ] `StuffViewer.tsx:243, 311, 313, 315, 336, 342, 348, 351, 352, 357, 358, 380` — replace the `|| "stuff"` / `|| "Data"` / `|| "Image content"` / `|| "png"` patterns with an explicit "unnamed stuff" indicator and a thrown error on missing MIME for download.
- [ ] `src/graph/react/detail/ConceptDetailPanel.tsx:129, 131, 139` — `"ref"` / `"unknown"` / empty `digest` substitutions. The schema-type column should render a distinct "(unresolved type)" indicator instead of fabricated type names.
- [ ] `src/graph/react/detail/sections/PipeComposeDetail.tsx:25` — `from_path ?? "?"` arrow. Decide whether `from_path` is required in the pipelex spec; if yes, throw via the validator. (Needs a small follow-up audit of the `PipeCompose` blueprint serialization.)

---

## Phase 11 — description / domain_code required (UNBLOCKED — verified in 0.28.0)

No longer blocked: pipelex 0.28.0 ships `NodeSpec.description` and `NodeSpec.domain_code` and populates both on every pipe-call node (see "Pipelex guarantees" above). Prefer folding the validator rule into Phase 2 and the `types.ts` change into Phase 5 rather than running this strictly last; the checkboxes remain here so nothing is missed.

- [x] Confirmed pipelex 0.28.0 includes `NodeSpec.description` and `NodeSpec.domain_code`, populated from `PipeAbstract`'s required `str` fields via `GraphTracer.on_pipe_start`.
- [ ] Add `domain_code?: string` to `GraphSpecNode` in `types.ts` (currently absent).
- [ ] Validator: for pipe-call nodes, require `description` and `domain_code` to be non-empty strings.
- [ ] Remove `defaultDescription()` (`src/graph/pipeCardPayload.ts:9-21`) and the synthesized-English fallback at line 59.
- [ ] Simplify the description precedence in `buildPipeCardPayload` (`pipeCardPayload.ts:51-60`): `node.description` is now guaranteed for pipe-call nodes; the registry lookup becomes a redundant safety net that can be deleted, leaving a single source of truth.
- [ ] Regenerate any fixtures still missing the fields (Phase 9 pattern).

---

## Out of scope (intentionally not addressed)

Items the audit flagged that are _not_ anti-pattern under the principle above:

- `inputs ?? []` and similar empty-collection defaults when an empty collection is a valid state.
- `childCount ?? 0` (count identity).
- `DEFAULT_GRAPH_CONFIG` visual palette and direction defaults (visual config is not graph-spec data).
- `useResizable({ defaultWidth: 380 })` UI sizing.
- Theme / localStorage user-preference reads in the standalone adapter.
- `getPipeCardComponent(...) ?? PipeCardBase` (renderer registry fallback to the base component — not data fabrication).

## Open questions to revisit during implementation

- Does `from_path` in `PipeCompose` field specs have a required guarantee from pipelex? (Phase 10.)
- Should the standalone loader's "malformed JSON" failure be a thrown error (host page sees it), an in-page error UI, or both? Default: thrown error + `console.error` for visibility. Revisit if host-page UX demands a graceful in-page banner.
- Should the validator log a single summary line of what it accepted (node count, edge count) on success? Useful for debugging at the cost of a small log line on every load.
