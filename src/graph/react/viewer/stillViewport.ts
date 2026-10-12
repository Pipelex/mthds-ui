import type { EdgeRoute } from "@graph/types";

/**
 * The geometry of the still presentation (`GraphViewer`'s `interactive={false}`):
 * where the drawing sits and how tall its container is. Pure and React-free, so
 * it is tested without rendering. See `docs/still-presentation.md`.
 */

/** A box in flow coordinates: its top-left corner and its size. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The room left around a still drawing, in screen pixels, on every side. */
export const STILL_PADDING_PX = 16;

/** The container's height until the drawing has been laid out and measured. */
export const STILL_PLACEHOLDER_HEIGHT_PX = 120;

/**
 * The box a still drawing must show: its nodes' bounds, grown to take in every
 * bend of a routed edge and the box the layout placed its label in. A route can
 * run outside the nodes, around one in its way, and an interactive viewer covers
 * that with a proportional padding the still presentation does not have. Edges
 * drawn as free curves carry no route and stay within their ends' nodes.
 */
export function stillContentBounds(
  nodeBounds: Rect,
  routes: readonly (EdgeRoute | undefined)[],
): Rect {
  let minX = nodeBounds.x;
  let minY = nodeBounds.y;
  let maxX = nodeBounds.x + nodeBounds.width;
  let maxY = nodeBounds.y + nodeBounds.height;
  const take = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const route of routes) {
    if (!route) continue;
    for (const point of route.points) take(point.x, point.y);
    if (route.label) {
      take(route.label.x, route.label.y);
      take(route.label.x + route.label.width, route.label.y + route.label.height);
    }
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Where a still drawing sits in its container, and the height the container takes. */
export interface StillViewport {
  /** The viewport's translation and zoom, as ReactFlow's `setViewport` takes them. */
  x: number;
  y: number;
  zoom: number;
  /** The container's height in pixels: the drawing at that zoom, plus the padding. */
  height: number;
}

/**
 * Fit a drawing to its container's width, never drawn larger than its natural
 * size, centered across the width, with the container's height following it.
 * A drawing narrower than the container is drawn at zoom 1 and centered; a wider
 * one is scaled down until it fits. `null` when there is nothing to fit yet:
 * an empty drawing, or a container not yet measured.
 */
export function stillViewport(
  bounds: Rect,
  containerWidth: number,
  padding: number = STILL_PADDING_PX,
): StillViewport | null {
  if (!(containerWidth > 0) || !(bounds.width > 0) || !(bounds.height > 0)) return null;
  const room = Math.max(containerWidth - 2 * padding, 1);
  const zoom = Math.min(1, room / bounds.width);
  return {
    x: (containerWidth - bounds.width * zoom) / 2 - bounds.x * zoom,
    y: padding - bounds.y * zoom,
    zoom,
    height: Math.ceil(bounds.height * zoom + 2 * padding),
  };
}
