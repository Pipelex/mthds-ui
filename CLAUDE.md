# @pipelex/mthds-ui

Shared graph rendering logic for MTHDS method visualization. Pure TypeScript core (`graph/`) with optional React components (`graph/react/`).

## Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Language | TypeScript (strict mode) | `moduleResolution: "bundler"` |
| Build | tsup | ESM output with declarations, multiple entry points |
| Testing | Vitest + Storybook | Unit tests (node), visual stories (browser/Chromium) |
| Linting | ESLint 9 (flat config) | `no-console: error`, `no-explicit-any: off` (ReactFlow compat) |
| Formatting | Prettier 3 | Double quotes, semicolons, trailing commas, 100 char width |
| Layout | dagre | Directed graph auto-layout |
| Graph UI | @xyflow/react (ReactFlow) | Custom node types, pan/zoom |
| Storybook | Storybook 10 + react-vite | Addon-vitest for browser tests |

## Project Structure

```
src/
  index.ts                        # Root barrel (re-exports graph/)
  graph/
    types.ts                      # Domain types, constants, utility helpers
    graphAnalysis.ts              # Dataflow analysis (stuff registry, containment)
    graphBuilders.ts              # Node/edge construction from GraphSpec
    graphLayout.ts                # Dagre layout + 6-phase post-layout spacing
    graphControllers.ts           # Controller group node generation + collapse
    graphConfig.ts                # Default visual configuration + palette
    index.ts                      # Barrel export for pure-TS graph logic
    __tests__/                    # Unit tests (co-located)
    react/
      rfTypes.ts                  # Domain ↔ ReactFlow type bridge
      graph-core.css              # Shared node/edge/card styles
      index.ts                    # Barrel export for React components
      viewer/
        GraphViewer.tsx           # Unified ReactFlow viewer component
        renderLabel.tsx           # Label rendering + hydration
      nodes/
        controller/
          ControllerGroupNode.tsx # Custom controller group node
        pipe/
          PipeCardNode.tsx        # ReactFlow node wrapper with handles
          PipeCardBase.tsx        # Shared card rendering (header, IO, status)
          pipeCardTypes.ts        # PipeCardData interface (imports from types.ts)
          pipeCardRegistry.ts     # Pipe type → component registry
  shiki/                          # Syntax highlighting (separate entry point)
```

## Path Alias

The project uses `@graph/*` → `src/graph/*` to avoid deep relative imports. Configured in:
- `tsconfig.json` (`paths`)
- `tsup.config.ts` (`esbuildOptions.alias`)
- `.storybook/main.ts` (`viteFinal` resolve alias)
- `vitest.config.mts` (`resolve.alias`)

**Rule:** Use `@graph/types`, `@graph/react/viewer/GraphViewer`, etc. for any cross-module import. Keep relative imports (`./`, `../`) only within the same module (1-2 levels max).

**This applies everywhere** — including `__tests__/` and `__stories__/` files. A test file at `src/graph/__tests__/foo.test.ts` importing from `src/graph/react/` must use `@graph/react/...`, not `../../graph/react/...`. The only acceptable relative imports from `__tests__/` are:
- `./testUtils` (sibling in same `__tests__/` dir)
- `../types`, `../graphBuilders`, etc. (one level up to parent module)

## Architecture

### Data Pipeline

```
GraphSpec (JSON from pipelex-agent)
  → buildDataflowAnalysis()     # Extract stuff registry, containment tree
  → buildDataflowGraph()        # Create pipe nodes + stuff nodes + edges
  → getLayoutedElements()       # Dagre auto-layout (direction-aware sizing)
  → ensureControllerSpacing()   # 6-phase post-layout: overlap, alignment, reorder
  → applyControllers()          # Wrap children in controller group nodes
  → hydrateLabels()             # Convert label descriptors → React elements
  → toAppNodes() / toAppEdges() # Domain → ReactFlow type boundary
  → ReactFlow render
```

### Domain Model

**Pipes** have two semantic categories:
- **Operators** (`PipeOperatorType`): Do work — `PipeLLM`, `PipeExtract`, `PipeCompose`, `PipeImgGen`, `PipeSearch`, `PipeFunc`
- **Controllers** (`PipeControllerType`): Orchestrate other pipes — `PipeSequence`, `PipeParallel`, `PipeCondition`, `PipeBatch`

**Stuff** = data nodes. Produced by one pipe, consumed by one or more pipes. Identified by digest. Node IDs use `stuff_<digest>` convention (use `stuffNodeId()`, `isStuffNodeId()`, `stuffDigestFromId()` helpers).

**Controllers** contain child pipes via `contains` edges in GraphSpec. They render as group nodes wrapping their children. Parallel/Batch with >5 children auto-collapse.

### Three Node Types

| Constant | Value | Used By |
|----------|-------|---------|
| `NODE_TYPE_PIPE_CARD` | `"pipeCard"` | Operator pipe nodes (custom PipeCardNode component) |
| `NODE_TYPE_STUFF` | `"default"` | Data nodes (ReactFlow default node with custom label) |
| `NODE_TYPE_CONTROLLER` | `"controllerGroup"` | Controller group nodes (custom ControllerGroupNode) |

## Type System

### Type Boundary: Domain vs ReactFlow

1. **Domain types** (`types.ts`): `GraphNode`, `GraphEdge`, `GraphNodeData` — used by all pure graph logic. No React dependency.

2. **ReactFlow types** (`rfTypes.ts`): `AppNode`, `AppEdge`, `AppRFInstance` — ReactFlow generics parameterized with our domain data. Used only in the React layer.

**Boundary rule:** Convert domain → ReactFlow types using `toAppNodes()`/`toAppEdges()` at the `setNodes`/`setEdges` call sites.

### Strict Typing Rules

- Use `PipeOperatorType` (not `string`) for operator pipe types
- Use `PipeControllerType` (not `string`) for controller pipe types
- Use `PipeStatus` (not `string`) for status values
- Use `PipeType` (union of both) when the pipe category is unknown
- Use node type constants (`NODE_TYPE_PIPE_CARD`, etc.) instead of string literals
- Use stuff ID helpers (`stuffNodeId()`, `isStuffNodeId()`) instead of string concatenation
- Type Record keys with union types (e.g., `Record<PipeOperatorType, string>`) — the compiler ensures exhaustiveness

### Anti-Patterns

- Do NOT add React or `@xyflow/react` imports to pure graph modules (`types.ts`, `graphAnalysis.ts`, etc.)
- Do NOT use `as any` to bridge domain ↔ ReactFlow types — use the mapping functions
- Do NOT add ReactFlow-specific fields (`CSSProperties`, `EdgeMarkerType`) to domain types
- Do NOT re-define types that exist in `types.ts` — import and re-export instead
- Do NOT use magic strings for pipe types, statuses, or node types — use the typed constants
- Do NOT use deep relative imports (`../../` or deeper) — use `@graph/*` alias. This includes test and story files.

## Code Style

### Formatting (Prettier)

- Double quotes, semicolons, trailing commas (`"all"`)
- Print width: 100, tab width: 2 (spaces)

### Naming Conventions

| Kind | Convention | Example |
|------|-----------|---------|
| Types/Interfaces | PascalCase | `GraphNodeData`, `PipeOperatorType` |
| Constants | UPPER_SNAKE_CASE | `NODE_TYPE_PIPE_CARD`, `CONTROLLER_PADDING_X` |
| Functions | camelCase | `buildDataflowGraph`, `stuffNodeId` |
| Files (pure TS) | camelCase | `graphBuilders.ts`, `graphConfig.ts` |
| Files (React) | PascalCase | `GraphViewer.tsx`, `PipeCardBase.tsx` |
| CSS classes | kebab-case with BEM-ish nesting | `.pipe-card-header`, `.pipe-card--lr` |

### Module Organization

- **Named exports only** — no default exports (except Storybook `meta`)
- **Barrel exports** via `index.ts` at each module boundary
- **Co-located tests** in `__tests__/` directories
- **Co-located stories** in `__stories__/` directories
- Pure graph logic must be React-free and importable without React installed

## Testing

### Running Tests

| Command | Purpose |
|---------|---------|
| `make check` | **Always run after modifying code.** Runs lint + format + typecheck + tests |
| `make test` | Vitest only (unit tests, single pass) |
| `make test-watch` | Vitest watch mode |
| `make storybook` | Storybook dev server on port 6006 |

### Test Philosophy

- **Unit tests** (`__tests__/*.test.ts`): Test pure graph logic functions. Node environment, no DOM.
- **Storybook stories** (`__stories__/*.stories.tsx`): Visual testing of React components. Browser environment via Playwright.
- Tests are co-located with their source modules.
- Test fixtures use proper typed values (`PipeType`, `PipeStatus`, etc.) — not arbitrary strings.

### Writing Tests

- Use `describe` blocks to group related tests. Use `it` for individual assertions.
- Test happy paths, edge cases (empty inputs, null, missing fields), and error paths (cycle detection, invalid data).
- For pure functions, test input→output. For stateful logic, test state transitions.
- When adding a new exported function, add tests for it in the same commit.

### Storybook Play Functions (E2E browser tests)

- Import test utilities from `storybook/test` (not `@storybook/test` — Storybook 10 moved them).
- Use `within(canvasElement)` + `expect` + `userEvent` for DOM assertions and interactions.
- ReactFlow nodes may be rendered outside the visible viewport — use `toBeInTheDocument()` instead of `toBeVisible()` when asserting on elements inside ReactFlow nodes.
- Play functions run via `@storybook/addon-vitest` in the `storybook` vitest project with Playwright/Chromium.

### Test Data

- **Mock GraphSpecs** live in `src/graph/react/viewer/__stories__/mockGraphSpec.ts` — 25 DRY + 25 LIVE fixtures with `DRY_RUN_CATALOG` / `LIVE_RUN_CATALOG` dictionaries.
- **Extreme-scale generators** in `extremeGraphSpecs.ts` — `makeWideParallel(N)`, `makeWideBatch(N)`.
- **PipeCard edge cases** in `src/graph/react/nodes/pipe/__stories__/edge-cases/edgeCaseData.ts`.
- **Programmatic factories** in `src/graph/__tests__/testUtils.ts` — `makeMinimalSpec()`, `makeParallelSpec()`, `makeBatchSpec()`, `makeNestedSpec()`, `runFullPipeline()`.

### Coverage

Coverage is configured at the top level of `vitest.config.mts` (not per-project). It targets core graph logic files only. Thresholds: 90% statements, 85% branches, 90% functions, 90% lines. Run with `make test-coverage`.

## Scripts

| Command | Purpose |
|---------|---------|
| `make check` | Full validation (lint + format + typecheck + tests) |
| `make all` | Full validation + build |
| `make build` | Build with tsup |
| `make lint` | ESLint check |
| `make format` | Prettier write |
| `make storybook` | Storybook dev server |
| `make test-coverage` | Vitest with coverage report |
| `make clean` | Remove dist/ and node_modules/ |

## Workflow Rules

1. **Always run `make check` after modifying code** — before considering work done.
2. **Use the `@graph/*` path alias** for cross-module imports within `src/graph/`.
3. **Use typed constants** — never hardcode pipe types, statuses, or node type strings.
4. **Keep the type boundary clean** — domain types in pure modules, ReactFlow types in `react/` only.
5. **Add tests when adding exported functions** — at minimum, test happy path and null/empty cases.
