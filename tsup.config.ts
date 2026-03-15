import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/shiki/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["dagre", "shiki"],
});
