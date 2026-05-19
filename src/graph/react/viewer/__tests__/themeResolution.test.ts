import { describe, it, expect } from "vitest";
import { GRAPH_THEME } from "@graph/types";
import { resolveExternalTheme } from "../GraphViewer";

/**
 * Regression tests for the theme-resolution rules called out by the PR-41
 * review agents (greptile P1 + cubic P2):
 *
 * - "Theme clearing sticks": `themeProp` going from a concrete value back to
 *   `undefined` must NOT keep the previous explicit value — the resolved
 *   theme must fall back to `config.theme` / default.
 * - "Config theme is stale": `config.theme` must be honored as a runtime
 *   input, not only as a one-shot initializer.
 * - "Controlled→uncontrolled→controlled with same value": going `light` →
 *   `undefined` → `light` must round-trip through the config fallback at the
 *   middle step (otherwise the prev-value cache misses a real transition).
 */
describe("resolveExternalTheme", () => {
  it("returns themeProp when set, ignoring config.theme", () => {
    expect(resolveExternalTheme(GRAPH_THEME.LIGHT, GRAPH_THEME.DARK)).toBe(GRAPH_THEME.LIGHT);
    expect(resolveExternalTheme(GRAPH_THEME.DARK, GRAPH_THEME.LIGHT)).toBe(GRAPH_THEME.DARK);
  });

  it("falls back to config.theme when themeProp is undefined", () => {
    expect(resolveExternalTheme(undefined, GRAPH_THEME.LIGHT)).toBe(GRAPH_THEME.LIGHT);
    expect(resolveExternalTheme(undefined, GRAPH_THEME.DARK)).toBe(GRAPH_THEME.DARK);
  });

  it("falls back to dark when both inputs are undefined", () => {
    expect(resolveExternalTheme(undefined, undefined)).toBe(GRAPH_THEME.DARK);
  });

  it("treats themeProp clearing as an external change (no prev-value stickiness)", () => {
    // greptile P1: "Theme clearing sticks" — going from LIGHT → undefined must
    // resolve to the config/default fallback, not to the previous LIGHT.
    const before = resolveExternalTheme(GRAPH_THEME.LIGHT, GRAPH_THEME.DARK);
    const after = resolveExternalTheme(undefined, GRAPH_THEME.DARK);
    expect(before).toBe(GRAPH_THEME.LIGHT);
    expect(after).toBe(GRAPH_THEME.DARK);
    expect(after).not.toBe(before);
  });

  it("reacts to config.theme changes when themeProp is undefined", () => {
    // greptile P1: "Config theme is stale" — async config update must reach
    // the resolved theme.
    expect(resolveExternalTheme(undefined, GRAPH_THEME.DARK)).toBe(GRAPH_THEME.DARK);
    expect(resolveExternalTheme(undefined, GRAPH_THEME.LIGHT)).toBe(GRAPH_THEME.LIGHT);
  });

  it("round-trips controlled→uncontrolled→controlled through the config fallback", () => {
    // cubic P2: when the same theme value is re-sent after a clear, the
    // middle step must visibly resolve to the fallback so the prev-value
    // cache sees a real transition on both edges.
    const configTheme = GRAPH_THEME.DARK;
    const step1 = resolveExternalTheme(GRAPH_THEME.LIGHT, configTheme);
    const step2 = resolveExternalTheme(undefined, configTheme);
    const step3 = resolveExternalTheme(GRAPH_THEME.LIGHT, configTheme);
    expect(step1).toBe(GRAPH_THEME.LIGHT);
    expect(step2).toBe(GRAPH_THEME.DARK);
    expect(step3).toBe(GRAPH_THEME.LIGHT);
    // The middle step must differ from both edges — otherwise an effect that
    // only fires on `theme !== prev` would skip the re-application.
    expect(step2).not.toBe(step1);
    expect(step2).not.toBe(step3);
  });
});
