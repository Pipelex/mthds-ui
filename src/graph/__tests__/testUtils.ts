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
  GraphDirection,
  DataflowAnalysis,
  PipeOperatorType,
  PipeStatus,
  GraphSpecNodeIo,
} from "../types";
import { NODE_TYPE_PIPE_CARD, NODE_TYPE_STUFF, stuffNodeId } from "../types";
import { buildGraph } from "../graphBuilders";
import { getLayoutedElements } from "../graphLayout";
import { applyControllers } from "../graphControllers";
import { toAppNodes, toAppEdges } from "@graph/react/rfTypes";

// ─── Relay simulation ───────────────────────────────────────────────────────

/**
 * Remove every `null`-valued object key, recursively, the way a host that drops nulls
 * relays JSON (ChatGPT does, on the way to an MCP App view). Array elements are kept:
 * only object values are known to be dropped.
 */
export function dropNullValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(dropNullValues);
  if (typeof value !== "object" || value === null) return value;
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== null) result[key] = dropNullValues(entry);
  }
  return result;
}

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

/** Stamp the fields a real pipelex spec always carries onto a factory spec. */
function finalizeSpec(nodes: GraphSpecNode[], edges: GraphSpecEdge[]): GraphSpec {
  for (const node of nodes) {
    node.description ??= `Test pipe ${node.pipe_code}`;
    node.domain_code ??= "test";
  }
  return { nodes, edges, meta: { format: "mthds" } };
}

/** Linear chain of N operators sharing stuff between them. */
export function makeMinimalSpec(nodeCount: number): GraphSpec {
  const nodes: GraphSpecNode[] = [];
  const edges: GraphSpecEdge[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const io: GraphSpecNodeIo = { inputs: [], outputs: [] };
    const node: GraphSpecNode = {
      kind: "operator",
      status: "scheduled",
      id: `op${i}`,
      pipe_code: `step_${i}`,
      pipe_type: "PipeFunc",
      io,
    };
    if (i > 0) {
      const digest = `d${i - 1}_${i}`;
      io.inputs = [{ digest, name: `data_${i - 1}`, concept: "Text" }];
    }
    if (i < nodeCount - 1) {
      const digest = `d${i}_${i + 1}`;
      io.outputs = [{ digest, name: `data_${i}`, concept: "Text" }];
    }
    nodes.push(node);
  }

  return finalizeSpec(nodes, edges);
}

/** Seq > Parallel(N branches) > Compose pattern. */
export function makeParallelSpec(branchCount: number): GraphSpec {
  const nodes: GraphSpecNode[] = [];
  const edges: GraphSpecEdge[] = [];

  // Root sequence
  nodes.push({
    pipe_code: "root_seq",
    kind: "controller",
    status: "succeeded",
    io: { inputs: [], outputs: [] },
    id: "root_seq",
    pipe_type: "PipeSequence",
  });
  // Parallel controller
  nodes.push({
    pipe_code: "par",
    kind: "controller",
    status: "succeeded",
    io: { inputs: [], outputs: [] },
    id: "par",
    pipe_type: "PipeParallel",
  });
  edges.push({ id: "e0", source: "root_seq", target: "par", kind: "contains" });

  // Source operator (produces input stuff)
  nodes.push({
    kind: "operator",
    status: "succeeded",
    id: "source",
    pipe_code: "extract",
    pipe_type: "PipeExtract",
    io: { inputs: [], outputs: [{ digest: "input_data", name: "input", concept: "Document" }] },
  });
  edges.push({ id: "e1", source: "root_seq", target: "source", kind: "contains" });

  // Branch operators inside parallel
  for (let i = 0; i < branchCount; i++) {
    nodes.push({
      kind: "operator",
      status: "succeeded",
      id: `branch_${i}`,
      pipe_code: `branch_${i}`,
      pipe_type: "PipeLLM",
      io: {
        inputs: [{ digest: "input_data", name: "input", concept: "Document" }],
        outputs: [{ digest: `branch_out_${i}`, name: `result_${i}`, concept: "Text" }],
      },
    });
    edges.push({ id: `e_branch_${i}`, source: "par", target: `branch_${i}`, kind: "contains" });
  }

  // Compose operator (consumes all branch outputs)
  const composeInputs = Array.from({ length: branchCount }, (_, i) => ({
    digest: `branch_out_${i}`,
    name: `result_${i}`,
    concept: "Text",
  }));
  nodes.push({
    kind: "operator",
    status: "succeeded",
    id: "compose",
    pipe_code: "compose",
    pipe_type: "PipeCompose",
    io: { outputs: [], inputs: composeInputs },
  });
  edges.push({ id: "e3", source: "root_seq", target: "compose", kind: "contains" });

  return finalizeSpec(nodes, edges);
}

/** Seq > Batch(N iterations) > Compose pattern. */
export function makeBatchSpec(iterationCount: number): GraphSpec {
  const nodes: GraphSpecNode[] = [];
  const edges: GraphSpecEdge[] = [];

  nodes.push({
    pipe_code: "root_seq",
    kind: "controller",
    status: "succeeded",
    io: { inputs: [], outputs: [] },
    id: "root_seq",
    pipe_type: "PipeSequence",
  });
  nodes.push({
    pipe_code: "batch",
    kind: "controller",
    status: "succeeded",
    io: { inputs: [], outputs: [] },
    id: "batch",
    pipe_type: "PipeBatch",
  });
  edges.push({ id: "e4", source: "root_seq", target: "batch", kind: "contains" });

  // Source
  nodes.push({
    kind: "operator",
    status: "succeeded",
    id: "source",
    pipe_code: "extract",
    pipe_type: "PipeExtract",
    io: { inputs: [], outputs: [{ digest: "input_data", name: "items", concept: "Document" }] },
  });
  edges.push({ id: "e5", source: "root_seq", target: "source", kind: "contains" });

  // Batch iterations
  for (let i = 0; i < iterationCount; i++) {
    nodes.push({
      kind: "operator",
      status: "succeeded",
      id: `iter_${i}`,
      pipe_code: `process_${i}`,
      pipe_type: "PipeLLM",
      io: {
        inputs: [{ digest: `item_${i}`, name: "item", concept: "Text" }],
        outputs: [{ digest: `result_${i}`, name: "result", concept: "Text" }],
      },
    });
    edges.push({ id: `e_iter_${i}`, source: "batch", target: `iter_${i}`, kind: "contains" });
    edges.push({
      id: `e_batch_item_${i}`,
      source: "batch",
      target: `iter_${i}`,
      kind: "batch_item",
      source_stuff_digest: "input_data",
      target_stuff_digest: `item_${i}`,
    });
    edges.push({
      id: `e_batch_agg_${i}`,
      source: `iter_${i}`,
      target: "batch",
      kind: "batch_aggregate",
      source_stuff_digest: `result_${i}`,
      target_stuff_digest: "agg_result",
    });
  }

  // Consume aggregate
  nodes.push({
    kind: "operator",
    status: "succeeded",
    id: "final",
    pipe_code: "compose",
    pipe_type: "PipeCompose",
    io: { outputs: [], inputs: [{ digest: "agg_result", name: "results", concept: "Text" }] },
  });
  edges.push({ id: "e9", source: "root_seq", target: "final", kind: "contains" });

  return finalizeSpec(nodes, edges);
}

/**
 * Seq > [binding, Batch > Compose] — the shape a run gives a sequence step
 * batching over a dotted path (`batch_over = "catalog.pages"`): a binding node
 * reading the root and binding the list under a private name, then the batch
 * over that name. Mirrors a real dry run of the corpus entry
 * `feature_binding_step_batch_over_catalog_pages`, node for node.
 */
export function makeBindingSpec(): GraphSpec {
  const nodes: GraphSpecNode[] = [
    {
      id: "seq",
      kind: "controller",
      status: "succeeded",
      pipe_code: "index_catalog",
      pipe_type: "PipeSequence",
      io: {
        inputs: [{ digest: "d_catalog", name: "catalog", concept: "Catalog" }],
        outputs: [{ digest: "d_lines", name: "index_lines", concept: "Text", multiplicity: true }],
      },
    },
    {
      id: "bind",
      kind: "binding",
      status: "succeeded",
      pipe_code: "catalog.pages",
      pipe_type: "BindingStep",
      description: "Binds 'catalog.pages' to '_bound_catalog_pages'",
      io: {
        inputs: [{ digest: "d_catalog", name: "catalog", concept: "Catalog" }],
        outputs: [
          {
            digest: "d_pages",
            name: "_bound_catalog_pages",
            concept: "CatalogPage",
            multiplicity: true,
          },
        ],
      },
      execution_data: { from: "catalog.pages", result: "_bound_catalog_pages" },
    },
    {
      id: "batch",
      kind: "controller",
      status: "succeeded",
      pipe_code: "write_index_line_batch",
      pipe_type: "PipeBatch",
      io: {
        inputs: [
          {
            digest: "d_pages",
            name: "_bound_catalog_pages",
            concept: "CatalogPage",
            multiplicity: true,
          },
        ],
        outputs: [{ digest: "d_lines", name: "index_lines", concept: "Text", multiplicity: true }],
      },
    },
    {
      id: "compose",
      kind: "operator",
      status: "succeeded",
      pipe_code: "write_index_line",
      pipe_type: "PipeCompose",
      io: {
        inputs: [{ digest: "d_page", name: "page", concept: "CatalogPage" }],
        outputs: [{ digest: "d_text", name: "text", concept: "Text" }],
      },
    },
  ];
  const edges: GraphSpecEdge[] = [
    { id: "e_seq_bind", source: "seq", target: "bind", kind: "contains" },
    { id: "e_seq_batch", source: "seq", target: "batch", kind: "contains" },
    { id: "e_batch_compose", source: "batch", target: "compose", kind: "contains" },
    { id: "e_data", source: "bind", target: "batch", kind: "data", label: "_bound_catalog_pages" },
    {
      id: "e_item",
      source: "batch",
      target: "compose",
      kind: "batch_item",
      source_stuff_digest: "d_pages",
      target_stuff_digest: "d_page",
      label: "[0]",
    },
    {
      id: "e_agg",
      source: "compose",
      target: "batch",
      kind: "batch_aggregate",
      source_stuff_digest: "d_text",
      target_stuff_digest: "d_lines",
      label: "[0]",
    },
  ];
  return finalizeSpec(nodes, edges);
}

/**
 * A sequence whose binding step closed with empty IO, the way pipelex closes
 * one whose root `catalog` was absent: skipped when the root's absence was
 * recorded (`trace_start` passes no input then, and `trace_end` no output for a
 * single result), failed when it was not (`trace_error` adds none either). With
 * `besideProducer`, an operator of the same sequence produces a stuff, so the
 * graph has data flow of its own; without it, the binding is all it holds.
 */
export function makeEmptyBindingSpec(
  status: "failed" | "skipped",
  { besideProducer = false }: { besideProducer?: boolean } = {},
): GraphSpec {
  const nodes: GraphSpecNode[] = [
    {
      id: "seq",
      kind: "controller",
      status: status === "failed" ? "failed" : "succeeded",
      pipe_code: "review_catalog",
      pipe_type: "PipeSequence",
      io: { inputs: [], outputs: [] },
    },
    {
      id: "bind",
      kind: "binding",
      status,
      pipe_code: "catalog.editor_note",
      pipe_type: "BindingStep",
      description: "Binds 'catalog.editor_note' to 'editor_note'",
      io: { inputs: [], outputs: [] },
      execution_data: { from: "catalog.editor_note", result: "editor_note" },
      ...(status === "failed"
        ? {
            error: {
              error_type: "PipeRunInputsError",
              message:
                "The binding step of pipe 'review_catalog' reads 'catalog', which is not in working memory and has no recorded absence.",
            },
          }
        : {}),
    },
  ];
  const edges: GraphSpecEdge[] = [
    { id: "e_seq_bind", source: "seq", target: "bind", kind: "contains" },
  ];
  if (besideProducer) {
    nodes.push({
      id: "title",
      kind: "operator",
      status: "succeeded",
      pipe_code: "write_title",
      pipe_type: "PipeLLM",
      io: {
        inputs: [{ digest: "d_brief", name: "brief", concept: "Text" }],
        outputs: [{ digest: "d_title", name: "title", concept: "Text" }],
      },
    });
    edges.unshift({ id: "e_seq_title", source: "seq", target: "title", kind: "contains" });
  }
  return finalizeSpec(nodes, edges);
}

/** N levels of nesting: Seq > Seq > ... > operator. */
export function makeNestedSpec(depth: number): GraphSpec {
  const nodes: GraphSpecNode[] = [];
  const edges: GraphSpecEdge[] = [];

  let parentId = "";
  for (let i = 0; i < depth; i++) {
    const id = `seq_${i}`;
    nodes.push({
      pipe_code: id,
      kind: "controller",
      status: "succeeded",
      io: { inputs: [], outputs: [] },
      id,
      pipe_type: "PipeSequence",
    });
    if (parentId) edges.push({ id: `e_nest_${i}`, source: parentId, target: id, kind: "contains" });
    parentId = id;
  }

  // Leaf operator
  nodes.push({
    kind: "operator",
    status: "succeeded",
    id: "leaf_op",
    pipe_code: "leaf",
    pipe_type: "PipeLLM",
    io: { inputs: [], outputs: [{ digest: "leaf_out", name: "output", concept: "Text" }] },
  });
  edges.push({ id: "e11", source: parentId, target: "leaf_op", kind: "contains" });

  return finalizeSpec(nodes, edges);
}

/** Push the two edges that hand a batch's item to one branch and collect its result. */
function batchItemEdges(
  edges: GraphSpecEdge[],
  batchId: string,
  branchId: string,
  digests: { list: string; item: string; result: string; results: string },
): void {
  edges.push(
    { id: `e_contains_${branchId}`, source: batchId, target: branchId, kind: "contains" },
    {
      id: `e_item_${branchId}`,
      source: batchId,
      target: branchId,
      kind: "batch_item",
      source_stuff_digest: digests.list,
      target_stuff_digest: digests.item,
    },
    {
      id: `e_agg_${branchId}`,
      source: branchId,
      target: batchId,
      kind: "batch_aggregate",
      source_stuff_digest: digests.result,
      target_stuff_digest: digests.results,
    },
  );
}

/**
 * A run of Batch(documents) > Seq(split, Batch(pages) > read, summarize), two
 * documents of two pages each: a batch inside a batch. Every run succeeded but
 * the operator named by `failedId`, if any (`read_2_2` is the second page of
 * the second document).
 */
export function makeNestedBatchSpec(failedId?: string): GraphSpec {
  const nodes: GraphSpecNode[] = [];
  const edges: GraphSpecEdge[] = [];
  const status = (id: string): PipeStatus => (id === failedId ? "failed" : "succeeded");
  nodes.push({
    id: "docs",
    kind: "controller",
    pipe_type: "PipeBatch",
    pipe_code: "each_document",
    status: "succeeded",
    io: {
      inputs: [{ digest: "documents", name: "documents", concept: "Document", multiplicity: true }],
      outputs: [{ digest: "summaries", name: "summaries", concept: "Text", multiplicity: true }],
    },
  });
  for (const d of [1, 2]) {
    nodes.push({
      id: `doc_${d}`,
      kind: "controller",
      pipe_type: "PipeSequence",
      pipe_code: "process_document",
      status: "succeeded",
      io: {
        inputs: [{ digest: `document_${d}`, name: "document", concept: "Document" }],
        outputs: [{ digest: `summary_${d}`, name: "summary", concept: "Text" }],
      },
    });
    batchItemEdges(edges, "docs", `doc_${d}`, {
      list: "documents",
      item: `document_${d}`,
      result: `summary_${d}`,
      results: "summaries",
    });
    nodes.push({
      id: `split_${d}`,
      kind: "operator",
      pipe_type: "PipeExtract",
      pipe_code: "split_pages",
      status: status(`split_${d}`),
      io: {
        inputs: [{ digest: `document_${d}`, name: "document", concept: "Document" }],
        outputs: [{ digest: `pages_${d}`, name: "pages", concept: "Page", multiplicity: true }],
      },
    });
    edges.push({ id: `e_split_${d}`, source: `doc_${d}`, target: `split_${d}`, kind: "contains" });
    nodes.push({
      id: `pages_${d}`,
      kind: "controller",
      pipe_type: "PipeBatch",
      pipe_code: "each_page",
      status: "succeeded",
      io: {
        inputs: [{ digest: `pages_${d}`, name: "pages", concept: "Page", multiplicity: true }],
        outputs: [{ digest: `notes_${d}`, name: "notes", concept: "Text", multiplicity: true }],
      },
    });
    edges.push({ id: `e_pages_${d}`, source: `doc_${d}`, target: `pages_${d}`, kind: "contains" });
    for (const p of [1, 2]) {
      const id = `read_${d}_${p}`;
      nodes.push({
        id,
        kind: "operator",
        pipe_type: "PipeLLM",
        pipe_code: "read_page",
        status: status(id),
        io: {
          inputs: [{ digest: `page_${d}_${p}`, name: "page", concept: "Page" }],
          outputs: [{ digest: `note_${d}_${p}`, name: "note", concept: "Text" }],
        },
      });
      batchItemEdges(edges, `pages_${d}`, id, {
        list: `pages_${d}`,
        item: `page_${d}_${p}`,
        result: `note_${d}_${p}`,
        results: `notes_${d}`,
      });
    }
    nodes.push({
      id: `summarize_${d}`,
      kind: "operator",
      pipe_type: "PipeLLM",
      pipe_code: "summarize",
      status: status(`summarize_${d}`),
      io: {
        inputs: [{ digest: `notes_${d}`, name: "notes", concept: "Text", multiplicity: true }],
        outputs: [{ digest: `summary_${d}`, name: "summary", concept: "Text" }],
      },
    });
    edges.push({
      id: `e_summarize_${d}`,
      source: `doc_${d}`,
      target: `summarize_${d}`,
      kind: "contains",
    });
  }
  return finalizeSpec(nodes, edges);
}

/**
 * A run of Batch(candidates) > Seq(assess, Condition(route) > the branch taken),
 * one item per outcome in `outcomes`, in order: `"matched"` takes the branch
 * `write_questions`, anything else `write_refusal`. A run's condition holds only
 * the branch its item took, so items with different outcomes hold different steps.
 */
export function makeBatchedConditionSpec(outcomes: readonly string[]): GraphSpec {
  const nodes: GraphSpecNode[] = [];
  const edges: GraphSpecEdge[] = [];
  nodes.push({
    id: "screen",
    kind: "controller",
    pipe_type: "PipeBatch",
    pipe_code: "screen_candidates",
    status: "succeeded",
    io: {
      inputs: [{ digest: "candidates", name: "candidates", concept: "Text", multiplicity: true }],
      outputs: [{ digest: "answers", name: "answers", concept: "Text", multiplicity: true }],
    },
  });
  outcomes.forEach((outcome, index) => {
    const i = index + 1;
    nodes.push({
      id: `candidate_${i}`,
      kind: "controller",
      pipe_type: "PipeSequence",
      pipe_code: "screen_candidate",
      status: "succeeded",
      io: {
        inputs: [{ digest: `candidate_${i}`, name: "candidate", concept: "Text" }],
        outputs: [{ digest: `answer_${i}`, name: "answer", concept: "Text" }],
      },
    });
    batchItemEdges(edges, "screen", `candidate_${i}`, {
      list: "candidates",
      item: `candidate_${i}`,
      result: `answer_${i}`,
      results: "answers",
    });
    nodes.push({
      id: `assess_${i}`,
      kind: "operator",
      pipe_type: "PipeLLM",
      pipe_code: "assess_match",
      status: "succeeded",
      io: {
        inputs: [{ digest: `candidate_${i}`, name: "candidate", concept: "Text" }],
        outputs: [{ digest: `match_${i}`, name: "match", concept: "Text" }],
      },
    });
    edges.push({
      id: `e_assess_${i}`,
      source: `candidate_${i}`,
      target: `assess_${i}`,
      kind: "contains",
    });
    nodes.push({
      id: `route_${i}`,
      kind: "controller",
      pipe_type: "PipeCondition",
      pipe_code: "route_by_match",
      status: "succeeded",
      io: {
        inputs: [{ digest: `match_${i}`, name: "match", concept: "Text" }],
        outputs: [{ digest: `answer_${i}`, name: "answer", concept: "Text" }],
      },
    });
    edges.push({
      id: `e_route_${i}`,
      source: `candidate_${i}`,
      target: `route_${i}`,
      kind: "contains",
    });
    const branch = outcome === "matched" ? "write_questions" : "write_refusal";
    nodes.push({
      id: `${branch}_${i}`,
      kind: "operator",
      pipe_type: "PipeLLM",
      pipe_code: branch,
      status: "succeeded",
      io: {
        inputs: [{ digest: `match_${i}`, name: "match", concept: "Text" }],
        outputs: [{ digest: `answer_${i}`, name: "answer", concept: "Text" }],
      },
    });
    edges.push({
      id: `e_branch_${i}`,
      source: `route_${i}`,
      target: `${branch}_${i}`,
      kind: "contains",
      label: outcome,
    });
  });
  return finalizeSpec(nodes, edges);
}

/** Malformed spec with circular containment: A contains B, B contains A. */
export function makeCycleSpec(): GraphSpec {
  const nodes: GraphSpecNode[] = [
    {
      pipe_code: "A",
      kind: "controller",
      status: "succeeded",
      io: { inputs: [], outputs: [] },
      id: "A",
      pipe_type: "PipeSequence",
    },
    {
      pipe_code: "B",
      kind: "controller",
      status: "succeeded",
      io: { inputs: [], outputs: [] },
      id: "B",
      pipe_type: "PipeSequence",
    },
    {
      kind: "operator",
      status: "succeeded",
      id: "op1",
      pipe_code: "op1",
      pipe_type: "PipeFunc",
      io: { inputs: [], outputs: [{ digest: "d1", name: "out", concept: "Text" }] },
    },
  ];
  const edges: GraphSpecEdge[] = [
    { id: "e12", source: "A", target: "B", kind: "contains" },
    { id: "e13", source: "B", target: "A", kind: "contains" },
    { id: "e14", source: "A", target: "op1", kind: "contains" },
  ];
  return finalizeSpec(nodes, edges);
}

// ─── Full pipeline runner ───────────────────────────────────────────────────

export interface PipelineOptions {
  direction?: GraphDirection;
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
  withControllers: { nodes: GraphNode[]; edges: GraphEdge[] };
  appNodes: ReturnType<typeof toAppNodes>;
  appEdges: ReturnType<typeof toAppEdges>;
}

/**
 * Run the full graph pipeline (same sequence as GraphViewer minus React).
 * GraphSpec → buildGraph → getLayoutedElements → applyControllers → toAppNodes/toAppEdges
 */
export async function runFullPipeline(
  graphspec: GraphSpec | null,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
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
  const layouted = await getLayoutedElements(
    graphData.nodes,
    graphData.edges,
    direction,
    layoutConfig,
    graphspec,
    analysis,
  );

  const withControllers = applyControllers(
    layouted.nodes,
    layouted.edges,
    graphspec,
    analysis,
    showControllers,
    expandedControllers,
    undefined, // onToggleCollapse
    layouted.controllerPositions,
  );

  const appNodes = toAppNodes(withControllers.nodes);
  const appEdges = toAppEdges(withControllers.edges);

  return { analysis, graphData, layouted, withControllers, appNodes, appEdges };
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
export async function assertDeterministic(
  graphspec: GraphSpec,
  runs: number = 5,
  options: PipelineOptions = {},
): Promise<void> {
  const results = await Promise.all(
    Array.from({ length: runs }, () => runFullPipeline(graphspec, options)),
  );
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
