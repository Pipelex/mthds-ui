# Foldable Pipe Controllers — Implementation Plan

Design reference: `wip/foldable-controllers-design.md`

Each controller (`PipeSequence`, `PipeParallel`, `PipeCondition`, `PipeBatch`) gets a per-instance fold/expand toggle. Folded → renders as a `PipeCardBase` (same chrome as an operator card). Expanded → renders as today (group wrapper). Default: all expanded — zero behavior change for existing consumers.

This plan is sequenced bottom-up: pure graph logic first, then components, then `GraphViewer` integration, then stories. Each phase has a checkpoint where work can hand off cleanly.

---

## Phase 1 — Type broadening & payload builder

Goal: make `PipeCardData` representable for any pipe type, and extract a reusable function that builds a card payload from a `GraphSpecNode`.

### Implementation

- [ ] Broaden `PipeCardData.pipeType` from `PipeOperatorType` to `PipeType` in `src/graph/react/nodes/pipe/pipeCardTypes.ts`.
- [ ] Add optional `onExpand?: () => void` field to `PipeCardData` — when present, the card renders an unfold button.
- [ ] Add controller entries to `PIPE_TYPE_BADGES` in `src/graph/react/nodes/pipe/PipeCardBase.tsx`: `PipeSequence` → "Sequence", `PipeParallel` → "Parallel", `PipeCondition` → "Condition", `PipeBatch` → "Batch".
- [ ] Register controller types in `PIPE_CARD_REGISTRY` in `src/graph/react/nodes/pipe/pipeCardRegistry.ts`, all mapped to `PipeCardBase` for v1.
- [ ] Update `getPipeCardComponent` to accept `PipeType` (or keep `PipeOperatorType` and broaden at the call site — pick whichever produces less churn).
- [ ] Extract a reusable `buildPipeCardPayload(node: GraphSpecNode, graphspec: GraphSpec, analysis: DataflowAnalysis): PipeCardData` function. Moves the existing inline logic from `graphBuilders.ts` into a single helper. New module `src/graph/pipeCardPayload.ts` (pure TS, no React import).
  - Pulls `inputs` / `outputs` from `node.io` (missing `name`/`concept` → empty string).
  - Description fallback chain: `node.description` → `graphspec.pipe_registry?.[node.pipe_code ?? ""]?.description` → for controllers (`analysis.controllerNodeIds.has(node.id)`) leave `undefined`; for operators fall through to `defaultDescription(node.pipe_type, node.pipe_code)`. The operator/controller distinction must use `analysis.controllerNodeIds` (single source of truth), NOT string-matching against `pipe_type`.
  - Status fallback: `node.status ?? "scheduled"`.
  - Pipe type: read `node.pipe_type` directly. If it is `undefined`, throw `Error("Node <id> missing pipe_type — GraphSpec invariant violated")`. Do NOT silently fall back to `PipeFunc` (the current `graphBuilders.ts:69` hack is removed as part of this refactor).
- [ ] Refactor `buildDataflowGraph` to use `buildPipeCardPayload` for operator nodes (no behavior change — just deduplication).

### Tests (`src/graph/__tests__/pipeCardPayload.test.ts`)

- [ ] Builds operator payloads from a `GraphSpecNode` with full `io`.
- [ ] Builds controller payloads with `pipeType: PipeSequence | PipeParallel | PipeCondition | PipeBatch`.
- [ ] Description falls back to `pipe_registry[code].description` when node has none.
- [ ] Description is `undefined` when both node and registry have none (controllers).
- [ ] Description uses the operator default fallback when both node and registry have none (operators).
- [ ] Status defaults to `"scheduled"` when absent.
- [ ] Inputs/outputs with missing `name` or `concept` get empty strings.

### Checkpoint 1

`make check && make test` is green. `buildDataflowGraph` still produces identical output for operators (no folding involved yet). Controller card payloads are buildable but not yet emitted anywhere.

---

## Phase 2 — Fold transformation (pure graph logic)

Goal: a single pure function `applyFolds()` that takes the dataflow graph, the analysis, the graphspec, and a set of folded controller IDs, and returns a transformed graph where folded controllers are leaf pipe-card nodes and their descendants are hidden.

### Implementation

Create `src/graph/graphFolds.ts`:

- [ ] Helper `buildContainmentChain(nodeId, childToCtrl)` → ordered list of ancestor controller IDs from immediate parent up to root. Used to compute outermost folded ancestor.
- [ ] Helper `outermostFoldedAncestor(nodeId, childToCtrl, foldedSet)` → the topmost (closest to root) folded ancestor, or `null` if none. Walk up via `childToCtrl`; remember last folded ID seen; that's outermost.
- [ ] Main function `applyFolds(graphData, analysis, graphspec, foldedSet, onToggleFold?)` → `{ nodes, edges, analysis }`.
  - Build `childToCtrl = buildChildToControllerMap(graphspec, analysis)` once.
  - Filter input nodes: drop any node whose `outermostFoldedAncestor(...)` is set (it's hidden inside a fold).
  - For each ID in `foldedSet` that is **not** itself inside another folded controller:
    - Find the corresponding `GraphSpecNode` in `graphspec.nodes`.
    - Build a `PipeCardData` via `buildPipeCardPayload(node, graphspec)`. Inject `onExpand: () => onToggleFold?.(id)`.
    - Append a new `GraphNode` with `type: NODE_TYPE_PIPE_CARD`, `isController: true`, `isPipe: false`, and `pipeCardData` set. (We keep `isController: true` so external consumers can still differentiate via `node.data.isController`.)
  - Rewrite edges:
    - `eff(id) = outermostFoldedAncestor(id) ?? id`.
    - For each edge, compute `newSrc = eff(source)`, `newDst = eff(target)`.
    - Drop if `newSrc === newDst`.
    - Dedup key: `${newSrc}->${newDst}|${edge._batchEdge ? "batch" : "data"}`. The bucket separator ensures a `batch_item` edge and a regular data edge between the same pair are kept as two distinct edges (visual differentiation matters).
    - Preserve the first-seen edge's style and `_batchEdge` flag.
    - **Recompute `_crossGroup`** against the folded containment: build a fresh `childToCtrl` from the updated analysis, then re-classify each surviving edge using the same rule as `graphBuilders.ts:248-261`. The pre-fold `_crossGroup` flag is stale after folding (an edge that was cross-group between two sibling controllers may now be a normal edge into/out of a folded card). Drop the stale flag before recomputing.
  - Update analysis:
    - `controllerNodeIds`: drop folded IDs and any controller whose outermost folded ancestor is set.
    - `containmentTree`: remove entries for dropped controllers; for surviving controllers, filter their children list to drop hidden ones.
    - `stuffProducers` / `stuffConsumers` / `stuffRegistry`: left untouched (they describe the underlying GraphSpec, not the rendered view). Downstream code paths that use these (mainly `applyControllers` and `elkGraphBuilder` via `buildChildToControllerMap`) operate on the updated analysis's controller set, so unreachable stuff entries are harmless.
  - Return `{ nodes, edges, analysis }`. The function is pure — no mutations to inputs.

### Tests (`src/graph/__tests__/graphFolds.test.ts`)

- [ ] Empty fold set is a no-op (returns deeply-equal nodes/edges/analysis).
- [ ] Single folded controller:
  - Hides all direct child operators.
  - Hides stuff nodes contained in the controller.
  - Emits a single pipe-card node for the controller, carrying `pipeCardData` with the controller's `io` mapped to inputs/outputs.
  - External edges into/out of the children are reattached to the controller card.
  - Internal-only edges (both endpoints inside) are dropped.
- [ ] Nested folds (outer + inner): outermost wins; only the outer controller's card appears; the inner controller is not in the rendered nodes.
- [ ] Nested folds (only inner): outer is still a regular expanded controller in the analysis; inner appears as a pipe-card; outer's `containmentTree` entry is updated to point at the inner controller's card instead of its descendants.
- [ ] Edge dedup: multiple internal pipes consuming the same external producer collapse to a single edge in/out of the card.
- [ ] Batch/parallel synthetic edges (`batch_item`, `batch_aggregate`, `parallel_combine`) are rewritten with the same rules and dropped when fully internal.
- [ ] Edge bucketing: a `_batchEdge` edge and a regular data edge with the same `(newSrc, newDst)` survive as two distinct edges (dedup buckets differ).
- [ ] Self-loop dropping: edges where both endpoints rewrite to the same folded controller are removed.
- [ ] **`_crossGroup` recomputation (REGRESSION):** an edge marked `_crossGroup: true` pre-fold has its flag re-evaluated post-fold. Test scenario: two sibling controllers with a cross-group edge, fold one of them — assert the surviving edge is no longer marked `_crossGroup` (it now enters/exits a folded card, not between sibling groups).
- [ ] Unknown IDs in the fold set are silently ignored (no error, no spurious nodes).
- [ ] `onToggleFold` is wired into the emitted card's `pipeCardData.onExpand` and invoking it calls the supplied callback with the controller ID.
- [ ] The original input nodes/edges/analysis are unchanged (purity check via deep-equal before/after).

### Checkpoint 2

`applyFolds` is tested and pure. Nothing in the rendering pipeline calls it yet — operators and controllers still render exactly as before. Ready to wire in.

---

## Phase 3 — Component changes

Goal: surface the fold and expand affordances in the existing components. No data flow yet — just the buttons and their callbacks.

### Implementation

- [ ] `src/graph/react/nodes/pipe/PipeCardBase.tsx`:
  - Render an "expand" / "unfold" button in the card header when `data.onExpand` is set. Place it on the right of the status dot, before/inside the header row. Suggested glyph: `⤢` or `[+]` — use a button with class `pipe-card-expand`.
  - Stop propagation on the click so it doesn't trigger the parent `onNodeClick`.
- [ ] `src/graph/react/nodes/controller/ControllerGroupNode.tsx`:
  - Extend `ControllerGroupData` with `onToggleFold?: () => void`.
  - Render a fold button in the header bar (right side) when `onToggleFold` is set. Suggested glyph: `[–]` or `⤡`. Class `controller-group-fold`.
  - Stop propagation on click.
- [ ] `src/graph/react/graph-core.css`:
  - Styles for `.pipe-card-expand` and `.controller-group-fold` — small icon buttons with hover state.
  - Optional visual differentiation for controller cards: tint the `.pipe-card-badge` background per controller type. New rules keyed on the badge text or on an additional class `.pipe-card-badge--controller` (set conditionally in `PipeCardBase`).
- [ ] No new CSS files (rule: avoid extending `tsup.config.ts`'s CSS-external list unless necessary). All new styles live in the already-bundled `graph-core.css`.
- [ ] Update `controllerNodeTypes` export if any signature changed (it currently maps `controllerGroup` → `ControllerGroupNode` — should be fine).
- [ ] `src/graph/react/viewer/GraphToolbar.tsx`: add "fold all" / "expand all" buttons.
  - Two new optional props:
    - `onFoldAll?: () => void` and `onExpandAll?: () => void` (callback presence drives rendering, matching the existing zoom/fit pattern).
    - `foldAllDisabled?: boolean` and `expandAllDisabled?: boolean` (toolbar applies the `disabled` HTML attribute + a CSS class for greyed styling; the parent owns the state predicate).
  - Render both buttons in a new section right after the `showControllers` toggle, fronted by a `graph-toolbar-separator`. Only render the section when **either** callback is defined (so when `showControllers=false` and the parent passes neither, the section disappears entirely).
  - New SVG icons defined inline in `GraphToolbar.tsx` (same pattern as the existing `BOXES_ICON`, `FIT_VIEW_ICON`):
    - `FOLD_ALL_ICON` — arrows-into-box glyph (suggests "collapse everything into one").
    - `EXPAND_ALL_ICON` — arrows-out-of-box glyph (suggests "expand everything back").
    - Use the same 14×14 viewBox / stroke style as the others — don't break the visual rhythm.
  - Accessibility: `aria-label` and `title` both set ("Fold all controllers" / "Expand all controllers"). When disabled, append " (nothing to fold)" / " (nothing to expand)" to the title so hover gives the reason.
  - **No new CSS file** — extend `GraphToolbar.css` in place to add a disabled-state rule (`.graph-toolbar-btn:disabled { opacity: 0.4; cursor: not-allowed; }`) if one doesn't already exist. Per CLAUDE.md's CSS packaging rule, do not add a new `.css` file (avoids tsup config churn).

### Tests (`src/graph/__tests__/`)

- [ ] Static rendering check for `PipeCardBase` with `pipeType: "PipeSequence"` — badge says "Sequence", description renders when provided, no expand button without `onExpand`.
- [ ] With `onExpand` set, the expand button renders and clicking it invokes the callback (use `vi.fn()`).
- [ ] `ControllerGroupNode` with `onToggleFold` set renders the fold button; click invokes the callback.
- [ ] Status dot still renders correctly for controller card payloads.
- [ ] `GraphToolbar` with neither `onFoldAll` nor `onExpandAll` does NOT render the fold-all section (and not even the separator).
- [ ] `GraphToolbar` with both callbacks defined renders two buttons; clicking each invokes its callback once with no args.
- [ ] `foldAllDisabled` / `expandAllDisabled` apply the `disabled` attribute and prevent the click handler from firing (use `vi.fn()` and assert it's NOT called when disabled).
- [ ] Disabled buttons carry the "(nothing to fold)" / "(nothing to expand)" title suffix.

### Checkpoint 3

The two new buttons render and fire callbacks. No data pipeline integration yet — clicking them in a live GraphViewer does nothing. Pure component-level testing only.

---

## Phase 4 — GraphViewer integration

Goal: wire `applyFolds` into the rendering pipeline, add fold state to `GraphViewer`, and hook the buttons up so the graph actually re-renders.

### Implementation

- [ ] Add state to `GraphViewer`:
  - `[foldedControllers, setFoldedControllers] = useState<Set<string>>(new Set())`.
  - Reset to empty when `graphspec` changes (mirror the existing `setExpandedControllers(new Set())` reset).
- [ ] **Uncontrolled only in v1.** Do NOT add `foldedControllers` / `onFoldedControllersChange` props. The controlled/uncontrolled mixing pattern is a footgun (state coherence on prop changes, ref staleness across modes), no internal consumer is asking for it, and the existing `expandedControllers` state is also uncontrolled — keep the API symmetric. Add controlled mode in a follow-up when a real consumer surfaces.
- [ ] Add `toggleFold` callback (mirrors `toggleCollapse`):
  ```ts
  const toggleFold = useCallback((controllerId: string) => {
    setFoldedControllers((prev) => {
      const next = new Set(prev);
      if (next.has(controllerId)) next.delete(controllerId);
      else next.add(controllerId);
      return next;
    });
  }, []);
  ```
- [ ] Hold `foldedRef` and `toggleFoldRef` (same pattern as `expandedRef` / `toggleCollapseRef`) so async effects always read the latest values.
- [ ] Insert `applyFolds` in the pipeline. **Folding changes the structure, so it triggers a re-layout** (unlike `expandedControllers` which only re-runs `applyControllers`).
  - In the build-and-layout effect:
    ```
    const { graphData, analysis } = buildGraph(graphspec, edgeType);
    const folded = applyFolds(graphData, analysis, graphspec, foldedRef.current, toggleFoldRef.current);
    initialDataRef.current = { nodes: folded.nodes, edges: folded.edges, _analysis: folded.analysis, _graphspec: graphspec };
    // Layout from folded nodes/edges/analysis
    const layouted = await getLayoutedElements(folded.nodes, folded.edges, currentDirection, currentLayoutConfig, graphspec, folded.analysis);
    ```
  - Also recompute when `direction` / `layoutConfig` changes — already runs `getLayoutedElements`, just needs to use the folded data.
- [ ] Add a new effect that re-runs the full build+layout when `foldedControllers` changes. Pattern mirrors the `graphspec` effect but reads from `initialDataRef`-pre-fold cache instead of calling `buildGraph` again. To support this, keep a _separate_ cache `rawGraphDataRef` holding the un-folded `buildGraph` output, and re-derive `initialDataRef` from `rawGraphDataRef` + current `foldedControllers` on each change.
- [ ] `applyControllers` keeps working unchanged — the folded analysis it receives already excludes folded controllers from `controllerNodeIds`, so it just doesn't wrap them.
- [ ] When the layout cache is reused for `expandedControllers` / `statusMap` changes, the cached nodes already include any folded controller cards, so no change needed to those effects.
- [ ] Wire the toolbar's fold-all / expand-all into `GraphViewer`:
  - Compute `allControllerIds = analysis?.controllerNodeIds ?? new Set<string>()` from the latest analysis (use the **raw** un-folded analysis cached in `rawGraphDataRef`, NOT the folded `_analysis` — the folded one has folded controllers pruned, and we need to be able to refold them).
  - Pass to `GraphToolbar` only when `showControllers === true` AND `allControllerIds.size > 0` (otherwise pass `undefined` for both, so the toolbar hides the section).
  - `onFoldAll = () => setFoldedControllers(new Set(allControllerIds))`.
  - `onExpandAll = () => setFoldedControllers(new Set())`.
  - `foldAllDisabled = foldedControllers.size === allControllerIds.size` (every controller already folded).
  - `expandAllDisabled = foldedControllers.size === 0` (nothing folded — note: `> allControllerIds.size` cannot happen since fold IDs not in the controller set get silently ignored by `applyFolds`, but the disabled check uses set-equality on size for simplicity).
  - Edge case: when `graphspec` changes and `setExpandedControllers(new Set())` resets state, also reset `setFoldedControllers(new Set())` (already in the plan). The toolbar's disabled states will follow naturally.

### Tests (`src/graph/__tests__/`)

- [ ] Integration test in `integration.test.ts` (or new `foldIntegration.test.ts`):
  - Build → fold → layout → verify the folded controller appears as a `NODE_TYPE_PIPE_CARD` with handles.
  - Verify children are absent.
  - Verify edges connect external inputs/outputs to the controller card.
- [ ] Add to `controllerToggle.test.ts` (or new) — combined fold + showControllers scenarios:
  - `showControllers=false` + folded set populated → folded set is silently inert.
  - `showControllers=true` + folded controller → card appears.
- [ ] Verify `foldedControllers` resets to empty when `graphspec` changes.
- [ ] Toolbar wiring integration: after `onFoldAll` is invoked, every controller in the spec renders as a folded pipe card (modulo outermost-wins rule — only root controllers actually appear, descendants are hidden). After `onExpandAll`, the original group wrappers are back. Verify via play test or DOM count check.

### Checkpoint 4

`GraphViewer` honors `foldedControllers` state. Clicking the fold button on a `ControllerGroupNode` collapses the group to a card; clicking the expand button on a card restores the group. Re-layout happens automatically.

---

## Phase 5 — Storybook demo

Goal: a dedicated story demonstrating the feature, plus play tests that exercise the fold/expand interactions.

### Implementation

- [ ] Create `src/graph/react/viewer/__stories__/FoldableControllers.stories.tsx`:
  - Default story uses the CV-screening LIVE fixture from `mockGraphSpec.ts` (has multiple nested controllers — good showcase).
  - Story title: `Graph/FoldableControllers`.
  - Variants (each its own named export):
    - `AllExpanded` — default state, baseline.
    - `RootFolded` — story renders with a wrapper component that pre-folds the root controller after the first render by clicking the fold button programmatically (since `foldedControllers` is uncontrolled — see Phase 4). Shows the maximally-zoomed-out view: pipeline inputs → one card → outputs.
    - `OneBranchFolded` — same wrapper pattern, folds an inner `PipeBatch` or nested `PipeSequence`. Demonstrates partial fold.
    - `EverythingFolded` — pre-folds every controller. Effectively equivalent to `RootFolded` (because of outermost-wins rule) but verifies that.
  - Since the API is uncontrolled (Phase 4), the pre-folded variants drive state via a small wrapper that simulates clicks in `useEffect` on mount. Add an `InteractivePanel` story that includes a floating sidebar listing the controllers — clicking a checkbox simulates clicking the corresponding fold button. (No controlled prop is exposed to consumers; the panel just drives the same affordances a user would.)
  - `ToolbarFoldAll` story — uses the CV-screening LIVE fixture, default toolbar visible. Play test: locate the "Fold all controllers" toolbar button, click it, assert the graph now shows the root controller(s) as `pipe-card` elements and no `controller-group-node` elements. Click "Expand all controllers", assert the original `controller-group-node` elements are back.
  - `ToolbarDisabledStates` story — verify the buttons render with the `disabled` attribute and the title-suffix copy under both edge states (nothing folded vs everything folded). Use `toBeDisabled()` from `storybook/test` for the assertion.
- [ ] Play tests (Storybook 10 + `storybook/test`):
  - `AllExpanded.play`: assert that the root controller renders as a group node (has class `controller-group-node`).
  - `RootFolded.play`: assert that the root controller renders as a pipe card (has class `pipe-card`) and that no `controller-group-node` for it exists.
  - Interactive test: click the fold button on an expanded controller → assert it becomes a pipe card. Click expand → assert it becomes a group again.
  - Use `toBeInTheDocument()` not `toBeVisible()` for assertions on nodes inside the ReactFlow canvas (out-of-viewport rule from CLAUDE.md).
- [ ] Add the story file to whatever index or registry exists (Storybook auto-discovers `*.stories.tsx`, so likely nothing extra).

### Tests

The play tests above run automatically via `@storybook/addon-vitest` in the `storybook` Vitest project. No separate unit test file needed for the story.

### Checkpoint 5

Storybook has a runnable demo. Play tests pass headlessly. Visual confirmation possible via `make storybook` (port 6006) + `/browse` skill per CLAUDE.md.

---

## Phase 6 — Final validation

Goal: cross-check the feature against the broader test suite, visual stories, and the workflow rules from CLAUDE.md.

- [ ] `make check` (lint + format + typecheck) green.
- [ ] `make test` green.
- [ ] `make test-coverage` — fold-transformation module hits the 90% statement / 85% branch threshold. Add tests if it's under.
- [ ] Visual verification via `make storybook` + `/browse`:
  - `Graph/FoldableControllers` — all four variants render without overlapping nodes or broken edges.
  - `Graph/PipelineSmoke` — confirm the existing pipelines (CV screening, nested controllers, wide parallels) still render correctly with the new fold buttons on group headers. No regressions.
  - `Graph/StatusMap` — confirm status overrides still work on folded controller cards (status dot updates).
- [ ] Manual click-test in Storybook:
  - Fold a controller → graph re-lays out cleanly.
  - Unfold it → graph returns to the expected expanded layout.
  - Fold the root sequence on the CV-screening pipeline → see a single card between pipeline inputs and outputs.
- [ ] Cross-reference final state against `wip/foldable-controllers-design.md` — flag any deviation in a follow-up note at the bottom of that file.

### Checkpoint 6

Feature ships. Design doc reflects what was actually built.

---

## Out of scope (deferred)

- Per-input / per-output ports on the folded card (single in/out for v1).
- Persisting fold state across remounts.
- Animated fold/expand transitions.
- Hover-revealing internal pipe count on a folded card.
- **Controlled-prop API** for `foldedControllers` / `onFoldedControllersChange` — defer until a real consumer needs it (existing `expandedControllers` is also uncontrolled).

## Open questions to confirm during implementation

- Glyph choice for the fold and expand buttons — pick during Phase 3.
- Whether controller cards need visual differentiation from operator cards (badge tint, border color) — propose two variants and pick during Phase 3 visual review.
- Whether `onExpand` should sit on `PipeCardData` or be passed as a separate prop to `PipeCardBase` — `PipeCardData` is simpler because the data flows through ReactFlow as a single payload; sticking with that unless something forces a refactor.
- Fold button visibility on group headers — always-shown vs hover-only. Recommendation: always-shown, matching the existing collapse button.

## Effect layering (Phase 4 reference)

For maintainers reading this later — the React effect order after fold integration:

1. **`graphspec` change** → fresh `buildGraph()` cached in `rawGraphDataRef`; `applyFolds(raw, foldedRef.current)` re-derives `initialDataRef`; full ELK layout; full controller wrapping.
2. **`foldedControllers` change** → re-derive `initialDataRef` from `rawGraphDataRef` + new fold set; full ELK layout; full controller wrapping. (Structural change ⇒ re-layout required.)
3. **`direction` / `layoutConfig` change** → re-layout from `initialDataRef` (already folded); re-wrap controllers.
4. **`showControllers` / `expandedControllers` change** → reuse `layoutCacheRef`; re-wrap controllers only. (Folded cards are already in the cache as leaf nodes.)
5. **`statusMap` change** → reuse `layoutCacheRef`; re-wrap; apply status overrides. (Folded cards have a `pipeCode` so statusMap can update their dot.)

Race coverage: each effect inherits the existing `let cancelled = false` pattern. No new race profile compared to today's `graphspec`/`direction` interplay.

---

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status       | Findings                                             |
| ------------- | --------------------- | ------------------------------- | ---- | ------------ | ---------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | —            | —                                                    |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | —            | —                                                    |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 1    | CLEAR (PLAN) | 7 findings, 1 regression test added, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 0    | —            | —                                                    |
| DX Review     | `/plan-devex-review`  | Developer experience gaps       | 0    | —            | —                                                    |

- **UNRESOLVED:** 0 — all findings folded into the plan as edits.
- **VERDICT:** ENG CLEARED — ready to implement. Plan refined inline.

### Scope amendments (post-review)

- **Toolbar "fold all" / "expand all"** — moved from OOS into scope. Component changes land in Phase 3 (Lane B), wiring in Phase 4, story coverage in Phase 5. Design call: two explicit buttons (not a toggle), hidden when `showControllers=false` or no controllers exist, individually disabled when their action would be a no-op.

### Findings summary

**Architecture (4)**

- **A1** — `_crossGroup` flag stale after fold rewrites. Plan now requires recompute against folded containment. **REGRESSION test added.**
- **A2** — Controlled-prop API for `foldedControllers` deferred to v2. Plan trimmed to uncontrolled-only, matching the existing `expandedControllers` pattern.
- **A3** — Effect-layer ordering documented in a new "Effect layering" section so the asynchronous re-layout interplay is legible to future maintainers.
- **A4** — `isController: true` on folded cards is correct. Verified against `GraphViewer.tsx:493` (click), `:506` (detail panel gate), `:562` (spec node lookup).

**Code quality (3)**

- **Q1** — Silent `|| "PipeFunc"` fallback in `graphBuilders.ts:69` removed by the refactor. `buildPipeCardPayload` now throws on missing `pipe_type` (GraphSpec invariant violation).
- **Q2** — Operator/controller distinction in the payload builder uses `analysis.controllerNodeIds.has(node.id)` (single source of truth), not string-matching against `pipe_type`. Signature changed to `(node, graphspec, analysis)`.
- **Q3** — Edge dedup key spelled out: `${newSrc}->${newDst}|${edge._batchEdge ? "batch" : "data"}`. A `batch_item` and a regular `data` edge between the same pair stay distinct.

**Tests**

- 100% coverage target for both new modules (`pipeCardPayload.ts`, `graphFolds.ts`). All paths enumerated in the coverage diagram above.
- One regression test added (`_crossGroup` recomputation) per finding A1.
- No critical silent-failure gaps.

**Parallelization**

- 2 parallel lanes (Phase 1+2 vs Phase 3) merge into a sequential Phase 4 → 5 → 6.
- One coordination point: pipe-card folder. Lane A owns `pipeCardTypes.ts` + `pipeCardRegistry.ts`; Lane B owns `PipeCardBase.tsx`.

### Lake Score: 7/7

Every finding chose the complete option:

- A1: recompute `_crossGroup` (complete) rather than accept stale flag (shortcut).
- A2: defer cleanly with explicit OOS entry (clear shipped boundary) rather than half-build controlled mode.
- Q1: throw on invariant violation (complete) rather than keep the silent fallback (shortcut).
- Q2/Q3: precise spec language so the implementer can't misinterpret.
- Tests: enumerated, with regression test for the edge style bug.
