# Configurable Graph Toolbar Position

Make the floating toolbar on the method graph view positionable. Today it is hard-pinned to the top-right; the client project must be able to set / get / change its anchor.

## Status

- [x] Phase 1 — Types & pure logic (`types.ts`)
- [x] Phase 2 — `GraphToolbar` renders inside a ReactFlow `<Panel>`
- [x] Phase 3 — `GraphViewer` resolves & passes the position (controlled prop)
- [x] Phase 4 — CSS: orientation + separators
- [x] Phase 5 — Barrel exports
- [x] Phase 6 — Unit tests
- [x] Phase 7 — Storybook story + **mandatory visual verification**
- [x] Phase 8 — Docs + CHANGELOG

---

## Decisions (locked with the user)

1. **8 positions, model #1** — single enum, orientation _derived_ (no independent orientation axis):
   - 4 corners + `top-center` + `bottom-center` → **horizontal** bar
   - `center-left` + `center-right` → **vertical** bar
   - "Corners are horizontal, edges decide the rest." Corner orientation is NOT configurable.
2. **Use the ReactFlow standard** — anchor via `<Panel position=…>` from `@xyflow/react`. Its `PanelPosition` union is _exactly_ our 8 values (verified: `'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'center-left' | 'center-right'`, no `center-center`). Don't reinvent anchoring (CLAUDE.md "don't reinvent the wheel").
3. **No persistence in this library.** The client owns the value. Expose it as a **controlled, reactive prop** (`toolbarPosition`) — client sets it, reads its own state, and changes it by passing a new value; the viewer reacts immediately. No in-toolbar "move me" button. Mirror the existing `theme` prop's controlled/reactive pattern, NOT the `initialDirection` initial-only pattern.
4. **ReactFlow's own zoom Controls are hidden** — ignore collisions with them. The only overlap concern is the external `DetailPanel` on the right (see dodge note below). Default stays `top-right` for backward-compat.

### Position → orientation map (the one helper)

| Position        | Orientation  |
| --------------- | ------------ |
| `top-left`      | horizontal   |
| `top-center`    | horizontal   |
| `top-right`     | horizontal   |
| `bottom-left`   | horizontal   |
| `bottom-center` | horizontal   |
| `bottom-right`  | horizontal   |
| `center-left`   | **vertical** |
| `center-right`  | **vertical** |

Only `center-left` / `center-right` are vertical. Everything else is horizontal.

---

## Current code — what we're changing (verified line refs)

- **`src/graph/react/viewer/GraphToolbar.tsx`** — hand-rolled `<div className="graph-toolbar" style={{ right: rightOffset + 8 }}>` (line ~301). Renders direction/controllers/fold/zoom/theme buttons. Already exports pure helpers (`nextThemeMode`, `themeModeIcon`, `themeModeLabel`) — follow that pattern. Props interface at line 10.
- **`src/graph/react/viewer/GraphToolbar.css`** — `.graph-toolbar` currently owns `position: absolute; top: 8px; z-index: 11` (lines 5-13). `.graph-toolbar-separator` is `width:1px; height:18px` (line 68).
- **`src/graph/react/viewer/GraphViewer.tsx`**
  - `GraphToolbar` is rendered as a **sibling** of `<ReactFlow>` (line ~1002-1024), AFTER `<DetailPanel>`. It must move **inside** `<ReactFlow>…</ReactFlow>` (line ~945-971) because `<Panel>` requires ReactFlow context.
  - Passes `rightOffset={detailOpen ? panelWidth : 0}` (line 1023) — the detail-panel dodge. `detailOpen` (line 917) and `panelWidth` (line ~373) already exist.
  - `GraphViewerProps` interface at line 60; prop destructure at line 273. Existing `theme` prop (controlled/reactive) at lines 88, 280, 313 is the pattern to copy. `resolveExternalThemeMode` (exported pure resolver, line 211) is the precedence-resolver pattern to copy.
- **`src/graph/types.ts`** — const-object + derived-type pattern at `GRAPH_DIRECTION` (line 404) / `GRAPH_THEME_MODE` (line 453). `GraphConfig` interface at line 461. **This file is React-free and must stay so — do NOT import `@xyflow/react` here.**
- **`src/graph/index.ts`** → `export * from "./types"`; **`src/index.ts`** → `export * from "./graph"`. So anything exported from `types.ts` is already public. No new barrel lines needed _unless_ a helper lives outside `types.ts`.
- **`tsup.config.ts`** — `GraphToolbar.css` is **already** registered in both places (external array line 25, `cpSync` line 42). We are editing that file, not adding one → **no tsup change**.

### Detail-panel dodge (important nuance)

`<Panel>` positions relative to the full ReactFlow pane; the `DetailPanel` overlays the right `panelWidth`. Preserve today's behavior: **only right-anchored** positions (`top-right`, `center-right`, `bottom-right`) dodge, by passing `style={{ marginRight: 8 + rightOffset }}` to the Panel when `rightOffset > 0`. Left/center positions don't collide with a right panel in practice → no dodge. (Center-x positions could theoretically overlap at very narrow widths — explicitly **out of scope**; note it in the PR.)

---

## Phase 1 — Types & pure logic (`src/graph/types.ts`)

- [ ] Add the const + type, in the `GRAPH_DIRECTION` style, values matching `PanelPosition` exactly so they pass straight to `<Panel>`:
  ```ts
  export const TOOLBAR_POSITION = {
    TOP_LEFT: "top-left",
    TOP_CENTER: "top-center",
    TOP_RIGHT: "top-right",
    BOTTOM_LEFT: "bottom-left",
    BOTTOM_CENTER: "bottom-center",
    BOTTOM_RIGHT: "bottom-right",
    CENTER_LEFT: "center-left",
    CENTER_RIGHT: "center-right",
  } as const;
  export type ToolbarPosition = (typeof TOOLBAR_POSITION)[keyof typeof TOOLBAR_POSITION];
  export type ToolbarOrientation = "horizontal" | "vertical";
  ```
- [ ] Add the pure derived-orientation helper (React-free, unit-testable):
  ```ts
  export function toolbarOrientation(position: ToolbarPosition): ToolbarOrientation {
    return position === TOOLBAR_POSITION.CENTER_LEFT || position === TOOLBAR_POSITION.CENTER_RIGHT
      ? "vertical"
      : "horizontal";
  }
  ```
- [ ] Add `toolbarPosition?: ToolbarPosition;` to `GraphConfig` (line 461) with a doc comment. Consider adding a default in `DEFAULT_GRAPH_CONFIG` (`src/graph/graphConfig.ts`) of `TOOLBAR_POSITION.TOP_RIGHT` for the precedence chain — check how `direction`/`theme` defaults are set there and match.

## Phase 2 — `GraphToolbar` → ReactFlow `<Panel>`

- [ ] Import `Panel` (and `type PanelPosition`) from `@xyflow/react`, and `TOOLBAR_POSITION`, `toolbarOrientation`, `type ToolbarPosition` from `@graph/types`.
- [ ] Add a **compile-time** compatibility assertion (this is the React layer, so importing `PanelPosition` is allowed — it must NOT go in `types.ts`):
  ```ts
  // Guarantees our public enum stays a strict subset of ReactFlow's Panel positions.
  type _AssertToolbarPositionIsPanelPosition = ToolbarPosition extends PanelPosition ? true : never;
  const _toolbarPositionCompat: _AssertToolbarPositionIsPanelPosition = true;
  ```
- [ ] Add `position?: ToolbarPosition` to `GraphToolbarProps` (default `TOOLBAR_POSITION.TOP_RIGHT`). Keep `rightOffset` (semantics unchanged: how far the right detail panel intrudes).
- [ ] Wrap the existing button stack in a `<Panel>`:

  ```tsx
  const orientation = toolbarOrientation(position);
  const isRight =
    position === TOOLBAR_POSITION.TOP_RIGHT ||
    position === TOOLBAR_POSITION.CENTER_RIGHT ||
    position === TOOLBAR_POSITION.BOTTOM_RIGHT;
  const style: React.CSSProperties = { margin: 8 };
  if (isRight && rightOffset) style.marginRight = 8 + rightOffset;

  return (
    <Panel position={position} className="graph-toolbar-panel" style={style}>
      <div className={`graph-toolbar graph-toolbar--${orientation}`}>
        {/* …existing buttons, unchanged… */}
      </div>
    </Panel>
  );
  ```

  - Remove the old `style={{ right: rightOffset + 8 }}` from the inner div — `<Panel>` owns positioning now.
  - The 8px keeps parity with today's `top:8px/right:8px`; ReactFlow's default Panel margin is 15px, so set it explicitly.

## Phase 3 — `GraphViewer` wiring (controlled, reactive)

- [ ] Add to `GraphViewerProps` (near the `theme` prop, ~line 88), with a doc comment stating it's controlled and the client owns persistence:
  ```ts
  /** Anchor for the built-in toolbar. Controlled + reactive: pass a new value to move it.
   *  Precedence: this prop → config.toolbarPosition → "top-right". */
  toolbarPosition?: ToolbarPosition;
  ```
- [ ] Add an exported pure resolver beside `resolveExternalThemeMode` (line 211), for unit-testing precedence:
  ```ts
  export function resolveToolbarPosition(
    positionProp: ToolbarPosition | undefined,
    configPosition: ToolbarPosition | undefined,
  ): ToolbarPosition {
    return (
      positionProp ??
      configPosition ??
      DEFAULT_GRAPH_CONFIG.toolbarPosition ??
      TOOLBAR_POSITION.TOP_RIGHT
    );
  }
  ```
- [ ] Destructure `toolbarPosition` (line ~273) and compute `const effectiveToolbarPosition = resolveToolbarPosition(toolbarPosition, config.toolbarPosition);` on every render (controlled — no `useState`).
- [ ] **Move** the `{!hideToolbar && <GraphToolbar … />}` block from its sibling spot (line ~1002) to **inside** `<ReactFlow>…</ReactFlow>` (after `<Background />`, before `</ReactFlow>` at line 971). Add `position={effectiveToolbarPosition}`. Keep all existing props incl. `rightOffset={detailOpen ? panelWidth : 0}`.
- [ ] Import `TOOLBAR_POSITION` + `type ToolbarPosition` in GraphViewer.

> **Checkpoint A** — after Phase 3: `make check` is green, the toolbar still renders top-right by default, and passing `toolbarPosition="center-left"` visibly moves it. Logic is wired but unstyled-vertical still looks like a row — that's Phase 4.

## Phase 4 — CSS (`GraphToolbar.css`)

- [ ] Strip positioning from `.graph-toolbar` (Panel owns it now): remove `position: absolute; top: 8px;` and the `z-index`. Keep `display:flex; align-items:center; gap:4px; pointer-events:auto;`.
- [ ] If a stacking fix is needed, add `.graph-toolbar-panel { z-index: 11; }` (ReactFlow Panel default z-index is lower; the old code used 11).
- [ ] Orientation:
  ```css
  .graph-toolbar--vertical {
    flex-direction: column;
  }
  .graph-toolbar--vertical .graph-toolbar-separator {
    width: 18px;
    height: 1px;
    margin: 2px 0;
  }
  ```
- [ ] Confirm the existing horizontal `.graph-toolbar-separator` (width:1px; height:18px) still applies for the default/horizontal case.

## Phase 5 — Barrel exports

- [ ] No new lines needed if everything lives in `types.ts` (already `export *`-ed via `src/graph/index.ts` → `src/index.ts`). **Verify** `TOOLBAR_POSITION`, `ToolbarPosition`, `ToolbarOrientation`, `toolbarOrientation` are reachable from the package root after build.
- [ ] `resolveToolbarPosition` lives in `GraphViewer.tsx` — confirm it's exported (the React barrel already re-exports named exports from the viewer? It currently exports `{ GraphViewer, applyStatusOverrides }` explicitly — add `resolveToolbarPosition` there only if we want it public; tests can import it directly regardless).

## Phase 6 — Unit tests

- [ ] `toolbarOrientation` — all 8 positions → expected orientation (table-driven). Co-locate in `src/graph/__tests__/` (use `@graph/types` import, per CLAUDE.md alias rule).
- [ ] `resolveToolbarPosition` — precedence: prop wins; falls back to config; falls back to `top-right`; prop `undefined` after being set falls through to config (mirror the `resolveExternalThemeMode` test cases in `__tests__/themeResolution.test.ts`).
- [ ] Keep `make test` green; respect coverage thresholds (90/85/90/90).

## Phase 7 — Storybook + **mandatory visual verification**

- [ ] Add `src/graph/react/viewer/__stories__/ToolbarPosition.stories.tsx` — render a representative pipeline (reuse a `mockGraphSpec` fixture, e.g. CV-screening / nested controllers) with an `argTypes` `select` over all 8 `TOOLBAR_POSITION` values bound to the `toolbarPosition` prop.
- [ ] (Optional) a play function asserting the toolbar is in the document for two contrasting positions (`top-right`, `center-left`). Import test utils from `storybook/test`; use `toBeInTheDocument()` (ReactFlow may render off-viewport).
- [ ] **CLAUDE.md Workflow Rule #2 is non-negotiable:** this is a layout change. Run `make storybook` (port 6006) and use the `/browse` skill to visually confirm **each** of the 8 positions on at least one complex pipeline:
  - corners + top/bottom-center render as a **horizontal** bar, correctly anchored;
  - `center-left` / `center-right` render as a **vertical** bar with rotated separators;
  - default (no prop) is unchanged top-right;
  - right-anchored positions dodge the `DetailPanel` when a node is selected; left/center do not slide under it.
  - Do NOT mark this phase done on `make check`/tests alone.

> **Checkpoint B** — after Phase 7: feature is functionally complete and visually verified. Good handoff point before docs.

## Phase 8 — Docs + CHANGELOG

- [ ] Document the new `toolbarPosition` prop + the position/orientation model in this repo's `docs/` (and the GraphViewer prop docs if a props reference exists). Note it's controlled and persistence is the client's responsibility.
- [ ] Add a `CHANGELOG.md` Unreleased entry (the `/release` skill finalizes it later).
- [ ] Per CLAUDE.md, no hardcoded counts in docs/comments.

---

## Constraints & gotchas (cold-start reminders)

- **`types.ts` stays React-free** — the `PanelPosition` compatibility assertion goes in the React layer (`GraphToolbar.tsx`), never in `types.ts`.
- **`<Panel>` must be a child of `<ReactFlow>`** — that's why the toolbar moves inside. No explicit `<ReactFlowProvider>` needed (ReactFlow provides its own context).
- **Use the `@graph/*` alias** for cross-module imports, incl. tests/stories. Relative imports only within the same module.
- **Use the typed constants** (`TOOLBAR_POSITION.*`), never the raw `"top-left"` strings, outside the const definition.
- **No new `.css` file** → no tsup edit. If that ever changes, register in BOTH places in `tsup.config.ts` (external array + `cpSync`) per the v0.4.0 regression note.
- **Backward-compat default is `top-right`.** Existing consumers passing nothing must see no change (modulo the 8px↔15px Panel margin — we pin 8px).
- **ReactFlow zoom Controls are hidden** — ignore them; the only dodge target is `DetailPanel` (right side).

## Final verification checklist

- [x] `make check` (lint + format + typecheck) green
- [x] `make test` green, coverage thresholds met (96.2% stmts / 90.61% branches / 96.15% funcs / 97.67% lines)
- [x] Storybook visually verified for all 8 positions on a complex pipeline (Rule #2) — CV-screening, via `/browse`
- [x] Default render unchanged (top-right) for consumers passing no prop
- [x] `make build` succeeds; `dist/graph/react/viewer/GraphToolbar.css` contains the `--vertical` rules and `dist/graph/react/index.js` keeps the `GraphToolbar.css` import
