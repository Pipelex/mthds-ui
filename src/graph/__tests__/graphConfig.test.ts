import { describe, it, expect } from "vitest";
import { DEFAULT_GRAPH_CONFIG, getPaletteColors } from "../graphConfig";

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

  it("has paletteColors with required CSS variables", () => {
    const palette = DEFAULT_GRAPH_CONFIG.paletteColors!;
    expect(palette).toBeDefined();
    expect(palette["--color-pipe"]).toBeDefined();
    expect(palette["--color-stuff"]).toBeDefined();
    expect(palette["--color-edge"]).toBeDefined();
    expect(palette["--color-batch-item"]).toBeDefined();
    expect(palette["--color-batch-aggregate"]).toBeDefined();
    expect(palette["--color-parallel-combine"]).toBeDefined();
    expect(palette["--color-success"]).toBeDefined();
    expect(palette["--color-error"]).toBeDefined();
  });

  it("has font variables", () => {
    const palette = DEFAULT_GRAPH_CONFIG.paletteColors!;
    expect(palette["--font-sans"]).toContain("Inter");
    expect(palette["--font-mono"]).toContain("JetBrains Mono");
  });
});

describe("getPaletteColors", () => {
  it("returns palette colors from DEFAULT_GRAPH_CONFIG", () => {
    const colors = getPaletteColors();
    expect(colors["--color-pipe"]).toBe("#ff6b6b");
    expect(colors["--color-stuff"]).toBe("#4ECDC4");
  });

  it("returns an object with all palette keys", () => {
    const colors = getPaletteColors();
    expect(Object.keys(colors).length).toBeGreaterThan(10);
  });
});
