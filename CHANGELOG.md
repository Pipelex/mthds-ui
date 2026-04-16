# Changelog

## [Unreleased]

### Added

- **Built-in floating toolbar on `GraphViewer`** with five controls, grouped left-to-right: toggle layout direction (LR ↔ TB), toggle pipe-controller grouping, then a separator followed by `−` zoom out, `+` zoom in, and fit-view. Zoom/fit buttons delegate to xyflow's own `zoomIn()` / `zoomOut()` / `fitView()` on the ReactFlow instance — no custom zoom math — but share the dark translucent chrome of the direction/controllers buttons so the whole cluster reads as one toolbar. The toolbar now lives inside mthds-ui so every consumer gets the same UI — no need to re-implement it per app. Positioned absolutely at the top-right of the graph background; when the detail panel is open, the toolbar shifts left by the panel's width so it stays on the graph background (never over the panel) and remains visible at any panel size. New `hideToolbar` prop disables it for consumers that want to provide their own controls. (`<Controls />` from `@xyflow/react` was considered but rejected: its light-theme chrome clashed with the dark toolbar and its built-in positioning can't shift with the detail panel.)
- **`pipelex-storage://` URI resolution in `StuffViewer`** via a new `resolveStorageUrl?: ResolveStorageUrl` prop. Internal pipelex-storage URIs aren't browser-fetchable; the viewer now calls the consumer-supplied resolver to exchange them for short-lived, browser-fetchable URLs (e.g. presigned S3) before rendering images/PDFs inline. If the stuff data already has an `http(s)://` URL, that's preferred and the resolver is skipped. Resolution is async, cancellation-safe on unmount/stuff-change, and falls back to the "no preview" placeholder if the resolver returns `null`. The resolver is threaded through `ConceptDetailPanel` and `GraphViewer`'s built-in stuff detail panel so consumers only have to pass it once at the top level.
- **Smarter MIME detection via `resolveMimeType`** (new utility in `stuffViewerUtils`). Previously, PDF/image preview decisions were made from `stuff.contentType` — but `contentType` is often the concept tag (e.g. `"document"`), not a MIME type. The resolver now checks in order: (1) `contentType` when it already looks like a MIME, (2) `data.mime_type` (Document content carries this), (3) the file extension in `filename` or in the URL/URI. Supports `pdf`, `png`, `jpg`/`jpeg`, `gif`, `webp`, `svg`, `bmp`. This makes storage-resolved PDFs and images actually render as previews instead of falling back to raw JSON.
- **New public exports** from `@pipelex/mthds-ui/graph/react`: `ResolveStorageUrl` type, `extractStorageUri(data)`, and `resolveMimeType(data, contentType, url)` — consumers can reuse them when building custom viewers or precomputing preview state.

### Changed

- **BREAKING: `GraphViewer` props `direction` and `showControllers` renamed to `initialDirection` and `initialShowControllers`.** They are now initial values for internal state (the built-in toolbar drives user-facing toggling). Consumers that previously passed these as controlled values should either rely on the new toolbar or set `hideToolbar` and manage state externally via their own UI.
- **`getHtmlTabLabel` now accepts `string | null | undefined`** (was `string | undefined`) to match the new `effectiveMime` nullability inside `StuffViewer`.

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
