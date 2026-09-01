import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * esbuild strips directive prologues, so a `"use client"` written in the source
 * never survives into the bundle. Re-prepend it onto the built entries that a
 * React Server Components host must treat as client code — the same fix
 * `mthds-form/tsup.config.ts` applies to its own react entry.
 */
function prependUseClient(file: string) {
  const source = readFileSync(file, "utf8");
  if (source.startsWith('"use client"')) return;
  writeFileSync(file, `"use client";\n${source}`);
}

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/graph/index.ts",
    "src/graph/react/index.ts",
    "src/form/react/index.ts",
    "src/shiki/index.ts",
    "src/static-graph/index.ts",
  ],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "elkjs",
    "@xyflow/react",
    "@shikijs/core",
    "@shikijs/engine-oniguruma",
    "@shikijs/themes",
    // The form kernel is an OPTIONAL PEER and carries React contexts
    // (FieldStringsProvider, FieldPresentationProvider). Bundling a copy here
    // would give the panel a second context identity, so a host's provider
    // would not resolve inside it — design Decision B.
    "@pipelex/mthds-form",
    "@pipelex/mthds-form/react",
    "react",
    "react-dom",
    /graph-core\.css$/,
    /detail\/DetailPanel\.css$/,
    /viewer\/GraphToolbar\.css$/,
    /RunPanel\.css$/,
  ],
  esbuildOptions(options) {
    options.alias = {
      "@graph": path.resolve(dirname, "src/graph"),
      "@static-graph": path.resolve(dirname, "src/static-graph"),
      "@form": path.resolve(dirname, "src/form"),
    };
  },
  // CSS files are kept external so the import stays in the JS output.
  // The consumer's bundler resolves it (including the @import for @xyflow CSS).
  onSuccess: async () => {
    mkdirSync("dist/graph/react", { recursive: true });
    cpSync("src/graph/react/graph-core.css", "dist/graph/react/graph-core.css");
    mkdirSync("dist/graph/react/detail", { recursive: true });
    cpSync("src/graph/react/detail/DetailPanel.css", "dist/graph/react/detail/DetailPanel.css");
    mkdirSync("dist/graph/react/viewer", { recursive: true });
    cpSync("src/graph/react/viewer/GraphToolbar.css", "dist/graph/react/viewer/GraphToolbar.css");
    mkdirSync("dist/form/react", { recursive: true });
    cpSync("src/form/react/RunPanel.css", "dist/form/react/RunPanel.css");
    prependUseClient("dist/form/react/index.js");
  },
});
