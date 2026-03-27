import type { GraphSpec, GraphSpecNode, GraphSpecEdge } from "../../../types";

const UUID = "extreme-test";

/**
 * Generate a wide-parallel pipeline: Seq > Extract > Parallel(N branches) > Compose
 * Each branch is a PipeLLM with its own input/output.
 */
export function makeWideParallel(branchCount: number): GraphSpec {
  const nodes: GraphSpecNode[] = [];
  const edges: GraphSpecEdge[] = [];
  let nodeIdx = 0;
  let edgeIdx = 0;

  const n = (i: number) => `${UUID}:node_${i}`;
  const e = (i: number) => `${UUID}:edge_${i}`;

  // Root sequence
  const rootId = n(nodeIdx++);
  nodes.push({
    id: rootId,
    pipe_code: "document_analysis_pipeline",
    pipe_type: "PipeSequence",
    status: "succeeded",
    io: {
      inputs: [{ name: "document", digest: "doc_in", concept: "Document" }],
      outputs: [{ name: "report", digest: "report_out", concept: "Report" }],
    },
  });

  // Extract
  const extractId = n(nodeIdx++);
  nodes.push({
    id: extractId,
    pipe_code: "extract_document",
    pipe_type: "PipeExtract",
    status: "succeeded",
    io: {
      inputs: [{ name: "document", digest: "doc_in", concept: "Document" }],
      outputs: [{ name: "pages", digest: "pages_d", concept: "Page" }],
    },
  });
  edges.push({ source: rootId, target: extractId, kind: "contains", id: e(edgeIdx++) });

  // Parallel controller
  const parallelId = n(nodeIdx++);
  const branchOutputDigests: string[] = [];
  const branchInputs: { name: string; digest: string; concept: string }[] = [];

  for (let i = 0; i < branchCount; i++) {
    branchOutputDigests.push(`branch_out_${i}`);
    branchInputs.push({ name: `analysis_${i}`, digest: `branch_out_${i}`, concept: "Analysis" });
  }

  nodes.push({
    id: parallelId,
    pipe_code: "parallel_analyze",
    pipe_type: "PipeParallel",
    status: "succeeded",
    io: {
      inputs: [{ name: "pages", digest: "pages_d", concept: "Page" }],
      outputs: branchInputs.slice(0, 5).map((b) => ({
        name: b.name,
        digest: b.digest,
        concept: b.concept,
      })),
    },
  });
  edges.push({ source: rootId, target: parallelId, kind: "contains", id: e(edgeIdx++) });

  // Branch pipes inside parallel
  const pipeTypes = ["PipeLLM", "PipeFunc", "PipeSearch", "PipeLLM", "PipeCompose", "PipeImgGen"];
  const taskNames = [
    "sentiment_analysis",
    "keyword_extraction",
    "entity_recognition",
    "topic_modeling",
    "summarize_section",
    "classify_content",
    "extract_figures",
    "detect_language",
    "check_grammar",
    "find_references",
    "extract_dates",
    "identify_authors",
    "detect_tables",
    "parse_equations",
    "extract_citations",
    "analyze_structure",
    "check_consistency",
    "find_definitions",
    "extract_acronyms",
    "detect_duplicates",
  ];

  for (let i = 0; i < branchCount; i++) {
    const branchId = n(nodeIdx++);
    const taskName = taskNames[i % taskNames.length] + (i >= taskNames.length ? `_${i}` : "");
    const pipeType = pipeTypes[i % pipeTypes.length];

    nodes.push({
      id: branchId,
      pipe_code: taskName,
      pipe_type: pipeType,
      status: "succeeded",
      io: {
        inputs: [{ name: "pages", digest: "pages_d", concept: "Page" }],
        outputs: [{ name: `analysis_${i}`, digest: `branch_out_${i}`, concept: "Analysis" }],
      },
    });
    edges.push({ source: parallelId, target: branchId, kind: "contains", id: e(edgeIdx++) });
  }

  // Compose at the end
  const composeId = n(nodeIdx++);
  nodes.push({
    id: composeId,
    pipe_code: "compose_report",
    pipe_type: "PipeCompose",
    status: "succeeded",
    io: {
      inputs: branchInputs.slice(0, 5).map((b) => ({
        name: b.name,
        digest: b.digest,
        concept: b.concept,
      })),
      outputs: [{ name: "report", digest: "report_out", concept: "Report" }],
    },
  });
  edges.push({ source: rootId, target: composeId, kind: "contains", id: e(edgeIdx++) });

  return { nodes, edges };
}

/**
 * Generate a wide-batch pipeline: Seq > Extract > Batch(N iterations) > Compose
 * Each batch iteration is a PipeLLM with branch-N digest suffixes.
 */
export function makeWideBatch(iterationCount: number): GraphSpec {
  const nodes: GraphSpecNode[] = [];
  const edges: GraphSpecEdge[] = [];
  let nodeIdx = 0;
  let edgeIdx = 0;

  const n = (i: number) => `${UUID}:node_${i}`;
  const e = (i: number) => `${UUID}:edge_${i}`;

  // Root sequence
  const rootId = n(nodeIdx++);
  nodes.push({
    id: rootId,
    pipe_code: "batch_processing_pipeline",
    pipe_type: "PipeSequence",
    status: "succeeded",
    io: {
      inputs: [{ name: "document", digest: "doc_in", concept: "Document" }],
      outputs: [{ name: "summary", digest: "summary_out", concept: "Summary" }],
    },
  });

  // Extract
  const extractId = n(nodeIdx++);
  nodes.push({
    id: extractId,
    pipe_code: "extract_pages",
    pipe_type: "PipeExtract",
    status: "succeeded",
    io: {
      inputs: [{ name: "document", digest: "doc_in", concept: "Document" }],
      outputs: [{ name: "pages", digest: "pages_d", concept: "Page" }],
    },
  });
  edges.push({ source: rootId, target: extractId, kind: "contains", id: e(edgeIdx++) });

  // Batch controller
  const batchId = n(nodeIdx++);
  nodes.push({
    id: batchId,
    pipe_code: "process_each_page",
    pipe_type: "PipeBatch",
    status: "succeeded",
    io: {
      inputs: [{ name: "pages", digest: "pages_d", concept: "Page" }],
      outputs: [{ name: "page_results", digest: "results_d", concept: "PageResult" }],
    },
  });
  edges.push({ source: rootId, target: batchId, kind: "contains", id: e(edgeIdx++) });

  // Batch iterations
  for (let i = 0; i < iterationCount; i++) {
    const iterationId = n(nodeIdx++);
    nodes.push({
      id: iterationId,
      pipe_code: "analyze_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [{ name: "page", digest: `pages_d-branch-${i}`, concept: "Page" }],
        outputs: [{ name: "page_result", digest: `result_d-branch-${i}`, concept: "PageResult" }],
      },
    });
    edges.push({ source: batchId, target: iterationId, kind: "contains", id: e(edgeIdx++) });

    // batch_item edge: parent stuff → branch stuff
    edges.push({
      source: batchId,
      target: iterationId,
      kind: "batch_item",
      id: e(edgeIdx++),
      source_stuff_digest: "pages_d",
      target_stuff_digest: `pages_d-branch-${i}`,
    });

    // batch_aggregate edge: branch output → parent output
    edges.push({
      source: iterationId,
      target: batchId,
      kind: "batch_aggregate",
      id: e(edgeIdx++),
      source_stuff_digest: `result_d-branch-${i}`,
      target_stuff_digest: "results_d",
    });
  }

  // Compose at the end
  const composeId = n(nodeIdx++);
  nodes.push({
    id: composeId,
    pipe_code: "compose_summary",
    pipe_type: "PipeCompose",
    status: "succeeded",
    io: {
      inputs: [{ name: "page_results", digest: "results_d", concept: "PageResult" }],
      outputs: [{ name: "summary", digest: "summary_out", concept: "Summary" }],
    },
  });
  edges.push({ source: rootId, target: composeId, kind: "contains", id: e(edgeIdx++) });

  return { nodes, edges };
}
