import { describe, it, expect } from "vitest";
import { GRAPH_THEME_MODE } from "@graph/types";
import { nextThemeMode, themeModeIcon, themeModeLabel } from "../GraphToolbar";

/**
 * The toolbar theme button is a pure mapping over the tri-state mode. These
 * tests lock the cycle order (auto → light → dark → auto), the per-state icon
 * distinctness, and the accessible labels naming current + next state.
 */
describe("nextThemeMode", () => {
  it("cycles auto → light → dark → auto", () => {
    expect(nextThemeMode(GRAPH_THEME_MODE.AUTO)).toBe(GRAPH_THEME_MODE.LIGHT);
    expect(nextThemeMode(GRAPH_THEME_MODE.LIGHT)).toBe(GRAPH_THEME_MODE.DARK);
    expect(nextThemeMode(GRAPH_THEME_MODE.DARK)).toBe(GRAPH_THEME_MODE.AUTO);
  });

  it("returns to the start after a full cycle", () => {
    const start = GRAPH_THEME_MODE.AUTO;
    const full = nextThemeMode(nextThemeMode(nextThemeMode(start)));
    expect(full).toBe(start);
  });
});

describe("themeModeIcon", () => {
  it("returns a distinct icon for each mode", () => {
    const auto = themeModeIcon(GRAPH_THEME_MODE.AUTO);
    const light = themeModeIcon(GRAPH_THEME_MODE.LIGHT);
    const dark = themeModeIcon(GRAPH_THEME_MODE.DARK);
    expect(auto).not.toBe(light);
    expect(light).not.toBe(dark);
    expect(auto).not.toBe(dark);
  });
});

describe("themeModeLabel", () => {
  it("names the current mode and the one a click switches to", () => {
    expect(themeModeLabel(GRAPH_THEME_MODE.AUTO)).toBe(
      "Theme: auto (follows system) — switch to light",
    );
    expect(themeModeLabel(GRAPH_THEME_MODE.LIGHT)).toBe("Theme: light — switch to dark");
    expect(themeModeLabel(GRAPH_THEME_MODE.DARK)).toBe("Theme: dark — switch to auto");
  });
});
