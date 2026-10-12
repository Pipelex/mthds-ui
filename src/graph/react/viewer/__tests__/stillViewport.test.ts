import { describe, it, expect } from "vitest";
import { STILL_PADDING_PX, stillContentBounds, stillViewport } from "../stillViewport";

/**
 * The still presentation's geometry: a drawing fitted to its container's width,
 * never past its natural size, centered, with the container's height following
 * it; and the box it fits, grown to take in the edges routed outside the nodes.
 */
describe("stillViewport", () => {
  it("draws a drawing narrower than the container at its natural size, centered", () => {
    const view = stillViewport({ x: 0, y: 0, width: 400, height: 100 }, 800, 16);
    expect(view).toEqual({ x: 200, y: 16, zoom: 1, height: 132 });
  });

  it("scales a wider drawing down until it fits between the paddings", () => {
    const view = stillViewport({ x: 0, y: 0, width: 1536, height: 300 }, 800, 16);
    expect(view?.zoom).toBe(0.5);
    // Centered: the scaled drawing is 768 wide in 800, so 16 on each side.
    expect(view?.x).toBe(16);
    expect(view?.height).toBe(Math.ceil(300 * 0.5 + 32));
  });

  it("offsets the viewport by the drawing's own origin", () => {
    const view = stillViewport({ x: -50, y: 40, width: 400, height: 100 }, 800, 16);
    // The left edge at x = -50 lands where a drawing at x = 0 would.
    expect(view?.x).toBe(200 + 50);
    // The top edge at y = 40 lands on the top padding.
    expect(view?.y).toBe(16 - 40);
  });

  it("rounds the height up to a whole pixel", () => {
    const view = stillViewport({ x: 0, y: 0, width: 1000, height: 101 }, 516, 8);
    expect(view?.zoom).toBe(0.5);
    expect(view?.height).toBe(Math.ceil(50.5 + 16));
  });

  it("uses the library padding by default", () => {
    const view = stillViewport({ x: 0, y: 0, width: 100, height: 100 }, 800);
    expect(view?.height).toBe(100 + 2 * STILL_PADDING_PX);
  });

  it("has nothing to fit for an empty drawing or an unmeasured container", () => {
    expect(stillViewport({ x: 0, y: 0, width: 0, height: 0 }, 800)).toBeNull();
    expect(stillViewport({ x: 0, y: 0, width: 100, height: 0 }, 800)).toBeNull();
    expect(stillViewport({ x: 0, y: 0, width: 100, height: 100 }, 0)).toBeNull();
    expect(stillViewport({ x: 0, y: 0, width: 100, height: 100 }, Number.NaN)).toBeNull();
  });

  it("still draws something in a container narrower than its paddings", () => {
    const view = stillViewport({ x: 0, y: 0, width: 100, height: 100 }, 20, 16);
    expect(view?.zoom).toBeGreaterThan(0);
  });
});

describe("stillContentBounds", () => {
  const nodes = { x: 0, y: 0, width: 200, height: 100 };

  it("is the nodes' bounds when no edge is routed", () => {
    expect(stillContentBounds(nodes, [undefined, undefined])).toEqual(nodes);
  });

  it("grows to take in a route's bends outside the nodes", () => {
    const bounds = stillContentBounds(nodes, [
      {
        points: [
          { x: 150, y: 50 },
          { x: 150, y: -20 },
          { x: 230, y: -20 },
        ],
      },
    ]);
    expect(bounds).toEqual({ x: 0, y: -20, width: 230, height: 120 });
  });

  it("grows to take in a label's box", () => {
    const bounds = stillContentBounds(nodes, [
      { points: [{ x: 10, y: 10 }], label: { x: 120, y: 90, width: 100, height: 30 } },
    ]);
    expect(bounds).toEqual({ x: 0, y: 0, width: 220, height: 120 });
  });

  it("ignores a point that is not a number", () => {
    const bounds = stillContentBounds(nodes, [{ points: [{ x: Number.NaN, y: 500 }] }]);
    expect(bounds).toEqual(nodes);
  });
});
