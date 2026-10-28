import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMELINE_STYLE,
  TIMELINE_STYLE,
  TIMELINE_STYLE_IDS,
  TIMELINE_STYLES,
  isTimelineStyleId,
  resolveTimelineStyle,
  resolveTimelineStyleMenu,
} from "../timelineStyles";

describe("the timeline style registry", () => {
  it("describes every style it lists, under its own id", () => {
    expect(TIMELINE_STYLE_IDS).toEqual(["detailed", "simple"]);
    for (const id of TIMELINE_STYLE_IDS) {
      expect(TIMELINE_STYLES[id].id).toBe(id);
      expect(TIMELINE_STYLES[id].name.length).toBeGreaterThan(0);
      expect(TIMELINE_STYLES[id].description.length).toBeGreaterThan(0);
    }
  });

  it("keeps the detailed style as the default", () => {
    expect(DEFAULT_TIMELINE_STYLE).toBe(TIMELINE_STYLE.DETAILED);
  });

  it("knows its own ids and nothing else", () => {
    expect(isTimelineStyleId("simple")).toBe(true);
    expect(isTimelineStyleId("detailed")).toBe(true);
    expect(isTimelineStyleId("compact")).toBe(false);
    expect(isTimelineStyleId("toString")).toBe(false);
    expect(isTimelineStyleId(undefined)).toBe(false);
    expect(isTimelineStyleId(1)).toBe(false);
  });
});

describe("resolveTimelineStyle", () => {
  it("reads an unset style as the default", () => {
    expect(resolveTimelineStyle(undefined)).toBe("detailed");
  });

  it("reads a known style as itself", () => {
    expect(resolveTimelineStyle("simple")).toBe("simple");
    expect(resolveTimelineStyle("detailed")).toBe("detailed");
  });

  it("reads an unknown style as unset rather than throwing", () => {
    expect(resolveTimelineStyle("compact")).toBe("detailed");
    expect(resolveTimelineStyle(null)).toBe("detailed");
  });
});

describe("resolveTimelineStyleMenu", () => {
  it("offers nothing unless asked", () => {
    expect(resolveTimelineStyleMenu(undefined)).toEqual([]);
    expect(resolveTimelineStyleMenu(false)).toEqual([]);
  });

  it("offers every style for true, in registry order", () => {
    expect(resolveTimelineStyleMenu(true)).toEqual(["detailed", "simple"]);
  });

  it("offers the listed styles in their order, once each, and none for fewer than two", () => {
    expect(resolveTimelineStyleMenu(["simple", "detailed", "simple"])).toEqual([
      "simple",
      "detailed",
    ]);
    expect(resolveTimelineStyleMenu(["simple"])).toEqual([]);
    expect(resolveTimelineStyleMenu(["simple", "compact" as unknown as "simple"])).toEqual([]);
  });
});
