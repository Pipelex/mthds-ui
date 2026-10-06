import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";

const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// Visual regression tests: `*.screenshot.tsx` files render a story in Playwright
// Chromium and compare it with a committed reference image. Kept out of
// `vitest.config.mts`, and so out of `make test` and CI, on purpose: a reference
// is a picture of one platform's font rendering, named for that platform
// (`…-chromium-darwin.png`), and a machine of another platform has no reference
// to compare with. Run `make test-screenshots` to check, `make
// update-screenshots` to rewrite the references after an intended change. See
// `docs/static-graph.md`.
export default defineConfig({
  resolve: {
    alias: {
      "@graph": path.resolve(dirname, "src/graph"),
      "@static-graph": path.resolve(dirname, "src/static-graph"),
      "@form": path.resolve(dirname, "src/form"),
    },
  },
  optimizeDeps: {
    // The same pre-bundling Storybook asks for (`.storybook/main.ts`), for the same reasons.
    include: ["elkjs/lib/elk.bundled.js", "@pipelex/mthds-form", "@pipelex/mthds-form/react"],
  },
  test: {
    name: "screenshots",
    include: ["src/**/*.screenshot.tsx"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({}),
      instances: [{ browser: "chromium", viewport: { width: 1280, height: 800 } }],
    },
  },
});
