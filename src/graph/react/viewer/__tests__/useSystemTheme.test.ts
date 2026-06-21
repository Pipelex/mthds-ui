import { describe, it, expect, afterEach } from "vitest";
import { GRAPH_THEME } from "@graph/types";
import { detectSystemTheme, prefersDarkToTheme } from "../useSystemTheme";

/**
 * Unit tests for the `useSystemTheme` building blocks. The hook itself
 * (matchMedia subscription + live `change` reactivity, injected-value-wins) is
 * exercised by the Storybook play function; here we cover the pure seams that
 * run without a DOM, stubbing `globalThis.window` for the matchMedia path.
 */

const originalWindow = (globalThis as { window?: unknown }).window;

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

function stubMatchMedia(matches: boolean): void {
  (globalThis as { window?: unknown }).window = {
    matchMedia: (query: string) => ({ matches: query.includes("dark") ? matches : !matches }),
  };
}

describe("prefersDarkToTheme", () => {
  it("maps a dark match to the dark theme and otherwise to light", () => {
    expect(prefersDarkToTheme(true)).toBe(GRAPH_THEME.DARK);
    expect(prefersDarkToTheme(false)).toBe(GRAPH_THEME.LIGHT);
  });
});

describe("detectSystemTheme", () => {
  it("defaults to dark when window/matchMedia is unavailable (SSR-safe)", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(detectSystemTheme()).toBe(GRAPH_THEME.DARK);
  });

  it("returns dark when the environment prefers a dark color scheme", () => {
    stubMatchMedia(true);
    expect(detectSystemTheme()).toBe(GRAPH_THEME.DARK);
  });

  it("returns light when the environment prefers a light color scheme", () => {
    stubMatchMedia(false);
    expect(detectSystemTheme()).toBe(GRAPH_THEME.LIGHT);
  });
});
