import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.mts"],
    exclude: ["node_modules/**"],
    environment: "node",
  },
});
