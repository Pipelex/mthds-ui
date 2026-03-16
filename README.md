# @pipelex/mthds-ui

Shared graph rendering logic for MTHDS method visualization. Core graph logic (builders, layout, analysis, configuration) is pure TypeScript with no React dependency. An optional React layer provides a ready-to-use `GraphViewer` component powered by ReactFlow.

## Install

```bash
npm install github:pipelex/mthds-ui
```

### Peer dependencies

| Dependency           | Required     | Used by                       |
| -------------------- | ------------ | ----------------------------- |
| `dagre`              | **yes**      | Graph layout engine           |
| `@types/dagre`       | no (TS only) | Type definitions for dagre    |
| `react`, `react-dom` | no           | React layer (`graph/react`)   |
| `@xyflow/react`      | no           | React layer (`graph/react`)   |
| `shiki`              | no           | Syntax highlighting (`shiki`) |

## Entry points

| Import path                                    | Content                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `@pipelex/mthds-ui` (or `./graph`)             | Pure-TS graph logic — types, builders, layout, controllers, config     |
| `@pipelex/mthds-ui/graph/react`                | React components — `GraphViewer`, `ControllerGroupNode`, label helpers |
| `@pipelex/mthds-ui/graph/react/graph-core.css` | Base ReactFlow node/edge styles                                        |
| `@pipelex/mthds-ui/shiki`                      | MTHDS syntax highlighting with shiki                                   |

## Quick start (pure TypeScript)

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
const { nodes, edges } = getLayoutedElements(graphData.nodes, graphData.edges, "TB");

// Optionally wrap nodes in controller groups
const final = applyControllers(nodes, edges, graphspec, analysis, true);
```

## Quick start (React)

```tsx
import { ReactFlowProvider } from "@xyflow/react";
import { GraphViewer } from "@pipelex/mthds-ui/graph/react";
import "@xyflow/react/dist/style.css";
import "@pipelex/mthds-ui/graph/react/graph-core.css";

function MethodGraph({ viewspec, graphspec }) {
  return (
    <ReactFlowProvider>
      <GraphViewer
        viewspec={viewspec}
        graphspec={graphspec}
        config={DEFAULT_GRAPH_CONFIG}
        direction="TB"
        showControllers={false}
        onNavigateToPipe={(pipeCode) => console.log("navigate:", pipeCode)}
      />
    </ReactFlowProvider>
  );
}
```

### GraphViewer props

| Prop                | Type                                | Description                                 |
| ------------------- | ----------------------------------- | ------------------------------------------- |
| `viewspec`          | `ViewSpec \| null`                  | Node/edge view data                         |
| `graphspec`         | `GraphSpec \| null`                 | Dataflow spec (IO, containment, edge kinds) |
| `config`            | `GraphConfig`                       | Layout and visual configuration             |
| `direction`         | `GraphDirection`                    | `"TB"`, `"LR"`, `"RL"`, or `"BT"`           |
| `showControllers`   | `boolean`                           | Show controller group outlines              |
| `onNavigateToPipe?` | `(pipeCode: string) => void`        | Callback when a pipe node is clicked        |
| `onReactFlowInit?`  | `(instance: AppRFInstance) => void` | Access the ReactFlow instance               |

## CSS theming

`graph-core.css` reads these CSS custom properties. Override them in your app to theme the graph:

| Property                  | Purpose                          |
| ------------------------- | -------------------------------- |
| `--color-bg`              | Graph background                 |
| `--color-bg-dots`         | Background dot pattern           |
| `--color-text-muted`      | Edge label text                  |
| `--color-accent`          | Selected node highlight          |
| `--color-controller-text` | Controller group label/type text |
| `--font-sans`             | Node font family                 |
| `--font-mono`             | Controller label font family     |
| `--shadow-lg`             | Selected node box shadow         |

## GraphConfig

The `GraphConfig` object controls layout and visual behavior. Use `DEFAULT_GRAPH_CONFIG` as a starting point.

```ts
interface GraphConfig {
  direction?: "TB" | "LR" | "RL" | "BT"; // Dagre layout direction
  showControllers?: boolean; // Show controller group boxes
  nodesep?: number; // Horizontal spacing (default: 50)
  ranksep?: number; // Vertical spacing (default: 30)
  edgeType?: "bezier" | "step" | "straight" | "smoothstep";
  initialZoom?: number | null; // Override fit-view zoom (null = auto)
  panToTop?: boolean; // Pan viewport to top after layout
  paletteColors?: Record<string, string>; // Color overrides for node/edge styles
}
```

### Palette colors

`paletteColors` controls the colors used when building nodes and edges. Keys are CSS custom property names (e.g. `--color-pipe`, `--color-stuff`, `--color-edge`). See `graphConfig.ts` for the full default palette.

## Type boundary: domain types vs ReactFlow types

The graph module separates two type worlds:

- **Domain types** (`graph/types.ts`): `GraphNode`, `GraphEdge`, `GraphNodeData` — used by all pure graph logic (builders, layout, controllers, analysis). No React dependency.
- **ReactFlow types** (`graph/react/rfTypes.ts`): `AppNode`, `AppEdge`, `AppRFInstance` — ReactFlow generics parameterized with domain data. Used only in the React layer.

If you bypass `GraphViewer` and drive ReactFlow directly, convert at the boundary:

```ts
import { toAppNodes, toAppEdges } from "@pipelex/mthds-ui/graph/react";

setNodes(toAppNodes(domainNodes));
setEdges(toAppEdges(domainEdges));
```

Never use `as any` to pass `GraphNode[]` to `setNodes` — use the mapping functions.

## Shiki integration

Syntax-highlight MTHDS code with the bundled grammar and themes:

```ts
import { highlightMthds, getAvailableThemes } from "@pipelex/mthds-ui/shiki";

const html = await highlightMthds(mthdsSource, "pipelex-dark");
```

For custom shiki setups, use `getMthdsGrammar()` and `getMthdsTheme()` to register the MTHDS language and theme with your own highlighter instance.

## Development

```bash
npm install
make check    # lint + format-check + typecheck + test
make build    # build to dist/
```

## License

MIT
