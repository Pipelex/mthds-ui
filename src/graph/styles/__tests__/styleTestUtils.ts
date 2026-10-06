import type { GraphDirection, GraphSpec, GraphStyleId } from "@graph/types";
import { EDGE_TYPE } from "@graph/types";
import { buildGraph } from "@graph/graphBuilders";
import { applyFolds } from "@graph/graphFolds";
import { getLayoutedElements } from "@graph/graphLayout";
import { DEFAULT_GRAPH_CONFIG } from "@graph/graphConfig";
import { GRAPH_STYLES } from "../graphStyles";
import { GRAPH_STYLE_PIPELINES } from "../stylePipelines";
import type { StyleProjection } from "../stylePipelines";

/**
 * A spec drawn the way the viewer draws it before layout: built, folded by the
 * style's default folds (plus `extraFolds`), and projected by the style.
 */
export function projectStyle(
  spec: GraphSpec,
  style: GraphStyleId,
  extraFolds: readonly string[] = [],
): StyleProjection {
  const { graphData, analysis } = buildGraph(spec, EDGE_TYPE.DEFAULT);
  const pipeline = GRAPH_STYLE_PIPELINES[style];
  const folds = new Set([
    ...(analysis ? pipeline.defaultFolds(spec, analysis) : []),
    ...extraFolds,
  ]);
  const folded =
    analysis && folds.size > 0
      ? applyFolds(graphData, analysis, spec, folds)
      : { nodes: graphData.nodes, edges: graphData.edges, analysis };
  return pipeline.project({
    graphspec: spec,
    nodes: folded.nodes,
    edges: folded.edges,
    analysis: folded.analysis,
    rawAnalysis: analysis,
  });
}

/** The projection laid out the way the viewer lays it out, with the style's own layout config. */
export async function layoutStyle(
  spec: GraphSpec,
  style: GraphStyleId,
  direction: GraphDirection = "LR",
) {
  const projected = projectStyle(spec, style);
  const layoutConfig = GRAPH_STYLES[style].layout ?? {
    nodesep: DEFAULT_GRAPH_CONFIG.nodesep,
    ranksep: DEFAULT_GRAPH_CONFIG.ranksep,
  };
  const laid = await getLayoutedElements(
    projected.nodes,
    projected.edges,
    direction,
    layoutConfig,
    spec,
    projected.analysis,
  );
  return { ...laid, analysis: projected.analysis };
}
