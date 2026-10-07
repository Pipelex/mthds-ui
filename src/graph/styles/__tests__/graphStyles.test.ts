import { describe, it, expect } from "vitest";
import { GRAPH_STYLE } from "@graph/types";
import { DEFAULT_GRAPH_CONFIG } from "@graph/graphConfig";
import {
  GRAPH_STYLES,
  GRAPH_STYLE_IDS,
  isGraphStyleId,
  resolveGraphStyle,
  resolveStyleMenu,
} from "../graphStyles";
import { GRAPH_STYLE_PIPELINES } from "../stylePipelines";

describe("the style registry", () => {
  it("lists every style once, each describing itself under its own id", () => {
    expect(new Set(GRAPH_STYLE_IDS).size).toBe(GRAPH_STYLE_IDS.length);
    expect([...GRAPH_STYLE_IDS].sort()).toEqual(Object.keys(GRAPH_STYLES).sort());
    for (const id of GRAPH_STYLE_IDS) {
      expect(GRAPH_STYLES[id].id).toBe(id);
      expect(GRAPH_STYLES[id].name.length).toBeGreaterThan(0);
      expect(GRAPH_STYLES[id].description.length).toBeGreaterThan(0);
      expect(GRAPH_STYLE_PIPELINES[id]).toBeDefined();
    }
  });

  it("keeps the detailed style the default, so no host sees a change", () => {
    expect(DEFAULT_GRAPH_CONFIG.graphStyle).toBe(GRAPH_STYLE.DETAILED);
    expect(GRAPH_STYLES.detailed.layout).toBeUndefined();
    expect(GRAPH_STYLES.detailed.capabilities.controllerFrameToggle).toBe(true);
  });
});

describe("isGraphStyleId", () => {
  it("accepts the registered ids only", () => {
    expect(isGraphStyleId("detailed")).toBe(true);
    expect(isGraphStyleId("simple")).toBe(true);
    expect(isGraphStyleId("fancy")).toBe(false);
    expect(isGraphStyleId("")).toBe(false);
    expect(isGraphStyleId(undefined)).toBe(false);
    expect(isGraphStyleId(3)).toBe(false);
  });

  it("does not take an inherited property for a style", () => {
    expect(isGraphStyleId("toString")).toBe(false);
    expect(isGraphStyleId("__proto__")).toBe(false);
  });
});

/**
 * The same contract `resolveExternalThemeMode` holds the theme to: the prop
 * wins, clearing it hands control back to config, and config is read on every
 * call rather than once.
 */
describe("resolveGraphStyle", () => {
  it("returns the prop when it names a style, ignoring config", () => {
    expect(resolveGraphStyle("simple", "detailed")).toBe("simple");
    expect(resolveGraphStyle("detailed", "simple")).toBe("detailed");
  });

  it("falls back to config when the prop is undefined", () => {
    expect(resolveGraphStyle(undefined, "simple")).toBe("simple");
    expect(resolveGraphStyle(undefined, "detailed")).toBe("detailed");
  });

  it("falls back to the library default when neither is set", () => {
    expect(resolveGraphStyle(undefined, undefined)).toBe(DEFAULT_GRAPH_CONFIG.graphStyle);
  });

  it("treats clearing the prop as a change back to config, not a sticky value", () => {
    const before = resolveGraphStyle("simple", "detailed");
    const after = resolveGraphStyle(undefined, "detailed");
    expect(before).toBe("simple");
    expect(after).toBe("detailed");
  });

  it("round-trips simple → undefined → simple through the config fallback", () => {
    const sequence = ["simple", undefined, "simple"].map((prop) =>
      resolveGraphStyle(prop, "detailed"),
    );
    expect(sequence).toEqual(["simple", "detailed", "simple"]);
  });

  it("reacts to a config change while the prop is unset", () => {
    expect(resolveGraphStyle(undefined, "simple")).toBe("simple");
    expect(resolveGraphStyle(undefined, "detailed")).toBe("detailed");
  });

  it("treats a value naming no style as unset rather than throwing", () => {
    expect(resolveGraphStyle("fancy", "simple")).toBe("simple");
    expect(resolveGraphStyle("fancy", "fancier")).toBe(DEFAULT_GRAPH_CONFIG.graphStyle);
    expect(resolveGraphStyle(null, 42)).toBe(DEFAULT_GRAPH_CONFIG.graphStyle);
  });
});

describe("resolveStyleMenu", () => {
  it("offers nothing unless the host opts in", () => {
    expect(resolveStyleMenu(undefined)).toEqual([]);
    expect(resolveStyleMenu(false)).toEqual([]);
  });

  it("offers every style in registry order for true", () => {
    expect(resolveStyleMenu(true)).toEqual([...GRAPH_STYLE_IDS]);
  });

  it("keeps a list's order and drops repeats and unknown ids", () => {
    expect(resolveStyleMenu(["simple", "detailed", "simple"])).toEqual(["simple", "detailed"]);
    expect(resolveStyleMenu(["simple", "fancy" as never, "detailed"])).toEqual([
      "simple",
      "detailed",
    ]);
  });

  it("offers nothing when fewer than two styles remain to choose between", () => {
    expect(resolveStyleMenu([])).toEqual([]);
    expect(resolveStyleMenu(["simple"])).toEqual([]);
    expect(resolveStyleMenu(["simple", "simple"])).toEqual([]);
  });
});
