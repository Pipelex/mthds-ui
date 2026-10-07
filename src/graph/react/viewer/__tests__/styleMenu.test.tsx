import React from "react";
import { describe, expect, it } from "vitest";
import { GRAPH_STYLES, GRAPH_STYLE_IDS } from "@graph/styles/graphStyles";
import { graphStyleIcon, styleMenuLabel } from "../StyleMenu";

describe("graphStyleIcon", () => {
  it("gives every style an icon of its own", () => {
    const icons = GRAPH_STYLE_IDS.map(graphStyleIcon);
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
