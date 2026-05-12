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
- [ ] Extract a reusable `buildPipeCardPayload(node: GraphSpecNode, graphspec: GraphSpec): PipeCardData` function. Moves the existing inline logic from `graphBuilders.ts` into a single helper. New module `src/graph/pipeCardPayload.ts` (pure TS, no React import).
  - Pulls `inputs` / `outputs` from `node.io`.
  - Description fallback chain: `node.description` → `graphspec.pipe_registry?.[node.pipe_code]?.description` → `undefined` for controllers; existing `defaultDescription(...)` text for operators.
  - Status fallback: `node.status ?? "scheduled"`.
  - Pipe type is `node.pipe_type` (must not be undefined — assert or fall back to `PipeFunc` only for operators, never fabricate a controller type).
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
    - Dedup by `(newSrc, newDst, kind-bucket)` where kind-bucket distinguishes batch/parallel synthetic edges from regular data edges (so a `batch_item` and a `data` edge between the same pair don't collapse into one).
    - Preserve the first-seen edge's style and `_batchEdge` / `_crossGroup` flags.
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
- [ ] Self-loop dropping: edges where both endpoints rewrite to the same folded controller are removed.
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

### Tests (`src/graph/__tests__/`)

- [ ] Static rendering check for `PipeCardBase` with `pipeType: "PipeSequence"` — badge says "Sequence", description renders when provided, no expand button without `onExpand`.
- [ ] With `onExpand` set, the expand button renders and clicking it invokes the callback (use `vi.fn()`).
- [ ] `ControllerGroupNode` with `onToggleFold` set renders the fold button; click invokes the callback.
- [ ] Status dot still renders correctly for controller card payloads.

### Checkpoint 3

The two new buttons render and fire callbacks. No data pipeline integration yet — clicking them in a live GraphViewer does nothing. Pure component-level testing only.

---

## Phase 4 — GraphViewer integration

Goal: wire `applyFolds` into the rendering pipeline, add fold state to `GraphViewer`, and hook the buttons up so the graph actually re-renders.

### Implementation

- [ ] Add state to `GraphViewer`:
  - `[foldedControllers, setFoldedControllers] = useState<Set<string>>(new Set())`.
  - Reset to empty when `graphspec` changes (mirror the existing `setExpandedControllers(new Set())` reset).
- [ ] Add controlled prop support (optional):
  - `foldedControllers?: ReadonlySet<string>` and `onFoldedControllersChange?: (next: ReadonlySet<string>) => void`. When `foldedControllers` is provided, treat it as controlled (don't keep internal state).
  - Convenience: if a consumer just wants to read it, expose via `onFoldedControllersChange` callback.
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

### Tests (`src/graph/__tests__/`)

- [ ] Integration test in `integration.test.ts` (or new `foldIntegration.test.ts`):
  - Build → fold → layout → verify the folded controller appears as a `NODE_TYPE_PIPE_CARD` with handles.
  - Verify children are absent.
  - Verify edges connect external inputs/outputs to the controller card.
- [ ] Add to `controllerToggle.test.ts` (or new) — combined fold + showControllers scenarios:
  - `showControllers=false` + folded set populated → folded set is silently inert.
  - `showControllers=true` + folded controller → card appears.
- [ ] Verify `foldedControllers` resets to empty when `graphspec` changes.

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
    - `RootFolded` — start with the root `PipeSequence` in `foldedControllers`. Shows the maximally-zoomed-out view: pipeline inputs → one card → outputs.
    - `OneBranchFolded` — start with one inner `PipeBatch` or nested `PipeSequence` folded. Demonstrates partial fold.
    - `EverythingFolded` — every controller in the fixture is in the fold set. Effectively equivalent to `RootFolded` (because of outermost-wins rule) but verifies that.
  - Each variant uses `foldedControllers` as a controlled prop. Render an interactive overlay (a small floating panel above the canvas) listing all controllers with a checkbox per controller, bound to local React state. Lets the reader toggle fold state and watch the graph rebuild.
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
- Toolbar "fold all" / "expand all" buttons.
- Persisting fold state across remounts.
- Animated fold/expand transitions.
- Hover-revealing internal pipe count on a folded card.

## Open questions to confirm during implementation

- Glyph choice for the fold and expand buttons — pick during Phase 3.
- Whether controller cards need visual differentiation from operator cards (badge tint, border color) — propose two variants and pick during Phase 3 visual review.
- Whether `onExpand` should sit on `PipeCardData` or be passed as a separate prop to `PipeCardBase` — `PipeCardData` is simpler because the data flows through ReactFlow as a single payload; sticking with that unless something forces a refactor.
