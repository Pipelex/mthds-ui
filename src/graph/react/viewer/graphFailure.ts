/**
 * Why `GraphViewer` drew no graph, as a value it can draw.
 *
 * `validateGraphSpec` throws on a spec it refuses, which is the right contract
 * for the code that calls it directly: a CLI, a worker, a test. Inside a React
 * render the same throw unmounts the host's whole tree, so the viewer reads the
 * spec through `readGraphSpec` instead and draws the refusal in place of the
 * graph (`GraphErrorState`). The validator itself is unchanged.
 *
 * The layout runs asynchronously, so its failure reaches no render either; the
 * rules below decide what becomes of one, and of a layout that succeeds after
 * the spec it laid out was replaced. Pure, so they are tested without a DOM.
 */
import type { GraphSpec } from "@graph/types";
import { GraphSpecValidationError, validateGraphSpec } from "@graph/validateGraphSpec";

/**
 * The sentence the error state shows for a failure: a refused spec's own
 * message, which names the location it refused and what it found there, or any
 * other error's name and message.
 */
export function describeGraphFailure(error: unknown): string {
  if (error instanceof GraphSpecValidationError) return error.message;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

/** The spec the viewer draws, or why it refused it: never both. */
export type GraphSpecReading =
  | { graphspec: GraphSpec | null; failure: null }
  | { graphspec: null; failure: string };

/**
 * Validate the host's spec at the viewer's boundary, returning the refusal
 * rather than throwing it. `null` is no spec, which draws nothing and is no
 * failure. Like `validateGraphSpec`, it normalizes an accepted spec in place
 * and returns that same object.
 */
export function readGraphSpec(raw: GraphSpec | null): GraphSpecReading {
  if (raw === null) return { graphspec: null, failure: null };
  try {
    return { graphspec: validateGraphSpec(raw), failure: null };
  } catch (error) {
    return { graphspec: null, failure: describeGraphFailure(error) };
  }
}

/**
 * Whether a layout that has just settled has lost its claim on the canvas:
 * its effect was torn down, or the spec it laid out has since been replaced,
 * by another spec or by none. A stale layout writes nothing when it succeeds
 * and reports nothing when it fails, so one spec's result never lands on the
 * next. `laidOutSpec` is the spec captured before the layout's first await;
 * `currentSpec` is the one the viewer draws now.
 */
export function isLayoutStale(
  cancelled: boolean,
  laidOutSpec: GraphSpec | null,
  currentSpec: GraphSpec | null,
): boolean {
  return cancelled || laidOutSpec !== currentSpec;
}

/** Where a failed layout is drawn. */
export const LAYOUT_FAILURE_ROUTE = {
  /** Nowhere: the layout was stale, so its failure belongs to a spec no longer drawn. */
  DROP: "drop",
  /** Over the canvas, which keeps its toolbar, so the reader can change the view back. */
  CANVAS: "canvas",
  /** To the boundary, which draws the error state in place of the canvas. */
  BOUNDARY: "boundary",
} as const;
export type LayoutFailureRoute = (typeof LAYOUT_FAILURE_ROUTE)[keyof typeof LAYOUT_FAILURE_ROUTE];

/**
 * Where a failed layout goes. A stale one is dropped. A layout of a spec the
 * canvas has not drawn yet, a new spec's first above all, goes to the
 * boundary, since there is no drawing of that spec to go back to. Any other
 * layout redraws a spec already drawn, after the reader changed the direction,
 * a fold or the style, or the host changed the style, the edge type or the
 * spacing; its failure is drawn over the canvas, which keeps the toolbar, so
 * the reader can undo the change that failed.
 */
export function routeLayoutFailure({
  stale,
  specDrawn,
}: {
  stale: boolean;
  /** Whether a layout of this same spec has already been drawn on the canvas. */
  specDrawn: boolean;
}): LayoutFailureRoute {
  if (stale) return LAYOUT_FAILURE_ROUTE.DROP;
  return specDrawn ? LAYOUT_FAILURE_ROUTE.CANVAS : LAYOUT_FAILURE_ROUTE.BOUNDARY;
}

/** A relayout's failure, kept by the canvas with the spec it failed to redraw. */
export interface LayoutFailure {
  spec: GraphSpec | null;
  /** The failure in the error state's words (`describeGraphFailure`). */
  message: string;
}

/**
 * The relayout failure the canvas draws for the spec it draws now: the one
 * recorded for that same spec, or none. A new spec clears it on the render
 * that brings it, before any effect runs.
 */
export function layoutFailureFor(
  failure: LayoutFailure | null,
  spec: GraphSpec | null,
): string | null {
  return failure !== null && failure.spec === spec ? failure.message : null;
}

/** Where the canvas draws a failure: in place of the flow, or over it. */
export interface CanvasFailurePlacement {
  /** Drawn in place of the flow, as the error state. */
  inPlace: string | null;
  /** Drawn over the flow, which keeps its toolbar. */
  overFlow: string | null;
}

/**
 * Where the canvas draws what failed. A refused spec has no flow to draw, so
 * its failure takes the flow's place. A relayout's failure is drawn over the
 * flow in the interactive presentation, where the toolbar stays usable; the
 * still presentation has no toolbar and no reader control, so it draws that
 * failure in place of the picture, as the error state.
 */
export function placeCanvasFailure({
  specFailure,
  layoutFailure,
  interactive,
}: {
  specFailure: string | null;
  layoutFailure: string | null;
  interactive: boolean;
}): CanvasFailurePlacement {
  if (specFailure !== null) return { inPlace: specFailure, overFlow: null };
  if (layoutFailure === null) return { inPlace: null, overFlow: null };
  return interactive
    ? { inPlace: null, overFlow: layoutFailure }
    : { inPlace: layoutFailure, overFlow: null };
}
