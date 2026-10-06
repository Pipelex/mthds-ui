import type { GraphStyleId, LayoutConfig } from "@graph/types";
import { GRAPH_STYLE } from "@graph/types";
import { DEFAULT_GRAPH_CONFIG } from "@graph/graphConfig";

// ─── The style registry ─────────────────────────────────────────────────────
// A closed, typed table: adding a style is a new `GRAPH_STYLE` id, after which
// the compiler names every table keyed by `GraphStyleId` that needs a row — the
// descriptor below, the drawing pipeline (`stylePipelines.ts`), the node
// components and the menu icon in the React layer.

/** Which of the toolbar's controls make sense for a style. */
export interface GraphStyleCapabilities {
  /**
   * The toolbar's show/hide controllers toggle applies: the style draws
   * controller frames on demand. A style that decides its own frames hides it.
   */
  controllerFrameToggle: boolean;
  /**
   * Fold-all and expand-all apply. In a style that also has the frame toggle
   * they apply only while the frames are shown, since a fold is undone from a
   * frame.
   */
  foldAll: boolean;
}

/** What the registry says of one style: what it is called, what it is for, and what it supports. */
export interface GraphStyleDescriptor {
  id: GraphStyleId;
  /** The style's name in the toolbar menu. */
  name: string;
  /** One line saying what the style shows, under its name in the menu. */
  description: string;
  capabilities: GraphStyleCapabilities;
  /**
   * How the style lays out: its spacing, which replaces `config.nodesep` and
   * `config.ranksep` for it, the room its frames keep around their steps, and
   * whether its edges follow routes around the nodes in their way. A style
   * that leaves it undefined keeps the host's spacing and the controller
   * groups' padding, and draws free curves of the host's `edgeType`.
   */
  layout?: Required<LayoutConfig>;
}

export const GRAPH_STYLES: Record<GraphStyleId, GraphStyleDescriptor> = {
  [GRAPH_STYLE.DETAILED]: {
    id: GRAPH_STYLE.DETAILED,
    name: "Detailed",
    description: "Every pipe with its inputs, outputs and settings",
    capabilities: { controllerFrameToggle: true, foldAll: true },
  },
  [GRAPH_STYLE.SIMPLE]: {
    id: GRAPH_STYLE.SIMPLE,
    name: "Simple",
    description: "The method's steps in plain words",
    capabilities: { controllerFrameToggle: false, foldAll: true },
    layout: {
      nodesep: 28,
      ranksep: 44,
      routeEdges: true,
      groupPadding: { x: 20, top: 40, bottom: 16 },
    },
  },
};

/** Every registered style, in the order the menu lists them. */
export const GRAPH_STYLE_IDS: readonly GraphStyleId[] = [GRAPH_STYLE.DETAILED, GRAPH_STYLE.SIMPLE];

/**
 * Whether a value names a registered style. For values that cross an untyped
 * boundary — an editor setting, the standalone page's config embed, a host
 * written in plain JavaScript — before they reach the viewer.
 */
export function isGraphStyleId(value: unknown): value is GraphStyleId {
  return typeof value === "string" && Object.hasOwn(GRAPH_STYLES, value);
}

/**
 * Resolve the active style from `(graphStyle prop, config.graphStyle, default)`.
 * Pure + exported so the controlled/reactive precedence is unit-testable
 * without React, under the same contract `resolveExternalThemeMode` holds:
 * - the prop wins when it names a style,
 * - falls back to `config.graphStyle` when the prop is undefined (so a host can
 *   hand control back to config after passing the prop),
 * - falls back to the library default (`detailed`) when neither is set.
 *
 * A value naming no registered style is treated as unset rather than thrown
 * on: a style is a preference, and a host relaying a setting written for a
 * newer version of this package should still get a graph.
 */
export function resolveGraphStyle(styleProp: unknown, configStyle: unknown): GraphStyleId {
  if (isGraphStyleId(styleProp)) return styleProp;
  if (isGraphStyleId(configStyle)) return configStyle;
  return DEFAULT_GRAPH_CONFIG.graphStyle;
}

/**
 * The styles the toolbar menu offers, from the viewer's `styleMenu` prop:
 * nothing for `false` or `undefined` (the menu is opt-in), every registered
 * style in registry order for `true`, and for a list the registered styles it
 * names, in its order and without repeats. A menu needs two styles to choose
 * between, so fewer than two offer none.
 */
export function resolveStyleMenu(
  styleMenu: boolean | readonly GraphStyleId[] | undefined,
): GraphStyleId[] {
  if (styleMenu === undefined || styleMenu === false) return [];
  const requested: readonly unknown[] = styleMenu === true ? GRAPH_STYLE_IDS : styleMenu;
  const offered: GraphStyleId[] = [];
  for (const id of requested) {
    if (isGraphStyleId(id) && !offered.includes(id)) offered.push(id);
  }
  return offered.length >= 2 ? offered : [];
}
