import { cpSync, mkdirSync } from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/graph/index.ts", "src/graph/react/index.ts", "src/shiki/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "dagre",
    "shiki",
    "shiki/core",
    "shiki/engine/oniguruma",
    "shiki/wasm",
    "shiki/themes/dark-plus.mjs",
    "shiki/themes/monokai.mjs",
    "shiki/themes/dracula.mjs",
    "shiki/themes/one-dark-pro.mjs",
    "react",
    "react-dom",
    "@xyflow/react",
  ],
  onSuccess: async () => {
    mkdirSync("dist/graph/react", { recursive: true });
    cpSync("src/graph/react/graph-core.css", "dist/graph/react/graph-core.css");
  },
});
