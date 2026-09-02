# @pipelex/mthds-ui

Shared graph rendering logic for MTHDS method visualization. Pure TypeScript core (`graph/`) with optional React components (`graph/react/`).

## Tech Stack

| Layer      | Tool                      | Notes                                                          |
| ---------- | ------------------------- | -------------------------------------------------------------- |
| Language   | TypeScript (strict mode)  | `moduleResolution: "bundler"`                                  |
| Build      | tsup                      | ESM output with declarations, multiple entry points            |
| Testing    | Vitest + Storybook        | Unit tests (node), visual stories (browser/Chromium)           |
| Linting    | ESLint 9 (flat config)    | `no-console: error`, `no-explicit-any: off` (ReactFlow compat) |
| Formatting | Prettier 3                | Double quotes, semicolons, trailing commas, 100 char width     |
| Layout     | elkjs (ELK)               | Directed graph auto-layout (EPL-2.0 licensed, see NOTICE)      |
| Graph UI   | @xyflow/react (ReactFlow) | Custom node types, pan/zoom                                    |
| Storybook  | Storybook 10 + react-vite | Addon-vitest for browser tests                                 |

## Project Structure

```
src/
  index.ts                        # Root barrel (re-exports graph/)
  graph/
    types.ts                      # Domain types, constants, utility helpers
    graphAnalysis.ts              # Dataflow analysis (stuff registry, containment)
    graphBuilders.ts              # Node/edge construction from GraphSpec
    elkGraphBuilder.ts            # ELK graph construction (nodes, ports, edges)
    graphLayout.ts                # ELK layout + post-layout spacing
    graphControllers.ts           # Controller group node generation + collapse
    graphConfig.ts                # Default visual configuration + palette
    stuffLookup.ts                # Digest → data item + the pipe that produced it
    index.ts                      # Barrel export for pure-TS graph logic
    __tests__/                    # Unit tests (co-located)
    react/
      rfTypes.ts                  # Domain ↔ ReactFlow type bridge
      graph-core.css              # Shared node/edge/card styles
      index.ts                    # Barrel export for React components
      viewer/
        GraphViewer.tsx           # Unified ReactFlow viewer component
        renderLabel.tsx           # Label rendering + hydration
      stuffRender.ts              # The seam a host renders a stuff node's DATA through
      nodes/
        controller/
          ControllerGroupNode.tsx # Custom controller group node
        pipe/
          PipeCardNode.tsx        # ReactFlow node wrapper with handles
          PipeCardBase.tsx        # Shared card rendering (header, IO, status)
          pipeCardTypes.ts        # PipeCardData interface (imports from types.ts)
          pipeCardRegistry.ts     # Pipe type → component registry
  form/                           # Run form panel over @pipelex/mthds-form (separate entry point):
    runGate.ts                    #   The submit path, React-free: the kernel's four-step gate + error summary
    react/
      RunPanel.tsx                #   The panel — fields, readiness, the gate
      RunPanel.css                #   Panel chrome only (this repo's tokens, no Tailwind)
      StuffResultPanel.tsx        #   The graph's data panel, through the kernel's ResultPanel
      index.ts                    #   Barrel for the ./form/react entry
      __stories__/contracts/      #   Generated pipe_io_contracts + input_form + output_form fixtures
  shiki/                          # Syntax highlighting (separate entry point)
  static-graph/                   # Static method-graph module (separate entry point, pure TS, no React):
    types.ts                      #   Diagnostic, ParsedBundle, MergedMethodSet + narrowing helpers
    conceptRefs.ts                #   Concept-ref parsing/resolution + native concept catalog
    normalizePipe.ts              #   Authored TOML pipe shape → PipeBlueprintUnion registry shape
    parseMthdsBundle.ts           #   .mthds TOML text → ParsedBundle (lenient, never throws)
    mergeBundles.ts               #   ParsedBundle[] → MergedMethodSet (per-domain namespaces)
    buildStaticGraphSpec.ts       #   The static walk: MergedMethodSet → GraphSpec (meta.mode "static")
docs/
  static-graph.md                 # Static GraphSpec API, mode contract, display behavior
```

The `static-graph/` module reuses the blueprint types from `graph/types.ts` (no parallel type universe) and uses the `@static-graph/*` path alias. Its authoring-surface reference contract is `data/schema/mthds_schema.json`, re-copied from `pipelex/derived/` via `make schema-refresh` — a dev-time reference, not a runtime dependency. Static specs must carry `meta: { format: "mthds", mode: "static" }`; renderer behavior must check that explicit mode only.

## Path Alias

The project uses `@graph/*` → `src/graph/*`, `@static-graph/*` → `src/static-graph/*` and `@form/*` → `src/form/*` to avoid deep relative imports. Configured in:

- `tsconfig.json` (`paths`)
- `tsup.config.ts` (`esbuildOptions.alias`)
- `.storybook/main.ts` (`viteFinal` resolve alias)
- `vitest.config.mts` (`resolve.alias`)

**Rule:** Use `@graph/types`, `@graph/react/viewer/GraphViewer`, `@form/runGate`, etc. for any cross-module import. Keep relative imports (`./`, `../`) only within the same module (1-2 levels max).

**This applies everywhere** — including `__tests__/` and `__stories__/` files. A test file at `src/graph/__tests__/foo.test.ts` importing from `src/graph/react/` must use `@graph/react/...`, not `../../graph/react/...`. The only acceptable relative imports from `__tests__/` are:

- `./testUtils` (sibling in same `__tests__/` dir)
- `../types`, `../graphBuilders`, etc. (one level up to parent module)

## CSS Packaging — MANDATORY when adding a `.css` file

**Every new `.css` file must be registered in `tsup.config.ts` — in BOTH places — or it will silently disappear in the built package.**

tsup treats unregistered `.css` imports as bundle-time assets and drops them. The JS output still contains `className="..."` but the stylesheet is never written to `dist/` or imported, so the feature renders unstyled (and invisible) for every consumer. This caused the v0.4.0 `GraphToolbar.css` regression — the toolbar shipped with no styles and looked completely absent in downstream apps.

When you add `import "./Foo.css"` to any source file, you MUST also:

1. Add `/Foo\.css$/` to the `external` array so the import survives in the JS output.
2. Add a `mkdirSync` + `cpSync` pair in `onSuccess` so the raw CSS file is copied to `dist/` at the same relative path.

**The `external` pattern is matched against the import SPECIFIER, not the resolved path.** `RunPanel.tsx` writes `import "./RunPanel.css"`, so `/RunPanel\.css$/` matches and `/form\/react\/RunPanel\.css$/` does not — and a pattern that does not match fails the way this rule exists to prevent: silently. The existing `/detail\/DetailPanel\.css$/` entries look like paths only because the barrel that imports them writes `"./detail/DetailPanel.css"`.

Verify after building: `grep "Foo.css" dist/graph/react/index.js` must show the import, and the file must exist at `dist/<same-relative-path>/Foo.css`. If either is missing, the bundler ate the stylesheet.

**There is a THIRD place to consider, and it is a decision rather than a registration:** `scripts/standaloneCssFiles.mjs`, the hand-maintained manifest for the standalone IIFE bundle, guarded by `src/standalone/__tests__/cssManifest.test.ts`. That bundle has exactly one entry point (`src/standalone/adapter.ts`, the graph viewer), so a stylesheet it cannot reach must be EXCLUDED rather than listed — `src/form/` is excluded there because the standalone build by construction has no form kernel, and listing `RunPanel.css` would inline dead CSS into every standalone HTML. The test names whichever choice you have not made yet.

## The form kernel is a DEPENDENCY, re-exported; `shiki` is the only optional peer

`@pipelex/mthds-form` **was** an optional peer isolated behind `./form/react`. That was right while the kernel powered only the run form — a host embedding a graph viewer need not offer a way to run methods — and it stopped being right the moment `output_form` became how the graph's detail panel shows a result at all. A viewer whose detail panel cannot display data is not a viewer.

**The route to "dependency" matters, because the obvious answer failed.** A *required peer* is auto-installed by npm and **not by pnpm**, which reports it unmet and installs nothing even with `auto-install-peers=true` (tested, not assumed). A property that holds on one package manager is not one a library can offer, so a host would still have had to declare the kernel — the thing the change exists to remove.

So: a dependency, plus two re-export entries. **`./form`** is the kernel's React-free surface (descriptor vocabulary, derivation, readiness, run gate, value plumbing — importable from a server action or a worker) and **`./form/react`** its controls. A host installs `@pipelex/mthds-ui` and imports everything from it.

**The rule that keeps a dependency safe: a consumer imports the kernel through those entries, never directly.** The objection to depending on a package that carries React context is duplication — two copies, two context identities, and a host's `FieldStringsProvider` silently fails to resolve inside our controls. A host that declares nothing cannot produce a second copy.

What still holds, and what to keep:

1. **`external` in `tsup.config.ts`.** The kernel must never be BUNDLED — a bundled copy is the second identity all over again, and it is invisible in the source tree.
2. **The React-free entries stay React-free and kernel-free.** `.`, `./graph` and `./static-graph` are importable from a CLI or a worker with nothing installed, and a stray value import from a pure module would take that away silently.
3. **`shiki` is the only optional peer left**, behind `./shiki`: optional in `peerDependencies` + `peerDependenciesMeta`, a devDependency for local work, `external` in tsup, its own entry.

`make smoke-pack` proves all of it from outside, in a consumer declaring only this package and React: the kernel arrives, it is a dependency rather than a peer, there is **exactly one copy** in the tree, both React entries import it rather than inlining it, the React-free entries never reach it, and every React entry keeps its `"use client"`.

**`"use client"` survives because the smoke test says so, not because of the prepend.** `tsup.config.ts`'s `onSuccess` re-prepends it onto `dist/form/react/index.js`, but at the pinned toolchain that is belt-and-braces: esbuild preserves the directive prologue on its own, which `dist/graph/react/index.js` proves — same source directive, no prepend call, directive present. Keep the fixup (idempotent, costs nothing if a future bundler starts stripping), but do not rely on it, and do not assume a new React entry is covered because that one is. Verify by hand with `head -1 dist/form/react/index.js`.

## Architecture

### Data Pipeline

```
GraphSpec (JSON from pipelex-agent, or static builder output)
  → buildDataflowAnalysis()     # Extract stuff registry, containment tree
  → buildDataflowGraph()        # Create pipe nodes + stuff nodes + edges
  → getLayoutedElements()       # ELK auto-layout (hierarchical, direction-aware)
  → ensureControllerSpacing()   # Post-layout spacing: overlap, alignment, reorder
  → applyControllers()          # Wrap children in controller group nodes
  → hydrateLabels()             # Convert label descriptors → React elements
  → toAppNodes() / toAppEdges() # Domain → ReactFlow type boundary
  → ReactFlow render
```

### Domain Model

**Pipes** have two semantic categories:

- **Operators** (`PipeOperatorType`): Do work — `PipeLLM`, `PipeExtract`, `PipeCompose`, `PipeImgGen`, `PipeSearch`, `PipeFunc`
- **Controllers** (`PipeControllerType`): Orchestrate other pipes — `PipeSequence`, `PipeParallel`, `PipeCondition`, `PipeBatch`

**Adding a new pipelex pipe class requires an mthds-ui update.** pipelex sets a node's `pipe_type` from the pipe's Python class name. `validateGraphSpec` checks `pipe_type` against `KNOWN_PIPE_TYPES` (derived from the `PipeType` union in `types.ts`) and throws on an unrecognized class. When pipelex ships a new pipe class, add it to `PipeOperatorType` or `PipeControllerType` — the `Record<PipeType, true>` exhaustiveness maps in `types.ts`, `PipeCardBase.tsx`, and `PipeDetailPanel.tsx` will fail to compile until every badge/status table is updated.

**Stuff** = data nodes. Produced by one pipe, consumed by one or more pipes. Identified by digest. Node IDs use `stuff_<digest>` convention (use `stuffNodeId()`, `isStuffNodeId()`, `stuffDigestFromId()` helpers).

**Controllers** contain child pipes via `contains` edges in GraphSpec. They render as group nodes wrapping their children. Parallel/Batch with >5 children auto-collapse.

### Three Node Types

| Constant               | Value               | Used By                                               |
| ---------------------- | ------------------- | ----------------------------------------------------- |
| `NODE_TYPE_PIPE_CARD`  | `"pipeCard"`        | Operator pipe nodes (custom PipeCardNode component)   |
| `NODE_TYPE_STUFF`      | `"default"`         | Data nodes (ReactFlow default node with custom label) |
| `NODE_TYPE_CONTROLLER` | `"controllerGroup"` | Controller group nodes (custom ControllerGroupNode)   |

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

| Kind             | Convention                      | Example                                       |
| ---------------- | ------------------------------- | --------------------------------------------- |
| Types/Interfaces | PascalCase                      | `GraphNodeData`, `PipeOperatorType`           |
| Constants        | UPPER_SNAKE_CASE                | `NODE_TYPE_PIPE_CARD`, `CONTROLLER_PADDING_X` |
| Functions        | camelCase                       | `buildDataflowGraph`, `stuffNodeId`           |
| Files (pure TS)  | camelCase                       | `graphBuilders.ts`, `graphConfig.ts`          |
| Files (React)    | PascalCase                      | `GraphViewer.tsx`, `PipeCardBase.tsx`         |
| CSS classes      | kebab-case with BEM-ish nesting | `.pipe-card-header`, `.pipe-card--lr`         |

### Module Organization

- **Named exports only** — no default exports (except Storybook `meta`)
- **Barrel exports** via `index.ts` at each module boundary
- **Co-located tests** in `__tests__/` directories
- **Co-located stories** in `__stories__/` directories
- Pure graph logic must be React-free and importable without React installed

## Testing

### Running Tests

| Command           | Purpose                                                             |
| ----------------- | ------------------------------------------------------------------- |
| `make check`      | **Always run after modifying code.** Runs lint + format + typecheck |
| `make test`       | Vitest only (unit tests, single pass)                               |
| `make test-watch` | Vitest watch mode                                                   |
| `make storybook`  | Storybook dev server on port 6006                                   |

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

- **The vendored MTHDS Test Corpus** lives in `data/mthds-corpus/` — a copy of the canonical `.mthds` corpus owned by `pipelex` (`pipelex/test_extras/mthds_corpus/`), delivered by the workspace `mthds-corpus-sync` skill because a TypeScript repo cannot read the Python wheel it ships in. **Never edit anything under `data/mthds-corpus/`.** Fix the entry in `pipelex`, where the corpus gates run, then re-sync; a copy that gets edited is a fork. `parseFixtureBundles` and `buildFixtureGraphs` sweep it alongside `data/pipelines/` through `src/static-graph/__tests__/fixtureBundles.ts`, which keeps the two piles apart on purpose — only `data/pipelines/` carries the generated graph specs that `parity` and `nativeConceptsCorpus` read as their oracle. See `docs/static-graph.md`.
- **Pipeline fixtures** are generated from the `.mthds` bundles in `data/pipelines/pipeline_NN/` (see "Regenerating fixtures" below). The generator emits `__stories__/pipelines/specs/_generated.dry.ts` and `_generated.live.ts`; `mockGraphSpec.ts` and `liveGraphSpec.ts` re-export them as `DRY_*` / `LIVE_*` and build `DRY_RUN_CATALOG` / `LIVE_RUN_CATALOG`.
- **Contracts fixtures** — `pipe_io_contracts` and its two descriptor siblings `input_form` and `output_form` — are generated by `make fixtures-contracts` into `src/form/react/__stories__/contracts/`. Each split module exports all three (`CONTRACTS_*`, `INPUT_FORM_*`, `OUTPUT_FORM_*`), and all three are required: since kernel `0.5.0` a descriptor drives the derivation and the contract is co-walked beside it, so a pipeline carrying fewer is skipped rather than emitted — an emitted half renders an empty form or an empty result silently, a skipped one fails the story that imports it. `input_form` feeds `RunPanel`; `output_form` paired with `output.json_schema` feeds `StuffResultPanel`, the graph's data panel. Mode-independent and offline: both are projections of what a pipe DECLARES, so they need no run, which is why this is its own fast pass and why it works even when a bundle is not currently runnable. **Never hand-write either** — an invented pair gets the standard's field taxonomy subtly wrong, and being self-consistent, nothing here can catch it. Two vendored corpus entries are swept alongside the pipelines because the pipeline corpus has no OPTIONAL input anywhere. See `docs/run-form-panel.md`.
- **Static fixture catalog** lives in `src/graph/react/viewer/__stories__/staticGraphSpec.ts`. It wraps `_generated.static.ts`, which imports raw `.mthds` bundles and builds `STATIC_*` specs through `buildStaticGraphSpecFromToml` with no CLI, Python, gateway key, or network.
- **Static stories** live in `StaticGraphDev.stories.tsx`, `StaticVsLive.stories.tsx`, and `StaticGraphInvalid.stories.tsx`. Keep representative static-vs-live coverage for sequence, condition, batch, CV screening, deep nesting, and wide parallel.
- **Extreme-scale generators** in `extremeGraphSpecs.ts` — `makeWideParallel(N)`, `makeWideBatch(N)` (hand-built; kept validator-clean by `finalizeSpec`).
- **PipeCard edge cases** in `src/graph/react/nodes/pipe/__stories__/edge-cases/edgeCaseData.ts`.
- **Programmatic factories** in `src/graph/__tests__/testUtils.ts` — `makeMinimalSpec()`, `makeParallelSpec()`, `makeBatchSpec()`, `makeNestedSpec()`, `runFullPipeline()`.

### Regenerating fixtures

**NEVER hand-write or hand-edit GraphSpec JSON.** Pipeline fixtures are generated by `scripts/generate-fixtures.mjs`, which runs every `data/pipelines/pipeline_NN/bundle.mthds` through the pipelex CLI and emits the typed `_generated.*.ts` files. pipelex resolves config from the repo-local `.pipelex/` directory (gateway-only; needs `PIPELEX_GATEWAY_API_KEY` available, e.g. in `~/.pipelex/.env`).

**The generator needs two executables, and they are satisfied separately.** Graph specs and inputs templates go through the pipelex CLI (`PIPELEX_BIN`); the validate-views dump (`pipe_io_contracts` and `input_form`) has no CLI surface, so it shells out to `scripts/dump_validate_views.py` through the venv interpreter (`PIPELEX_PYTHON`). Both default to `../pipelex/.venv/bin/`, so a normal sibling checkout satisfies both at once — but either can be pointed elsewhere, and a machine can have one without the other. Each mode asserts only the executable it actually invokes, up front rather than partway through: `--contracts` demands the interpreter alone, a DRY write pass demands both, `--check` demands only the CLI (it writes nothing, so it never dumps contracts), and `--from-disk` demands neither.

**`bundle.mthds`, `inputs.json` and `inputs/` are the only authored files in a pipeline directory.** Everything else there is written by the generator, from one run each per mode: the graph spec (`<mode>_run_graph_spec.json`, the contract the fixtures are built from), the standalone ReactFlow viewer (`<mode>_run_graph.html`), the Mermaid pair (`<mode>_run_mermaidflow.mmd` / `.html`), what the live run produced (`live_run_main_stuff.json`), and the offline inputs template (`inputs_template.json`). The renders are committed so a reviewer can open a pipeline's graph without a pipelex checkout — they are the same run as the spec beside them, never a separate one. A dry run's main stuff is deliberately not committed: it is the mock string `--mock-inputs` invented, so it would be diff churn carrying no information.

```bash
make fixtures                      # DRY specs  -> _generated.dry.ts  (mock inputs, no inference)
make fixtures-live ONLY=pipeline_NN # LIVE specs -> _generated.live.ts (real inference, costs API budget)
make fixtures-live-test            # smoke-test the live path on 3 small bundles, writes nothing
```

**Always pass `ONLY=` to `make fixtures-live`.** A full-corpus live run sweeps every fixture onto whatever pipelex the local CLI happens to be, inside whatever change is in flight, and it has no skip path — any failure (network, quota, a model that will not produce a given output shape) aborts partway and leaves a half-swept, mixed-version tree. `make fixtures-live-missing` is the recovery, and only works when the failure was transient. See `wip/fixtures-live-corpus-regeneration.md`.

`make fixtures` also bootstraps the LIVE placeholder layer so a DRY-only run is enough to build Storybook: the stories import LIVE specs from the per-pipeline split modules (`_generated/live/pipeline_NN.ts`), not the barrel, so for every pipeline lacking real LIVE data it emits a placeholder split (re-exporting the DRY spec as LIVE) and re-exports them all from `_generated.live.ts`. Each placeholder is guarded by `existsSync`, so `make fixtures-live` (real inference) is never clobbered by a later DRY run. Adding/removing a pipeline means adding its `data/pipelines/pipeline_NN/` directory and an entry in the generator's `NAME_MAP`.

`validateGraphSpec` runs on every spec at the `GraphViewer` boundary, so a regenerated fixture that violates the contract fails loudly in its story. After `make fixtures`, the `snapshots.test.ts` structural snapshot may need re-baselining (`npx vitest run -u src/graph/__tests__/snapshots.test.ts`) — pipelex node numbering is not fully deterministic for branching pipelines. Static snapshots should only change when authored static behavior changes; static ids and stuff digests are deterministic.

### Coverage

Coverage is configured at the top level of `vitest.config.mts` (not per-project). It targets core graph logic files only. Thresholds: 90% statements, 85% branches, 90% functions, 90% lines. Run with `make test-coverage`.

## Scripts

| Command                   | Purpose                                                         |
| ------------------------- | --------------------------------------------------------------- |
| `make check`              | Lint + format + typecheck                                       |
| `make test`               | Vitest unit tests (single pass)                                 |
| `make all`                | Full validation + tests + build                                 |
| `make build`              | Build with tsup                                                 |
| `make lint`               | ESLint check                                                    |
| `make format`             | Prettier write                                                  |
| `make storybook`          | Storybook dev server                                            |
| `make test-coverage`      | Vitest with coverage report                                     |
| `make fixtures`           | Regenerate DRY pipeline fixtures                                |
| `make fixtures-contracts` | Regenerate the `pipe_io_contracts` + `input_form` fixtures (offline, fast) |
| `make fixtures-live`      | Regenerate LIVE fixtures (real inference) — always with `ONLY=` |
| `make smoke-pack`         | Pack the tarball and check it from a bare consumer              |
| `make use-local` (`ul`)   | Swap `@pipelex/mthds-form` to a build of `../mthds-form`        |
| `make use-npm` (`un`)     | Swap it back to the published version `package.json` pins       |
| `make clean`              | Remove dist/ and node_modules/                                  |

`use-local` / `use-npm` install with `--no-save` and never rewrite `package.json`. That is deliberate, and it is the one place this pair diverges from the same one in `../pipelex-starter-js`, which restores `@latest` and re-pins: here the kernel is named TWICE — `peerDependencies` and `devDependencies` — and the two must agree, so moving that version is a reviewed change owned by the `/bump-mthds-form` skill, not a side effect of leaving dev mode. `use-local` packs a tarball rather than symlinking (a symlinked kernel is a second React context identity — the failure the peer arrangement exists to prevent) and is a snapshot, so re-run it after every kernel edit. Both targets clear Vite's pre-bundle cache, because `.storybook/main.ts` names the kernel in `optimizeDeps.include` and a local build usually carries the same version string as the published one, so the optimizer's hash would not change and Storybook would keep serving the stale copy. See `docs/run-form-panel.md`.

## Workflow Rules

1. **Always run `make check && make test` after modifying code** — before considering work done.
2. **Always visually verify Storybook after graph/layout changes** — `make check` only validates logic; graph rendering changes (layout, spacing, node sizing, edge routing) MUST be verified visually in Storybook (`make storybook`, port 6006) using the `/browse` skill before considering work done. Check multiple pipeline stories (especially complex ones like CV screening, nested controllers, wide parallels). Do NOT claim a visual fix works based on tests alone.
3. **Use the `@graph/*` path alias** for cross-module imports within `src/graph/`.
4. **Use typed constants** — never hardcode pipe types, statuses, or node type strings.
5. **Keep the type boundary clean** — domain types in pure modules, ReactFlow types in `react/` only.
6. **Add tests when adding exported functions** — at minimum, test happy path and null/empty cases.
7. **Never hand-write or hand-edit GraphSpec JSON** — regenerate pipeline fixtures with `make fixtures` (see "Regenerating fixtures"). The `_generated.*.ts` files are build artifacts; edit the `.mthds` bundle and regenerate instead.
8. **The graph does not render data — a renderer is passed in.** `StuffViewer` is deleted. `GraphViewer`'s `renderStuffData` prop takes the view, and `renderStuffResult` from `./form/react` is the one this package ships (see `docs/stuff-result-panel.md`). Do not add payload sniffing back to the graph entries: the standard states what a result IS in `output_form`, and guessing from the value is the mistake that component existed to demonstrate.
9. **Don't reinvent the wheel.** Before writing custom behavior, check whether a dependency already ships it — hooks, utilities, components, APIs. Reuse the library's logic aggressively. Only replace a library's UI chrome when it genuinely doesn't fit the design, and even then keep driving it with the library's behavior underneath.
