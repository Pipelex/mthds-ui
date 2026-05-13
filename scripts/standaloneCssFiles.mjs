/**
 * Single source of truth for the CSS files that get concatenated into the
 * standalone IIFE bundle (`dist/standalone/graph-viewer.css` and the inlined
 * `<style>` in `graph-standalone.html`).
 *
 * Imported by `scripts/build-standalone.mjs` at build time and by
 * `src/standalone/__tests__/cssManifest.test.ts` as a regression guard
 * against the v0.4.1 / v0.6.1 pattern: a new `import "./Foo.css"` in a React
 * component is silently dropped from the standalone bundle because
 * `loader: { ".css": "empty" }` strips the import and this allow-list is
 * hand-maintained. The test asserts every component-side CSS import is
 * present here.
 *
 * Paths are repo-relative.
 */
export const STANDALONE_CSS_FILES = [
  "node_modules/@xyflow/react/dist/style.css",
  "src/graph/react/graph-core.css",
  "src/graph/react/stuff/StuffViewer.css",
  "src/graph/react/detail/DetailPanel.css",
  "src/graph/react/viewer/GraphToolbar.css",
  "src/standalone/standalone.css",
];
