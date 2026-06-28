import { describe, it, expect } from "vitest";
import {
  TOOLBAR_POSITION,
  toolbarSide,
  type ToolbarPosition,
  type ToolbarSide,
} from "@graph/types";

/**
 * `toolbarSide` derives which edge an anchor hugs. The detail panel overlays the
 * right edge, so only `*-right` anchors return `"right"` and dodge it; the
 * `*-left` anchors are `"left"` and `top-center` / `bottom-center` are `"center"`.
 */
describe("toolbarSide", () => {
  const CASES: ReadonlyArray<[ToolbarPosition, ToolbarSide]> = [
    [TOOLBAR_POSITION.TOP_LEFT, "left"],
    [TOOLBAR_POSITION.CENTER_LEFT, "left"],
    [TOOLBAR_POSITION.BOTTOM_LEFT, "left"],
    [TOOLBAR_POSITION.TOP_CENTER, "center"],
    [TOOLBAR_POSITION.BOTTOM_CENTER, "center"],
    [TOOLBAR_POSITION.TOP_RIGHT, "right"],
    [TOOLBAR_POSITION.CENTER_RIGHT, "right"],
    [TOOLBAR_POSITION.BOTTOM_RIGHT, "right"],
  ];

  it.each(CASES)("maps %s → %s", (position, expected) => {
    expect(toolbarSide(position)).toBe(expected);
  });

  it("treats exactly the three right anchors as the detail-panel dodge set", () => {
    const right = Object.values(TOOLBAR_POSITION).filter((p) => toolbarSide(p) === "right");
    expect(right.sort()).toEqual(
      [
        TOOLBAR_POSITION.TOP_RIGHT,
        TOOLBAR_POSITION.CENTER_RIGHT,
        TOOLBAR_POSITION.BOTTOM_RIGHT,
      ].sort(),
    );
  });

  it("covers every TOOLBAR_POSITION value", () => {
    // Guard against a position being added to the enum without a case here.
    expect(CASES.map(([p]) => p).sort()).toEqual(Object.values(TOOLBAR_POSITION).sort());
  });
});
