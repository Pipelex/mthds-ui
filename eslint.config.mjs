// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [js.configs.recommended, ...tseslint.configs.recommended, {
  ignores: ["dist/**"],
}, {
  rules: {
    // These types intentionally use `any` to match ReactFlow's flexible data model
    "@typescript-eslint/no-explicit-any": "off",
    // Allow unused vars prefixed with _
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }],
    "no-console": "error",
  },
}, ...storybook.configs["flat/recommended"]];
