# @pipelex/mthds-ui

Utilities for visualizing and interacting with MTHDS methods. Provides graph types, builders, layout algorithms, and configuration — all as pure TypeScript with no React dependency.

## Install

```bash
npm install github:pipelex/mthds-ui
```

## Usage

```ts
import {
  buildGraph,
  getLayoutedElements,
  applyControllers,
  DEFAULT_GRAPH_CONFIG,
} from "@pipelex/mthds-ui";

// Build graph data from a ViewSpec/GraphSpec
const { graphData, analysis } = buildGraph(viewspec, graphspec, "bezier");

// Apply dagre layout
const { nodes, edges } = getLayoutedElements(
  graphData.nodes,
  graphData.edges,
  "TB",
);

// Optionally wrap nodes in controller groups
const final = applyControllers(nodes, edges, graphspec, analysis, true);
```

## Development

```bash
npm install
make check    # lint + format-check + typecheck + test
make build    # build to dist/
```

## License

MIT
