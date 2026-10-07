import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";

const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// The graph styles' review loop (`docs/graph-styles.md`): render every
// fixture of the review set in each style, and save each picture with its
// measurements into `.style-review/<ITERATION>/<style>/`, for reading — nothing
// is compared. Kept out of `vitest.config.mts`, and so out of `make test`, like
// the screenshot suite: it writes files and takes minutes. `make style-review
// ITERATION=<n>` runs it; `STYLES=simple` limits the styles and `ONLY=` (a
// comma-separated list of review fixture ids) the fixtures.
const iteration = process.env.ITERATION || "scratch";
const outDir = path.resolve(dirname, ".style-review", iteration);

export default defineConfig({
  resolve: {
    alias: {
      "@graph": path.resolve(dirname, "src/graph"),
      "@static-graph": path.resolve(dirname, "src/static-graph"),
      "@form": path.resolve(dirname, "src/form"),
    },
  },
  optimizeDeps: {
    include: ["elkjs/lib/elk.bundled.js", "@pipelex/mthds-form", "@pipelex/mthds-form/react"],
  },
  define: {
    __STYLE_REVIEW_DIR__: JSON.stringify(outDir),
    __STYLE_REVIEW_STYLES__: JSON.stringify(process.env.STYLES || "detailed,simple"),
    __STYLE_REVIEW_ONLY__: JSON.stringify(process.env.ONLY || ""),
  },
  test: {
    name: "style-review",
    include: ["src/**/*.style-review.tsx"],
    testTimeout: 60000,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({}),
      // A failed capture is read from its error; a failure screenshot would land
      // in `__screenshots__/`, beside the committed references of the screenshot suite.
      screenshotFailures: false,
      instances: [{ browser: "chromium", viewport: { width: 1280, height: 800 } }],
    },
  },
});
