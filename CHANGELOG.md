# Changelog

## [Unreleased]

### Added

- **`system` theme mode — the graph follows the host environment.** The in-graph theme toggle is now tri-state: it cycles `system → light → dark → system`, each with a distinct icon (monitor / sun / moon) and an accessible label naming the current state and the next. In `system`, the graph follows the browser's `prefers-color-scheme` **live** (updating on OS theme changes with no reload), or an injected `systemTheme` when the host provides one. New `GraphThemeMode` (`dark | light | system`) type and `GRAPH_THEME_MODE` constant; `GraphTheme` stays the resolved binary (`dark | light`) the palette consumes. The `system` value matches what pipelex emits (`ReactFlowTheme.SYSTEM`) and the React ecosystem convention (`next-themes` / shadcn).
- **`GraphViewer` `systemTheme` prop.** Host-injected environment theme, authoritative when set — for non-browser hosts (e.g. VS Code webviews, where `prefers-color-scheme` is unreliable) to drive `system` from their own detection. Omit it and `system` follows the browser. New exported `useSystemTheme` / `detectSystemTheme` helpers back this.

### Changed

- **BREAKING: the default theme is now `system` (was effectively `dark`).** `DEFAULT_GRAPH_CONFIG.theme = "system"`. Any consumer that never set `theme` will now follow the OS/editor color scheme instead of always rendering dark. To keep a fixed appearance, pass `theme: "dark"` (or `"light"`) explicitly.
- **BREAKING: `GraphViewer`'s `theme` prop and `config.theme` now accept `dark | light | system`** (the `GraphThemeMode` domain) instead of only `dark | light`.
- **BREAKING: `onThemeChange` signature is now `(mode, resolvedTheme) => void`** (was `(theme) => void`). It fires on toggle clicks, on external prop/config updates, and when `system` re-resolves on an environment change — reporting both the selected `mode` (for persistence) and the `resolvedTheme` (for chrome sync). The first arg's value domain widened: it can now be the string `"system"`, so handlers wired to the old single `theme` arg must handle it (see `docs/theming.md` → "Migrating from the old `onThemeChange`").
- The standalone HTML wrapper drops its own page-level theme button and `prefers-color-scheme` machinery; the library-owned in-graph toolbar is now the single theme toggle, and page chrome stays in sync via `onThemeChange`.

## [v0.8.0] - 2026-06-20

### Added

- **Render `PipeSignature` stub nodes in the method graph.** A node with `pipe_type: "PipeSignature"` — emitted by pipelex under `--allow-signatures` for a contract-only pipe that is declared but not yet implemented — now validates and renders as a distinct dashed, muted "stub" card (badge `Signature`) instead of throwing `GraphSpecValidationError` and blanking the entire viewer. `PipeSignature` joins `PipeOperatorType`, and the detail panel shows a "declared but not yet implemented" note for it.
- **`validateGraphSpec` — structural validation for GraphSpec JSON.** New exported function (`src/graph/validateGraphSpec.ts`) that enforces the GraphSpec contract before anything renders it: `meta.format` must be `"mthds"`, the spec must have nodes, every node needs a `description` and `domain_code`, and controller/operator nodes need a `pipe_code`. `GraphViewer` runs it at its input boundary, so a malformed or incomplete spec now fails fast with a descriptive error naming the offending node instead of silently rendering a broken or empty graph downstream.
- **`pipe_code` on graph nodes.** Controller and operator nodes now carry a `pipe_code` — the code of the pipe definition the node instantiates, distinct from the per-node `id`. It is used for node identification and to group cousin controllers (multiple instances of the same pipe). `validateGraphSpec` requires it on every controller and operator node.
- **`canceled` pipe status.** `PipeStatus` gains a `canceled` value, rendered across pipe cards, the pipe detail panel, and status badges alongside the existing `succeeded` / `failed` / `running` / `scheduled` / `skipped` states.

### Changed

- **GraphSpec JSON must now include `pipe_code` on controller and operator nodes, and a `status` on every node.** Breaking change for consumers feeding hand-built or pre-existing GraphSpecs: `validateGraphSpec` (invoked by `GraphViewer`) throws on a node missing `pipe_code`, and the node `status` field is no longer optional. GraphSpecs emitted by current pipelex already satisfy both. `buildPipeCardPayload` was refactored to consume the now-guaranteed `PipeCallNode` shape directly.
- **`StuffViewer` surfaces content serialization failures** instead of rendering empty on error, and ships its own `StuffViewer.css`.

### Internal

- **Pipeline fixtures are now generated from `.mthds` bundles instead of hand-maintained.** Removed the checked-in per-pipeline GraphSpec `.ts` files (`cvScreening.ts`, `rfpQualifier.ts`, …) and replaced them with `scripts/generate-fixtures.mjs`, which runs each bundle under `data/pipelines/` through the pipelex CLI and emits typed `_generated.dry.ts` (mock inputs, no inference) and `_generated.live.ts` (real inference) consumed by the Storybook stories. New Makefile targets: `make fixtures` / `make fixtures-live`, plus `ONLY=pipeline_NN` to regenerate specific pipelines and `make fixtures-live-missing` to fill only the gaps — partial runs merge into the complete fixture file rather than overwriting it.

## [v0.7.0] - 2026-06-11

### Changed

- **Detail panel close button scrolls with the content.** The "x" was an absolutely-positioned overlay pinned to the panel, floating over whatever scrolled beneath it; it now lives in a flow row at the top of the scrollable content, so it scrolls out of view with the content (close = scroll back up). It passes under the sticky pipe header on scroll.
- **Concept detail panel: structure behind a tab.** When a stuff node has instance data, the panel shows "Data" / "Structure" tabs with Data selected by default — the schema table no longer pushes the data viewer below the fold. Without data (dry run / unexecuted), the structure renders directly as before. Tab state resets when selecting a different node.

### Added

- **`pipelex-light` shiki theme.** Light counterpart of `pipelex-dark` — same scopes one-for-one, VS Code Light+ values for generic tokens, darkened brand accents (coral/teal/green/magenta/orange) for contrast on white. New exports: `pipelexLightTheme`, `getMthdsThemes()` (both themes, for editors like Monaco that register every theme up front); `getMthdsTheme(name?)` now takes an optional theme name (defaults to `pipelex-dark`).
- **Storybook stories for the shiki module** (`Shiki/Themes`): pipelex-dark, pipelex-light, and a side-by-side comparison.

### Removed

- **BREAKING: stock shiki themes dropped.** `dark-plus`, `monokai`, `dracula`, and `one-dark-pro` are no longer bundled or accepted by `highlightMthds` — `MthdsThemeName` is now `"pipelex-dark" | "pipelex-light"`. Consumers passing a removed theme name must switch to a pipelex theme (the playroom highlight API was updated in the same change).

## [v0.6.5] - 2026-05-15

### Added

- **Light theme.** `GraphViewer` now supports a `"light"` theme alongside the existing `"dark"` default (still dark unless `theme="light"` is passed). New props: `theme` (`"dark" | "light"`), `showThemeToggle` (defaults to `true` — renders a sun/moon button in the floating toolbar; set to `false` to hide it), and `onThemeChange` (fired on every theme change).

### Fixed

- **Standalone adapter silently swallowed malformed embedded JSON.** `readJsonScript()` in `src/standalone/adapter.ts` parses the `pipelex-graphspec` and `pipelex-config` `<script type="application/json">` tags that pipelex emits into the standalone HTML viewer. Its `catch` block returned `null` on any `JSON.parse` failure, making a malformed tag indistinguishable from a legitimately absent one — so if the upstream HTML generator ever emitted broken JSON, the viewer rendered an empty graph with no error reported anywhere. The catch now re-throws an `Error` naming the offending `<script>` tag and the underlying parse message; the throw lands in the post-mount data-load tick, so it surfaces in DevTools / `window.onerror` without white-screening the already-mounted viewer. The legitimate "tag absent or empty → `null`" path is unchanged.

## [v0.6.4] - 2026-05-13

### Fixed

- **Folded fold mode now forces `showControllers` on at initialization.** When `initialFoldMode` (or `config.foldMode`) was `"folded"` but the host left `showControllers` off, the GraphViewer rendered folded controllers as pipe cards but hid the toolbar's expand-all button — the user had no global path to unfold the graph and had to click each folded card individually. `GraphViewer` now overrides `initialShowControllers` to `true` whenever the effective fold mode is `"folded"`, so the toolbar always exposes the expand-all action on a folded-on-startup graph. Hosts can still toggle `showControllers` off interactively after the initial render.

## [v0.6.3] - 2026-05-13

### Fixed

- **Standalone bundle was missing from the published npm tarball.** Releases v0.4.0–v0.6.2 ran only `npm run build` (tsup) before `npm publish`, which produces `dist/index.js`, `dist/graph/`, and `dist/shiki/` but not the standalone IIFE bundle (`scripts/build-standalone.mjs` writes to `dist/standalone/`). Downstream consumers that load the bundle from a CDN (jsDelivr / unpkg) hit a 404 — the bundle existed only in maintainers' local checkouts. Coupling `build:standalone` to `build` via a `postbuild` hook (plus pointing `prepare` at `npm run build` so the `npm publish` lifecycle doesn't run a bare `tsup` and clobber `dist/standalone/`) fixes this, and a new release-workflow guard fails CI if the standalone files are missing before publish.

### Changed

- **LR pipe-card header now puts `pipe_code` on its own line below `pipe_type`.** In horizontal (LR) layout the narrow pipe cards previously crammed badge + code + status onto one row; long codes were cut off by ellipsis. The header now wraps onto two rows for LR (badge/status on top, code below) and stays single-row for TB. Card height estimation in `elkGraphBuilder` was split into per-direction constants (`PIPE_CARD_HEADER_HEIGHT_LR` / `_TB`) so the layout reserves the right vertical space.

## [v0.6.2] - 2026-05-12

### Fixed

- **Standalone bundle: `foldMode` was not forwarded to `GraphViewer`.** The `foldMode` field on `GraphConfig` and the `initialFoldMode` prop on `GraphViewer` shipped in v0.6.0, but `src/standalone/adapter.ts` picked config keys out of the embedded `pipelex-config` JSON explicitly and silently dropped `foldMode`. Hosts of the IIFE bundle (`graph-viewer.{js,css}`, including pipelex's reactflow HTML output) couldn't seed the initial fold state — controllers always started fully expanded regardless of what the embedded config said. The adapter now validates `foldMode` against the `FOLD_MODE` constants (`"folded"` / `"expanded"` / `"auto"`), falls back to `"expanded"` on missing or invalid values, and forwards it to `GraphViewer` as both `initialFoldMode` and inside `config`. Config parsing was extracted into a new pure module `src/standalone/viewerProps.ts` (with `buildViewerProps()`) so the wire-through is now unit-tested. Third standalone-bundle wire-through gap in the v0.4–v0.6 window after the v0.4.1 / v0.6.1 missing-CSS fixes — consumers of the npm package were unaffected because they pass `foldMode` to `GraphViewer` directly.

### Internal

- **Automated regression guards against standalone-bundle drift.** Two CI-enforced parity tests close the gap that produced the v0.4.1 / v0.6.1 / v0.6.2 fixes. First: `buildViewerProps` was refactored to spread the embedded config blob (`...cfg`) and then override only validated fields (`foldMode`, `direction`, `showControllers`) — any future `GraphConfig` key now flows through automatically, eliminating the v0.6.2-shape bug class. A new `viewerProps.test.ts` parity test asserts every key in `DEFAULT_GRAPH_CONFIG` reaches the output, catching the case where someone reverts to cherry-picking. Second: the hand-maintained `cssFiles` allow-list in `scripts/build-standalone.mjs` was extracted into `scripts/standaloneCssFiles.mjs` (shared by the build and the test), and a new `cssManifest.test.ts` walks `src/**/*.{ts,tsx}` for relative `.css` imports and asserts every resolved path is present in the manifest. Together these prevent the next "wire-through silently dropped" regression from reaching a release.

## [v0.6.1] - 2026-05-12

### Fixed

- **Standalone bundle: `GraphToolbar.css` was missing.** `scripts/build-standalone.mjs` concatenates CSS files into the standalone bundle via an explicit allow-list (the JS build uses `loader: { ".css": "empty" }`, so side-effect CSS imports from React components are stripped on purpose). The toolbar stylesheet `src/graph/react/viewer/GraphToolbar.css` — introduced in v0.4.0 alongside the floating `GraphToolbar` component — was never added to that list, so every consumer of the standalone IIFE bundle (`graph-viewer.{js,css}`, including mthds-ui's own `graph-standalone.html` demo) rendered the toolbar in the DOM but with no styling (no `position: absolute`, no backdrop, no button visuals) — effectively invisible. Consumers of the npm package were unaffected because their bundler (e.g. Next.js, esbuild with proper CSS loader) picks up the side-effect import from `GraphToolbar.tsx` directly. The CSS file is now in the allow-list and ships in `graph-viewer.css`.

## [v0.6.0] - 2026-05-12

### Added

- **Foldable pipe controllers.** Each `PipeSequence` / `PipeParallel` / `PipeCondition` / `PipeBatch` controller group now has a fold toggle (`⤡`) in its header bar. Folded → the group collapses to a single pipe card with the controller's badge, IO, and status; expanded (default) → renders as today. Edges into/out of the controller are reattached to the folded card; internal-only edges are dropped; batch labels collapse to `[N]`. A new pure transform `applyFolds()` (`src/graph/graphFolds.ts`) drives the rewrite; `PipeCardBase` renders an `⤢` expand button on folded cards. Per-instance state — fold/unfold independently across nodes.
- **Cousin folding.** A normal click on a controller's fold/expand button mirrors the action to every other controller that shares the same `pipe_code` (its "cousins" — e.g. three `route_by_match` controllers in a batched pipeline fold together). Hold `alt`/`option` to fold or expand only the clicked controller. Exposed as `FoldToggleOptions { soloMode?: boolean }` and `findCousinControllers()` for downstream consumers.
- **"Fold all" / "Expand all" toolbar buttons.** Built-in toolbar gains two buttons that fold or expand every controller in the current graph. Hidden when `showControllers` is off or no controllers exist; each button disables itself when its action would be a no-op (with a `(nothing to fold)` / `(nothing to expand)` tooltip suffix). Wired through new optional `GraphToolbar` props (`onFoldAll`, `onExpandAll`, `foldAllDisabled`, `expandAllDisabled`).
- **`initialFoldMode` prop on `GraphViewer` + `foldMode` field on `GraphConfig`.** Hosts can now seed the controller fold state when a graph first opens, instead of always starting fully expanded. Three values are accepted via the new `FOLD_MODE` constant: `"folded"` collapses every controller into a single pipe card on the first layout pass, `"expanded"` leaves them as group wrappers (previous behavior), and `"auto"` is a pass-through reserved for renderer-defined heuristics — it currently behaves the same as `"expanded"`. The seed is applied once per graphspec; users can still fold/unfold individually via the toolbar afterwards. `DEFAULT_GRAPH_CONFIG.foldMode` defaults to `"expanded"` so existing consumers see no change.
- **`buildPipeCardPayload()` exported helper** (`src/graph/pipeCardPayload.ts`) for building a `PipeCardPayload` from a `GraphSpecNode` + `GraphSpec` + `DataflowAnalysis`. Used internally by `buildDataflowGraph` and `applyFolds`; available for consumers that want to render pipe cards outside the standard pipeline.

### Changed

- **BREAKING: `GraphSpecNode.pipe_type` is now required (was optional).** The runtime always needs a pipe type to pick the right card layout, badge, and operator/controller classification; allowing it to be missing forced a silent `"PipeFunc"` fallback in `buildDataflowGraph` that masked malformed inputs. Consumers building `GraphSpec` values by hand must set `pipe_type` on every node — pipelex CLI output already does so. The operator/controller distinction inside `buildPipeCardPayload` now reads `analysis.controllerNodeIds` rather than string-matching against `pipe_type`.
- **Keyboard focus rings on graph control buttons** (`.controller-group-fold`, `.controller-group-collapse`, `.pipe-card-expand`, `.pipe-card-io-more`). The previous `all: unset` reset removed the native `:focus-visible` outline; an explicit ring is now drawn so keyboard users can see what's focused.

### Fixed

- **Folded controller hiding its declared output stuff node.** When the outermost folded controller declared a stuff as one of its outputs (e.g. `match_analyses` on the `batch_analyze_cvs_for_job_offer` PipeSequence in `cv_batch_screening`), the stuff lived inside the controller via `buildChildToControllerMap`'s "stuff produced by controllers themselves → assign to parent controller" step. Folding the controller hid the stuff with the rest of the internals and collapsed its incoming `batch_aggregate` edges into self-loops, so the final output disappeared from the graph. `applyFolds` now promotes such stuff nodes out of their outermost folded declarer to that declarer's parent context, so the folded pipe-card stays connected to its external output (the surviving batch edge keeps its dashed style and is relabeled `[N]`).

## [v0.5.2] - 2026-05-12

### Fixed

- **Spacebar input swallowed in editors mounted next to `GraphViewer`.** ReactFlow's default `panActivationKeyCode='Space'` attaches a `window`-level keydown listener that can call `preventDefault()` on the spacebar, blocking text input in adjacent editors (e.g. Monaco). `GraphViewer` now sets `panActivationKeyCode={null}` on its `<ReactFlow>` so the space key is never intercepted at the window level.

## [v0.5.1] - 2026-05-05

### Added

- **New exported type `FieldResolution`** (`{ method: "from_var" | "fixed" | "template" | "nested"; rendered?: string }`).
- **`canEmbedPdf` and `onOpenExternally` props on `StuffViewer`, `ConceptDetailPanel`, and `GraphViewer`.** Hosts that can't render `<embed type="application/pdf">` (e.g. VS Code webviews, which run inside Electron without the Chromium PDFium plugin) can now set `canEmbedPdf={false}` to fall back to a clickable tile that triggers `onOpenExternally` (or `window.open` if not provided). `onOpenExternally` also overrides the default `window.open` behavior of the StuffViewer toolbar's "open externally" button — wire it to the host's external-open mechanism (e.g. `vscode.env.openExternal` via postMessage). Both props are forwarded through `GraphViewer` → `ConceptDetailPanel` → `StuffViewer` so consumers only have to pass them once at the top level.
- **`PDFContentEmbedDisabled` Storybook story** demonstrating the embed-disabled fallback tile.

### Changed

- **PipeCompose `execution_data.resolved_fields` → `execution_data.fields`.** Per-field resolution record `{ method, rendered? }` keyed by field name; `rendered` is set only for `template` fields. The detail panel reads `rendered` for templates and ignores other methods (their contract lives in the blueprint).

### Internal

- Prettier reformat across detail panel files, `GraphToolbar`, `GraphViewer`, and `StuffViewer`.

## [v0.5.0] - 2026-05-04

### Added

- **First publish to the npm registry as `@pipelex/mthds-ui`.** Adds `publishConfig` (`access: public`, `provenance: true`) so the scoped package publishes as public with npm provenance attestations. The `release.yml` workflow now builds, runs tests, and publishes to npm on every push to `main` when the `package.json` version isn't already on the registry, then tags the commit and creates a GitHub release with notes pulled from this changelog.
- **`./graph/react/viewer/GraphToolbar.css` subpath export.** The toolbar stylesheet was already copied to `dist/` by `tsup` but wasn't reachable through the package's `exports` map, forcing consumers to import it via deep paths. It's now a first-class export alongside the other component stylesheets.

## [v0.4.1] - 2026-04-16

### Fixed

- **`GraphToolbar` rendered without styles in the published package.** The v0.4.0 toolbar shipped as invisible/unstyled for every consumer because `tsup.config.ts` didn't register `GraphToolbar.css` — tsup silently dropped the `import "./GraphToolbar.css"` from the built JS and never copied the file to `dist/`. The CSS file is now externalized and copied to `dist/graph/react/viewer/GraphToolbar.css` alongside the other component stylesheets. Added a `CSS Packaging` section to `CLAUDE.md` documenting the two-step registration required whenever a new `.css` file is added.

## [v0.4.0] - 2026-04-16

### Added

- **Built-in floating toolbar on `GraphViewer`** with five controls, grouped left-to-right: toggle layout direction (LR ↔ TB), toggle pipe-controller grouping, then a separator followed by `−` zoom out, `+` zoom in, and fit-view. Zoom/fit buttons delegate to xyflow's own `zoomIn()` / `zoomOut()` / `fitView()` on the ReactFlow instance — no custom zoom math — but share the dark translucent chrome of the direction/controllers buttons so the whole cluster reads as one toolbar. The toolbar now lives inside mthds-ui so every consumer gets the same UI — no need to re-implement it per app. Positioned absolutely at the top-right of the graph background; when the detail panel is open, the toolbar shifts left by the panel's width so it stays on the graph background (never over the panel) and remains visible at any panel size. New `hideToolbar` prop disables it for consumers that want to provide their own controls. (`<Controls />` from `@xyflow/react` was considered but rejected: its light-theme chrome clashed with the dark toolbar and its built-in positioning can't shift with the detail panel.)
- **`pipelex-storage://` URI resolution in `StuffViewer`** via a new `resolveStorageUrl?: ResolveStorageUrl` prop. Internal pipelex-storage URIs aren't browser-fetchable; the viewer now calls the consumer-supplied resolver to exchange them for short-lived, browser-fetchable URLs (e.g. presigned S3) before rendering images/PDFs inline. If the stuff data already has an `http(s)://` URL, that's preferred and the resolver is skipped. Resolution is async, cancellation-safe on unmount/stuff-change, and falls back to the "no preview" placeholder if the resolver returns `null`. The resolver is threaded through `ConceptDetailPanel` and `GraphViewer`'s built-in stuff detail panel so consumers only have to pass it once at the top level.
- **Smarter MIME detection via `resolveMimeType`** (new utility in `stuffViewerUtils`). Previously, PDF/image preview decisions were made from `stuff.contentType` — but `contentType` is often the concept tag (e.g. `"document"`), not a MIME type. The resolver now checks in order: (1) `contentType` when it already looks like a MIME, (2) `data.mime_type` (Document content carries this), (3) the file extension in `filename` or in the URL/URI. Supports `pdf`, `png`, `jpg`/`jpeg`, `gif`, `webp`, `svg`, `bmp`. This makes storage-resolved PDFs and images actually render as previews instead of falling back to raw JSON.
- **New public exports** from `@pipelex/mthds-ui/graph/react`: `ResolveStorageUrl` type, `extractStorageUri(data)`, and `resolveMimeType(data, contentType, url)` — consumers can reuse them when building custom viewers or precomputing preview state.
- **`GRAPH_DIRECTION` constant** exported from `@graph/types` (mirrors the existing `EDGE_TYPE` pattern). `GraphDirection` type is now derived from it. Use `GRAPH_DIRECTION.TB` / `LR` / `RL` / `BT` instead of string literals so the compiler enforces exhaustiveness.

### Changed

- **BREAKING: `GraphViewer` props `direction` and `showControllers` renamed to `initialDirection` and `initialShowControllers`.** They are now initial values for internal state (the built-in toolbar drives user-facing toggling). Consumers that previously passed these as controlled values should either rely on the new toolbar or set `hideToolbar` and manage state externally via their own UI.
- **`getHtmlTabLabel` now accepts `string | null | undefined`** (was `string | undefined`) to match the new `effectiveMime` nullability inside `StuffViewer`.
- **Standalone HTML shell: removed the redundant external toolbar** (direction toggle, controllers toggle, zoom in/out/fit). Those now live inside `GraphViewer` itself, and the external buttons stopped driving viewer state once `direction`/`showControllers` became mount-only initial props. Title/logo and theme toggle remain. DOM ids `direction-toggle`, `controllers-toggle`, `zoom-in`, `zoom-out`, `zoom-fit` no longer exist.
- **Direction toggle now handles all four axes.** Previously, clicking the toggle while `direction` was `RL` or `BT` collapsed the graph to `TB`. The toggle now treats `TB`/`BT` as vertical and `LR`/`RL` as horizontal, flipping between the two canonical forms so label, icon, and click behavior stay consistent. (Flagged in PR review: cubic-dev-ai.)

### Fixed

- **Storage URL resolver output is now scheme-validated** through the same `isInlineRenderableUrl` guard used by every other URL path in `StuffViewer` — a faulty or compromised resolver can't slip `javascript:` / `data:` / `vbscript:` URLs into `<img>` / `<iframe>`. (Flagged in PR review: cubic-dev-ai.)
- **Stale resolved storage URL** when switching between two `pipelex-storage://` stuff items: the viewer now clears the previously resolved URL synchronously before kicking off the new async resolution, so the new item never briefly renders the old one's image/PDF during the in-flight window. (Flagged in PR review: cubic-dev-ai, greptile-apps.)
- **`ResolveStorageUrl` JSDoc** now documents the stable-reference requirement (wrap in `useCallback` or define outside the component), since the resolver is in `StuffViewer`'s `useEffect` deps and a fresh arrow on every parent render re-triggers the presigned-URL fetch. (Flagged in PR review: greptile-apps.)

## [v0.3.4] - 2026-04-10

### Fixed

- **PipeCompose detail panel was surfacing input data as if the pipe had produced it**. The panel was reading `execution_data.resolved_fields` for every construct field method, which made `from_var` fields display the actual value pulled from working memory (e.g. `score = 2`, `candidate_name = "John Doe"`). That value isn't authored by the pipe — it lives in the input stuff node — so showing it on the pipe was misleading. The panel now follows a strict design rule: it shows the **field contract**, not runtime data. `from_var` displays as `← match_assessment.score` (the path), `fixed` as `= "no_match"` (the literal), `nested` recurses, and `template` is the only method that still shows the rendered output (since template is the only construct method where the pipe actually computes something new).
- **PipeCompose detail panel: long resolved field values broke the KV row layout**: when `execution_data.resolved_fields` contained a long value (e.g. an LLM-generated `rationale` of 800+ chars), the value wrapped across many lines inside a flex row designed for one-line content. The label drifted to the vertical center of the wrapped block. Long values (>60 chars or containing newlines) now render as a labeled `FieldBlock` (bordered scrollable text box, max-height 240px) instead of a KV row. The KV row CSS was also hardened (`align-items: flex-start`, `flex: 1 1 0`, `word-break`, `overflow-wrap`) as defense-in-depth.

### Added

- **Recursive nested construct rendering in the PipeCompose detail panel**. Previously, `nested` fields rendered as a flat `(nested construct)` placeholder, hiding everything inside. The panel now walks the construct tree recursively: each nested sub-construct renders its own header (`name · nested · N fields`) followed by its sub-fields, indented 12px per depth level, with a green left border connecting the sub-section to its parent. Deep structures (4+ levels) are fully visible by default — no clicking, no tooltips, just scroll. Implementation lives in a new `ConstructFieldsBlock` component in `PipeComposeDetail.tsx`.
- **Reorganized detail panel storybook layout** under `src/graph/react/detail/__stories__/`:
  - `Stuff/` for stuff/concept stories (`ConceptDetail.stories.tsx`)
  - `Resizable/` for the resizable panel stories
  - `Pipes/` with one subfolder per pipe type (`PipeLLM/`, `PipeExtract/`, `PipeImgGen/`, `PipeSearch/`, `PipeSequence/`, `PipeParallel/`, `PipeCompose/`)
  - Inside `Pipes/PipeCompose/`, dedicated edge-case files: `TemplateMode`, `ConstructFixed`, `ConstructFromVar`, `ConstructTemplate`, `ConstructNested`, `ConstructMixed`, `ConstructRenderedTemplates`, `EmptyTemplateField`
  - Shared helpers (`detailPanelDecorator`, `PipeStory` wrapper, `makeComposeBlueprint`, sample text fixtures) extracted into `_shared.tsx`
- **HUGE-content stress-test variants for every PipeCompose construct story**. Each construct edge-case file now has a `Huge*` story exercising the renderer at scale: ~3000-char rationale paragraph, ~4000-char multi-paragraph email template, 25-question interview bank, deeply-structured pipeline config object, 14-field deeply-nested `from_var` paths, 4-level deeply-nested sub-constructs. Stress-tests `FieldBlock` rendering, panel scroll behavior, and the recursive nested renderer.

### Changed

- **`PipeComposeConstructField.method` is a closed union** (`"from_var" | "fixed" | "template" | "nested"`). Previously included a trailing `| string` escape hatch that absorbed the literal cases and killed exhaustiveness checking on switches. The construct field formatter is now exhaustive — any new method added to the union will fail to compile until it's handled. (carried forward from v0.3.3 work, finalized here)
- **`PipeComposeConstructField.nested`** now typed as recursive `PipeComposeConstructBlueprint | null` instead of `Record<string, unknown> | null`. Enables the recursive renderer to drill into sub-constructs with full type safety.

## [v0.3.3] - 2026-04-10

### Fixed

- **PipeCompose detail panel empty for field-level construct form**: `PipeComposeDetail.tsx` only read the legacy monolithic `blueprint.template` field, which is `null` when a pipe uses `[pipe.X.construct]` (the field-level form where each output field has its own method — `from_var`, `fixed`, `template`, `nested`). The panel now renders the `construct_blueprint.fields` map: non-template fields appear as a FIELDS section with KV rows, and each template field gets its own `PromptToggle` labeled `Template — <field_name>`.
- **Runtime-resolved construct values now rendered**: when the graph tracer emits `execution_data.resolved_fields` (new in pipelex worker), the panel shows the runtime value instead of the static blueprint summary. Template fields display the Jinja-rendered text (with `$var` substitutions applied), and `from_var`/`fixed` fields show the concrete value pulled from working memory. **(Note: this behavior was reversed in v0.3.4 — see the v0.3.4 entry for the rationale.)**
- **PipeCompose template-field routing bug**: fields with `method === "template"` but an empty/null `template` string were misrouted to the non-template KV section and rendered as `(template)`. Routing now depends on `method` alone — `PromptToggle` already returns null when both `templateText` and `renderedText` are falsy, so empty templates are handled gracefully. (PR #23 review)
- **Pipe card description clipping in LR and TB**: description was hardcoded to `-webkit-line-clamp: 2` for both directions, which didn't match the card shapes. LR cards (narrow/tall) are now 3-line clamped vertically; TB cards (wide/short) are 1-line with horizontal ellipsis. Both truncate cleanly with `...`.
- **Pipe card height undercounted for wrapping pills in TB**: the height estimator assumed 3 pills per row regardless of pill width, so long input names caused outputs to overflow the card and get clipped. The estimator now bin-packs pills against the available area width (accounting for label column + padding) and reserves accurate height per wrapping row. The description height also now scales with actual line count instead of a fixed 24px reserve.
- **Stuff nodes wider than pipe cards in LR**: stuff nodes were capped at 400px regardless of direction, while LR pipe cards max out at 240px — producing visually lopsided graphs. Stuff node width now tracks the pipe card max for the current direction (240 in LR, 400 in TB).
- **Stuff/pipe node labels overflowed their container**: `renderLabel.tsx` set no max-width or truncation on label/concept spans, so long identifiers bled past the node edges. Both spans now truncate with `text-overflow: ellipsis` + `white-space: nowrap` and surface the full text via a native `title` tooltip on hover.

### Changed

- **`PipeComposeBlueprint.template` is now `string | null`** (was `string`). Reflects reality: the field is null when `construct_blueprint` is used instead.
- **New types: `PipeComposeConstructField`, `PipeComposeConstructBlueprint`**. Strongly typed replacement for the previous `construct_blueprint: Record<string, unknown> | null`. Consumers can now introspect field methods, from paths, templates, and fixed values with full type safety.
- **`PipeComposeConstructField.method` is a closed union** (`"from_var" | "fixed" | "template" | "nested"`). Previously included a trailing `| string` escape hatch that absorbed the literal cases and killed exhaustiveness checking on switches. `formatConstructField`'s switch is now exhaustive — any new method added to the union will fail to compile until it's handled. (PR #23 review)
- **Pipe card layout constants extracted** in `elkGraphBuilder.ts`. The height estimator was a pile of magic numbers; it's now a set of named `PIPE_CARD_*` constants with comments pointing at the matching CSS rules, plus two pure helpers (`estimateDescriptionLines`, `countTbPillRows`) that are individually reviewable. The `320px` height cap is preserved.

## [v0.3.2] - 2026-04-10

### Fixed

- **Detail panel CSS not loading in consumers**: `DetailPanel.css` and `StuffViewer.css` were extracted into `index.css` by tsup but never imported by the built JS. Externalized both CSS files in `tsup.config.ts` so their imports are preserved in the output, matching the existing `graph-core.css` pattern.
- **PromptToggle showing empty when only template available**: When `renderedText` (from execution_data) was undefined, the component showed blank instead of falling back to `templateText`. Now shows whichever text is available, defaulting to rendered when both exist.

### Added

- `renderDetailExtra` prop on `GraphViewer`: render function that injects custom content below the built-in detail panel for the selected node. Enables consumers to add app-specific UI (e.g., input forms) without reimplementing the panel.
- `DetailPanel.css` export in `package.json` (`./graph/react/detail/DetailPanel.css`)

## [v0.3.1] - 2026-04-09

### Fixed

- Edge type `"bezier"` renamed to `"default"` to match ReactFlow v12 (fixes console spam)
- `useState` hooks moved before early return in `PromptToggle` (React rules of hooks violation)
- Guard `navigator.clipboard` before `writeText` call (prevents error when Clipboard API unavailable)

### Changed

- `EDGE_TYPE` constant object for ReactFlow edge types (replaces string literals)

## [v0.3.0] - 2026-04-09

### Fixed

- Close button z-index fixed to stay above sticky header

### Added

- Resizable detail panel: drag the left edge to resize between 280px and 800px, width persists during session
- Escape key closes the detail panel (controllable via `closeOnEscape` prop)
- Sticky header in pipe detail panel: pipe info, status, inputs, outputs stay pinned at top while scrolling
- Prompt expand/collapse toggle button: collapsed shows 300px with scroll, expanded shows full content
- Copy button on prompt blocks (system prompt, user prompt, template)
- PipeLLM and PipeCompose: prompts moved to bottom of the detail section
- `useResizable` hook for horizontal panel resize (pure React, no dependencies)
- Storybook stories: resizable panel (default/min/max width), local image/PDF fixtures
- Pipeline 30: CV Analyzer with concept refinement (`DetailedMatchResult` refines `MatchResult`), dry + live runs
- Pipeline 31: RFP Qualifier with structured concepts, dry + live runs
- Concept detail panel stories: parent concept (`Evaluation`) and refined concept (`TechnicalEvaluation`)
- `/add-pipeline-story` skill for adding new pipeline examples from `.mthds` bundles
- Storybook static file serving (`staticDirs`) for local fixture files
- `.npmignore` to exclude dev files from git installs
- CLA document

### Changed

- Detail panel resize handle hit area widened to 12px (visible bar stays 2px)

## [v0.2.6] - 2026-04-08

### Fixed

- StuffViewer now renders images and PDFs inline with both local URLs (`file://`) and remote URLs (`http://`, `https://`)
- `pipelex-storage://` URLs (internal, non-browser-renderable) show a clean fallback card with filename instead of a blank embed or generic placeholder
- PDF embed hides the browser sidebar by default (`#pagemode=none`)
- PDF Storybook story now uses a real, loadable PDF URL

### Added

- `isInlineRenderableUrl` and `extractInlineUrl` utilities for separating inline-renderable URLs from link-safe URLs
- `extractFilename` utility for extracting filename metadata from stuff data
- `InternalStorageImage` Storybook story demonstrating the fallback for non-renderable URLs
- GitHub Actions workflows: guard-branches, version-check, changelog-check, quality-checks, release (tag + GitHub Release), CLA
- README install instructions updated for git tag references (`github:Pipelex/mthds-ui#vX.Y.Z`)

## [v0.2.5] - 2026-04-07

### Changed

- elkjs loaded via CDN — use shim that reads `window.ELK` instead of bundling elkjs

## [v0.2.4] - 2026-04-07

### Added

- Standalone build: esbuild IIFE bundle (`dist/standalone/graph-standalone.html`) for embedding GraphViewer in single HTML files without a bundler
- Standalone adapter, CSS, and HTML template with sentinel-based data injection
- `build:standalone` npm script

## [v0.2.3] - 2026-04-06

### Added

- Built-in detail panel in GraphViewer: click any pipe or stuff node to inspect
- Per-pipe-type detail sections: PipeLLM, PipeImgGen, PipeExtract, PipeSearch, PipeCompose, PipeCondition, PipeSequence, PipeParallel, PipeBatch
- Prompt toggle: switch between template and rendered prompt (default: rendered)
- Concept detail panel: schema table, refinement chain, live data via StuffViewer
- Execution data display: resolved models, rendered prompts, structuring paths, expression results
- TypeScript types for GraphSpec enrichment: pipe_registry, concept_registry, execution_data, ConceptInfo, PipeBlueprintUnion with per-type interfaces
- Registry lookup helpers: getPipeBlueprint, getConceptInfo, resolveConceptRef

### Changed

- GraphViewer now manages its own detail panel state (no external wrapper needed)
- Reduced StuffViewer font sizes (JSON, Pretty, HTML tabs) to 11px

## [v0.2.2] - 2026-04-02

### Fixed

- Reset list styles (ul only) in StuffViewer HTML content to prevent browser defaults

### Added

- PageList Storybook story for StuffViewer with multi-page data

## [v0.2.1] - 2026-04-02

### Added

- StuffViewer component for stuff content inspection
