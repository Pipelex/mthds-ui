import type { ElkNode, ElkPort, ElkExtendedEdge, LayoutOptions } from "elkjs/lib/elk-api";
import type {
  GraphNode,
  GraphEdge,
  GraphSpec,
  DataflowAnalysis,
  LayoutConfig,
  GraphDirection,
} from "./types";
import {
  NODE_TYPE_PIPE_CARD,
  CONTROLLER_PADDING_X,
  CONTROLLER_PADDING_TOP,
  CONTROLLER_PADDING_BOTTOM,
} from "./types";
import { buildChildToControllerMap } from "./graphAnalysis";

// ─── Direction mapping ──────────────────────────────────────────────────────

function elkDirection(direction: GraphDirection): string {
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

function makePorts(nodeId: string, dims: NodeDimensions, direction: GraphDirection): ElkPort[] {
  // Port sides must match the flow direction so ELK computes edge attachment
  // on the same side that ReactFlow renders handles.
  // LR: input=WEST, output=EAST | RL: input=EAST, output=WEST
  // TB: input=NORTH, output=SOUTH | BT: input=SOUTH, output=NORTH
  const portSides: Record<GraphDirection, { inSide: string; outSide: string }> = {
    LR: { inSide: "WEST", outSide: "EAST" },
    RL: { inSide: "EAST", outSide: "WEST" },
    TB: { inSide: "NORTH", outSide: "SOUTH" },
    BT: { inSide: "SOUTH", outSide: "NORTH" },
  };
  const { inSide, outSide } = portSides[direction];

  const isHorizontal = direction === "LR" || direction === "RL";
  // Pin ports at the exact center of each side so ELK computes layout
  // with the same edge attachment point that ReactFlow will render.
  const inX = isHorizontal ? (direction === "LR" ? 0 : dims.width) : dims.width / 2;
  const inY = isHorizontal ? dims.height / 2 : direction === "TB" ? 0 : dims.height;
  const outX = isHorizontal ? (direction === "LR" ? dims.width : 0) : dims.width / 2;
  const outY = isHorizontal ? dims.height / 2 : direction === "TB" ? dims.height : 0;

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

// ─── Pipe card layout constants (keep in sync with graph-core.css) ──────────
// If you change these, update the matching rules in graph-core.css.
const PIPE_CARD_HEIGHT_CAP = 320;

// Horizontal padding (12 + 12 = 24) + vertical padding (12 + 12 = 24)
const PIPE_CARD_PADDING_X = 28; // padding-left + padding-right (14 + 14)
const PIPE_CARD_PADDING_Y = 24; // padding-top + padding-bottom (12 + 12)
const PIPE_CARD_GAP = 8; // gap between flex children (header / description / io sections)

// Header: badge (~20px) + code line with status dot
const PIPE_CARD_HEADER_HEIGHT = 22;

// Description: 11.5px font × 1.4 line-height ≈ 16.1px per line
const PIPE_CARD_DESC_LINE_HEIGHT = 16;
const PIPE_CARD_DESC_MAX_LINES_LR = 3;

// I/O section heights (label + first row of pills)
const PIPE_CARD_IO_SECTION_HEIGHT_LR = 38; // stacked: label on top, pills below
const PIPE_CARD_IO_SECTION_HEIGHT_TB = 30; // inline: label on left, pills on right
const PIPE_CARD_IO_EXTRA_ROW_HEIGHT = 22; // each additional wrapping row of pills

// Pill dimension caps (keep in sync with .pipe-card--tb .pipe-card-io-pill-name/concept max-width)
const PIPE_CARD_PILL_NAME_MAX_WIDTH = 140;
const PIPE_CARD_PILL_CONCEPT_MAX_WIDTH = 100;
const PIPE_CARD_PILL_CHROME_WIDTH = 17; // pill padding (10) + name/concept gap (3) + inter-pill gap (4)
const PIPE_CARD_IO_LABEL_WIDTH_TB = 58; // min-width 52 + gap 6

// Character width estimates for Inter font
const CHAR_WIDTH_DESC = 5.5; // 11.5px font
const CHAR_WIDTH_PILL_NAME = 5.0; // 10px font (pill-name)
const CHAR_WIDTH_PILL_CONCEPT = 4.5; // 9px font (pill-concept)

const MAX_VISIBLE_INPUTS = 4;

/** Estimate how many lines the description will wrap to, given direction + text length. */
function estimateDescriptionLines(
  description: string,
  isHorizontal: boolean,
  cardWidth: number,
): number {
  if (!description) return 0;
  if (!isHorizontal) return 1; // TB always clamps to 1 line (CSS handles ellipsis)
  const textWidth = cardWidth - PIPE_CARD_PADDING_X;
  const charsPerLine = Math.max(1, Math.floor(textWidth / CHAR_WIDTH_DESC));
  const neededLines = Math.ceil(description.length / charsPerLine);
  return Math.min(PIPE_CARD_DESC_MAX_LINES_LR, Math.max(1, neededLines));
}

/** Estimate the rendered width of a single pill in TB mode. */
function estimateTbPillWidth(name: string, concept: string): number {
  const nameWidth = Math.min(
    PIPE_CARD_PILL_NAME_MAX_WIDTH,
    Math.ceil(name.length * CHAR_WIDTH_PILL_NAME),
  );
  const conceptWidth = Math.min(
    PIPE_CARD_PILL_CONCEPT_MAX_WIDTH,
    Math.ceil(concept.length * CHAR_WIDTH_PILL_CONCEPT),
  );
  return nameWidth + conceptWidth + PIPE_CARD_PILL_CHROME_WIDTH;
}

/** Count how many wrapping rows a set of pills will occupy in TB mode.
 *  Uses a simple first-fit bin-packing against the available pill area width.
 */
function countTbPillRows(
  pills: readonly { name: string; concept: string }[],
  cardWidth: number,
): number {
  if (pills.length === 0) return 0;
  const availableWidth = cardWidth - PIPE_CARD_PADDING_X - PIPE_CARD_IO_LABEL_WIDTH_TB;
  let rows = 1;
  let currentRowWidth = 0;
  for (const pill of pills) {
    const pillWidth = estimateTbPillWidth(pill.name, pill.concept);
    if (currentRowWidth === 0) {
      currentRowWidth = pillWidth;
      continue;
    }
    if (currentRowWidth + pillWidth <= availableWidth) {
      currentRowWidth += pillWidth;
    } else {
      rows += 1;
      currentRowWidth = pillWidth;
    }
  }
  return rows;
}

export function estimateNodeDimensions(node: GraphNode, isHorizontal: boolean): NodeDimensions {
  const nodeData = node.data || {};
  const isStuff = nodeData.isStuff;
  const labelText = nodeData.labelText || "";
  const isPipeCard = node.type === NODE_TYPE_PIPE_CARD;

  const pipeCardMinWidth = isHorizontal ? 180 : 280;
  const pipeCardMaxWidth = isHorizontal ? 240 : 400;
  // Stuff nodes are visually aligned with pipe cards — they must never be wider
  // than the pipe card max for the current direction, otherwise the graph looks
  // lopsided (a 400px stuff node next to a 240px pipe card in LR mode).
  const estimatedWidth = Math.max(180, Math.min(pipeCardMaxWidth, labelText.length * 8 + 60));

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
    const inputs = pcd.inputs ?? [];
    const outputs = pcd.outputs ?? [];
    const description = pcd.description || nodeData.nodeData?.description || "";

    // Header
    let total = PIPE_CARD_PADDING_Y + PIPE_CARD_HEADER_HEIGHT;

    // Description: actual lines needed
    const descLines = estimateDescriptionLines(description, isHorizontal, width);
    if (descLines > 0) {
      total += PIPE_CARD_GAP + descLines * PIPE_CARD_DESC_LINE_HEIGHT;
    }

    // Inputs — cap visible to MAX_VISIBLE_INPUTS (rest collapses behind "+N more")
    const visibleInputs = inputs.slice(0, MAX_VISIBLE_INPUTS);
    if (visibleInputs.length > 0) {
      total += PIPE_CARD_GAP;
      if (isHorizontal) {
        // LR: one pill per row, always stacked
        total +=
          PIPE_CARD_IO_SECTION_HEIGHT_LR +
          (visibleInputs.length - 1) * PIPE_CARD_IO_EXTRA_ROW_HEIGHT;
      } else {
        // TB: bin-pack pills horizontally, each extra row adds height
        const rows = countTbPillRows(visibleInputs, width);
        total += PIPE_CARD_IO_SECTION_HEIGHT_TB + (rows - 1) * PIPE_CARD_IO_EXTRA_ROW_HEIGHT;
      }
    }

    // Outputs — same logic as inputs
    if (outputs.length > 0) {
      total += PIPE_CARD_GAP;
      if (isHorizontal) {
        total +=
          PIPE_CARD_IO_SECTION_HEIGHT_LR + (outputs.length - 1) * PIPE_CARD_IO_EXTRA_ROW_HEIGHT;
      } else {
        const rows = countTbPillRows(outputs, width);
        total += PIPE_CARD_IO_SECTION_HEIGHT_TB + (rows - 1) * PIPE_CARD_IO_EXTRA_ROW_HEIGHT;
      }
    }

    height = Math.min(PIPE_CARD_HEIGHT_CAP, total);
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

function makeLeafNode(nodeId: string, dims: NodeDimensions, direction: GraphDirection): ElkNode {
  return {
    id: nodeId,
    width: dims.width,
    height: dims.height,
    ports: makePorts(nodeId, dims, direction),
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
  direction: GraphDirection,
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
      return makeLeafNode(node.id, dims, direction);
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
          children.push(makeLeafNode(childId, dims, direction));
        }
      }
    }

    // Add stuff nodes that belong to this controller
    for (const node of nodes) {
      if (node.data.isStuff && childToCtrl[node.id] === ctrlId) {
        if (!children.some((c) => c.id === node.id)) {
          const dims = estimateNodeDimensions(node, isHorizontal);
          dimensionMap[node.id] = dims;
          children.push(makeLeafNode(node.id, dims, direction));
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
      rootChildren.push(makeLeafNode(node.id, dims, direction));
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
