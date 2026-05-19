import { describe, it, expect } from "vitest";
import { GRAPH_THEME } from "@graph/types";
import { nextPageTheme, resolvePageThemeToGraphTheme } from "../pageTheme";

/**
 * Regression tests for the standalone `#theme-toggle` button (PR-41 greptile
 * P1: "Standalone toggle desyncs"). The page cycles dark→light→system→dark;
 * the resolver maps that tri-state to the binary `GraphTheme` the library
 * consumes.
 */
describe("nextPageTheme", () => {
  it("cycles dark → light → system → dark", () => {
    expect(nextPageTheme("dark")).toBe("light");
    expect(nextPageTheme("light")).toBe("system");
    expect(nextPageTheme("system")).toBe("dark");
  });

  it("defaults to 'light' when current is unset or invalid (treated as dark)", () => {
    expect(nextPageTheme(null)).toBe("light");
    expect(nextPageTheme(undefined)).toBe("light");
    expect(nextPageTheme("bogus")).toBe("light");
    expect(nextPageTheme("")).toBe("light");
  });
});

describe("resolvePageThemeToGraphTheme", () => {
  it("maps 'dark' to GraphTheme.DARK regardless of system preference", () => {
    expect(resolvePageThemeToGraphTheme("dark", () => true)).toBe(GRAPH_THEME.DARK);
    expect(resolvePageThemeToGraphTheme("dark", () => false)).toBe(GRAPH_THEME.DARK);
  });

  it("maps 'light' to GraphTheme.LIGHT regardless of system preference", () => {
    expect(resolvePageThemeToGraphTheme("light", () => true)).toBe(GRAPH_THEME.LIGHT);
    expect(resolvePageThemeToGraphTheme("light", () => false)).toBe(GRAPH_THEME.LIGHT);
  });

  it("maps 'system' via the injected prefers-color-scheme callback", () => {
    expect(resolvePageThemeToGraphTheme("system", () => true)).toBe(GRAPH_THEME.DARK);
    expect(resolvePageThemeToGraphTheme("system", () => false)).toBe(GRAPH_THEME.LIGHT);
  });
});
