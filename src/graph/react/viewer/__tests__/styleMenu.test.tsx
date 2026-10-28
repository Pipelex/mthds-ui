import React from "react";
import { describe, expect, it } from "vitest";
import { GRAPH_STYLES, GRAPH_STYLE_IDS } from "@graph/styles/graphStyles";
import { GRAPH_STYLE_MENU_ENTRIES, styleMenuLabel } from "../StyleMenu";

describe("GRAPH_STYLE_MENU_ENTRIES", () => {
  it("gives every style its registry name and description and an icon of its own", () => {
    const icons = GRAPH_STYLE_IDS.map((style) => GRAPH_STYLE_MENU_ENTRIES[style].icon);
    for (const style of GRAPH_STYLE_IDS) {
      expect(GRAPH_STYLE_MENU_ENTRIES[style].name).toBe(GRAPH_STYLES[style].name);
      expect(GRAPH_STYLE_MENU_ENTRIES[style].description).toBe(GRAPH_STYLES[style].description);
    }
    for (const icon of icons) expect(React.isValidElement(icon)).toBe(true);
    expect(new Set(icons).size).toBe(GRAPH_STYLE_IDS.length);
  });
});

describe("styleMenuLabel", () => {
  it("names the active style and what the button does", () => {
    for (const style of GRAPH_STYLE_IDS) {
      expect(styleMenuLabel(style)).toBe(
        `Graph style: ${GRAPH_STYLES[style].name} — choose how the graph is drawn`,
      );
    }
  });
});
