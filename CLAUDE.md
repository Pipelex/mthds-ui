# @pipelex/mthds-ui

Shared graph rendering logic for MTHDS method visualization. Core graph logic is pure TypeScript; optional React components live under `graph/react/`.

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Build**: tsup (ESM output with declarations)
- **Testing**: Vitest
- **Linting**: ESLint 9 (flat config)
- **Formatting**: Prettier 3
- **Layout**: dagre

## Project Structure

```
src/
  index.ts                 # Root barrel (re-exports graph/)
  graph/
    types.ts               # Graph type definitions and constants
    graphAnalysis.ts        # Dataflow analysis (stuff registry, containment)
    graphBuilders.ts        # Node/edge construction from method data
    graphLayout.ts          # Dagre-based auto-layout
    graphControllers.ts     # Controller group node generation
    graphConfig.ts          # Default visual configuration
    index.ts               # Barrel export for pure-TS graph logic
    __tests__/              # Unit tests
    react/
      GraphViewer.tsx       # Unified ReactFlow graph viewer component
      renderLabel.tsx       # Label rendering + hydration
      ControllerGroupNode.tsx # Custom controller group node type
      graph-core.css        # Shared ReactFlow node/edge styles
      index.ts              # Barrel export for React components
  shiki/                   # Syntax highlighting (separate entry point)
```

## Code Style (Prettier)

Configured in `.prettierrc`:

- Double quotes
- Semicolons
- Trailing commas (all)
- Print width: 100
- Tab width: 2 (spaces)

## Testing

- **Runner**: Vitest
- **Location**: Co-located test files (`__tests__/` dirs or `.test.ts` files)
- Pure logic tests only — no DOM, no React

## Scripts

| Command              | Purpose                    |
| -------------------- | -------------------------- |
| `npm run build`      | Build with tsup            |
| `npm run lint`       | ESLint check (`src/`)      |
| `npm run format`     | Prettier write (src files) |
| `npm run format:check` | Prettier check (CI)      |
| `npm run typecheck`  | TypeScript type checking   |
| `npm run test`       | Vitest run (single pass)   |

## Workflow Rules

- **Always run `make check` after modifying code.** This validates linting, formatting, type-checking, and tests before finishing.

## Type Boundary: Domain Types vs ReactFlow Types

The graph module has two type worlds:

1. **Domain types** (`graph/types.ts`): `GraphNode`, `GraphEdge`, `GraphNodeData` — used by
   all pure graph logic (builders, layout, controllers, analysis). No React dependency.

2. **ReactFlow types** (`graph/react/rfTypes.ts`): `AppNode`, `AppEdge`, `AppRFInstance` —
   ReactFlow generics parameterized with our domain data. Used only in the React layer.

**Boundary rule:** Convert domain → ReactFlow types using `toAppNodes()`/`toAppEdges()`
at the `setNodes`/`setEdges` call sites. Never use `as any` to bridge the gap.

**Anti-patterns:**
- Do NOT add React or `@xyflow/react` imports to `graph/types.ts` or other pure modules
- Do NOT use `as any` to pass GraphNode[] to setNodes — use the mapping functions
- Do NOT add ReactFlow-specific fields (CSSProperties, EdgeMarkerType) to domain types

## Anti-patterns to Avoid

- **No React imports in `graph/` or root** — only `graph/react/` may import React
- **No default exports** for modules
- **No relative imports across module boundaries** — import from `./types`, `./graphAnalysis`, etc.
