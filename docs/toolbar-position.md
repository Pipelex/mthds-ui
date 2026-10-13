# Toolbar position

`GraphViewer` renders a built-in floating toolbar (direction toggle, controller grouping, fold/expand, zoom, theme, and the style menu when the host offers one with `styleMenu`, see [graph-styles.md](graph-styles.md)). Its anchor is configurable via the `toolbarPosition` prop and `config.toolbarPosition`. The default is `top-right`, so existing consumers see no change.

## The positions

`ToolbarPosition` (the `TOOLBAR_POSITION` constant) is a single enum of anchors, matching ReactFlow's `PanelPosition` union exactly so the value passes straight to the `<Panel position=…>` the toolbar renders inside:

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

<GraphViewer graph={{ graphSpec: spec }} toolbarPosition={pos} />;
// move it later — the viewer reacts on the next render:
setPos(TOOLBAR_POSITION.BOTTOM_RIGHT);
```

## Positioning is ReactFlow's, not ours

The toolbar renders inside a ReactFlow `<Panel>`, which owns **all** base positioning: the anchor, its default margin, and the center-anchor transforms calibrated to cancel exactly that margin. The component never sets the `margin` shorthand — doing so would leave ReactFlow's hardcoded center compensation in place (mis-centering every center anchor) and would break React's style reconciliation when mixed with the conditional dodge override below. The toolbar's `side` (left / center / right) is derived from the anchor by `toolbarSide(position)`.

## Detail-panel dodge

The built-in `DetailPanel` overlays the right edge of the pane when a node is selected. To avoid sitting under it, only the **right-anchored** positions (`top-right`, `center-right`, `bottom-right` — i.e. `toolbarSide(position) === "right"`) shift left by the panel width while it is open, by adding it to `marginRight` on top of the panel's normal margin. When the panel closes the override is dropped and the gap falls cleanly back to the default. Left and center anchors don't collide with a right-side panel in practice, so they don't move.

Center-x positions (`top-center` / `bottom-center`) could in theory overlap the panel at very narrow viewport widths; that edge case is out of scope. ReactFlow's own zoom Controls are hidden in this viewer, so they are not a dodge target.

## On a phone: 44×44 touch targets

Below 640px of viewport width (Tailwind's `sm` breakpoint), every toolbar button, the style menu's trigger and the validation button included, grows from 28×28 to 44×44, the size a fingertip needs, with its icon drawn at 18px instead of 14px. The button itself grows rather than gaining an invisible extended hit area, because the buttons sit 4px apart and an extension would take the taps meant for a neighbour. At 640px and above nothing changes. The breakpoint reads the viewport, not the pointer, so a viewer in a window or webview panel narrower than 640px takes the phone sizes too.

A bar of 44px buttons is wider than a phone, so below 640px it wraps, and is never wider or taller than the viewer less ReactFlow's 15px panel margin on each side. A row bar wraps into rows, its short last row sitting under the side it is anchored to (right, left or centred); an edge anchor's column wraps into a second column that grows toward the graph, not off the viewer's edge. The group separators are hidden at that width, since a wrapped row would end on one. The panel carries its orientation as a class (`graph-toolbar-panel--horizontal` or `graph-toolbar-panel--vertical`) for these rules.

The detail panel's close button keeps its 24×24 look and its place on the first content line at that width, and takes taps over 44×44 through an invisible `::after` reaching 10px past each edge: the content's padding lies above and to its right, and the header's text to its left and below, so the reach covers no other control. The rules are the `@media (max-width: 639.98px)` blocks at the end of `GraphToolbar.css` and after `.detail-panel-close` in `DetailPanel.css`. The `Misc/Touch targets` stories measure every one of these controls at 375×844, failing under 44×44, on a hit area that overlaps a neighbour's, or on a button outside the viewer, and check that the desktop sizes hold at 1280×800.

## API surface

- `TOOLBAR_POSITION` — the constant of anchor values (use these, not raw strings).
- `ToolbarPosition` — the union type.
- `ToolbarOrientation` — `"horizontal" | "vertical"`.
- `toolbarOrientation(position)` — pure helper deriving orientation from an anchor.
- `ToolbarSide` — `"left" | "center" | "right"`.
- `toolbarSide(position)` — pure helper deriving which edge an anchor hugs (drives the detail-panel dodge).
- `GraphViewerProps.toolbarPosition` — the controlled, reactive prop.
- `GraphConfig.toolbarPosition` — the config-level fallback (`DEFAULT_GRAPH_CONFIG.toolbarPosition` is `top-right`).
