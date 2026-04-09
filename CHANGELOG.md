# Changelog

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
