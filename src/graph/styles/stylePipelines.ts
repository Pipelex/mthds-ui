import type {
  DataflowAnalysis,
  FoldToggleOptions,
  GraphEdge,
  GraphNode,
  GraphSpec,
  GraphStyleId,
} from "@graph/types";
import { GRAPH_STYLE } from "@graph/types";
import { applyControllers } from "@graph/graphControllers";
import type { ControllerRect } from "@graph/graphControllers";
import { applySimpleFrames, projectSimpleGraph, simpleDefaultFolds } from "./simpleStyle";

/** What a style's projection receives: the dataflow graph after the folds, for one spec. */
export interface StyleProjectionArgs {
  graphspec: GraphSpec;
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** The analysis after the folds; null for a spec with no data flow. */
  analysis: DataflowAnalysis | null;
  /** The analysis before the folds; null for a spec with no data flow. */
  rawAnalysis: DataflowAnalysis | null;
}

/** What the layout lays out for a style, and the analysis its frames are built from. */
export interface StyleProjection {
  nodes: GraphNode[];
  edges: GraphEdge[];
  analysis: DataflowAnalysis | null;
}

/** What a style's frame pass receives: the laid-out nodes, and the viewer's frame and fold state. */
export interface StyleFrameArgs {
  nodes: GraphNode[];
  edges: GraphEdge[];
  graphspec: GraphSpec | null;
  analysis: DataflowAnalysis | null;
  controllerPositions?: Record<string, ControllerRect>;
  showControllers: boolean;
  expandedControllers?: ReadonlySet<string>;
  onToggleCollapse?: (controllerId: string) => void;
  onToggleFold?: (controllerId: string, options?: FoldToggleOptions) => void;
}

/**
 * The drawing pipeline a style contributes, in the order the viewer runs it:
 * the controllers it folds on a fresh graph, the projection of the folded
 * dataflow graph into the nodes and edges it lays out, and the pass that wraps
 * the laid-out nodes in its frames. Pure: the node components that draw the
 * result are the React layer's.
 */
export interface GraphStylePipeline {
  defaultFolds(graphspec: GraphSpec, rawAnalysis: DataflowAnalysis): Set<string>;
  project(args: StyleProjectionArgs): StyleProjection;
  frame(args: StyleFrameArgs): { nodes: GraphNode[]; edges: GraphEdge[] };
}

export const GRAPH_STYLE_PIPELINES: Record<GraphStyleId, GraphStylePipeline> = {
  // Today's drawing: the dataflow graph as built, framed by controller groups
  // when the viewer shows them.
  [GRAPH_STYLE.DETAILED]: {
    defaultFolds: () => new Set(),
    project: ({ nodes, edges, analysis }) => ({ nodes, edges, analysis }),
    frame: (args) =>
      applyControllers(
        args.nodes,
        args.edges,
        args.graphspec,
        args.analysis,
        args.showControllers,
        args.expandedControllers,
        args.onToggleCollapse,
        args.controllerPositions,
        args.onToggleFold,
      ),
  },
  [GRAPH_STYLE.SIMPLE]: {
    defaultFolds: simpleDefaultFolds,
    project: ({ graphspec, nodes, analysis, rawAnalysis }) =>
      analysis && rawAnalysis
        ? projectSimpleGraph({ graphspec, nodes, analysis, rawAnalysis })
        : { nodes: [], edges: [], analysis: null },
    // Its frames are its own decision, whatever the controllers toggle says.
    frame: (args) =>
      args.graphspec && args.analysis
        ? applySimpleFrames({
            nodes: args.nodes,
            edges: args.edges,
            graphspec: args.graphspec,
            analysis: args.analysis,
            controllerPositions: args.controllerPositions,
            onToggleFold: args.onToggleFold,
          })
        : { nodes: args.nodes, edges: args.edges },
  },
};
