# Toolbar position

`GraphViewer` renders a built-in floating toolbar (direction toggle, controller grouping, fold/expand, zoom, theme). Its anchor is configurable via the `toolbarPosition` prop and `config.toolbarPosition`. The default is `top-right`, so existing consumers see no change.

## The eight positions

`ToolbarPosition` (the `TOOLBAR_POSITION` constant) is a single enum of eight anchors, matching ReactFlow's `PanelPosition` union exactly so the value passes straight to the `<Panel position=…>` the toolbar renders inside:

`top-left` · `top-center` · `top-right` · `bottom-left` · `bottom-center` · `bottom-right` · `center-left` · `center-right`

There is no `center-center` — a toolbar in the middle of the graph would cover it.

## Orientation is derived, never configured

The bar's orientation (a horizontal row vs a vertical column) is **derived** from the anchor by `toolbarOrientation(position)` — there is no separate orientation axis. "Corners are horizontal, edges decide the rest":

| Position                                                                              | Orientation  |
| ------------------------------------------------------------------------------------- | ------------ |
| `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right` | horizontal   |
| `center-left`, `center-right`                                                         | **vertical** |

Only the two edge-center anchors produce a vertical bar (with the group separators rotated to divide rows). Corner and top/bottom-center anchors are always horizontal; corner orientation is not configurable.

## Controlled and reactive — the host owns persistence

`toolbarPosition` is a **controlled, reactive** prop, mirroring the `theme` prop's pattern (not the initial-only `initialDirection` pattern). Pass a new value and the toolbar moves immediately; this library stores nothing. The host owns the value: it reads its own state, and changes the position by passing a new prop. There is no in-toolbar "move me" button.

Precedence is resolved on every render by `resolveToolbarPosition`:

```
toolbarPosition prop → config.toolbarPosition → "top-right"
```

Clearing the prop back to `undefined` falls through to `config.toolbarPosition` (then the default) — it does not stick at the previously-set value.

```tsx
const [pos, setPos] = useState<ToolbarPosition>(TOOLBAR_POSITION.CENTER_LEFT);

<GraphViewer graphspec={spec} toolbarPosition={pos} />;
// move it later — the viewer reacts on the next render:
setPos(TOOLBAR_POSITION.BOTTOM_RIGHT);
```

## Detail-panel dodge

The built-in `DetailPanel` overlays the right edge of the pane when a node is selected. To avoid sitting under it, only the **right-anchored** positions (`top-right`, `center-right`, `bottom-right`) shift left by the panel width while it is open (`marginRight = 8 + panelWidth`). Left and center anchors don't collide with a right-side panel in practice, so they don't move.

Center-x positions (`top-center` / `bottom-center`) could in theory overlap the panel at very narrow viewport widths; that edge case is out of scope. ReactFlow's own zoom Controls are hidden in this viewer, so they are not a dodge target.

## API surface

- `TOOLBAR_POSITION` — the constant of eight anchor values (use these, not raw strings).
- `ToolbarPosition` — the union type.
- `ToolbarOrientation` — `"horizontal" | "vertical"`.
- `toolbarOrientation(position)` — pure helper deriving orientation from an anchor.
- `GraphViewerProps.toolbarPosition` — the controlled, reactive prop.
- `GraphConfig.toolbarPosition` — the config-level fallback (`DEFAULT_GRAPH_CONFIG.toolbarPosition` is `top-right`).
