# The error state

`GraphViewer` draws an error state in place of the graph when it cannot draw the spec it was given, and never throws that failure out of render. A host's page stays up around it, whatever the spec holds. This page says when the error state is drawn, what it shows, and how it goes away.

## When it is drawn

Three kinds of failure lead to it, and all three are drawn the same way.

- **The validator refuses the spec.** The viewer reads every spec through `validateGraphSpec` before drawing it. A spec from a runtime newer than the viewer can carry a pipe class it does not know, and one from an older runtime can carry a failed node whose `error` is no MTHDS problem document (`{ error_type, message, stack, caller_facing }` rather than the protocol's `Problem`, see [run-problem.md](run-problem.md)). The validator refuses either, and the viewer reads that refusal as a value (`readGraphSpec` in `src/graph/react/viewer/graphFailure.ts`) rather than letting it throw, so the canvas draws the error state itself and keeps the reader's theme choice.
- **The build refuses a spec the validator accepted.** The validator checks each node and edge, not how they fit together, so a spec can pass it and still trip one of the build's own guards, a binding step that "contains" a pipe for instance. Those guards throw from the viewer's effects. A boundary around the canvas (`GraphFailureBoundary` in `src/graph/react/viewer/GraphErrorState.tsx`) catches whatever the canvas throws while rendering or from an effect, and draws the error state in place of the canvas.
- **The layout fails.** The layout runs asynchronously, where no boundary sees a throw, so the canvas reports its failure to the boundary itself. This used to leave a blank canvas and a line in the console; the console line is still written.

`validateGraphSpec` is unchanged for every other caller: a CLI, a worker or a test calling it directly still gets a `GraphSpecValidationError` thrown.

## What it shows

An alert (`role="alert"`, so a screen reader announces it) with a title, "This method graph could not be drawn", and the failure in its own words. For a refused spec, that is the validator's message, which names the location refused and what was found there:

```text
GraphSpec validation failed at nodes[0].error.type: expected a string, got undefined
```

Any other error is shown by its name and message. The detail is set in the monospace font and wraps anywhere, so a long location never scrolls the page sideways at phone width.

The error state is styled in `graph-core.css` (`.react-flow-container--failed`, `.graph-error-state`) from the graph's tokens alone, `--color-error`, `--color-error-bg`, `--color-error-border` and the `--text-*` family, so it follows the theme and any `paletteColors` the host sets. Drawn by the canvas, it sits in the canvas's own container and takes the reader's current theme; drawn by the boundary, the canvas is gone, so its container is themed from the props (`theme`, `config.theme`, `systemTheme`).

In the interactive presentation it fills the area the host gave the graph, centred, and scrolls when its message does not fit. In the still presentation (`interactive={false}`) it flows at the height of its message, it is not `inert`, since an inert alert would be hidden from a screen reader, and it takes the pointer, so its text can be selected and copied.

## How it goes away

A new spec clears it: the host passing another `graph.graphSpec` object is drawn afresh, and fails afresh if it fails. The same spec object keeps the error state. When the boundary drew it, the canvas is mounted anew with the next spec, so the reader's choices on the toolbar (direction, theme, folds) start from the props again.

## Tests and stories

`src/graph/react/viewer/__tests__/graphErrorState.test.tsx` renders the viewer on the server with a refused spec, an unknown pipe class and a legacy node error, and asserts it draws the alert without throwing, and that a valid spec still draws the flow. `ErrorState.stories.tsx` (`Graph/Error state`) draws each failure in a browser, a host header beside the viewer that its play test checks survived, at phone width and in the still presentation, and switches one host between refused, unbuildable and valid specs to show each recovery.

Since a story whose fixture breaks the contract now draws the error state rather than failing, `fixturesConsistency.test.ts` holds every DRY, LIVE and static catalog spec to the validator directly.
