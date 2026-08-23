// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from "@eslint/js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: ["dist/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: dirname,
      },
    },
    rules: {
      // These types intentionally use `any` to match ReactFlow's flexible data model
      "@typescript-eslint/no-explicit-any": "off",
      // Allow unused vars prefixed with _
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],
      "no-console": "error",
    },
  },
  {
    // Import isolation for the optional peer (design Decision B,
    // `wip/adopt-form/design.md`): `@pipelex/mthds-form` is reachable only from
    // `src/form/**`, which is exported behind its own `./form/react` entry.
    // Every other entry must keep resolving with the kernel not installed.
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: ["src/form/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@pipelex/mthds-form", "@pipelex/mthds-form/*"],
              message:
                "@pipelex/mthds-form is an OPTIONAL peer dependency, isolated behind the ./form/react entry (design Decision B). Import it only from src/form/**, so the graph entries keep working with the kernel absent.",
            },
          ],
        },
      ],
      // `no-restricted-imports` does not visit `ImportExpression` at all, so the
      // rule above is blind to `await import("@pipelex/mthds-form")` — which is
      // the FIRST thing someone reaches for when the goal is "only pull the
      // kernel in when the form is actually shown". That spelling would lint
      // clean, stay external through tsup, and fail at runtime for every
      // graph-only consumer, who by construction has not installed the kernel.
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportExpression[source.value=/^@pipelex\\/mthds-form(\\/|$)/]",
          message:
            "@pipelex/mthds-form is an OPTIONAL peer dependency, isolated behind the ./form/react entry (design Decision B). A dynamic import() is still an import: outside src/form/** it breaks every consumer who has not installed the kernel.",
        },
      ],
    },
  },
  ...storybook.configs["flat/recommended"],
  {
    files: ["src/**/*.stories.ts", "src/**/*.stories.tsx"],
    rules: {
      // Storybook's interaction-test helpers are promise-like enough to make
      // type-aware promise linting noisy in play functions.
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
);
