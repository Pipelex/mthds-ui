/**
 * Regression guard for the v0.4.1 / v0.6.1 pattern: a new `import "./Foo.css"`
 * appears in a React component, but the hand-maintained CSS allow-list in
 * `scripts/standaloneCssFiles.mjs` never gets updated. The npm package
 * consumer is unaffected (their bundler picks up the side-effect import) but
 * the standalone IIFE bundle silently drops the stylesheet because the JS
 * build uses `loader: { ".css": "empty" }` and only files in the manifest
 * reach `dist/standalone/graph-viewer.css`.
 *
 * This test walks every `.ts`/`.tsx` file under `src/` (skipping
 * `__tests__/` and `__stories__/`), extracts every relative `.css` import,
 * resolves it to a repo-relative path, and asserts the path is present in
 * `STANDALONE_CSS_FILES`. If it fails, the message names the file and the
 * import that's missing from the manifest.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STANDALONE_CSS_FILES } from "../../../scripts/standaloneCssFiles.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC_DIR = path.join(REPO_ROOT, "src");

const SKIP_DIR_SEGMENTS = new Set(["__tests__", "__stories__", "node_modules"]);

/**
 * Source trees the standalone bundle cannot reach, and therefore must not be
 * asked to ship stylesheets for. The bundle has exactly one entry point —
 * `src/standalone/adapter.ts`, the graph viewer.
 *
 * `src/form/` is out because the run panel renders the form kernel's controls,
 * and `@pipelex/mthds-form` is an OPTIONAL PEER that the standalone IIFE by
 * construction does not have (design Decision B). Listing `RunPanel.css` in the
 * manifest would inline a stylesheet for a component no standalone HTML can
 * render.
 */
const UNREACHABLE_FROM_STANDALONE = ["src/form"];
const SOURCE_EXTS = new Set([".ts", ".tsx"]);
const CSS_IMPORT_PATTERN = /import\s+["'](\.{1,2}\/[^"']+\.css)["']/g;

function walkSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR_SEGMENTS.has(entry)) continue;
    const full = path.join(dir, entry);
    if (UNREACHABLE_FROM_STANDALONE.includes(path.relative(REPO_ROOT, full))) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walkSourceFiles(full));
    } else if (SOURCE_EXTS.has(path.extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

interface CssImport {
  importer: string;
  resolved: string;
}

function collectCssImports(files: string[]): CssImport[] {
  const out: CssImport[] = [];
  for (const file of files) {
    const source = readFileSync(file, "utf-8");
    for (const match of source.matchAll(CSS_IMPORT_PATTERN)) {
      const rawSpecifier = match[1];
      const resolvedAbs = path.resolve(path.dirname(file), rawSpecifier);
      const resolvedRel = path.relative(REPO_ROOT, resolvedAbs);
      out.push({ importer: path.relative(REPO_ROOT, file), resolved: resolvedRel });
    }
  }
  return out;
}

describe("standalone CSS manifest", () => {
  it("includes every component-side CSS import", () => {
    const manifest = new Set(STANDALONE_CSS_FILES);
    const imports = collectCssImports(walkSourceFiles(SRC_DIR));

    // Sanity: the walker actually found imports (catches a silently-broken regex).
    expect(imports.length).toBeGreaterThan(0);

    const missing = imports.filter((entry) => !manifest.has(entry.resolved));
    expect(missing, formatMissing(missing)).toEqual([]);
  });

  it("only lists CSS files that exist on disk", () => {
    const missing = STANDALONE_CSS_FILES.filter((rel) => {
      try {
        statSync(path.join(REPO_ROOT, rel));
        return false;
      } catch {
        return true;
      }
    });
    expect(
      missing,
      `STANDALONE_CSS_FILES references files that don't exist: ${missing.join(", ")}`,
    ).toEqual([]);
  });
});

function formatMissing(missing: CssImport[]): string {
  if (missing.length === 0) return "";
  const lines = missing.map((m) => `  - ${m.resolved}  (imported by ${m.importer})`);
  return [
    "Component CSS imports missing from scripts/standaloneCssFiles.mjs:",
    ...lines,
    "Add each path (repo-relative) to STANDALONE_CSS_FILES so the standalone bundle ships these styles.",
  ].join("\n");
}
