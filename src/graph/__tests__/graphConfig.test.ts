import { describe, it, expect } from "vitest";
import { GRAPH_THEME, GRAPH_THEME_MODE } from "../types";
import {
  DARK_PALETTE_COLORS,
  DEFAULT_GRAPH_CONFIG,
  LIGHT_PALETTE_COLORS,
  getPaletteColors,
  getPaletteForTheme,
} from "../graphConfig";

describe("DEFAULT_GRAPH_CONFIG", () => {
  it("has direction 'LR'", () => {
    expect(DEFAULT_GRAPH_CONFIG.direction).toBe("LR");
  });

  it("has showControllers false", () => {
    expect(DEFAULT_GRAPH_CONFIG.showControllers).toBe(false);
  });

  it("has edgeType 'default' (bezier curve, renamed in ReactFlow v12)", () => {
    expect(DEFAULT_GRAPH_CONFIG.edgeType).toBe("default");
  });

  it("has nodesep and ranksep as positive numbers", () => {
    expect(DEFAULT_GRAPH_CONFIG.nodesep).toBeGreaterThan(0);
    expect(DEFAULT_GRAPH_CONFIG.ranksep).toBeGreaterThan(0);
  });

  it("defaults to the auto theme mode (follows the environment)", () => {
    expect(DEFAULT_GRAPH_CONFIG.theme).toBe(GRAPH_THEME_MODE.AUTO);
  });

  it("omits paletteColors so the viewer derives it from `theme`", () => {
    expect(DEFAULT_GRAPH_CONFIG.paletteColors).toBeUndefined();
  });
});

describe("theme palettes", () => {
  it("define the required domain tokens in both themes", () => {
    for (const palette of [DARK_PALETTE_COLORS, LIGHT_PALETTE_COLORS]) {
      expect(palette["--color-pipe"]).toBeDefined();
      expect(palette["--color-stuff"]).toBeDefined();
      expect(palette["--color-edge"]).toBeDefined();
      expect(palette["--color-batch-item"]).toBeDefined();
      expect(palette["--color-batch-aggregate"]).toBeDefined();
      expect(palette["--color-parallel-combine"]).toBeDefined();
      expect(palette["--color-success"]).toBeDefined();
      expect(palette["--color-error"]).toBeDefined();
    }
  });

  it("define the required semantic surface/text/border tokens in both themes", () => {
    for (const palette of [DARK_PALETTE_COLORS, LIGHT_PALETTE_COLORS]) {
      expect(palette["--surface-page"]).toBeDefined();
      expect(palette["--surface-panel"]).toBeDefined();
      expect(palette["--surface-overlay"]).toBeDefined();
      expect(palette["--text-default"]).toBeDefined();
      expect(palette["--text-muted"]).toBeDefined();
      expect(palette["--border-default"]).toBeDefined();
      expect(palette["--shadow-lg"]).toBeDefined();
    }
  });

  it("expose font variables in both themes", () => {
    for (const palette of [DARK_PALETTE_COLORS, LIGHT_PALETTE_COLORS]) {
      expect(palette["--font-sans"]).toContain("Inter");
      expect(palette["--font-mono"]).toContain("JetBrains Mono");
    }
  });

  it("DARK and LIGHT define the same set of keys (regression guard)", () => {
    const darkKeys = Object.keys(DARK_PALETTE_COLORS).sort();
    const lightKeys = Object.keys(LIGHT_PALETTE_COLORS).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  it("getPaletteForTheme returns the right palette", () => {
    expect(getPaletteForTheme(GRAPH_THEME.DARK)).toBe(DARK_PALETTE_COLORS);
    expect(getPaletteForTheme(GRAPH_THEME.LIGHT)).toBe(LIGHT_PALETTE_COLORS);
  });
});

describe("getPaletteColors", () => {
  it("returns the dark palette by default", () => {
    const colors = getPaletteColors();
    expect(colors["--color-pipe"]).toBe(DARK_PALETTE_COLORS["--color-pipe"]);
  });

  it("returns an object with all palette keys", () => {
    const colors = getPaletteColors();
    expect(Object.keys(colors).length).toBeGreaterThan(10);
  });
});
