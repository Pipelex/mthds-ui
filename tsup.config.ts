import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/graph/index.ts", "src/graph/react/index.ts", "src/shiki/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "@shikijs/core",
    "@shikijs/engine-oniguruma",
    "@shikijs/themes",
    "react",
    "react-dom",
  ],
  onSuccess: async () => {
    mkdirSync("dist/graph/react", { recursive: true });
    // Keep graph-core.css as a standalone export for consumers that need it separately
    cpSync("src/graph/react/graph-core.css", "dist/graph/react/graph-core.css");

    // Bundle ReactFlow CSS into the output so consumers don't need to import it
    const require = createRequire(import.meta.url);
    const xyflowPkg = dirname(require.resolve("@xyflow/react/package.json"));
    const xyflowCss = readFileSync(resolve(xyflowPkg, "dist/style.css"), "utf-8");

    const outputCss = "dist/graph/react/index.css";
    const ourCss = readFileSync(outputCss, "utf-8");
    writeFileSync(
      outputCss,
      `/* @xyflow/react base styles */\n${xyflowCss}\n\n${ourCss}`,
    );
  },
});
