import ELK from "elkjs/lib/elk.bundled.js";
import type {
  GraphNode,
  GraphEdge,
  GraphSpec,
  DataflowAnalysis,
  LayoutConfig,
  GraphDirection,
} from "./types";
import { buildElkGraph, extractAbsolutePositions, estimateNodeDimensions } from "./elkGraphBuilder";
import type { ElkPositionResult } from "./elkGraphBuilder";

// Cache ELK instance at module level to avoid repeated WASM initialization
let elkInstance: InstanceType<typeof ELK> | null = null;
function getElk(): InstanceType<typeof ELK> {
  if (!elkInstance) elkInstance = new ELK();
  return elkInstance;
}

export interface LayoutResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** ELK-computed positions/sizes for controller compound nodes. */
  controllerPositions: Record<string, ElkPositionResult>;
}

export async function getLayoutedElements(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: GraphDirection,
  layoutConfig?: LayoutConfig,
  graphspec?: GraphSpec | null,
  analysis?: DataflowAnalysis | null,
): Promise<LayoutResult> {
  if (nodes.length === 0) return { nodes: [], edges, controllerPositions: {} };

  const isHorizontal = direction === "LR" || direction === "RL";

  const { elkGraph, dimensionMap } = buildElkGraph(
    nodes,
    edges,
    graphspec ?? null,
    analysis ?? null,
    direction,
    layoutConfig,
  );

  const layoutResult = await getElk().layout(elkGraph);
  const positions = extractAbsolutePositions(layoutResult);

  // Extract controller positions from ELK output
  const controllerPositions: Record<string, ElkPositionResult> = {};
  if (analysis) {
    for (const ctrlId of analysis.controllerNodeIds) {
      if (positions[ctrlId]) {
        controllerPositions[ctrlId] = positions[ctrlId];
      }
    }
  }

  const result = nodes.map((node) => {
    const pos = positions[node.id];
    const dims = dimensionMap[node.id] ?? estimateNodeDimensions(node, isHorizontal);

    const width = dims.width;
    const height = dims.height;

    // Inject direction into pipeCardData so the card component can adjust orientation
    const pipeCardData = node.data.pipeCardData;
    const cardDirection = isHorizontal ? ("LR" as const) : ("TB" as const);
    const updatedPipeCardData = pipeCardData
      ? { ...pipeCardData, direction: cardDirection }
      : undefined;

    return {
      ...node,
      data: {
        ...node.data,
        _estimatedWidth: width,
        _estimatedHeight: height,
        pipeCardData: updatedPipeCardData,
      },
      // Lock the ReactFlow node wrapper to the exact dimensions ELK used for layout.
      // This ensures ReactFlow's Handle (centered on the DOM element) matches
      // the port position ELK computed (centered on the estimated dimensions).
      style: {
        ...node.style,
        width: width + "px",
        height: height + "px",
      },
      position: {
        x: pos ? pos.x : 0,
        y: pos ? pos.y : 0,
      },
      sourcePosition: (isHorizontal
        ? direction === "LR"
          ? "right"
          : "left"
        : "bottom") as GraphNode["sourcePosition"],
      targetPosition: (isHorizontal
        ? direction === "LR"
          ? "left"
          : "right"
        : "top") as GraphNode["targetPosition"],
    };
  });

  return { nodes: result, edges, controllerPositions };
}
