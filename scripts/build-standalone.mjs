/**
 * Build standalone GraphViewer bundle for embedding in single HTML files.
 * Produces dist/standalone/graph-standalone.html with JS+CSS inlined.
 */
import esbuild from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { findInlineScriptHazard, findInlineStyleHazard } from "./inlineHazards.mjs";
import { STANDALONE_CSS_FILES } from "./standaloneCssFiles.mjs";

const require = createRequire(import.meta.url);

// Resolve React to a single copy (prevents dual-React hooks crash)
const reactDir = path.dirname(require.resolve("react/package.json"));
const reactDomDir = path.dirname(require.resolve("react-dom/package.json"));

mkdirSync("dist/standalone", { recursive: true });

// 1. Bundle adapter.ts → IIFE with all deps inlined
console.log("Building standalone JS bundle...");
esbuild.buildSync({
  entryPoints: ["./src/standalone/adapter.ts"],
  outfile: "./dist/standalone/graph-viewer.js",
  bundle: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  loader: { ".css": "empty" },
  alias: {
    "react": reactDir,
    "react-dom": reactDomDir,
    "react/jsx-runtime": reactDir + "/jsx-runtime",
    "@graph": path.resolve("./src/graph"),
    "@static-graph": path.resolve("./src/static-graph"),
    // elkjs loaded via CDN — use shim that reads window.ELK
    "elkjs/lib/elk.bundled.js": path.resolve("./src/standalone/elk-shim.ts"),
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  minify: true,
});

// 2. Concatenate all CSS into one file
console.log("Building standalone CSS bundle...");
const css = STANDALONE_CSS_FILES.map((f) => readFileSync(f, "utf-8"))
  // Strip bare-module @import that can't resolve without a bundler
  .map((content) => content.replace(/@import\s+["'][^"']*["'];?\s*\n?/g, ""))
  .join("\n");

writeFileSync("./dist/standalone/graph-viewer.css", css);

// 3. Assemble final HTML with JS + CSS inlined
console.log("Assembling standalone HTML...");
const template = readFileSync("./src/standalone/graph-standalone.html", "utf-8");
const js = readFileSync("./dist/standalone/graph-viewer.js", "utf-8");

// Checked, not rewritten: esbuild already escapes every `</script` it emits,
// and a text replace over minified code would be redundant where it is right
// and would change the program where it is wrong. See inlineHazards.mjs.
const hazard = findInlineScriptHazard(js) ?? findInlineStyleHazard(css);
if (hazard !== null) {
  throw new Error(`Cannot inline the standalone bundle into its HTML page: ${hazard}.`);
}

// Use function replacer to avoid $-pattern interpretation in String.replace
const html = template
  .replace("<!--PIPELEX_CSS-->", () => css)
  .replace("<!--PIPELEX_JS-->", () => js);

writeFileSync("./dist/standalone/graph-standalone.html", html);

console.log("Standalone build complete:");
console.log(`  JS:   ${(js.length / 1024).toFixed(0)} KB`);
console.log(`  CSS:  ${(css.length / 1024).toFixed(0)} KB`);
console.log(`  HTML: ${(html.length / 1024).toFixed(0)} KB`);
