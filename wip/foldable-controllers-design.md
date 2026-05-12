# Foldable Pipe Controllers — Design

## Motivation

Today, pipe controllers (`PipeSequence`, `PipeParallel`, `PipeCondition`, `PipeBatch`) render as **group wrappers** around their children — always expanded when `showControllers=true`. This is great for understanding the orchestration, but for large pipelines the result is visually heavy: a CV screening pipeline with three layers of nested controllers fills the canvas with chrome.

Controllers, however, have the same semantic shape as operators: they have a `description`, named `inputs`, a typed `output`, a `status`. So we have everything we need to render a folded controller as a single **pipe card**, identical chrome to an operator card. Folding is then a "zoom out" operation — trade visibility into the internals for a compact summary.

In the limit, folding the **root** controller of a pipeline (typically the top-level `PipeSequence`) gives you the highest-level view possible: pipeline inputs → one box → pipeline outputs.

## Concept

- A controller has two view states:
  - **Expanded** (default, current behavior): renders as a group wrapper containing its child operators and nested controllers.
  - **Folded** (new): renders as a single pipe card — same `PipeCardBase` chrome operators use today, with handles for its declared inputs/outputs.
- Each controller's fold state is **independent**. The user picks which ones to fold and which to expand.
- The fold/expand state is layered on top of `showControllers=true`. When `showControllers=false`, controllers are hidden entirely (current behavior, unchanged).
- The existing parallel/batch auto-collapse-after-5-children behavior **stays as-is**. It only applies to _expanded_ controllers (since folded ones hide all children anyway), so the two features are orthogonal.

## UX

| State              | Visual                                                                                                                                                  | Affordance                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Expanded (default) | Group wrapper as today. Header bar with icon + badge (e.g. "Sequence") + pipe code. Already shows the +N hidden collapse button when needed.            | **NEW: fold button** in the header — collapses the group to a card. |
| Folded             | Looks like an operator card. Header with badge ("Sequence" / "Parallel" / "Condition" / "Batch"), pipe code, status dot. Description + I/O pills below. | **NEW: expand button** in the header — opens the group back up.     |

The fold and expand buttons are conceptually the same toggle, rendered differently in each state. Default: all controllers expanded — no behavior change for existing consumers.

## Data we already have

For each controller, `GraphSpecNode` carries:

- `description?: string` — sometimes empty on the node; see fallback below.
- `io.inputs` — array of `{ name, concept, digest, ... }`. Confirmed populated for `PipeSequence` and `PipeBatch` in the CV-screening fixture.
- `io.outputs` — same shape, also populated.
- `status` — same enum as operators.
- `pipe_type` — narrows to `PipeControllerType`.
- `pipe_code` — the display name.

Description fallback chain:

1. `node.description`
2. `graphspec.pipe_registry[pipe_code].description` (when the registry is populated)
3. None — render the card without a description block (don't fabricate text for controllers).

The registry is empty in the fixture we have, so the runtime path through (2) needs to handle the missing-registry case gracefully.

## Algorithmic changes

### 1. Fold transformation (new pure-graph module)

A new pure function inserted in the pipeline, between `buildDataflowGraph()` and `getLayoutedElements()`:

```
applyFolds(graph, analysis, foldedControllerIds, graphspec)
  → { nodes, edges, analysis }
```

The transformation:

1. **Compute the "outermost folded ancestor" for every node** by walking the containment tree from each fold target downwards. Any descendant of a folded controller maps to that controller (with nested folds, the outermost wins).
2. **Hide** every node that has a folded ancestor (operators, intermediate stuff, nested controllers).
3. **Reattach the folded controller as a leaf-like pipe card** by attaching a `pipeCardData` payload (built from `node.io` + description fallback) and changing its node type to `NODE_TYPE_PIPE_CARD`.
4. **Rewrite edges** — for each `(src, dst)`:
   - `eff_src = foldedAncestor(src) ?? src`
   - `eff_dst = foldedAncestor(dst) ?? dst`
   - Drop if `eff_src === eff_dst` (edge fully inside a folded subgraph).
   - Else emit `(eff_src, eff_dst)`, preserving style.
5. **Deduplicate** parallel edges — multiple internal pipes consuming the same external stuff collapse to a single edge into the controller card.
6. **Update analysis** — strip folded controllers from `controllerNodeIds` and remove their entries from `containmentTree`. The rest of the pipeline (ELK build, post-layout spacing, `applyControllers`) treats them as leaf nodes.

This stage is pure and testable independently of any rendering.

### 2. Layout

`elkGraphBuilder.ts` doesn't need to know about folding directly — the updated analysis from step 1 makes folded controllers look like ordinary leaf nodes. `estimateNodeDimensions` already handles `NODE_TYPE_PIPE_CARD` with `pipeCardData`, so dimensions work without changes.

### 3. Controller group construction

`applyControllers` only wraps the controllers in `analysis.controllerNodeIds` — which the fold transformation has already pruned. Expanded controllers still wrap their children; folded ones don't.

## Component changes

### `pipeCardTypes.ts`

- Broaden `pipeType: PipeOperatorType` → `pipeType: PipeType`.
- Add `onExpand?: () => void`. When present, the card renders an unfold button in its header.

### `PipeCardBase.tsx`

- Extend `PIPE_TYPE_BADGES` to include the four controller types: `PipeSequence` → "Sequence", `PipeParallel` → "Parallel", `PipeCondition` → "Condition", `PipeBatch` → "Batch".
- Render the expand button when `onExpand` is set.
- Open question (see below): visually distinguish controller cards from operator cards (different border color or badge tint).

### `pipeCardRegistry.ts`

- Register the four controller types in `PIPE_CARD_REGISTRY`, all mapped to `PipeCardBase` for v1. Allows per-type customization later (e.g. show the branch condition expression for a folded `PipeCondition`).

### `ControllerGroupNode.tsx`

- Add a fold button in the header bar. Triggers `data.onToggleFold?.()`.
- Existing collapse button (for the >5-children auto-collapse) stays.

### `graphBuilders.ts` (or new `controllerCardBuilder.ts`)

- Add `buildControllerCardPayload(node, registry?) → PipeCardData` that mirrors what we already do for operators in `buildDataflowGraph`. Pulled into a separate module since it's used by the fold transformation, not the initial build.

### `GraphViewer.tsx`

- New state: `foldedControllers: ReadonlySet<string>` (uncontrolled `useState` by default, controlled prop when provided).
- New callback: `onToggleFold(controllerId)` flipping membership.
- Pipeline order:
  ```
  buildDataflowGraph(graphspec)
  → applyFolds(graph, analysis, foldedControllers, graphspec)     [NEW]
  → buildElkGraph (with the updated analysis)
  → getLayoutedElements
  → ensureControllerSpacing
  → applyControllers (only the still-expanded ones)
  → hydrateLabels
  ```
- Pass `onToggleFold` down to both `ControllerGroupNode` (via `data.onToggleFold`) and the folded pipe card (via `data.pipeCardData.onExpand`).

## State management

Mirror the existing `expandedControllers` pattern:

- Uncontrolled mode: internal `useState<Set<string>>(new Set())`, default empty (all expanded).
- Controlled mode: optional `foldedControllers` + `onFoldedControllersChange` props.
- The two state sets (`expandedControllers` for the >5-children auto-collapse, `foldedControllers` for fold/unfold) are independent. A controller can be folded _and_ in the expanded set — only the fold matters until it's unfolded.

## Edge cases

- **Nested folds.** If both a `PipeSequence` and its child `PipeBatch` are folded, the outer wins: every node inside the sequence (including the batch and the batch's children) maps to the sequence as its outermost folded ancestor. The batch never appears.
- **Stuff nodes at the boundary.** A stuff produced inside a folded controller and consumed outside is hidden; the producing edge becomes `(controller_id, external_stuff_id)`. Symmetric for the input side.
- **Self-loops created by folding.** When a stuff is produced and consumed entirely within a folded controller, both endpoints rewrite to the same controller ID — drop the edge.
- **Batch / parallel synthetic edges** (`batch_item`, `batch_aggregate`, `parallel_combine`). Same rewrite rules. If they cross a fold boundary, they reattach to the controller card; if they live entirely inside, they drop.
- **Root controller folded.** Perfectly fine — yields the pipeline's outermost inputs and outputs flowing through a single card. This is the marquee use case for the feature.
- **Folding a controller with no children rendered** (because of `showControllers=false`). The fold state is silently ignored — when controllers aren't shown, there's no card to render and no UI affordance to trigger fold/unfold. The state set stays put for when `showControllers` flips back on.

## Port assignment

V1: the folded card uses a single input port and a single output port — same as today's pipe cards. All redirected edges enter through the one input port and exit through the one output port. Simple, ships fast, the I/O pills inside the card are visual chrome only.

V2 (future): per-input / per-output ports keyed by `io.inputs[i].name` (or stuff digest), with edges attaching to the corresponding pill. Better visual mapping but considerably more layout work — defer.

## Backwards compatibility

Fully additive:

- Consumers that don't pass `foldedControllers` get today's behavior.
- The fold button on group headers is unconditional (always visible) — minor visual change but no semantic regression.

## Open questions

1. **Fold button visibility** on the group header — always shown, or only on hover? Defaulting to always-shown for discoverability; revisit if it crowds the header.
2. **Visual differentiation** between operator cards and folded controller cards. Probably yes: e.g. a different border color or a tinted badge. Without it, a folded `PipeSequence` looks identical to an operator and the user loses the cue that there's more inside. Suggest a subtle badge background tint per controller type, reusing the existing palette.
3. **Default description for controllers** when both `node.description` and `pipe_registry[code].description` are missing. Recommend: render no description block (don't fabricate). Operators have `defaultDescription` as a fallback, but for controllers a generic "Orchestrates steps" line is noise; better empty.
4. **Persistence** of fold state across remounts. Out of scope for v1. Consumers who want it can pass `foldedControllers` as a controlled prop and persist externally.
5. **Toolbar affordance for "fold all" / "expand all"**. Useful but not required for v1; per-controller fold ships the core feature.
6. **Storybook story coverage.** The CV-screening fixture has three nested controllers — ideal for visual testing. Add stories with: nothing folded; root folded; one inner branch folded; everything folded.

## Test coverage to add

- Unit tests for `applyFolds`:
  - Single folded controller hides direct children and rewrites in/out edges.
  - Nested folds: only the outermost matters.
  - Edge dedup when multiple internal consumers shared one external producer.
  - Self-loops dropped.
  - Stuff nodes contained in folded controllers are hidden.
  - Folded set referencing unknown controller IDs is ignored without error.
- Storybook play tests:
  - Click the fold button on an expanded controller → card appears, children gone.
  - Click the expand button on a folded card → original group reappears.
  - Fold the root sequence → only inputs, one card, outputs visible.
- Visual verification (per CLAUDE.md): confirm layout looks correct across CV screening, nested controllers, wide parallels — no overlapping nodes, edges route cleanly.

## Out of scope (v1)

- Per-input / per-output ports on the folded card.
- Toolbar "fold all" / "expand all" buttons.
- Persisting fold state.
- Animations between fold and expand transitions.
- Hover-revealing internal details of a folded controller without unfolding (a tooltip showing internal pipe count, e.g.).
