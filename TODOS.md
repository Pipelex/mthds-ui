# TODOs

## Add `showBatchItemIndex` parameter to GraphViewer

When true, batch item nodes display their index suffix (e.g., "topic[0]" instead of "topic"). Currently mthds-ui always shows indices on batch edges. This should be a configurable prop on GraphViewer, passed through to graphBuilders. The config field was removed from pipelex's ReactFlowRenderingConfig because the new standalone viewer doesn't support the toggle yet.
