/**
 * No run of this repo's tests sends usage telemetry, ours or a third party's.
 * Storybook reports to storybook.js.org unless its main config sets
 * `core.disableTelemetry`: the vitest addon checks exactly that flag (or the
 * `STORYBOOK_DISABLE_TELEMETRY` environment variable, which nothing here sets)
 * before sending its `test-run` event on every `make test`, and `storybook dev`
 * and `build-storybook` read the same flag. This test keeps it set.
 */
import { describe, it, expect } from "vitest";
import config from "../../.storybook/main";

describe("Storybook main config", () => {
  it("disables Storybook's telemetry", () => {
    const core = config.core;
    if (typeof core !== "object" || core === null) {
      throw new Error(
        "`.storybook/main.ts` must set `core` as a plain object carrying `disableTelemetry: true`",
      );
    }
    expect(core.disableTelemetry).toBe(true);
  });
});
