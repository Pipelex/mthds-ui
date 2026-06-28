import { describe, it, expect } from "vitest";
import { TOOLBAR_POSITION, toolbarOrientation, type ToolbarPosition } from "@graph/types";

/**
 * `toolbarOrientation` is the single derived-orientation helper for the
 * configurable toolbar anchor. "Corners are horizontal, edges decide the rest":
 * only the two edge-center anchors are vertical; every other position
 * (the four corners + top/bottom-center) is horizontal.
 */
describe("toolbarOrientation", () => {
  const CASES: ReadonlyArray<[ToolbarPosition, "horizontal" | "vertical"]> = [
    [TOOLBAR_POSITION.TOP_LEFT, "horizontal"],
    [TOOLBAR_POSITION.TOP_CENTER, "horizontal"],
    [TOOLBAR_POSITION.TOP_RIGHT, "horizontal"],
    [TOOLBAR_POSITION.BOTTOM_LEFT, "horizontal"],
    [TOOLBAR_POSITION.BOTTOM_CENTER, "horizontal"],
    [TOOLBAR_POSITION.BOTTOM_RIGHT, "horizontal"],
    [TOOLBAR_POSITION.CENTER_LEFT, "vertical"],
    [TOOLBAR_POSITION.CENTER_RIGHT, "vertical"],
  ];

  it.each(CASES)("maps %s → %s", (position, expected) => {
    expect(toolbarOrientation(position)).toBe(expected);
  });

  it("treats exactly the two edge-center anchors as vertical", () => {
    const vertical = Object.values(TOOLBAR_POSITION).filter(
      (p) => toolbarOrientation(p) === "vertical",
    );
    expect(vertical.sort()).toEqual(
      [TOOLBAR_POSITION.CENTER_LEFT, TOOLBAR_POSITION.CENTER_RIGHT].sort(),
    );
  });

  it("covers every TOOLBAR_POSITION value", () => {
    // Guard against a position being added to the enum without a case here.
    expect(CASES.map(([p]) => p).sort()).toEqual(Object.values(TOOLBAR_POSITION).sort());
  });
});
