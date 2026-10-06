// Drawing an edge along the route the layout computed for it. Pure and
// React-free: the routed edge component calls it with the handle positions
// ReactFlow measured, which may sit a few pixels from the ports the layout
// assumed, or anywhere at all once a node has been dragged.

import type { EdgeRoute, GraphPoint } from "./types";

/**
 * How far a measured handle may sit from the port the layout routed from
 * before the route is stale: a node dragged away. Handles are drawn a few
 * pixels outside their node, which this absorbs.
 */
export const ROUTE_ENDPOINT_TOLERANCE_PX = 8;

/** The radius each bend of a route is rounded with, shrunk on short segments. */
export const ROUTE_CORNER_RADIUS_PX = 8;

const SAME_AXIS_EPSILON = 0.5;

function near(a: GraphPoint, b: GraphPoint, tolerance: number): boolean {
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}

/**
 * A route's points with its ends moved onto the measured handles, or null
 * when either handle is too far from the port the layout routed from. The
 * point next to a moved end moves with it along the segment's axis, so an
 * orthogonal route stays orthogonal.
 */
export function fitRoute(
  points: readonly GraphPoint[],
  source: GraphPoint,
  target: GraphPoint,
  tolerance: number = ROUTE_ENDPOINT_TOLERANCE_PX,
): GraphPoint[] | null {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  if (!near(first, source, tolerance) || !near(last, target, tolerance)) return null;

  const fitted = points.map((p) => ({ x: p.x, y: p.y }));
  const end = fitted.length - 1;
  if (fitted.length > 2) {
    alignNeighbour(fitted, 0, 1, source);
    alignNeighbour(fitted, end, end - 1, target);
  }
  fitted[0] = { x: source.x, y: source.y };
  fitted[end] = { x: target.x, y: target.y };
  return fitted;
}

/** Move the neighbour of an end along with it, on the axis their segment shares. */
function alignNeighbour(
  points: GraphPoint[],
  endIndex: number,
  neighbourIndex: number,
  to: GraphPoint,
) {
  const end = points[endIndex];
  const neighbour = points[neighbourIndex];
  if (Math.abs(end.y - neighbour.y) <= SAME_AXIS_EPSILON) neighbour.y = to.y;
  else if (Math.abs(end.x - neighbour.x) <= SAME_AXIS_EPSILON) neighbour.x = to.x;
}

/**
 * An SVG path through a polyline, each bend rounded by a quadratic curve. A
 * bend's radius shrinks to half its shorter segment, so close bends never
 * overshoot each other.
 */
export function roundedPolylinePath(
  points: readonly GraphPoint[],
  radius: number = ROUTE_CORNER_RADIUS_PX,
): string {
  if (points.length === 0) return "";
  const parts = [`M ${points[0].x},${points[0].y}`];
  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1];
    const bend = points[i];
    const next = points[i + 1];
    const inLength = Math.hypot(bend.x - previous.x, bend.y - previous.y);
    const outLength = Math.hypot(next.x - bend.x, next.y - bend.y);
    const r = Math.min(radius, inLength / 2, outLength / 2);
    if (r <= 0) {
      parts.push(`L ${bend.x},${bend.y}`);
      continue;
    }
    const before = {
      x: bend.x + ((previous.x - bend.x) / inLength) * r,
      y: bend.y + ((previous.y - bend.y) / inLength) * r,
    };
    const after = {
      x: bend.x + ((next.x - bend.x) / outLength) * r,
      y: bend.y + ((next.y - bend.y) / outLength) * r,
    };
    parts.push(`L ${before.x},${before.y}`, `Q ${bend.x},${bend.y} ${after.x},${after.y}`);
  }
  const last = points[points.length - 1];
  parts.push(`L ${last.x},${last.y}`);
  return parts.join(" ");
}

/** The point halfway along a polyline, for a label the layout did not place. */
export function polylineMidpoint(points: readonly GraphPoint[]): GraphPoint {
  if (points.length === 0) return { x: 0, y: 0 };
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  let remaining = total / 2;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length >= remaining && length > 0) {
      const t = remaining / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= length;
  }
  return points[points.length - 1];
}

/** Where a routed edge's label is centred: the box the layout placed, or the route's midpoint. */
export function routeLabelCenter(route: EdgeRoute, fitted: readonly GraphPoint[]): GraphPoint {
  if (route.label) {
    return {
      x: route.label.x + route.label.width / 2,
      y: route.label.y + route.label.height / 2,
    };
  }
  return polylineMidpoint(fitted);
}
