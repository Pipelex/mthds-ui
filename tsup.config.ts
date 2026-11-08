import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Re-prepends `"use client"` onto a built entry that a React Server Components
 * host must treat as client code — the same fix `mthds-form/tsup.config.ts`
 * applies to its own rendering entries. At the pinned toolchain esbuild keeps
 * the directive on its own, which `dist/graph/react/index.js` shows with no
 * call here, so this is a guard against a bundler that starts stripping it,
 * idempotent and free. What proves the directive ships is `make smoke-pack`,
 * which checks every React entry, these included.
 */
function prependUseClient(file: string) {
  const source = readFileSync(file, "utf8");
  if (source.startsWith('"use client"')) return;
  writeFileSync(file, `"use client";\n${source}`);
}

/** The kernel's method files this package ships, each at `./form/<file>`. */
const KERNEL_METHOD_FILES = ["layout-design.mthds", "layout-sample.mthds"];

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/graph/index.ts",
    "src/graph/react/index.ts",
    "src/form/index.ts",
    "src/form/brand/index.ts",
    "src/form/generative/index.ts",
    "src/form/generative/headless/index.ts",
    "src/form/react/index.ts",
    "src/shiki/index.ts",
    "src/static-graph/index.ts",
    "src/timeline/index.ts",
    "src/timeline/react/index.ts",
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
    // The form kernel carries React contexts
    // (FieldStringsProvider, FieldPresentationProvider). Bundling a copy here
    // would give the panel a second context identity, so a host's provider
    // would not resolve inside it. It is a dependency now
    // rather than an optional peer, which makes this MORE important, not less:
    // nothing stops the bundler from inlining a package that is always present.
    "@pipelex/mthds-form",
    "@pipelex/mthds-form/brand",
    "@pipelex/mthds-form/generative",
    "@pipelex/mthds-form/generative/headless",
    "@pipelex/mthds-form/react",
    "react",
    "react-dom",
    /graph-core\.css$/,
    /detail\/DetailPanel\.css$/,
    /viewer\/GraphToolbar\.css$/,
    /viewer\/StyleMenu\.css$/,
    /styles\/simple\/SimpleStyle\.css$/,
    /styles\/simple\/SimpleDetailPanel\.css$/,
    /RunPanel\.css$/,
    /RunTimeline\.css$/,
    /styles\/simple\/SimpleProgress\.css$/,
  ],
  esbuildOptions(options) {
    options.alias = {
      "@graph": path.resolve(dirname, "src/graph"),
      "@static-graph": path.resolve(dirname, "src/static-graph"),
      "@form": path.resolve(dirname, "src/form"),
      "@timeline": path.resolve(dirname, "src/timeline"),
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
    cpSync("src/graph/react/viewer/StyleMenu.css", "dist/graph/react/viewer/StyleMenu.css");
    mkdirSync("dist/graph/react/styles/simple", { recursive: true });
    cpSync(
      "src/graph/react/styles/simple/SimpleStyle.css",
      "dist/graph/react/styles/simple/SimpleStyle.css",
    );
    cpSync(
      "src/graph/react/styles/simple/SimpleDetailPanel.css",
      "dist/graph/react/styles/simple/SimpleDetailPanel.css",
    );
    mkdirSync("dist/form/react", { recursive: true });
    cpSync("src/form/react/RunPanel.css", "dist/form/react/RunPanel.css");
    mkdirSync("dist/timeline/react", { recursive: true });
    cpSync("src/timeline/react/RunTimeline.css", "dist/timeline/react/RunTimeline.css");
    mkdirSync("dist/timeline/react/styles/simple", { recursive: true });
    cpSync(
      "src/timeline/react/styles/simple/SimpleProgress.css",
      "dist/timeline/react/styles/simple/SimpleProgress.css",
    );
    // The two stylesheets a HOST imports, never this package's JavaScript, so
    // they have no `external` pattern: only this copy and an `exports` entry.
    // `tailwind.css`'s `@source` paths are relative to `dist/styles/`, so it
    // must land exactly here.
    mkdirSync("dist/styles", { recursive: true });
    cpSync("src/styles/form-kernel.css", "dist/styles/form-kernel.css");
    cpSync("src/styles/tailwind.css", "dist/styles/tailwind.css");
    // The designer method's two files, which a host reads and hands a runner,
    // never modules anything imports. An export map cannot point into a
    // dependency, so the kernel's own files are copied beside
    // `./form/generative`, from the kernel this build resolves, which the lock
    // pins. `make smoke-pack` holds each copy to the kernel a consumer installs,
    // byte for byte: a `layout-design.mthds` that differs from the kernel's own
    // is one its `PROMPT_HASH` does not name, and `layout-sample.mthds` reads
    // that file's concepts and pipes (docs/generative-layout.md).
    mkdirSync("dist/form", { recursive: true });
    const resolveFromThisPackage = createRequire(path.join(dirname, "package.json")).resolve;
    for (const methodFile of KERNEL_METHOD_FILES) {
      cpSync(
        resolveFromThisPackage(`@pipelex/mthds-form/${methodFile}`),
        `dist/form/${methodFile}`,
      );
    }
    prependUseClient("dist/form/react/index.js");
    prependUseClient("dist/form/generative/index.js");
    // Never `dist/form/generative/headless/index.js`: that entry exists so a
    // server component or a server action can call the producer's functions,
    // and the directive would turn every one of them into a client reference.
    // `make smoke-pack` fails if it acquires one.
  },
});
