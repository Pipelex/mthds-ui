import { describe, it, expect } from "vitest";
import { GRAPH_THEME, GRAPH_THEME_MODE } from "@graph/types";
import { resolveExternalThemeMode, resolveActiveTheme } from "../GraphViewer";

/**
 * Regression tests for the theme-resolution rules called out by the PR-41
 * review agents (greptile P1 + cubic P2), now over the tri-state mode domain
 * (`dark | light | system`):
 *
 * - "Theme clearing sticks": `themeProp` going from a concrete value back to
 *   `undefined` must NOT keep the previous explicit value — the resolved
 *   mode must fall back to `config.theme` / default.
 * - "Config theme is stale": `config.theme` must be honored as a runtime
 *   input, not only as a one-shot initializer.
 * - "Controlled→uncontrolled→controlled with same value": going `light` →
 *   `undefined` → `light` must round-trip through the config fallback at the
 *   middle step (otherwise the prev-value cache misses a real transition).
 */
describe("resolveExternalThemeMode", () => {
  it("returns themeProp when set, ignoring config.theme", () => {
    expect(resolveExternalThemeMode(GRAPH_THEME_MODE.LIGHT, GRAPH_THEME_MODE.DARK)).toBe(
      GRAPH_THEME_MODE.LIGHT,
    );
    expect(resolveExternalThemeMode(GRAPH_THEME_MODE.DARK, GRAPH_THEME_MODE.LIGHT)).toBe(
      GRAPH_THEME_MODE.DARK,
    );
    expect(resolveExternalThemeMode(GRAPH_THEME_MODE.SYSTEM, GRAPH_THEME_MODE.DARK)).toBe(
      GRAPH_THEME_MODE.SYSTEM,
    );
  });

  it("falls back to config.theme when themeProp is undefined", () => {
    expect(resolveExternalThemeMode(undefined, GRAPH_THEME_MODE.LIGHT)).toBe(
      GRAPH_THEME_MODE.LIGHT,
    );
    expect(resolveExternalThemeMode(undefined, GRAPH_THEME_MODE.DARK)).toBe(GRAPH_THEME_MODE.DARK);
    expect(resolveExternalThemeMode(undefined, GRAPH_THEME_MODE.SYSTEM)).toBe(
      GRAPH_THEME_MODE.SYSTEM,
    );
  });

  it("falls back to system when both inputs are undefined", () => {
    expect(resolveExternalThemeMode(undefined, undefined)).toBe(GRAPH_THEME_MODE.SYSTEM);
  });

  it("treats themeProp clearing as an external change (no prev-value stickiness)", () => {
    // greptile P1: "Theme clearing sticks" — going from LIGHT → undefined must
    // resolve to the config/default fallback, not to the previous LIGHT.
    const before = resolveExternalThemeMode(GRAPH_THEME_MODE.LIGHT, GRAPH_THEME_MODE.DARK);
    const after = resolveExternalThemeMode(undefined, GRAPH_THEME_MODE.DARK);
    expect(before).toBe(GRAPH_THEME_MODE.LIGHT);
    expect(after).toBe(GRAPH_THEME_MODE.DARK);
    expect(after).not.toBe(before);
  });

  it("reacts to config.theme changes when themeProp is undefined", () => {
    // greptile P1: "Config theme is stale" — async config update must reach
    // the resolved mode.
    expect(resolveExternalThemeMode(undefined, GRAPH_THEME_MODE.DARK)).toBe(GRAPH_THEME_MODE.DARK);
    expect(resolveExternalThemeMode(undefined, GRAPH_THEME_MODE.LIGHT)).toBe(
      GRAPH_THEME_MODE.LIGHT,
    );
    expect(resolveExternalThemeMode(undefined, GRAPH_THEME_MODE.SYSTEM)).toBe(
      GRAPH_THEME_MODE.SYSTEM,
    );
  });

  it("round-trips controlled→uncontrolled→controlled through the config fallback", () => {
    // cubic P2: when the same mode value is re-sent after a clear, the middle
    // step must visibly resolve to the fallback so the prev-value cache sees a
    // real transition on both edges.
    const configTheme = GRAPH_THEME_MODE.DARK;
    const step1 = resolveExternalThemeMode(GRAPH_THEME_MODE.LIGHT, configTheme);
    const step2 = resolveExternalThemeMode(undefined, configTheme);
    const step3 = resolveExternalThemeMode(GRAPH_THEME_MODE.LIGHT, configTheme);
    expect(step1).toBe(GRAPH_THEME_MODE.LIGHT);
    expect(step2).toBe(GRAPH_THEME_MODE.DARK);
    expect(step3).toBe(GRAPH_THEME_MODE.LIGHT);
    // The middle step must differ from both edges — otherwise an effect that
    // only fires on `mode !== prev` would skip the re-application.
    expect(step2).not.toBe(step1);
    expect(step2).not.toBe(step3);
  });
});

/**
 * `resolveActiveTheme` collapses (mode, systemTheme) into the binary
 * `GraphTheme` that drives the palette + container class.
 */
describe("resolveActiveTheme", () => {
  it("returns the mode verbatim for the fixed modes, ignoring systemTheme", () => {
    expect(resolveActiveTheme(GRAPH_THEME_MODE.DARK, GRAPH_THEME.LIGHT)).toBe(GRAPH_THEME.DARK);
    expect(resolveActiveTheme(GRAPH_THEME_MODE.LIGHT, GRAPH_THEME.DARK)).toBe(GRAPH_THEME.LIGHT);
  });

  it("follows systemTheme when the mode is system", () => {
    expect(resolveActiveTheme(GRAPH_THEME_MODE.SYSTEM, GRAPH_THEME.DARK)).toBe(GRAPH_THEME.DARK);
    expect(resolveActiveTheme(GRAPH_THEME_MODE.SYSTEM, GRAPH_THEME.LIGHT)).toBe(GRAPH_THEME.LIGHT);
  });
});
