/**
 * Shared test utilities: factories, pipeline runner, assertion helpers.
 */
import type {
  GraphSpec,
  GraphSpecNode,
  GraphSpecEdge,
  GraphNode,
  GraphEdge,
  GraphNodeData,
  DataflowAnalysis,
  PipeOperatorType,
  PipeStatus,
} from "../types";
import { NODE_TYPE_PIPE_CARD, NODE_TYPE_STUFF, stuffNodeId } from "../types";
import { buildGraph } from "../graphBuilders";
import { getLayoutedElements, ensureControllerSpacing } from "../graphLayout";
import { applyControllers } from "../graphControllers";
import { toAppNodes, toAppEdges } from "@graph/react/rfTypes";

// ─── Node / Edge factories ──────────────────────────────────────────────────

export function makeGraphNode(id: string, overrides?: Partial<GraphNode>): GraphNode {
  return {
    id,
    type: "default",
    data: {
      isPipe: false,
      isStuff: false,
      labelText: id,
    } as GraphNodeData,
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

export function makeStuffNode(digest: string, name?: string, concept?: string): GraphNode {
  return makeGraphNode(stuffNodeId(digest), {
    type: NODE_TYPE_STUFF,
    data: {
      isPipe: false,
      isStuff: true,
      labelText: name || "data",
      labelDescriptor: { kind: "stuff", label: name || "data", concept: concept || "" },
    } as GraphNodeData,
    style: { width: 140, height: 60 },
  });
}

export function makePipeCardNode(
  id: string,
  pipeType: PipeOperatorType = "PipeFunc",
  inputs: { name: string; concept: string }[] = [],
  outputs: { name: string; concept: string }[] = [],
): GraphNode {
  return makeGraphNode(id, {
    type: NODE_TYPE_PIPE_CARD,
    data: {
      isPipe: true,
      isStuff: false,
      labelText: id,
      pipeCode: id,
      pipeType,
      pipeCardData: {
        pipeCode: id,
        pipeType,
        description: `Test pipe ${id}`,
        status: "scheduled" as PipeStatus,
        inputs,
        outputs,
      },
      labelDescriptor: { kind: "pipe", label: id, isFailed: false },
    } as GraphNodeData,
    style: { width: 200, height: 120 },
  });
}

export function makeGraphEdge(
  id: string,
  source: string,
  target: string,
  overrides?: Partial<GraphEdge>,
): GraphEdge {
  return {
    id,
    source,
    target,
    type: "bezier",
    ...overrides,
  };
}

// ─── GraphSpec factories ────────────────────────────────────────────────────

/** Linear chain of N operators sharing stuff between them. */
export function makeMinimalSpec(nodeCount: number): GraphSpec {
  const nodes: GraphSpecNode[] = [];
  const edges: GraphSpecEdge[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const node: GraphSpecNode = {
      id: `op${i}`,
      pipe_code: `step_${i}`,
      pipe_type: "PipeFunc",
      io: { inputs: [], outputs: [] },
    };
    if (i > 0) {
      const digest = `d${i - 1}_${i}`;
      node.io!.inputs = [{ digest, name: `data_${i - 1}`, concept: "Text" }];
    }
    if (i < nodeCount - 1) {
      const digest = `d${i}_${i + 1}`;
      node.io!.outputs = [{ digest, name: `data_${i}`, concept: "Text" }];
    }
    nodes.push(node);
  }

  return { nodes, edges };
}

/** Seq > Parallel(N branches) > Compose pattern. */
export function makeParallelSpec(branchCount: number): GraphSpec {
  const nodes: GraphSpecNode[] = [];
  const edges: GraphSpecEdge[] = [];

  // Root sequence
  nodes.push({ id: "root_seq", pipe_type: "PipeSequence" });
  // Parallel controller
  nodes.push({ id: "par", pipe_type: "PipeParallel" });
  edges.push({ source: "root_seq", target: "par", kind: "contains" });

  // Source operator (produces input stuff)
  nodes.push({
    id: "source",
    pipe_code: "extract",
    pipe_type: "PipeExtract",
    io: { outputs: [{ digest: "input_data", name: "input", concept: "Document" }] },
  });
  edges.push({ source: "root_seq", target: "source", kind: "contains" });

  // Branch operators inside parallel
  for (let i = 0; i < branchCount; i++) {
    nodes.push({
      id: `branch_${i}`,
      pipe_code: `branch_${i}`,
      pipe_type: "PipeLLM",
      io: {
        inputs: [{ digest: "input_data", name: "input", concept: "Document" }],
        outputs: [{ digest: `branch_out_${i}`, name: `result_${i}`, concept: "Text" }],
      },
    });
    edges.push({ source: "par", target: `branch_${i}`, kind: "contains" });
  }

  // Compose operator (consumes all branch outputs)
  const composeInputs = Array.from({ length: branchCount }, (_, i) => ({
    digest: `branch_out_${i}`,
    name: `result_${i}`,
    concept: "Text",
  }));
  nodes.push({
    id: "compose",
    pipe_code: "compose",
    pipe_type: "PipeCompose",
    io: { inputs: composeInputs },
  });
  edges.push({ source: "root_seq", target: "compose", kind: "contains" });

  return { nodes, edges };
}

/** Seq > Batch(N iterations) > Compose pattern. */
export function makeBatchSpec(iterationCount: number): GraphSpec {
  const nodes: GraphSpecNode[] = [];
  const edges: GraphSpecEdge[] = [];

  nodes.push({ id: "root_seq", pipe_type: "PipeSequence" });
  nodes.push({ id: "batch", pipe_type: "PipeBatch" });
  edges.push({ source: "root_seq", target: "batch", kind: "contains" });

  // Source
  nodes.push({
    id: "source",
    pipe_code: "extract",
    pipe_type: "PipeExtract",
    io: { outputs: [{ digest: "input_data", name: "items", concept: "Document" }] },
  });
  edges.push({ source: "root_seq", target: "source", kind: "contains" });

  // Batch iterations
  for (let i = 0; i < iterationCount; i++) {
    nodes.push({
      id: `iter_${i}`,
      pipe_code: `process_${i}`,
      pipe_type: "PipeLLM",
      io: {
        inputs: [{ digest: `item_${i}`, name: "item", concept: "Text" }],
        outputs: [{ digest: `result_${i}`, name: "result", concept: "Text" }],
      },
    });
    edges.push({ source: "batch", target: `iter_${i}`, kind: "contains" });
    edges.push({
      source: "batch",
      target: `iter_${i}`,
      kind: "batch_item",
      source_stuff_digest: "input_data",
      target_stuff_digest: `item_${i}`,
    });
    edges.push({
      source: `iter_${i}`,
      target: "batch",
      kind: "batch_aggregate",
      source_stuff_digest: `result_${i}`,
      target_stuff_digest: "agg_result",
    });
  }

  // Consume aggregate
  nodes.push({
    id: "final",
    pipe_code: "compose",
    pipe_type: "PipeCompose",
    io: { inputs: [{ digest: "agg_result", name: "results", concept: "Text" }] },
  });
  edges.push({ source: "root_seq", target: "final", kind: "contains" });

  return { nodes, edges };
}

/** N levels of nesting: Seq > Seq > ... > operator. */
export function makeNestedSpec(depth: number): GraphSpec {
  const nodes: GraphSpecNode[] = [];
  const edges: GraphSpecEdge[] = [];

  let parentId = "";
  for (let i = 0; i < depth; i++) {
    const id = `seq_${i}`;
    nodes.push({ id, pipe_type: "PipeSequence" });
    if (parentId) edges.push({ source: parentId, target: id, kind: "contains" });
    parentId = id;
  }

  // Leaf operator
  nodes.push({
    id: "leaf_op",
    pipe_code: "leaf",
    pipe_type: "PipeLLM",
    io: {
      outputs: [{ digest: "leaf_out", name: "output", concept: "Text" }],
    },
  });
  edges.push({ source: parentId, target: "leaf_op", kind: "contains" });

  return { nodes, edges };
}

/** Malformed spec with circular containment: A contains B, B contains A. */
export function makeCycleSpec(): GraphSpec {
  return {
    nodes: [
      { id: "A", pipe_type: "PipeSequence" },
      { id: "B", pipe_type: "PipeSequence" },
      {
        id: "op1",
        pipe_code: "op1",
        pipe_type: "PipeFunc",
        io: { outputs: [{ digest: "d1", name: "out", concept: "Text" }] },
      },
    ],
    edges: [
      { source: "A", target: "B", kind: "contains" },
      { source: "B", target: "A", kind: "contains" },
      { source: "A", target: "op1", kind: "contains" },
    ],
  };
}

// ─── Full pipeline runner ───────────────────────────────────────────────────

export interface PipelineOptions {
  direction?: "LR" | "TB";
  showControllers?: boolean;
  expandedControllers?: ReadonlySet<string>;
  edgeType?: string;
  nodesep?: number;
  ranksep?: number;
}

export interface PipelineResult {
  analysis: DataflowAnalysis | null;
  graphData: { nodes: GraphNode[]; edges: GraphEdge[] };
  layouted: { nodes: GraphNode[]; edges: GraphEdge[] };
  spaced: GraphNode[];
  withControllers: { nodes: GraphNode[]; edges: GraphEdge[] };
  appNodes: ReturnType<typeof toAppNodes>;
  appEdges: ReturnType<typeof toAppEdges>;
}

/**
 * Run the full graph pipeline (same sequence as GraphViewer minus React).
 * GraphSpec → buildGraph → getLayoutedElements → ensureControllerSpacing → applyControllers → toAppNodes/toAppEdges
 */
export function runFullPipeline(
  graphspec: GraphSpec | null,
  options: PipelineOptions = {},
): PipelineResult {
  const {
    direction = "LR",
    showControllers = true,
    expandedControllers,
    edgeType = "bezier",
    nodesep,
    ranksep,
  } = options;

  const { graphData, analysis } = buildGraph(graphspec, edgeType);

  const layoutConfig = nodesep != null || ranksep != null ? { nodesep, ranksep } : undefined;
  const layouted = getLayoutedElements(graphData.nodes, graphData.edges, direction, layoutConfig);

  const spaced = ensureControllerSpacing(layouted.nodes, graphspec, analysis, direction);

  const withControllers = applyControllers(
    spaced,
    layouted.edges,
    graphspec,
    analysis,
    showControllers,
    expandedControllers,
  );

  const appNodes = toAppNodes(withControllers.nodes);
  const appEdges = toAppEdges(withControllers.edges);

  return { analysis, graphData, layouted, spaced, withControllers, appNodes, appEdges };
}

// ─── Assertion helpers ──────────────────────────────────────────────────────

/** Assert that parent group nodes appear before their children in the array. */
export function assertParentBeforeChildren(nodes: { id: string; parentId?: string }[]): void {
  const seenIds = new Set<string>();
  for (const node of nodes) {
    if (node.parentId && !seenIds.has(node.parentId)) {
      throw new Error(
        `Node "${node.id}" appears before its parent "${node.parentId}" in the array`,
      );
    }
    seenIds.add(node.id);
  }
}

/** Assert that every edge source and target has a corresponding node. */
export function assertAllEdgesResolvable(
  nodes: { id: string }[],
  edges: { id: string; source: string; target: string }[],
): void {
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      throw new Error(`Edge "${edge.id}" source "${edge.source}" has no corresponding node`);
    }
    if (!nodeIds.has(edge.target)) {
      throw new Error(`Edge "${edge.id}" target "${edge.target}" has no corresponding node`);
    }
  }
}

/** Assert no NaN values in positions. */
export function assertNoNaNPositions(
  nodes: { id: string; position: { x: number; y: number } }[],
): void {
  for (const node of nodes) {
    if (isNaN(node.position.x) || isNaN(node.position.y)) {
      throw new Error(
        `Node "${node.id}" has NaN position: (${node.position.x}, ${node.position.y})`,
      );
    }
  }
}

/** Assert no duplicate node IDs. */
export function assertNoDuplicateIds(nodes: { id: string }[]): void {
  const seen = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.id)) {
      throw new Error(`Duplicate node ID: "${node.id}"`);
    }
    seen.add(node.id);
  }
}

/** Run the pipeline N times and assert identical structural output. */
export function assertDeterministic(
  graphspec: GraphSpec,
  runs: number = 5,
  options: PipelineOptions = {},
): void {
  const results = Array.from({ length: runs }, () => runFullPipeline(graphspec, options));
  const fingerprints = results.map((r) => ({
    nodeIds: r.appNodes.map((n) => n.id).sort(),
    edgeIds: r.appEdges.map((e) => e.id).sort(),
    nodeTypes: r.appNodes.map((n) => `${n.id}:${n.type}`).sort(),
    parentIds: r.appNodes.map((n) => `${n.id}:${n.parentId || ""}`).sort(),
  }));

  for (let i = 1; i < fingerprints.length; i++) {
    if (JSON.stringify(fingerprints[i]) !== JSON.stringify(fingerprints[0])) {
      throw new Error(
        `Non-deterministic output on run ${i + 1}/${runs}: structural fingerprint differs`,
      );
    }
  }
}
