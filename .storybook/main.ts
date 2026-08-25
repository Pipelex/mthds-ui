import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  staticDirs: ["../public"],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
  ],
  framework: "@storybook/react-vite",
  viteFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string>),
      "@graph": path.resolve(dirname, "../src/graph"),
      "@static-graph": path.resolve(dirname, "../src/static-graph"),
      "@form": path.resolve(dirname, "../src/form"),
    };
    // Pre-bundle elkjs CJS module for browser compatibility.
    //
    // The form kernel is listed for a different reason: discovered late (only
    // the form stories import it), Vite re-optimizes mid-run and reloads the
    // page, which fails the story tests with "Failed to fetch dynamically
    // imported module: …/sb-vitest/deps/…". Naming it up front means it is
    // optimized before any story loads.
    config.optimizeDeps = config.optimizeDeps || {};
    config.optimizeDeps.include = [
      ...(config.optimizeDeps.include || []),
      "elkjs/lib/elk.bundled.js",
      "@pipelex/mthds-form",
      "@pipelex/mthds-form/react",
    ];
    return config;
  },
};
export default config;
