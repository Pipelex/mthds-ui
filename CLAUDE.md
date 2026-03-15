# @pipelex/mthds-ui

Shared graph rendering logic for MTHDS method visualization. Pure TypeScript library (no React dependency) — consumers (playroom, VS Code extension) map graph data to their own UI frameworks.

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
  types.ts             # Graph type definitions and constants
  graphAnalysis.ts     # Dataflow analysis (stuff registry, containment)
  graphBuilders.ts     # Node/edge construction from method data
  graphLayout.ts       # Dagre-based auto-layout
  graphControllers.ts  # Controller group node generation
  graphConfig.ts       # Default visual configuration
  index.ts             # Barrel export
  __tests__/           # Unit tests
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

## Anti-patterns to Avoid

- **No React imports** — this is a pure logic library
- **No default exports** for modules
- **No relative imports across module boundaries** — import from `./types`, `./graphAnalysis`, etc.
