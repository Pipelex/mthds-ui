import type { GraphSpec, DataflowAnalysis, GraphNode, GraphEdge, GraphData } from "./types";
import {
  ARROW_CLOSED_MARKER,
  NODE_TYPE_PIPE_CARD,
  NODE_TYPE_STUFF,
  graphSpecMode,
  stuffNodeId,
} from "./types";
import { buildDataflowAnalysis, buildChildToControllerMap } from "./graphAnalysis";
import { asPipeCallNode } from "./validateGraphSpec";
import { buildPipeCardPayload } from "./pipeCardPayload";

const STUFF_CHAR_WIDTH_PX = 7;
const STUFF_LABEL_PADDING = 48;
const MIN_STUFF_WIDTH = 140;

/**
 * Build dataflow graph from GraphSpec. Creates pipe nodes + stuff (data) nodes +
 * producer/consumer edges. Returns label descriptors (not React elements).
 */
export function buildDataflowGraph(
  graphspec: GraphSpec,
  analysis: DataflowAnalysis,
  edgeType: string,
): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const graphMode = graphSpecMode(graphspec);
  const combinedStuffDigests = new Set<string>();
  for (const edge of graphspec.edges) {
    if (edge.kind === "parallel_combine" && edge.target_stuff_digest) {
      combinedStuffDigests.add(edge.target_stuff_digest);
    }
  }

  // Find participating pipes (those that produce or consume data)
  const participatingPipes = new Set<string>();
  for (const producer of Object.values(analysis.stuffProducers)) {
    participatingPipes.add(producer);
  }
  for (const consumers of Object.values(analysis.stuffConsumers)) {
    for (const consumer of consumers) {
      participatingPipes.add(consumer);
    }
  }

  // Create pipe nodes (only those that participate in data flow)
  for (const node of graphspec.nodes) {
    if (!participatingPipes.has(node.id)) continue;
    // A participating pipe is always a pipe-call node; this guard turns a
    // malformed spec into a loud, greppable error rather than a bare TypeError.
    const pipeNode = asPipeCallNode(node, `nodes[${node.id}]`);

    const isFailed = pipeNode.status === "failed";
    const label = pipeNode.pipe_code;
    const pipeCardData = buildPipeCardPayload(pipeNode, graphMode);

    nodes.push({
      id: pipeNode.id,
      type: NODE_TYPE_PIPE_CARD,
      data: {
        labelDescriptor: { kind: "pipe", label, isFailed },
        nodeData: pipeNode,
        isPipe: true,
        isStuff: false,
        labelText: label,
        pipeCode: pipeCardData.pipeCode,
        pipeType: pipeNode.pipe_type,
        graphMode,
        pipeCardData,
      },
      position: { x: 0, y: 0 },
    });
  }

  // Create stuff (data) nodes
  for (const [digest, stuffInfo] of Object.entries(analysis.stuffRegistry)) {
    const stuffId = stuffNodeId(digest);
    const label = stuffInfo.name;
    const concept = stuffInfo.concept || "";
    const textWidth =
      Math.max(label.length, concept.length) * STUFF_CHAR_WIDTH_PX + STUFF_LABEL_PADDING;
    const stuffWidth = Math.max(MIN_STUFF_WIDTH, textWidth);

    // Classify: input (no producer), output (no consumer), or intermediate
    const isCombined = combinedStuffDigests.has(digest);
    const isInput = !analysis.stuffProducers[digest] && !isCombined;
    const isOutput = !isInput && !isCombined && !analysis.stuffConsumers[digest]?.length;
    const stuffRole = isCombined
      ? ("combined" as const)
      : isInput
        ? ("input" as const)
        : isOutput
          ? ("output" as const)
          : undefined;

    const borderColor = isInput
      ? "var(--color-stuff-input-border, #50FA7B)"
      : isOutput
        ? "var(--color-stuff-output-border, #a78bfa)"
        : isCombined
          ? "var(--color-parallel-combine)"
          : "var(--color-stuff-border)";

    nodes.push({
      id: stuffId,
      type: NODE_TYPE_STUFF,
      data: {
        labelDescriptor: { kind: "stuff", label, concept },
        isStuff: true,
        isPipe: false,
        labelText: label,
        stuffRole,
        stuffDigest: digest,
      },
      position: { x: 0, y: 0 },
      style: {
        background: "var(--color-stuff-bg)",
        border: `2px solid ${borderColor}`,
        borderRadius: "999px",
        padding: "0",
        width: stuffWidth + "px",
        boxShadow: "var(--shadow-md)",
      },
    });
  }

  // Create edges: producer -> stuff
  let edgeId = 0;
  for (const [digest, producerNodeId] of Object.entries(analysis.stuffProducers)) {
    const stuffId = stuffNodeId(digest);
    edges.push({
      id: "edge_" + edgeId++,
      source: producerNodeId,
      target: stuffId,
      type: edgeType,
      animated: false,
      style: { stroke: "var(--color-edge)", strokeWidth: 2 },
      markerEnd: {
        type: ARROW_CLOSED_MARKER,
        color: "var(--color-edge)",
      },
    });
  }

  // Create edges: stuff -> consumer
  for (const [digest, consumers] of Object.entries(analysis.stuffConsumers)) {
    const stuffId = stuffNodeId(digest);
    for (const consumerNodeId of consumers) {
      edges.push({
        id: "edge_" + edgeId++,
        source: stuffId,
        target: consumerNodeId,
        type: edgeType,
        animated: false,
        style: { stroke: "var(--color-edge)", strokeWidth: 2 },
        markerEnd: {
          type: ARROW_CLOSED_MARKER,
          color: "var(--color-edge)",
        },
      });
    }
  }

  // Create PARALLEL_COMBINE edges from GraphSpec
  for (const edge of graphspec.edges) {
    if (edge.kind !== "parallel_combine") continue;
    if (!edge.source_stuff_digest || !edge.target_stuff_digest) continue;
    if (
      !analysis.stuffRegistry[edge.source_stuff_digest] ||
      !analysis.stuffRegistry[edge.target_stuff_digest]
    )
      continue;
    const sourceId = stuffNodeId(edge.source_stuff_digest);
    const targetId = stuffNodeId(edge.target_stuff_digest);

    edges.push({
      id: edge.id,
      source: sourceId,
      target: targetId,
      type: "smoothstep",
      animated: false,
      style: {
        stroke: "var(--color-parallel-combine)",
        strokeWidth: 2,
        strokeDasharray: "5,5",
      },
      markerEnd: {
        type: ARROW_CLOSED_MARKER,
        color: "var(--color-parallel-combine)",
      },
    });
  }

  // Create BATCH_ITEM and BATCH_AGGREGATE edges (data-centric mode: stuff -> stuff)
  for (const edge of graphspec.edges) {
    if (edge.kind !== "batch_item" && edge.kind !== "batch_aggregate") continue;

    if (!edge.source_stuff_digest || !edge.target_stuff_digest) continue;
    if (
      !analysis.stuffRegistry[edge.source_stuff_digest] ||
      !analysis.stuffRegistry[edge.target_stuff_digest]
    )
      continue;
    const sourceId = stuffNodeId(edge.source_stuff_digest);
    const targetId = stuffNodeId(edge.target_stuff_digest);
    const isBatchItem = edge.kind === "batch_item";

    edges.push({
      id: edge.id,
      source: sourceId,
      target: targetId,
      type: edgeType,
      animated: false,
      _batchEdge: true,
      label: edge.label || "",
      labelStyle: {
        fontSize: "10px",
        fontFamily: "var(--font-mono)",
        fill: isBatchItem ? "var(--color-batch-item)" : "var(--color-batch-aggregate)",
      },
      labelBgStyle: { fill: "var(--color-bg)", fillOpacity: 0.9 },
      style: {
        stroke: isBatchItem ? "var(--color-batch-item)" : "var(--color-batch-aggregate)",
        strokeWidth: 2,
        strokeDasharray: "5,5",
      },
      markerEnd: {
        type: ARROW_CLOSED_MARKER,
        color: isBatchItem ? "var(--color-batch-item)" : "var(--color-batch-aggregate)",
      },
    });
  }

  // Mark edges that cross between different sibling controller groups
  const childToCtrl = buildChildToControllerMap(graphspec, analysis);
  // and assign per-class edge types for better routing
  for (const edge of edges) {
    const srcCtrl = childToCtrl[edge.source] || null;
    const tgtCtrl = childToCtrl[edge.target] || null;
    if (srcCtrl && tgtCtrl && srcCtrl !== tgtCtrl) {
      edge._crossGroup = true;
      // Keep bezier for long-distance cross-group edges (natural curves look better)
      // but visually de-emphasize to reduce spaghetti effect
      edge.style = {
        ...edge.style,
        strokeWidth: 1.5,
        opacity: 0.65,
      };
    }
  }

  // Batch edges: keep bezier but visually differentiate
  for (const edge of edges) {
    if (edge._batchEdge) {
      edge.style = {
        ...edge.style,
        opacity: 0.7,
      };
    }
  }

  return { nodes, edges };
}

/**
 * Build graph from GraphSpec using dataflow mode.
 * Returns the built graph data and analysis.
 */
export function buildGraph(
  graphspec: GraphSpec | null,
  edgeType: string,
): { graphData: GraphData; analysis: DataflowAnalysis | null } {
  if (graphspec) {
    const analysis = buildDataflowAnalysis(graphspec);
    if (
      analysis &&
      (Object.keys(analysis.stuffProducers).length > 0 ||
        Object.keys(analysis.stuffConsumers).length > 0)
    ) {
      return { graphData: buildDataflowGraph(graphspec, analysis, edgeType), analysis };
    }
  }
  return { graphData: { nodes: [], edges: [] }, analysis: null };
}
