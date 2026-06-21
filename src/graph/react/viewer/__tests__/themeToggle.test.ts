import { describe, it, expect } from "vitest";
import { GRAPH_THEME_MODE } from "@graph/types";
import { nextThemeMode, themeModeIcon, themeModeLabel } from "../GraphToolbar";

/**
 * The toolbar theme button is a pure mapping over the tri-state mode. These
 * tests lock the cycle order (system → light → dark → system), the per-state
 * icon distinctness, and the accessible labels naming current + next state.
 */
describe("nextThemeMode", () => {
  it("cycles system → light → dark → system", () => {
    expect(nextThemeMode(GRAPH_THEME_MODE.SYSTEM)).toBe(GRAPH_THEME_MODE.LIGHT);
    expect(nextThemeMode(GRAPH_THEME_MODE.LIGHT)).toBe(GRAPH_THEME_MODE.DARK);
    expect(nextThemeMode(GRAPH_THEME_MODE.DARK)).toBe(GRAPH_THEME_MODE.SYSTEM);
  });

  it("returns to the start after a full cycle", () => {
    const start = GRAPH_THEME_MODE.SYSTEM;
    const full = nextThemeMode(nextThemeMode(nextThemeMode(start)));
    expect(full).toBe(start);
  });
});

describe("themeModeIcon", () => {
  it("returns a distinct icon for each mode", () => {
    const system = themeModeIcon(GRAPH_THEME_MODE.SYSTEM);
    const light = themeModeIcon(GRAPH_THEME_MODE.LIGHT);
    const dark = themeModeIcon(GRAPH_THEME_MODE.DARK);
    expect(system).not.toBe(light);
    expect(light).not.toBe(dark);
    expect(system).not.toBe(dark);
  });
});

describe("themeModeLabel", () => {
  it("names the current mode and the one a click switches to", () => {
    expect(themeModeLabel(GRAPH_THEME_MODE.SYSTEM)).toBe("Theme: system — switch to light");
    expect(themeModeLabel(GRAPH_THEME_MODE.LIGHT)).toBe("Theme: light — switch to dark");
    expect(themeModeLabel(GRAPH_THEME_MODE.DARK)).toBe("Theme: dark — switch to system");
  });
});
