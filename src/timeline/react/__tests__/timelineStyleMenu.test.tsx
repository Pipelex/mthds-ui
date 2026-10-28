import React from "react";
import { describe, expect, it } from "vitest";
import { TIMELINE_STYLES, TIMELINE_STYLE_IDS } from "@timeline/styles/timelineStyles";
import { TIMELINE_STYLE_MENU_ENTRIES, timelineStyleMenuLabel } from "../TimelineStyleMenu";

describe("TIMELINE_STYLE_MENU_ENTRIES", () => {
  it("gives every style its registry name and description and an icon of its own", () => {
    const icons = TIMELINE_STYLE_IDS.map((style) => TIMELINE_STYLE_MENU_ENTRIES[style].icon);
    for (const style of TIMELINE_STYLE_IDS) {
      expect(TIMELINE_STYLE_MENU_ENTRIES[style].name).toBe(TIMELINE_STYLES[style].name);
      expect(TIMELINE_STYLE_MENU_ENTRIES[style].description).toBe(
        TIMELINE_STYLES[style].description,
      );
    }
    for (const icon of icons) expect(React.isValidElement(icon)).toBe(true);
    expect(new Set(icons).size).toBe(TIMELINE_STYLE_IDS.length);
  });
});

describe("timelineStyleMenuLabel", () => {
  it("names the active style and what the button does", () => {
    for (const style of TIMELINE_STYLE_IDS) {
      expect(timelineStyleMenuLabel(style)).toBe(
        `Timeline style: ${TIMELINE_STYLES[style].name} — choose how the run is drawn`,
      );
    }
  });
});
