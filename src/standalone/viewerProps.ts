/**
 * Pure config parsing for the standalone adapter. Lives in its own module so
 * the wire-through from `pipelex-config` JSON to `GraphViewer` props can be
 * unit-tested without pulling React or CSS side-effects into the test.
 */
import type { GraphSpec, GraphConfig, GraphDirection, FoldMode } from "@graph/types";
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

function parseDirection(raw: unknown): GraphDirection {
  if (
    raw === GRAPH_DIRECTION.LR ||
    raw === GRAPH_DIRECTION.RL ||
    raw === GRAPH_DIRECTION.TB ||
    raw === GRAPH_DIRECTION.BT
  ) {
    return raw;
  }
  return GRAPH_DIRECTION.LR;
}

/**
 * Translate the raw `pipelex-config` JSON blob into props for `GraphViewer`.
 *
 * Unknown fields in `rawConfig` are forwarded verbatim (spread) so any future
 * `GraphConfig` key reaches `GraphViewer` without a code change here —
 * eliminating the v0.6.2-shape regression where new fields silently fail to
 * wire through. Validated fields (currently just `foldMode`) override the
 * spread.
 */
export function buildViewerProps(
  rawConfig: unknown,
  graphspec: GraphSpec | null,
): StandaloneViewerProps {
  const cfg = (rawConfig && typeof rawConfig === "object" ? rawConfig : {}) as Record<
    string,
    unknown
  >;
  const direction = parseDirection(cfg.direction);
  const showControllers = Boolean(cfg.showControllers);
  const foldMode = parseFoldMode(cfg.foldMode);
  return {
    graphspec,
    config: {
      ...cfg,
      direction,
      showControllers,
      foldMode,
    } as GraphConfig,
    initialDirection: direction,
    initialShowControllers: showControllers,
    initialFoldMode: foldMode,
  };
}
