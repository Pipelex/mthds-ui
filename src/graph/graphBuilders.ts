import type {
  GraphSpec,
  DataflowAnalysis,
  GraphNode,
  GraphEdge,
  GraphData,
  PipeOperatorType,
} from "./types";
import { ARROW_CLOSED_MARKER, NODE_TYPE_PIPE_CARD, NODE_TYPE_STUFF, stuffNodeId } from "./types";
import { buildDataflowAnalysis, buildChildToControllerMap } from "./graphAnalysis";

/** Fallback description when the GraphSpec node doesn't carry one. */
function defaultDescription(pipeType?: string, pipeCode?: string): string {
  const code = pipeCode || "this step";
  const verb: Record<string, string> = {
    PipeLLM: "Analyze and generate output using",
    PipeExtract: "Extract content from",
    PipeCompose: "Compose output using",
    PipeImgGen: "Generate image for",
    PipeSearch: "Search the web for",
    PipeFunc: "Process data in",
  };
  return `${verb[pipeType || ""] || "Execute"} ${code.replace(/_/g, " ")}`;
}

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

    const isFailed = node.status === "failed";
    const label = node.pipe_code || node.id.split(":").pop() || node.id;
    const inputs = (node.io?.inputs ?? []).map((i) => ({
      name: i.name ?? "",
      concept: i.concept ?? "",
    }));
    const outputs = (node.io?.outputs ?? []).map((o) => ({
      name: o.name ?? "",
      concept: o.concept ?? "",
    }));

    // Participating pipes are operators (controllers don't produce/consume stuff directly)
    const operatorType: PipeOperatorType = (node.pipe_type as PipeOperatorType) || "PipeFunc";

    nodes.push({
      id: node.id,
      type: NODE_TYPE_PIPE_CARD,
      data: {
        labelDescriptor: { kind: "pipe", label, isFailed },
        nodeData: node,
        isPipe: true,
        isStuff: false,
        labelText: label,
        pipeCode: node.pipe_code || label,
        pipeType: node.pipe_type,
        pipeCardData: {
          pipeCode: node.pipe_code || label,
          pipeType: operatorType,
          description: node.description || defaultDescription(node.pipe_type, node.pipe_code),
          status: node.status || "scheduled",
          inputs,
          outputs,
        },
      },
      position: { x: 0, y: 0 },
    });
  }

  // Create stuff (data) nodes
  for (const [digest, stuffInfo] of Object.entries(analysis.stuffRegistry)) {
    const stuffId = stuffNodeId(digest);
    const label = stuffInfo.name || "data";
    const concept = stuffInfo.concept || "";
    const textWidth =
      Math.max(label.length, concept.length) * STUFF_CHAR_WIDTH_PX + STUFF_LABEL_PADDING;
    const stuffWidth = Math.max(MIN_STUFF_WIDTH, textWidth);

    nodes.push({
      id: stuffId,
      type: NODE_TYPE_STUFF,
      data: {
        labelDescriptor: { kind: "stuff", label, concept },
        isStuff: true,
        isPipe: false,
        labelText: label,
      },
      position: { x: 0, y: 0 },
      style: {
        background: "var(--color-stuff-bg)",
        border: "2px solid var(--color-stuff-border)",
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
      id: edge.id || "edge_" + edgeId++,
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
      id: edge.id || "edge_" + edgeId++,
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

  // Sort nodes by controller group so dagre's initial ordering clusters
  // same-group nodes together
  const childToCtrl = buildChildToControllerMap(graphspec, analysis);

  // For unassigned stuff (method inputs with no producer), assign to
  // the controller of their first consumer so inputs cluster near their group
  for (const [digest, consumers] of Object.entries(analysis.stuffConsumers)) {
    const stuffId = stuffNodeId(digest);
    if (childToCtrl[stuffId]) continue;
    for (const consumerId of consumers) {
      if (childToCtrl[consumerId]) {
        childToCtrl[stuffId] = childToCtrl[consumerId];
        break;
      }
    }
  }

  // Depth-first order index for controllers
  const groupOrder: Record<string, number> = {};
  let orderIdx = 0;
  const visiting = new Set<string>();
  function assignOrder(ctrlId: string) {
    if (visiting.has(ctrlId)) {
      throw new Error(
        `Cycle detected in containment tree: controller "${ctrlId}" appears in its own subtree`,
      );
    }
    visiting.add(ctrlId);
    groupOrder[ctrlId] = orderIdx++;
    for (const childId of analysis.containmentTree[ctrlId] || []) {
      if (analysis.controllerNodeIds.has(childId)) {
        assignOrder(childId);
      }
    }
    visiting.delete(ctrlId);
  }
  for (const ctrlId of analysis.controllerNodeIds) {
    if (!childToCtrl[ctrlId]) assignOrder(ctrlId);
  }

  // Build sort key from containment path
  function sortKey(nodeId: string): number[] {
    const path: number[] = [];
    const seen = new Set<string>();
    let cur = childToCtrl[nodeId];
    while (cur) {
      if (seen.has(cur)) {
        throw new Error(
          `Cycle detected in controller hierarchy while computing sort key for "${nodeId}"`,
        );
      }
      seen.add(cur);
      path.unshift(groupOrder[cur] !== undefined ? groupOrder[cur] : 9999);
      cur = childToCtrl[cur];
    }
    while (path.length < 10) path.push(0);
    return path;
  }

  nodes.sort((a, b) => {
    const ka = sortKey(a.id);
    const kb = sortKey(b.id);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return ka[i] - kb[i];
    }
    return 0;
  });

  // Mark edges that cross between different sibling controller groups
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
