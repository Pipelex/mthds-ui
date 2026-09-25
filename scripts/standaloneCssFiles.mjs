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
 * Paths are repo-relative. Order is the cascade: vendor base sheets first,
 * then our own component CSS, so a hand-written rule of ours wins a tie
 * against a vendor utility rather than depending on which file was longer.
 */
export const STANDALONE_CSS_FILES = [
  "node_modules/@xyflow/react/dist/style.css",
  // The form kernel's prebuilt sheet, preflight included. The standalone HTML
  // is a host without Tailwind, and its detail panel renders the kernel's
  // controls, so it loads the sheet a host without Tailwind loads. Unlayered on
  // purpose: the page has no host stylesheet to lose a tie to, and ordering it
  // with the vendor base sheets gives our own component CSS the last word. No
  // source file imports it, so the regression guard does not ask for it; it is
  // listed by decision, like `@xyflow`'s sheet above.
  "node_modules/@pipelex/mthds-form/dist/styles.css",
  "src/graph/react/graph-core.css",
  "src/graph/react/detail/DetailPanel.css",
  "src/graph/react/viewer/GraphToolbar.css",
  "src/standalone/standalone.css",
];
