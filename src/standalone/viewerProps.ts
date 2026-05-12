/**
 * Pure config parsing for the standalone adapter. Lives in its own module so
 * the wire-through from `pipelex-config` JSON to `GraphViewer` props can be
 * unit-tested without pulling React or CSS side-effects into the test.
 */
import type { GraphSpec, GraphConfig, GraphDirection, EdgeType, FoldMode } from "@graph/types";
import { FOLD_MODE, GRAPH_DIRECTION } from "@graph/types";

export interface StandaloneViewerProps {
  graphspec: GraphSpec | null;
  config: GraphConfig;
  initialDirection: GraphDirection;
  initialShowControllers: boolean;
  initialFoldMode: FoldMode;
}

function parseFoldMode(raw: unknown): FoldMode {
  if (raw === FOLD_MODE.FOLDED || raw === FOLD_MODE.EXPANDED || raw === FOLD_MODE.AUTO) {
    return raw;
  }
  return FOLD_MODE.EXPANDED;
}

/**
 * Translate the raw `pipelex-config` JSON blob into props for `GraphViewer`.
 * `foldMode` is validated against the `FOLD_MODE` constants; any other value
 * (or a missing field) falls back to `"expanded"`.
 */
export function buildViewerProps(
  rawConfig: unknown,
  graphspec: GraphSpec | null,
): StandaloneViewerProps {
  const cfg = (rawConfig && typeof rawConfig === "object" ? rawConfig : {}) as Record<
    string,
    unknown
  >;
  const direction = (cfg.direction as GraphDirection) || GRAPH_DIRECTION.LR;
  const showControllers = Boolean(cfg.showControllers);
  const foldMode = parseFoldMode(cfg.foldMode);
  return {
    graphspec,
    config: {
      direction,
      showControllers,
      foldMode,
      nodesep: cfg.nodesep as number | undefined,
      ranksep: cfg.ranksep as number | undefined,
      edgeType: cfg.edgeType as EdgeType | undefined,
      initialZoom: cfg.initialZoom as number | null | undefined,
      panToTop: cfg.panToTop as boolean | undefined,
      paletteColors: cfg.paletteColors as Record<string, string> | undefined,
    },
    initialDirection: direction,
    initialShowControllers: showControllers,
    initialFoldMode: foldMode,
  };
}
