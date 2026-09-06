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
  "node_modules/@pipelex/mthds-form/dist/styles.css",
  "src/graph/react/graph-core.css",
  "src/graph/react/detail/DetailPanel.css",
  "src/graph/react/viewer/GraphToolbar.css",
  "src/standalone/standalone.css",
];

/**
 * Wrapper stylesheets, mapped to the file the bundle must ship instead.
 *
 * `src/styles/form-kernel.css` holds nothing but
 * `@import "@pipelex/mthds-form/styles.css" layer(mthds-form);` — the layer is
 * what makes the kernel's complete Tailwind build safe to inject into a host
 * that has Tailwind of its own (read that file for what it broke). The
 * standalone bundle is a plain `readFileSync` concatenation with no module
 * resolution, so listing the wrapper would inline a bare `@import` of a bare
 * package specifier: unresolvable, and invalid where it lands mid-sheet.
 *
 * The bundle therefore ships the RESOLVED sheet, unlayered — it is one
 * self-contained HTML with no host stylesheet to lose a tie to, and ordering it
 * with the vendor base sheets gives our own component CSS the last word anyway.
 * This is the same shape as `@xyflow`, whose `@import` inside `graph-core.css`
 * is likewise satisfied by an explicit `node_modules/…` entry above.
 *
 * Keyed and valued in repo-relative POSIX form, like the manifest itself.
 */
export const STANDALONE_CSS_ALIASES = {
  "src/styles/form-kernel.css": "node_modules/@pipelex/mthds-form/dist/styles.css",
};
