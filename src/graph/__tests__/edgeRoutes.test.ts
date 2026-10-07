import { describe, it, expect } from "vitest";
import {
  fitRoute,
  polylineMidpoint,
  roundedPolylinePath,
  routeLabelCenter,
  ROUTE_ENDPOINT_TOLERANCE_PX,
} from "../edgeRoutes";

const route = [
  { x: 100, y: 50 },
  { x: 120, y: 50 },
  { x: 120, y: 150 },
  { x: 200, y: 150 },
];

describe("fitRoute", () => {
  it("moves the ends onto the measured handles and keeps the route orthogonal", () => {
    const fitted = fitRoute(route, { x: 102, y: 52 }, { x: 203, y: 148 });
    expect(fitted).toEqual([
      { x: 102, y: 52 },
      { x: 120, y: 52 },
      { x: 120, y: 148 },
      { x: 203, y: 148 },
    ]);
  });

  it("leaves the route it was given untouched", () => {
    fitRoute(route, { x: 102, y: 52 }, { x: 203, y: 148 });
    expect(route[1]).toEqual({ x: 120, y: 50 });
  });

  it("moves the neighbour along a vertical first segment too", () => {
    const vertical = [
      { x: 50, y: 0 },
      { x: 50, y: 20 },
      { x: 90, y: 20 },
      { x: 90, y: 60 },
    ];
    expect(fitRoute(vertical, { x: 52, y: 0 }, { x: 88, y: 60 })).toEqual([
      { x: 52, y: 0 },
      { x: 52, y: 20 },
      { x: 88, y: 20 },
      { x: 88, y: 60 },
    ]);
  });

  it("says the route is stale once a handle has moved away from its port", () => {
    const far = ROUTE_ENDPOINT_TOLERANCE_PX + 1;
    expect(fitRoute(route, { x: 100 + far, y: 50 }, { x: 200, y: 150 })).toBeNull();
    expect(fitRoute(route, { x: 100, y: 50 }, { x: 200, y: 150 - far })).toBeNull();
  });

  it("fits a straight route by moving both ends", () => {
    const straight = [
      { x: 0, y: 10 },
      { x: 50, y: 10 },
    ];
    expect(fitRoute(straight, { x: 1, y: 11 }, { x: 49, y: 11 })).toEqual([
      { x: 1, y: 11 },
      { x: 49, y: 11 },
    ]);
  });

  it("has nothing to fit with fewer than two points", () => {
    expect(fitRoute([{ x: 0, y: 0 }], { x: 0, y: 0 }, { x: 0, y: 0 })).toBeNull();
  });
});

describe("roundedPolylinePath", () => {
  it("draws a straight line for two points", () => {
    expect(
      roundedPolylinePath([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ]),
    ).toBe("M 0,0 L 10,0");
  });

  it("rounds each bend with a quadratic curve", () => {
    const path = roundedPolylinePath(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      8,
    );
    expect(path).toBe("M 0,0 L 92,0 Q 100,0 100,8 L 100,100");
  });

  it("shrinks the radius to half the shorter segment", () => {
    const path = roundedPolylinePath(
      [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 100 },
      ],
      8,
    );
    expect(path).toBe("M 0,0 L 2,0 Q 4,0 4,2 L 4,100");
  });

  it("draws nothing for no points", () => {
    expect(roundedPolylinePath([])).toBe("");
  });
});

describe("labels", () => {
  it("centres a label in the box the layout placed", () => {
    expect(
      routeLabelCenter({ points: route, label: { x: 130, y: 152, width: 40, height: 16 } }, route),
    ).toEqual({ x: 150, y: 160 });
  });

  it("falls back to the route's midpoint", () => {
    // 20 + 100 + 80 = 200 long: halfway is 80 down the vertical segment.
    expect(routeLabelCenter({ points: route }, route)).toEqual({ x: 120, y: 130 });
    expect(polylineMidpoint([])).toEqual({ x: 0, y: 0 });
    expect(polylineMidpoint([{ x: 3, y: 4 }])).toEqual({ x: 3, y: 4 });
  });
});
