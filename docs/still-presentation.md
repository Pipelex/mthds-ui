# The still presentation

`GraphViewer` draws a graph one of two ways. The default is the interactive canvas: it pans and zooms, draws a dotted background, shows its toolbar, opens the detail panel when a node is clicked, and fills the parent the host sized for it. With `interactive={false}` it draws a **still picture** instead, laid in the page like an image: for a host that shows a method's flowchart before anyone asks to explore it, such as a chat host's view of a method or a method's card in a catalog.

```tsx
<GraphViewer
  graph={{ graphSpec }}
  interactive={false}
  graphStyle="simple"
  initialFoldMode="folded"
  initialDirection="LR"
  theme={theme}
/>
```

## What it draws, and what it leaves out

- **Nothing moves.** Nothing pans, zooms, drags, connects, selects or takes the keyboard focus, and the wheel scrolls the page the drawing sits in rather than the drawing.
- **Nothing answers a click or a key.** The container is `inert` and takes no pointer event, so a click opens no detail panel, fires none of the host's callbacks (`onNodeSelect`, `onNavigateToPipe`, `onStuffNodeClick`, `onPaneClick`), and a button drawn inside a node, such as a folded step's "6 steps inside", a frame's fold or a card's expander, neither takes a click nor the Tab key, so nothing changes the picture. The flow's own settings could not do this alone: they reach ReactFlow's node wrappers, not the buttons a node draws inside itself, some of which set `pointer-events: auto` of their own. A click lands on whatever is beneath, so a host can make the whole picture a button by wrapping it in one.
- **Hidden from assistive technology.** Being inert, the drawing is left out of the accessibility tree, as a picture is without its alternative text. The host gives it an accessible name of its own: a caption beside it, or a wrapper with `role="img"` and an `aria-label`.
- **No background, toolbar or detail panel.** The dotted background is not drawn and the container is transparent, so the page's own surface shows through. In the simple style an edge label has no backing either, since the layout reserves each label's box beside its arrow: its backing is the `--simple-edge-label-bg` variable, which the still container sets to `transparent`. The detailed style keeps its labels' backing, which is what hides a dashed batch edge behind its label. The validation widget, which lives in the toolbar, is not drawn; a node still wears its validation ring and badge.
- **Everything else is the same drawing.** The style, the fold mode, the direction, the theme and the palette, and a run's statuses through `statusMap`, apply as on the canvas.

## How it is sized

The host gives the viewer a width and no height. The drawing is fitted to the container's width, centered, and never drawn larger than its natural size: a drawing narrower than the container keeps zoom 1, and a wider one is scaled down until it fits. The container then takes the height the drawing needs at that zoom, with a padding of `STILL_PADDING_PX` around it, and follows the width when it changes. Until the layout has run and the nodes are measured, it holds a placeholder height, `STILL_PLACEHOLDER_HEIGHT_PX`.

The box fitted is the nodes' bounds grown to take in every bend of a routed edge and every label box, since a route can run around a node outside them. The arithmetic is `stillViewport` and `stillContentBounds` in `src/graph/react/viewer/stillViewport.ts`, and `StillFit`, rendered inside the flow, applies it.

This is the one place the container does not fill a sized parent (README, "Container sizing"): a still container flows in its parent like any block, `position: relative`, at the height it sets on itself.

## Switching to the canvas

The prop is reactive. A host that switches it to `true` gets the canvas, fitted to view as after a layout, and must then size the parent as for any canvas. Switching back to `false` closes the detail panel and the validation dropdown. A host that offers an "Explore" button can as well mount a second viewer in the first one's place, with its own props: an initial style or fold mode is read once per viewer, so a fresh mount is how the canvas starts from different ones.
