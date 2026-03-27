import type { ElkNode, ElkPort, ElkExtendedEdge, LayoutOptions } from "elkjs/lib/elk-api";
import type { GraphNode, GraphEdge, GraphSpec, DataflowAnalysis, LayoutConfig } from "./types";
import {
  NODE_TYPE_PIPE_CARD,
  CONTROLLER_PADDING_X,
  CONTROLLER_PADDING_TOP,
  CONTROLLER_PADDING_BOTTOM,
} from "./types";
import { buildChildToControllerMap } from "./graphAnalysis";

// ─── Direction mapping ──────────────────────────────────────────────────────

function elkDirection(direction: string): string {
  switch (direction) {
    case "LR":
      return "RIGHT";
    case "RL":
      return "LEFT";
    case "BT":
      return "UP";
    default:
      return "DOWN"; // TB
  }
}

// ─── Port helpers ───────────────────────────────────────────────────────────

const INPUT_PORT_SUFFIX = "_in";
const OUTPUT_PORT_SUFFIX = "_out";

export function inputPortId(nodeId: string): string {
  return nodeId + INPUT_PORT_SUFFIX;
}

export function outputPortId(nodeId: string): string {
  return nodeId + OUTPUT_PORT_SUFFIX;
}

function makePorts(nodeId: string, dims: NodeDimensions, isHorizontal: boolean): ElkPort[] {
  const inSide = isHorizontal ? "WEST" : "NORTH";
  const outSide = isHorizontal ? "EAST" : "SOUTH";

  // Pin ports at the exact center of each side so ELK computes layout
  // with the same edge attachment point that ReactFlow will render.
  const inX = isHorizontal ? 0 : dims.width / 2;
  const inY = isHorizontal ? dims.height / 2 : 0;
  const outX = isHorizontal ? dims.width : dims.width / 2;
  const outY = isHorizontal ? dims.height / 2 : dims.height;

  return [
    {
      id: inputPortId(nodeId),
      x: inX,
      y: inY,
      width: 1,
      height: 1,
      layoutOptions: { "elk.port.side": inSide },
    },
    {
      id: outputPortId(nodeId),
      x: outX,
      y: outY,
      width: 1,
      height: 1,
      layoutOptions: { "elk.port.side": outSide },
    },
  ];
}

// ─── Node dimension estimation ──────────────────────────────────────────────
// ELK needs dimensions upfront to compute layout.

interface NodeDimensions {
  width: number;
  height: number;
}

export function estimateNodeDimensions(node: GraphNode, isHorizontal: boolean): NodeDimensions {
  const nodeData = node.data || {};
  const isStuff = nodeData.isStuff;
  const labelText = nodeData.labelText || "";
  const isPipeCard = node.type === NODE_TYPE_PIPE_CARD;
  const estimatedWidth = Math.max(180, Math.min(400, labelText.length * 8 + 60));

  const pipeCardMinWidth = isHorizontal ? 180 : 280;
  const pipeCardMaxWidth = isHorizontal ? 240 : 400;
  let width: number;
  if (isStuff) {
    width = Math.max(180, estimatedWidth);
  } else if (isPipeCard && nodeData.pipeCardData) {
    width = pipeCardMaxWidth;
  } else {
    width = Math.max(isPipeCard ? pipeCardMinWidth : 200, estimatedWidth);
  }

  let height: number;
  if (isStuff) {
    height = 60;
  } else if (isPipeCard && nodeData.pipeCardData) {
    const pcd = nodeData.pipeCardData;
    const inputCount = pcd.inputs?.length ?? 0;
    const outputCount = pcd.outputs?.length ?? 0;
    const hasDesc = !!pcd.description || !!nodeData.nodeData?.description;
    const baseHeight = 44 + (hasDesc ? 24 : 0);
    const sectionBase = isHorizontal ? 38 : 30;
    const inputSection = inputCount > 0 ? sectionBase : 0;
    const outputSection = outputCount > 0 ? sectionBase : 0;
    const pillsPerRow = isHorizontal ? 1 : 3;
    const visibleInputs = Math.min(inputCount, 4);
    const inputExtraRows = Math.max(0, Math.ceil(visibleInputs / pillsPerRow) - 1);
    const outputExtraRows = Math.max(0, Math.ceil(outputCount / pillsPerRow) - 1);
    height = Math.min(
      320,
      baseHeight + inputSection + outputSection + (inputExtraRows + outputExtraRows) * 24,
    );
  } else {
    height = isPipeCard ? 120 : 70;
  }

  return { width, height };
}

// ─── Controller nesting depth ───────────────────────────────────────────────

function computeDepths(
  controllerNodeIds: ReadonlySet<string>,
  containmentTree: Readonly<Record<string, readonly string[]>>,
): Record<string, number> {
  const depthCache: Record<string, number> = {};
  const visiting = new Set<string>();

  function getDepth(ctrlId: string): number {
    if (depthCache[ctrlId] !== undefined) return depthCache[ctrlId];
    if (visiting.has(ctrlId)) return 0;
    visiting.add(ctrlId);
    const children = containmentTree[ctrlId] || [];
    let maxChildDepth = -1;
    for (const childId of children) {
      if (controllerNodeIds.has(childId)) {
        maxChildDepth = Math.max(maxChildDepth, getDepth(childId));
      }
    }
    visiting.delete(ctrlId);
    depthCache[ctrlId] = maxChildDepth + 1;
    return depthCache[ctrlId];
  }

  for (const id of controllerNodeIds) getDepth(id);
  return depthCache;
}

// ─── Leaf node builder ──────────────────────────────────────────────────────

function makeLeafNode(nodeId: string, dims: NodeDimensions, isHorizontal: boolean): ElkNode {
  return {
    id: nodeId,
    width: dims.width,
    height: dims.height,
    ports: makePorts(nodeId, dims, isHorizontal),
    layoutOptions: {
      "elk.portConstraints": "FIXED_POS",
    },
  };
}

// ─── Build ELK graph ────────────────────────────────────────────────────────

export function buildElkGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  graphspec: GraphSpec | null,
  analysis: DataflowAnalysis | null,
  direction: string,
  layoutConfig?: LayoutConfig,
): { elkGraph: ElkNode; dimensionMap: Record<string, NodeDimensions> } {
  const isHorizontal = direction === "LR" || direction === "RL";
  const nodesep = layoutConfig?.nodesep ?? 80;
  const ranksep = layoutConfig?.ranksep ?? 70;
  const elkDir = elkDirection(direction);

  const edgeNodeSpacing = "30";

  const rootLayoutOptions: LayoutOptions = {
    "elk.algorithm": "layered",
    "elk.direction": elkDir,
    "elk.hierarchyHandling": "INCLUDE_CHILDREN",
    "elk.spacing.nodeNode": String(nodesep),
    "elk.layered.spacing.nodeNodeBetweenLayers": String(ranksep),
    "elk.spacing.edgeNode": edgeNodeSpacing,
    "elk.spacing.edgeEdge": "20",
    "elk.layered.spacing.edgeNodeBetweenLayers": edgeNodeSpacing,
    "elk.layered.spacing.edgeEdgeBetweenLayers": "15",
    "elk.layered.nodePlacement.favorStraightEdges": "true",
  };

  // Fast path: no hierarchy info → flat layout
  if (!graphspec || !analysis || analysis.controllerNodeIds.size === 0) {
    const dimensionMap: Record<string, NodeDimensions> = {};
    const elkChildren: ElkNode[] = nodes.map((node) => {
      const dims = estimateNodeDimensions(node, isHorizontal);
      dimensionMap[node.id] = dims;
      return makeLeafNode(node.id, dims, isHorizontal);
    });

    const elkEdges: ElkExtendedEdge[] = edges.map((edge) => ({
      id: edge.id,
      sources: [outputPortId(edge.source)],
      targets: [inputPortId(edge.target)],
    }));

    return {
      elkGraph: {
        id: "root",
        layoutOptions: rootLayoutOptions,
        children: elkChildren,
        edges: elkEdges,
      },
      dimensionMap,
    };
  }

  // Hierarchical layout: build tree from containment analysis
  const childToCtrl = buildChildToControllerMap(graphspec, analysis);
  const depths = computeDepths(analysis.controllerNodeIds, analysis.containmentTree);
  const dimensionMap: Record<string, NodeDimensions> = {};

  // Create a map from node ID to its ELK leaf node
  const nodeById = new Map<string, GraphNode>();
  for (const node of nodes) nodeById.set(node.id, node);

  // Build controller compound nodes (bottom-up: leaf controllers first)
  const controllerElkNodes: Record<string, ElkNode> = {};
  const controllerIds = Array.from(analysis.controllerNodeIds);
  controllerIds.sort((a, b) => (depths[a] ?? 0) - (depths[b] ?? 0));

  for (const ctrlId of controllerIds) {
    const depth = depths[ctrlId] ?? 0;
    const depthScale = 1 + depth * 0.15;
    const padX = Math.round(CONTROLLER_PADDING_X * depthScale);
    const padTop = Math.round(CONTROLLER_PADDING_TOP * depthScale);
    const padBottom = Math.round(CONTROLLER_PADDING_BOTTOM * depthScale);

    const ctrlLayoutOptions: LayoutOptions = {
      "elk.padding": `[top=${padTop},left=${padX},bottom=${padBottom},right=${padX}]`,
      "elk.spacing.nodeNode": String(nodesep),
      "elk.layered.spacing.nodeNodeBetweenLayers": String(ranksep),
      "elk.spacing.edgeNode": edgeNodeSpacing,
      "elk.layered.spacing.edgeNodeBetweenLayers": edgeNodeSpacing,
    };

    const children: ElkNode[] = [];
    const directChildren = analysis.containmentTree[ctrlId] || [];

    for (const childId of directChildren) {
      if (analysis.controllerNodeIds.has(childId)) {
        // Child is a controller — use its already-built compound node
        const childElk = controllerElkNodes[childId];
        if (childElk) children.push(childElk);
      } else {
        // Child is an operator — create leaf node with ports
        const graphNode = nodeById.get(childId);
        if (graphNode) {
          const dims = estimateNodeDimensions(graphNode, isHorizontal);
          dimensionMap[childId] = dims;
          children.push(makeLeafNode(childId, dims, isHorizontal));
        }
      }
    }

    // Add stuff nodes that belong to this controller
    for (const node of nodes) {
      if (node.data.isStuff && childToCtrl[node.id] === ctrlId) {
        if (!children.some((c) => c.id === node.id)) {
          const dims = estimateNodeDimensions(node, isHorizontal);
          dimensionMap[node.id] = dims;
          children.push(makeLeafNode(node.id, dims, isHorizontal));
        }
      }
    }

    controllerElkNodes[ctrlId] = {
      id: ctrlId,
      layoutOptions: ctrlLayoutOptions,
      children,
    };
  }

  // Build root children: top-level controllers + loose nodes
  const rootChildren: ElkNode[] = [];

  // Add top-level controllers (those not contained by another controller)
  for (const ctrlId of controllerIds) {
    if (!childToCtrl[ctrlId]) {
      const elkNode = controllerElkNodes[ctrlId];
      if (elkNode) rootChildren.push(elkNode);
    }
  }

  // Add loose nodes (not inside any controller and not controllers themselves)
  for (const node of nodes) {
    if (!childToCtrl[node.id] && !analysis.controllerNodeIds.has(node.id)) {
      const dims = estimateNodeDimensions(node, isHorizontal);
      dimensionMap[node.id] = dims;
      rootChildren.push(makeLeafNode(node.id, dims, isHorizontal));
    }
  }

  // All edges at root level — INCLUDE_CHILDREN handles cross-hierarchy routing
  const nodeIdSet = new Set(nodes.map((n) => n.id));
  const elkEdges: ElkExtendedEdge[] = edges
    .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
    .map((edge) => ({
      id: edge.id,
      sources: [outputPortId(edge.source)],
      targets: [inputPortId(edge.target)],
    }));

  return {
    elkGraph: {
      id: "root",
      layoutOptions: rootLayoutOptions,
      children: rootChildren,
      edges: elkEdges,
    },
    dimensionMap,
  };
}

// ─── Extract absolute positions from ELK output ────────────────────────────

export interface ElkPositionResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function extractAbsolutePositions(elkResult: ElkNode): Record<string, ElkPositionResult> {
  const positions: Record<string, ElkPositionResult> = {};

  function walk(node: ElkNode, parentX: number, parentY: number) {
    const absX = parentX + (node.x ?? 0);
    const absY = parentY + (node.y ?? 0);

    if (node.id !== "root") {
      positions[node.id] = {
        x: absX,
        y: absY,
        width: node.width ?? 0,
        height: node.height ?? 0,
      };
    }

    for (const child of node.children ?? []) {
      walk(child, absX, absY);
    }
  }

  walk(elkResult, 0, 0);
  return positions;
}
