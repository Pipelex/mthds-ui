/**
 * Build standalone GraphViewer bundle for embedding in single HTML files.
 * Produces dist/standalone/graph-standalone.html with JS+CSS inlined.
 */
import esbuild from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

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
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  minify: true,
});

// 2. Concatenate all CSS into one file
console.log("Building standalone CSS bundle...");
const cssFiles = [
  "./node_modules/@xyflow/react/dist/style.css",
  "./src/graph/react/graph-core.css",
  "./src/graph/react/stuff/StuffViewer.css",
  "./src/graph/react/detail/DetailPanel.css",
  "./src/standalone/standalone.css",
];

const css = cssFiles
  .map((f) => readFileSync(f, "utf-8"))
  // Strip bare-module @import that can't resolve without a bundler
  .map((content) => content.replace(/@import\s+["'][^"']*["'];?\s*\n?/g, ""))
  .join("\n");

writeFileSync("./dist/standalone/graph-viewer.css", css);

// 3. Assemble final HTML with JS + CSS inlined
console.log("Assembling standalone HTML...");
const template = readFileSync("./src/standalone/graph-standalone.html", "utf-8");
const js = readFileSync("./dist/standalone/graph-viewer.js", "utf-8");

// Escape </script> in JS to prevent premature script tag closure in HTML
const escapedJs = js.replace(/<\/script>/gi, "<\\/script>");

// Use function replacer to avoid $-pattern interpretation in String.replace
const html = template
  .replace("<!--PIPELEX_CSS-->", () => css)
  .replace("<!--PIPELEX_JS-->", () => escapedJs);

writeFileSync("./dist/standalone/graph-standalone.html", html);

console.log("Standalone build complete:");
console.log(`  JS:   ${(js.length / 1024).toFixed(0)} KB`);
console.log(`  CSS:  ${(css.length / 1024).toFixed(0)} KB`);
console.log(`  HTML: ${(html.length / 1024).toFixed(0)} KB`);
