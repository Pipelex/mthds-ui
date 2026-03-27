import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: ["src/index.ts", "src/graph/index.ts", "src/graph/react/index.ts", "src/shiki/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "dagre",
    "@xyflow/react",
    "@shikijs/core",
    "@shikijs/engine-oniguruma",
    "@shikijs/themes",
    "react",
    "react-dom",
    /graph-core\.css$/,
  ],
  esbuildOptions(options) {
    options.alias = {
      "@graph": path.resolve(dirname, "src/graph"),
    };
  },
  // graph-core.css is kept external so the import stays in the JS output.
  // The consumer's bundler resolves it (including the @import for @xyflow CSS).
  onSuccess: async () => {
    mkdirSync("dist/graph/react", { recursive: true });
    cpSync("src/graph/react/graph-core.css", "dist/graph/react/graph-core.css");
  },
});
