import type { GraphSpec } from "../../../types";

/** Single Pipe (1 LLM) — 1 nodes, 0 edges */
export const SINGLE_PIPE: GraphSpec = {
  nodes: [
    { id: "ac1503f1-0526-4024-b322-a68607f67287:node_0", pipe_code: "summarize", pipe_type: "PipeLLM", status: "succeeded" },
  ],
  edges: [
  ],
};

/** Two-Pipe Chain (Extract + LLM) — 3 nodes, 3 edges */
export const TWO_PIPE_CHAIN: GraphSpec = {
  nodes: [
    { id: "728cd073-678c-4553-ab00-5c50641e964d:node_0", pipe_code: "extract_and_analyze", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "728cd073-678c-4553-ab00-5c50641e964d:node_1", pipe_code: "extract_document", pipe_type: "PipeExtract", status: "succeeded" },
    { id: "728cd073-678c-4553-ab00-5c50641e964d:node_2", pipe_code: "analyze_pages", pipe_type: "PipeLLM", status: "succeeded" },
  ],
  edges: [
    { source: "728cd073-678c-4553-ab00-5c50641e964d:node_0", target: "728cd073-678c-4553-ab00-5c50641e964d:node_1", kind: "contains" },
    { source: "728cd073-678c-4553-ab00-5c50641e964d:node_0", target: "728cd073-678c-4553-ab00-5c50641e964d:node_2", kind: "contains" },
    { source: "728cd073-678c-4553-ab00-5c50641e964d:node_1", target: "728cd073-678c-4553-ab00-5c50641e964d:node_2", kind: "data", label: "pages" },
  ],
};

/** Simple Sequence (3 pipes) — 4 nodes, 5 edges */
export const SIMPLE_SEQUENCE: GraphSpec = {
  nodes: [
    { id: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_0", pipe_code: "extract_analyze_report", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_1", pipe_code: "extract_pages", pipe_type: "PipeExtract", status: "succeeded" },
    { id: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_2", pipe_code: "analyze_content", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_3", pipe_code: "compose_report", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_0", target: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_1", kind: "contains" },
    { source: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_0", target: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_2", kind: "contains" },
    { source: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_0", target: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_3", kind: "contains" },
    { source: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_1", target: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_2", kind: "data", label: "pages" },
    { source: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_2", target: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_3", kind: "data", label: "analysis" },
  ],
};

/** Long Sequence (6 pipes) — 7 nodes, 11 edges */
export const LONG_SEQUENCE: GraphSpec = {
  nodes: [
    { id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0", pipe_code: "ingest_pipeline", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_1", pipe_code: "extract_raw", pipe_type: "PipeExtract", status: "succeeded" },
    { id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_2", pipe_code: "clean_text", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_3", pipe_code: "chunk_text", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_4", pipe_code: "embed_chunks", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_5", pipe_code: "build_index", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_6", pipe_code: "validate_index", pipe_type: "PipeLLM", status: "succeeded" },
  ],
  edges: [
    { source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0", target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_1", kind: "contains" },
    { source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0", target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_2", kind: "contains" },
    { source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0", target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_3", kind: "contains" },
    { source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0", target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_4", kind: "contains" },
    { source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0", target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_5", kind: "contains" },
    { source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0", target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_6", kind: "contains" },
    { source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_1", target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_2", kind: "data", label: "pages" },
    { source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_2", target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_3", kind: "data", label: "clean_text" },
    { source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_3", target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_4", kind: "data", label: "chunks" },
    { source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_4", target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_5", kind: "data", label: "embeddings" },
    { source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_5", target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_6", kind: "data", label: "index" },
  ],
};

/** Simple Parallel (2 branches) — 5 nodes, 6 edges */
export const SIMPLE_PARALLEL: GraphSpec = {
  nodes: [
    { id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_0", pipe_code: "dual_analysis_pipeline", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1", pipe_code: "parallel_analyze", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_2", pipe_code: "analyze_sentiment", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_3", pipe_code: "extract_keywords", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_4", pipe_code: "merge_results", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_0", target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1", kind: "contains" },
    { source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1", target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_2", kind: "contains" },
    { source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1", target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_3", kind: "contains" },
    { source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_0", target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_4", kind: "contains" },
    { source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1", target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_4", kind: "data", label: "sentiment" },
    { source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1", target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_4", kind: "data", label: "keywords" },
  ],
};

/** Three-Way Parallel — 7 nodes, 13 edges */
export const THREE_WAY_PARALLEL: GraphSpec = {
  nodes: [
    { id: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_0", pipe_code: "multi_format_report", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_1", pipe_code: "analyze_data", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_2", pipe_code: "generate_outputs", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_3", pipe_code: "generate_chart", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_4", pipe_code: "generate_table", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_5", pipe_code: "write_narrative", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_6", pipe_code: "assemble_report", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_0", target: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_1", kind: "contains" },
    { source: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_0", target: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_2", kind: "contains" },
    { source: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_2", target: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_3", kind: "contains" },
    { source: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_2", target: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_4", kind: "contains" },
    { source: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_2", target: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_5", kind: "contains" },
    { source: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_0", target: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_6", kind: "contains" },
    { source: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_1", target: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_2", kind: "data", label: "insight" },
    { source: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_1", target: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_3", kind: "data", label: "insight" },
    { source: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_1", target: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_4", kind: "data", label: "insight" },
    { source: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_1", target: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_5", kind: "data", label: "insight" },
    { source: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_2", target: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_6", kind: "data", label: "chart_spec" },
    { source: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_2", target: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_6", kind: "data", label: "table_data" },
    { source: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_2", target: "476d074d-6611-4f5c-bd3e-f48f5871bd1f:node_6", kind: "data", label: "narrative" },
  ],
};

/** Simple Condition — 6 nodes, 9 edges */
export const SIMPLE_CONDITION: GraphSpec = {
  nodes: [
    { id: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_0", pipe_code: "translate_pipeline", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_1", pipe_code: "detect_language", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_2", pipe_code: "route_translation", pipe_type: "PipeCondition", status: "succeeded" },
    { id: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_3", pipe_code: "passthrough", pipe_type: "PipeCompose", status: "succeeded" },
    { id: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_4", pipe_code: "translate_french", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_5", pipe_code: "translate_other", pipe_type: "PipeLLM", status: "succeeded" },
  ],
  edges: [
    { source: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_0", target: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_1", kind: "contains" },
    { source: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_0", target: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_2", kind: "contains" },
    { source: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_2", target: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_3", kind: "contains" },
    { source: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_2", target: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_4", kind: "contains" },
    { source: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_2", target: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_5", kind: "contains" },
    { source: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_1", target: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_2", kind: "data", label: "classified" },
    { source: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_1", target: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_3", kind: "data", label: "classified" },
    { source: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_1", target: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_4", kind: "data", label: "classified" },
    { source: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_1", target: "3545020b-4aef-4d00-afc6-32f5065e9fd4:node_5", kind: "data", label: "classified" },
  ],
};

/** Simple Batch — 8 nodes, 17 edges */
export const SIMPLE_BATCH: GraphSpec = {
  nodes: [
    { id: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_0", pipe_code: "batch_ocr_pipeline", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_1", pipe_code: "extract_pages", pipe_type: "PipeExtract", status: "succeeded" },
    { id: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", pipe_code: "summarize_page_batch", pipe_type: "PipeBatch", status: "succeeded" },
    { id: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_3", pipe_code: "summarize_page", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_4", pipe_code: "summarize_page", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_5", pipe_code: "summarize_page", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_6", pipe_code: "summarize_page", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_7", pipe_code: "combine_summaries", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_0", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_1", kind: "contains" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_0", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", kind: "contains" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_3", kind: "contains" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_4", kind: "contains" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_5", kind: "contains" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_6", kind: "contains" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_0", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_7", kind: "contains" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_1", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", kind: "data", label: "pages" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_7", kind: "data", label: "page_summaries" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_3", kind: "batch_item", label: "[0]" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_4", kind: "batch_item", label: "[1]" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_5", kind: "batch_item", label: "[2]" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_6", kind: "batch_item", label: "[3]" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_3", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", kind: "batch_aggregate", label: "[0]" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_4", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", kind: "batch_aggregate", label: "[1]" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_5", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", kind: "batch_aggregate", label: "[2]" },
    { source: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_6", target: "ccf5985d-026f-4ad8-830e-7f91ba4e4663:node_2", kind: "batch_aggregate", label: "[3]" },
  ],
};

/** CV Screening Pipeline — 8 nodes, 16 edges */
export const CV_SCREENING: GraphSpec = {
  nodes: [
    { id: "1628849e-8233-4b75-8826-d08525e733ce:node_0", pipe_code: "cv_screening", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "1628849e-8233-4b75-8826-d08525e733ce:node_1", pipe_code: "extract_cv", pipe_type: "PipeExtract", status: "succeeded" },
    { id: "1628849e-8233-4b75-8826-d08525e733ce:node_2", pipe_code: "analyze_candidate", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "1628849e-8233-4b75-8826-d08525e733ce:node_3", pipe_code: "enrich_candidate", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "1628849e-8233-4b75-8826-d08525e733ce:node_4", pipe_code: "search_candidate", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "1628849e-8233-4b75-8826-d08525e733ce:node_5", pipe_code: "generate_card", pipe_type: "PipeImgGen", status: "succeeded" },
    { id: "1628849e-8233-4b75-8826-d08525e733ce:node_6", pipe_code: "score_match", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "1628849e-8233-4b75-8826-d08525e733ce:node_7", pipe_code: "compose_report", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_0", target: "1628849e-8233-4b75-8826-d08525e733ce:node_1", kind: "contains" },
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_0", target: "1628849e-8233-4b75-8826-d08525e733ce:node_2", kind: "contains" },
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_0", target: "1628849e-8233-4b75-8826-d08525e733ce:node_3", kind: "contains" },
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_3", target: "1628849e-8233-4b75-8826-d08525e733ce:node_4", kind: "contains" },
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_3", target: "1628849e-8233-4b75-8826-d08525e733ce:node_5", kind: "contains" },
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_0", target: "1628849e-8233-4b75-8826-d08525e733ce:node_6", kind: "contains" },
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_0", target: "1628849e-8233-4b75-8826-d08525e733ce:node_7", kind: "contains" },
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_1", target: "1628849e-8233-4b75-8826-d08525e733ce:node_2", kind: "data", label: "pages" },
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_2", target: "1628849e-8233-4b75-8826-d08525e733ce:node_3", kind: "data", label: "profile" },
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_2", target: "1628849e-8233-4b75-8826-d08525e733ce:node_4", kind: "data", label: "profile" },
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_2", target: "1628849e-8233-4b75-8826-d08525e733ce:node_5", kind: "data", label: "profile" },
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_2", target: "1628849e-8233-4b75-8826-d08525e733ce:node_6", kind: "data", label: "profile" },
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_3", target: "1628849e-8233-4b75-8826-d08525e733ce:node_6", kind: "data", label: "search_result" },
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_2", target: "1628849e-8233-4b75-8826-d08525e733ce:node_7", kind: "data", label: "profile" },
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_6", target: "1628849e-8233-4b75-8826-d08525e733ce:node_7", kind: "data", label: "match" },
    { source: "1628849e-8233-4b75-8826-d08525e733ce:node_3", target: "1628849e-8233-4b75-8826-d08525e733ce:node_7", kind: "data", label: "card_image" },
  ],
};

/** Nested Seq > Par > Seq — 10 nodes, 18 edges */
export const NESTED_SEQ_PAR_SEQ: GraphSpec = {
  nodes: [
    { id: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_0", pipe_code: "etl_pipeline", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_1", pipe_code: "extract_content", pipe_type: "PipeExtract", status: "succeeded" },
    { id: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_2", pipe_code: "dual_process", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_3", pipe_code: "text_branch", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_4", pipe_code: "clean_text", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_5", pipe_code: "enrich_text", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_6", pipe_code: "image_branch", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_7", pipe_code: "extract_images", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_8", pipe_code: "caption_images", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_9", pipe_code: "combine_results", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_0", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_1", kind: "contains" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_0", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_2", kind: "contains" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_2", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_3", kind: "contains" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_3", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_4", kind: "contains" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_3", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_5", kind: "contains" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_2", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_6", kind: "contains" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_6", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_7", kind: "contains" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_6", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_8", kind: "contains" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_0", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_9", kind: "contains" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_1", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_2", kind: "data", label: "pages" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_1", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_3", kind: "data", label: "pages" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_1", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_4", kind: "data", label: "pages" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_4", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_5", kind: "data", label: "clean_text" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_1", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_6", kind: "data", label: "pages" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_1", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_7", kind: "data", label: "pages" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_7", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_8", kind: "data", label: "described" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_2", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_9", kind: "data", label: "clean_text" },
    { source: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_2", target: "0ab3ac59-54da-4a6a-9dc9-b9774a217df2:node_9", kind: "data", label: "processed_image" },
  ],
};

/** Nested Seq > Cond > Seq — 9 nodes, 16 edges */
export const NESTED_SEQ_COND_SEQ: GraphSpec = {
  nodes: [
    { id: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_0", pipe_code: "smart_responder", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_1", pipe_code: "classify_request", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_2", pipe_code: "route_response", pipe_type: "PipeCondition", status: "succeeded" },
    { id: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_3", pipe_code: "text_response_path", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_4", pipe_code: "draft_text", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_5", pipe_code: "polish_text", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_6", pipe_code: "image_response_path", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_7", pipe_code: "generate_response_image", pipe_type: "PipeImgGen", status: "succeeded" },
    { id: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_8", pipe_code: "caption_response", pipe_type: "PipeLLM", status: "succeeded" },
  ],
  edges: [
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_0", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_1", kind: "contains" },
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_0", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_2", kind: "contains" },
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_2", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_3", kind: "contains" },
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_3", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_4", kind: "contains" },
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_3", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_5", kind: "contains" },
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_2", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_6", kind: "contains" },
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_6", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_7", kind: "contains" },
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_6", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_8", kind: "contains" },
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_1", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_2", kind: "data", label: "classified" },
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_1", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_3", kind: "data", label: "classified" },
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_1", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_4", kind: "data", label: "classified" },
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_4", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_5", kind: "data", label: "draft" },
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_1", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_6", kind: "data", label: "classified" },
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_1", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_7", kind: "data", label: "classified" },
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_7", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_8", kind: "data", label: "image" },
    { source: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_1", target: "f689c58a-4f99-4813-8cc5-8164c7b88cad:node_8", kind: "data", label: "classified" },
  ],
};

/** Batch with Inner Sequence — 13 nodes, 29 edges */
export const BATCH_WITH_INNER_SEQ: GraphSpec = {
  nodes: [
    { id: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_0", pipe_code: "batch_enrich", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_1", pipe_code: "load_records", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", pipe_code: "enrich_single_batch", pipe_type: "PipeBatch", status: "succeeded" },
    { id: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_3", pipe_code: "enrich_single", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_4", pipe_code: "lookup_details", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_5", pipe_code: "format_entry", pipe_type: "PipeCompose", status: "succeeded" },
    { id: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_6", pipe_code: "enrich_single", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_7", pipe_code: "lookup_details", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_8", pipe_code: "format_entry", pipe_type: "PipeCompose", status: "succeeded" },
    { id: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_9", pipe_code: "enrich_single", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_10", pipe_code: "lookup_details", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_11", pipe_code: "format_entry", pipe_type: "PipeCompose", status: "succeeded" },
    { id: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_12", pipe_code: "export_results", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_0", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_1", kind: "contains" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_0", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", kind: "contains" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_3", kind: "contains" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_3", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_4", kind: "contains" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_3", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_5", kind: "contains" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_6", kind: "contains" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_6", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_7", kind: "contains" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_6", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_8", kind: "contains" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_9", kind: "contains" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_9", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_10", kind: "contains" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_9", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_11", kind: "contains" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_0", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_12", kind: "contains" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_1", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", kind: "data", label: "records" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_4", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_5", kind: "data", label: "search_result" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_7", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_8", kind: "data", label: "search_result" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_10", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_11", kind: "data", label: "search_result" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_12", kind: "data", label: "enriched_records" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_3", kind: "batch_item", label: "[0]" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_4", kind: "batch_item", label: "[0]" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_5", kind: "batch_item", label: "[0]" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_6", kind: "batch_item", label: "[1]" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_7", kind: "batch_item", label: "[1]" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_8", kind: "batch_item", label: "[1]" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_9", kind: "batch_item", label: "[2]" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_10", kind: "batch_item", label: "[2]" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_11", kind: "batch_item", label: "[2]" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_3", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", kind: "batch_aggregate", label: "[0]" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_6", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", kind: "batch_aggregate", label: "[1]" },
    { source: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_9", target: "5afa9cb2-50dd-4cfa-8920-182c77ae3406:node_2", kind: "batch_aggregate", label: "[2]" },
  ],
};

/** Diamond Pattern (4-way) — 7 nodes, 10 edges */
export const DIAMOND_PATTERN: GraphSpec = {
  nodes: [
    { id: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_0", pipe_code: "diamond_pipeline", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_1", pipe_code: "quad_process", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_2", pipe_code: "process_alpha", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_3", pipe_code: "process_beta", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_4", pipe_code: "process_gamma", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_5", pipe_code: "process_delta", pipe_type: "PipeImgGen", status: "succeeded" },
    { id: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_6", pipe_code: "merge_all", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_0", target: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_1", kind: "contains" },
    { source: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_1", target: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_2", kind: "contains" },
    { source: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_1", target: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_3", kind: "contains" },
    { source: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_1", target: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_4", kind: "contains" },
    { source: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_1", target: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_5", kind: "contains" },
    { source: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_0", target: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_6", kind: "contains" },
    { source: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_1", target: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_6", kind: "data", label: "alpha_result" },
    { source: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_1", target: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_6", kind: "data", label: "beta_result" },
    { source: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_1", target: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_6", kind: "data", label: "gamma_result" },
    { source: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_1", target: "11a567ac-f2fd-4bbf-84f6-ff226133c107:node_6", kind: "data", label: "delta_result" },
  ],
};

/** All Pipe Types Showcase — 6 nodes, 10 edges */
export const ALL_PIPE_TYPES: GraphSpec = {
  nodes: [
    { id: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_0", pipe_code: "all_types_chain", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_1", pipe_code: "step_extract", pipe_type: "PipeExtract", status: "succeeded" },
    { id: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_2", pipe_code: "step_llm", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_3", pipe_code: "step_search", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_4", pipe_code: "step_imggen", pipe_type: "PipeImgGen", status: "succeeded" },
    { id: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_5", pipe_code: "step_compose", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_0", target: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_1", kind: "contains" },
    { source: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_0", target: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_2", kind: "contains" },
    { source: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_0", target: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_3", kind: "contains" },
    { source: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_0", target: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_4", kind: "contains" },
    { source: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_0", target: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_5", kind: "contains" },
    { source: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_1", target: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_2", kind: "data", label: "pages" },
    { source: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_2", target: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_3", kind: "data", label: "analysis" },
    { source: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_2", target: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_4", kind: "data", label: "analysis" },
    { source: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_2", target: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_5", kind: "data", label: "analysis" },
    { source: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_3", target: "bffd703a-6b8c-449c-bddf-7e5a9a329b95:node_5", kind: "data", label: "search_result" },
  ],
};

/** RAG Pipeline — 7 nodes, 11 edges */
export const RAG_PIPELINE: GraphSpec = {
  nodes: [
    { id: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_0", pipe_code: "rag_pipeline", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_1", pipe_code: "embed_query", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_2", pipe_code: "parallel_search", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_3", pipe_code: "vector_search", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_4", pipe_code: "keyword_search", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_5", pipe_code: "rerank_results", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_6", pipe_code: "generate_answer", pipe_type: "PipeLLM", status: "succeeded" },
  ],
  edges: [
    { source: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_0", target: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_1", kind: "contains" },
    { source: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_0", target: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_2", kind: "contains" },
    { source: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_2", target: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_3", kind: "contains" },
    { source: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_2", target: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_4", kind: "contains" },
    { source: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_0", target: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_5", kind: "contains" },
    { source: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_0", target: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_6", kind: "contains" },
    { source: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_1", target: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_2", kind: "data", label: "query_embedding" },
    { source: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_1", target: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_3", kind: "data", label: "query_embedding" },
    { source: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_2", target: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_5", kind: "data", label: "vector_results" },
    { source: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_2", target: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_5", kind: "data", label: "keyword_results" },
    { source: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_5", target: "572af62c-03b3-4c91-91f9-2aaf09c74ce2:node_6", kind: "data", label: "context" },
  ],
};

/** Image Processing Pipeline — 6 nodes, 7 edges */
export const IMAGE_PIPELINE: GraphSpec = {
  nodes: [
    { id: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_0", pipe_code: "image_pipeline", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_1", pipe_code: "parallel_analyze", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_2", pipe_code: "describe_image", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_3", pipe_code: "classify_image", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_4", pipe_code: "generate_thumbnail", pipe_type: "PipeImgGen", status: "succeeded" },
    { id: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_5", pipe_code: "build_catalog", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_0", target: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_1", kind: "contains" },
    { source: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_1", target: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_2", kind: "contains" },
    { source: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_1", target: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_3", kind: "contains" },
    { source: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_1", target: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_4", kind: "contains" },
    { source: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_0", target: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_5", kind: "contains" },
    { source: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_1", target: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_5", kind: "data", label: "description" },
    { source: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_1", target: "4d783813-e8ad-4b82-842a-b14bb263b87c:node_5", kind: "data", label: "tags" },
  ],
};

/** Email Triage — 6 nodes, 9 edges */
export const EMAIL_TRIAGE: GraphSpec = {
  nodes: [
    { id: "6630e901-b2b6-486c-b668-199a9831cca7:node_0", pipe_code: "email_triage", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "6630e901-b2b6-486c-b668-199a9831cca7:node_1", pipe_code: "search_inbox", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "6630e901-b2b6-486c-b668-199a9831cca7:node_2", pipe_code: "classify_email", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "6630e901-b2b6-486c-b668-199a9831cca7:node_3", pipe_code: "route_email", pipe_type: "PipeCondition", status: "succeeded" },
    { id: "6630e901-b2b6-486c-b668-199a9831cca7:node_4", pipe_code: "flag_for_review", pipe_type: "PipeCompose", status: "succeeded" },
    { id: "6630e901-b2b6-486c-b668-199a9831cca7:node_5", pipe_code: "generate_auto_reply", pipe_type: "PipeLLM", status: "succeeded" },
  ],
  edges: [
    { source: "6630e901-b2b6-486c-b668-199a9831cca7:node_0", target: "6630e901-b2b6-486c-b668-199a9831cca7:node_1", kind: "contains" },
    { source: "6630e901-b2b6-486c-b668-199a9831cca7:node_0", target: "6630e901-b2b6-486c-b668-199a9831cca7:node_2", kind: "contains" },
    { source: "6630e901-b2b6-486c-b668-199a9831cca7:node_0", target: "6630e901-b2b6-486c-b668-199a9831cca7:node_3", kind: "contains" },
    { source: "6630e901-b2b6-486c-b668-199a9831cca7:node_3", target: "6630e901-b2b6-486c-b668-199a9831cca7:node_4", kind: "contains" },
    { source: "6630e901-b2b6-486c-b668-199a9831cca7:node_3", target: "6630e901-b2b6-486c-b668-199a9831cca7:node_5", kind: "contains" },
    { source: "6630e901-b2b6-486c-b668-199a9831cca7:node_1", target: "6630e901-b2b6-486c-b668-199a9831cca7:node_2", kind: "data", label: "search_result" },
    { source: "6630e901-b2b6-486c-b668-199a9831cca7:node_2", target: "6630e901-b2b6-486c-b668-199a9831cca7:node_3", kind: "data", label: "classified" },
    { source: "6630e901-b2b6-486c-b668-199a9831cca7:node_2", target: "6630e901-b2b6-486c-b668-199a9831cca7:node_4", kind: "data", label: "classified" },
    { source: "6630e901-b2b6-486c-b668-199a9831cca7:node_2", target: "6630e901-b2b6-486c-b668-199a9831cca7:node_5", kind: "data", label: "classified" },
  ],
};

/** Code Review Pipeline — 8 nodes, 16 edges */
export const CODE_REVIEW: GraphSpec = {
  nodes: [
    { id: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_0", pipe_code: "review_pipeline", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_1", pipe_code: "fetch_diff", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_2", pipe_code: "parallel_checks", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_3", pipe_code: "security_check", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_4", pipe_code: "style_check", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_5", pipe_code: "logic_check", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_6", pipe_code: "perf_check", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_7", pipe_code: "compose_review", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_0", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_1", kind: "contains" },
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_0", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_2", kind: "contains" },
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_2", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_3", kind: "contains" },
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_2", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_4", kind: "contains" },
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_2", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_5", kind: "contains" },
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_2", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_6", kind: "contains" },
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_0", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_7", kind: "contains" },
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_1", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_2", kind: "data", label: "diff" },
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_1", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_3", kind: "data", label: "diff" },
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_1", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_4", kind: "data", label: "diff" },
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_1", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_5", kind: "data", label: "diff" },
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_1", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_6", kind: "data", label: "diff" },
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_2", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_7", kind: "data", label: "security_findings" },
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_2", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_7", kind: "data", label: "style_findings" },
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_2", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_7", kind: "data", label: "logic_findings" },
    { source: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_2", target: "516ff2d8-946e-44eb-b7af-c82804ff6b56:node_7", kind: "data", label: "perf_findings" },
  ],
};

/** Content Moderation — 8 nodes, 12 edges */
export const CONTENT_MODERATION: GraphSpec = {
  nodes: [
    { id: "35589719-766a-4769-82e8-5bb437edf78f:node_0", pipe_code: "moderation_pipeline", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "35589719-766a-4769-82e8-5bb437edf78f:node_1", pipe_code: "parallel_checks", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "35589719-766a-4769-82e8-5bb437edf78f:node_2", pipe_code: "check_text_safety", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "35589719-766a-4769-82e8-5bb437edf78f:node_3", pipe_code: "check_image_safety", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "35589719-766a-4769-82e8-5bb437edf78f:node_4", pipe_code: "make_decision", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "35589719-766a-4769-82e8-5bb437edf78f:node_5", pipe_code: "route_action", pipe_type: "PipeCondition", status: "succeeded" },
    { id: "35589719-766a-4769-82e8-5bb437edf78f:node_6", pipe_code: "approve_content", pipe_type: "PipeCompose", status: "succeeded" },
    { id: "35589719-766a-4769-82e8-5bb437edf78f:node_7", pipe_code: "reject_content", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "35589719-766a-4769-82e8-5bb437edf78f:node_0", target: "35589719-766a-4769-82e8-5bb437edf78f:node_1", kind: "contains" },
    { source: "35589719-766a-4769-82e8-5bb437edf78f:node_1", target: "35589719-766a-4769-82e8-5bb437edf78f:node_2", kind: "contains" },
    { source: "35589719-766a-4769-82e8-5bb437edf78f:node_1", target: "35589719-766a-4769-82e8-5bb437edf78f:node_3", kind: "contains" },
    { source: "35589719-766a-4769-82e8-5bb437edf78f:node_0", target: "35589719-766a-4769-82e8-5bb437edf78f:node_4", kind: "contains" },
    { source: "35589719-766a-4769-82e8-5bb437edf78f:node_0", target: "35589719-766a-4769-82e8-5bb437edf78f:node_5", kind: "contains" },
    { source: "35589719-766a-4769-82e8-5bb437edf78f:node_5", target: "35589719-766a-4769-82e8-5bb437edf78f:node_6", kind: "contains" },
    { source: "35589719-766a-4769-82e8-5bb437edf78f:node_5", target: "35589719-766a-4769-82e8-5bb437edf78f:node_7", kind: "contains" },
    { source: "35589719-766a-4769-82e8-5bb437edf78f:node_1", target: "35589719-766a-4769-82e8-5bb437edf78f:node_4", kind: "data", label: "text_score" },
    { source: "35589719-766a-4769-82e8-5bb437edf78f:node_1", target: "35589719-766a-4769-82e8-5bb437edf78f:node_4", kind: "data", label: "image_score" },
    { source: "35589719-766a-4769-82e8-5bb437edf78f:node_4", target: "35589719-766a-4769-82e8-5bb437edf78f:node_5", kind: "data", label: "decision" },
    { source: "35589719-766a-4769-82e8-5bb437edf78f:node_4", target: "35589719-766a-4769-82e8-5bb437edf78f:node_6", kind: "data", label: "decision" },
    { source: "35589719-766a-4769-82e8-5bb437edf78f:node_4", target: "35589719-766a-4769-82e8-5bb437edf78f:node_7", kind: "data", label: "decision" },
  ],
};

/** Wide Parallel (5 branches) — 8 nodes, 12 edges */
export const WIDE_PARALLEL: GraphSpec = {
  nodes: [
    { id: "bedc7f62-acab-4bbb-84e5-181534283b66:node_0", pipe_code: "wide_pipeline", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "bedc7f62-acab-4bbb-84e5-181534283b66:node_1", pipe_code: "five_way_split", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "bedc7f62-acab-4bbb-84e5-181534283b66:node_2", pipe_code: "process_alpha", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "bedc7f62-acab-4bbb-84e5-181534283b66:node_3", pipe_code: "process_beta", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "bedc7f62-acab-4bbb-84e5-181534283b66:node_4", pipe_code: "process_gamma", pipe_type: "PipeImgGen", status: "succeeded" },
    { id: "bedc7f62-acab-4bbb-84e5-181534283b66:node_5", pipe_code: "process_delta", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "bedc7f62-acab-4bbb-84e5-181534283b66:node_6", pipe_code: "process_epsilon", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "bedc7f62-acab-4bbb-84e5-181534283b66:node_7", pipe_code: "collect_all", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "bedc7f62-acab-4bbb-84e5-181534283b66:node_0", target: "bedc7f62-acab-4bbb-84e5-181534283b66:node_1", kind: "contains" },
    { source: "bedc7f62-acab-4bbb-84e5-181534283b66:node_1", target: "bedc7f62-acab-4bbb-84e5-181534283b66:node_2", kind: "contains" },
    { source: "bedc7f62-acab-4bbb-84e5-181534283b66:node_1", target: "bedc7f62-acab-4bbb-84e5-181534283b66:node_3", kind: "contains" },
    { source: "bedc7f62-acab-4bbb-84e5-181534283b66:node_1", target: "bedc7f62-acab-4bbb-84e5-181534283b66:node_4", kind: "contains" },
    { source: "bedc7f62-acab-4bbb-84e5-181534283b66:node_1", target: "bedc7f62-acab-4bbb-84e5-181534283b66:node_5", kind: "contains" },
    { source: "bedc7f62-acab-4bbb-84e5-181534283b66:node_1", target: "bedc7f62-acab-4bbb-84e5-181534283b66:node_6", kind: "contains" },
    { source: "bedc7f62-acab-4bbb-84e5-181534283b66:node_0", target: "bedc7f62-acab-4bbb-84e5-181534283b66:node_7", kind: "contains" },
    { source: "bedc7f62-acab-4bbb-84e5-181534283b66:node_1", target: "bedc7f62-acab-4bbb-84e5-181534283b66:node_7", kind: "data", label: "alpha" },
    { source: "bedc7f62-acab-4bbb-84e5-181534283b66:node_1", target: "bedc7f62-acab-4bbb-84e5-181534283b66:node_7", kind: "data", label: "beta" },
    { source: "bedc7f62-acab-4bbb-84e5-181534283b66:node_1", target: "bedc7f62-acab-4bbb-84e5-181534283b66:node_7", kind: "data", label: "gamma" },
    { source: "bedc7f62-acab-4bbb-84e5-181534283b66:node_1", target: "bedc7f62-acab-4bbb-84e5-181534283b66:node_7", kind: "data", label: "delta" },
    { source: "bedc7f62-acab-4bbb-84e5-181534283b66:node_1", target: "bedc7f62-acab-4bbb-84e5-181534283b66:node_7", kind: "data", label: "epsilon" },
  ],
};

/** Multi-Input Converge — 6 nodes, 8 edges */
export const MULTI_INPUT_CONVERGE: GraphSpec = {
  nodes: [
    { id: "de629083-8848-4a39-b511-c21113d7dd54:node_0", pipe_code: "multi_source_pipeline", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "de629083-8848-4a39-b511-c21113d7dd54:node_1", pipe_code: "gather_sources", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "de629083-8848-4a39-b511-c21113d7dd54:node_2", pipe_code: "fetch_api", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "de629083-8848-4a39-b511-c21113d7dd54:node_3", pipe_code: "search_web", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "de629083-8848-4a39-b511-c21113d7dd54:node_4", pipe_code: "search_academic", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "de629083-8848-4a39-b511-c21113d7dd54:node_5", pipe_code: "combine_sources", pipe_type: "PipeLLM", status: "succeeded" },
  ],
  edges: [
    { source: "de629083-8848-4a39-b511-c21113d7dd54:node_0", target: "de629083-8848-4a39-b511-c21113d7dd54:node_1", kind: "contains" },
    { source: "de629083-8848-4a39-b511-c21113d7dd54:node_1", target: "de629083-8848-4a39-b511-c21113d7dd54:node_2", kind: "contains" },
    { source: "de629083-8848-4a39-b511-c21113d7dd54:node_1", target: "de629083-8848-4a39-b511-c21113d7dd54:node_3", kind: "contains" },
    { source: "de629083-8848-4a39-b511-c21113d7dd54:node_1", target: "de629083-8848-4a39-b511-c21113d7dd54:node_4", kind: "contains" },
    { source: "de629083-8848-4a39-b511-c21113d7dd54:node_0", target: "de629083-8848-4a39-b511-c21113d7dd54:node_5", kind: "contains" },
    { source: "de629083-8848-4a39-b511-c21113d7dd54:node_1", target: "de629083-8848-4a39-b511-c21113d7dd54:node_5", kind: "data", label: "api_data" },
    { source: "de629083-8848-4a39-b511-c21113d7dd54:node_1", target: "de629083-8848-4a39-b511-c21113d7dd54:node_5", kind: "data", label: "web_data" },
    { source: "de629083-8848-4a39-b511-c21113d7dd54:node_1", target: "de629083-8848-4a39-b511-c21113d7dd54:node_5", kind: "data", label: "academic_data" },
  ],
};

/** Multi-Output Fan-out — 7 nodes, 13 edges */
export const MULTI_OUTPUT_FANOUT: GraphSpec = {
  nodes: [
    { id: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_0", pipe_code: "fanout_pipeline", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_1", pipe_code: "deep_analyze", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_2", pipe_code: "distribute", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_3", pipe_code: "store_summary", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_4", pipe_code: "index_entities", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_5", pipe_code: "log_sentiment", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_6", pipe_code: "report", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_0", target: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_1", kind: "contains" },
    { source: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_0", target: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_2", kind: "contains" },
    { source: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_2", target: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_3", kind: "contains" },
    { source: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_2", target: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_4", kind: "contains" },
    { source: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_2", target: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_5", kind: "contains" },
    { source: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_0", target: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_6", kind: "contains" },
    { source: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_1", target: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_2", kind: "data", label: "analysis" },
    { source: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_1", target: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_3", kind: "data", label: "analysis" },
    { source: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_1", target: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_4", kind: "data", label: "analysis" },
    { source: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_1", target: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_5", kind: "data", label: "analysis" },
    { source: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_2", target: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_6", kind: "data", label: "summary" },
    { source: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_2", target: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_6", kind: "data", label: "index_entry" },
    { source: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_2", target: "62dab4c8-3f36-4aae-ae0a-ebe6cafc6cde:node_6", kind: "data", label: "sentiment_log" },
  ],
};

/** Sibling Parallels — 8 nodes, 14 edges */
export const SIBLING_PARALLELS: GraphSpec = {
  nodes: [
    { id: "33946036-3b70-4eaf-b079-219a822a5cbb:node_0", pipe_code: "double_parallel_pipeline", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "33946036-3b70-4eaf-b079-219a822a5cbb:node_1", pipe_code: "gather_phase", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "33946036-3b70-4eaf-b079-219a822a5cbb:node_2", pipe_code: "gather_source_a", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "33946036-3b70-4eaf-b079-219a822a5cbb:node_3", pipe_code: "gather_source_b", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "33946036-3b70-4eaf-b079-219a822a5cbb:node_4", pipe_code: "process_phase", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "33946036-3b70-4eaf-b079-219a822a5cbb:node_5", pipe_code: "transform_x", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "33946036-3b70-4eaf-b079-219a822a5cbb:node_6", pipe_code: "transform_y", pipe_type: "PipeImgGen", status: "succeeded" },
    { id: "33946036-3b70-4eaf-b079-219a822a5cbb:node_7", pipe_code: "finalize", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "33946036-3b70-4eaf-b079-219a822a5cbb:node_0", target: "33946036-3b70-4eaf-b079-219a822a5cbb:node_1", kind: "contains" },
    { source: "33946036-3b70-4eaf-b079-219a822a5cbb:node_1", target: "33946036-3b70-4eaf-b079-219a822a5cbb:node_2", kind: "contains" },
    { source: "33946036-3b70-4eaf-b079-219a822a5cbb:node_1", target: "33946036-3b70-4eaf-b079-219a822a5cbb:node_3", kind: "contains" },
    { source: "33946036-3b70-4eaf-b079-219a822a5cbb:node_0", target: "33946036-3b70-4eaf-b079-219a822a5cbb:node_4", kind: "contains" },
    { source: "33946036-3b70-4eaf-b079-219a822a5cbb:node_4", target: "33946036-3b70-4eaf-b079-219a822a5cbb:node_5", kind: "contains" },
    { source: "33946036-3b70-4eaf-b079-219a822a5cbb:node_4", target: "33946036-3b70-4eaf-b079-219a822a5cbb:node_6", kind: "contains" },
    { source: "33946036-3b70-4eaf-b079-219a822a5cbb:node_0", target: "33946036-3b70-4eaf-b079-219a822a5cbb:node_7", kind: "contains" },
    { source: "33946036-3b70-4eaf-b079-219a822a5cbb:node_1", target: "33946036-3b70-4eaf-b079-219a822a5cbb:node_4", kind: "data", label: "source_a" },
    { source: "33946036-3b70-4eaf-b079-219a822a5cbb:node_1", target: "33946036-3b70-4eaf-b079-219a822a5cbb:node_4", kind: "data", label: "source_b" },
    { source: "33946036-3b70-4eaf-b079-219a822a5cbb:node_1", target: "33946036-3b70-4eaf-b079-219a822a5cbb:node_5", kind: "data", label: "source_a" },
    { source: "33946036-3b70-4eaf-b079-219a822a5cbb:node_1", target: "33946036-3b70-4eaf-b079-219a822a5cbb:node_5", kind: "data", label: "source_b" },
    { source: "33946036-3b70-4eaf-b079-219a822a5cbb:node_1", target: "33946036-3b70-4eaf-b079-219a822a5cbb:node_6", kind: "data", label: "source_a" },
    { source: "33946036-3b70-4eaf-b079-219a822a5cbb:node_4", target: "33946036-3b70-4eaf-b079-219a822a5cbb:node_7", kind: "data", label: "result_x" },
    { source: "33946036-3b70-4eaf-b079-219a822a5cbb:node_4", target: "33946036-3b70-4eaf-b079-219a822a5cbb:node_7", kind: "data", label: "result_y" },
  ],
};

/** Deep Nesting (3 levels) — 12 nodes, 26 edges */
export const DEEP_NESTING: GraphSpec = {
  nodes: [
    { id: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_0", pipe_code: "deep_nested_pipeline", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_1", pipe_code: "extract_input", pipe_type: "PipeExtract", status: "succeeded" },
    { id: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_2", pipe_code: "level_2_parallel", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_3", pipe_code: "batch_branch", pipe_type: "PipeBatch", status: "succeeded" },
    { id: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_4", pipe_code: "search_branch", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_5", pipe_code: "search_context", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_6", pipe_code: "summarize_search", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_7", pipe_code: "process_single_page", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_8", pipe_code: "process_single_page", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_9", pipe_code: "process_single_page", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_10", pipe_code: "process_single_page", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_11", pipe_code: "exit_combine", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_0", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_1", kind: "contains" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_0", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_2", kind: "contains" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_2", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_3", kind: "contains" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_2", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_4", kind: "contains" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_4", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_5", kind: "contains" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_4", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_6", kind: "contains" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_3", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_7", kind: "contains" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_3", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_8", kind: "contains" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_3", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_9", kind: "contains" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_3", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_10", kind: "contains" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_0", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_11", kind: "contains" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_1", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_2", kind: "data", label: "pages" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_1", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_3", kind: "data", label: "pages" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_1", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_4", kind: "data", label: "pages" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_1", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_5", kind: "data", label: "pages" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_5", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_6", kind: "data", label: "search_result" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_2", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_11", kind: "data", label: "batch_result" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_2", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_11", kind: "data", label: "search_summary" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_3", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_7", kind: "batch_item", label: "[0]" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_3", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_8", kind: "batch_item", label: "[1]" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_3", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_9", kind: "batch_item", label: "[2]" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_3", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_10", kind: "batch_item", label: "[3]" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_7", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_3", kind: "batch_aggregate", label: "[0]" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_8", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_3", kind: "batch_aggregate", label: "[1]" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_9", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_3", kind: "batch_aggregate", label: "[2]" },
    { source: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_10", target: "8e3386c7-951b-482d-b3f2-c1c8cd47d6fc:node_3", kind: "batch_aggregate", label: "[3]" },
  ],
};

/** All Controller Types — 14 nodes, 30 edges */
export const ALL_CONTROLLER_TYPES: GraphSpec = {
  nodes: [
    { id: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_0", pipe_code: "all_controllers", pipe_type: "PipeSequence", status: "succeeded" },
    { id: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_1", pipe_code: "extract_input", pipe_type: "PipeExtract", status: "succeeded" },
    { id: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_2", pipe_code: "parallel_classify", pipe_type: "PipeParallel", status: "succeeded" },
    { id: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_3", pipe_code: "analyze_content", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_4", pipe_code: "search_context", pipe_type: "PipeSearch", status: "succeeded" },
    { id: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_5", pipe_code: "batch_process_batch", pipe_type: "PipeBatch", status: "succeeded" },
    { id: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_6", pipe_code: "batch_process", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_7", pipe_code: "batch_process", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_8", pipe_code: "batch_process", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_9", pipe_code: "batch_process", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_10", pipe_code: "classify_content", pipe_type: "PipeLLM", status: "succeeded" },
    { id: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_11", pipe_code: "route_processing", pipe_type: "PipeCondition", status: "succeeded" },
    { id: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_12", pipe_code: "process_text", pipe_type: "PipeCompose", status: "succeeded" },
    { id: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_13", pipe_code: "process_data", pipe_type: "PipeCompose", status: "succeeded" },
  ],
  edges: [
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_0", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_1", kind: "contains" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_0", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_2", kind: "contains" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_2", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_3", kind: "contains" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_2", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_4", kind: "contains" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_0", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_5", kind: "contains" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_5", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_6", kind: "contains" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_5", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_7", kind: "contains" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_5", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_8", kind: "contains" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_5", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_9", kind: "contains" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_0", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_10", kind: "contains" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_0", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_11", kind: "contains" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_11", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_12", kind: "contains" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_11", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_13", kind: "contains" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_1", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_2", kind: "data", label: "pages" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_1", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_3", kind: "data", label: "pages" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_1", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_4", kind: "data", label: "pages" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_1", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_5", kind: "data", label: "pages" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_2", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_10", kind: "data", label: "analysis" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_2", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_10", kind: "data", label: "search_result" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_10", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_11", kind: "data", label: "classified" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_10", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_12", kind: "data", label: "classified" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_10", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_13", kind: "data", label: "classified" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_5", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_6", kind: "batch_item", label: "[0]" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_5", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_7", kind: "batch_item", label: "[1]" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_5", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_8", kind: "batch_item", label: "[2]" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_5", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_9", kind: "batch_item", label: "[3]" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_6", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_5", kind: "batch_aggregate", label: "[0]" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_7", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_5", kind: "batch_aggregate", label: "[1]" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_8", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_5", kind: "batch_aggregate", label: "[2]" },
    { source: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_9", target: "57ec2aba-4f6a-40a3-b5cc-950d78f23697:node_5", kind: "batch_aggregate", label: "[3]" },
  ],
};

// Catalog of all examples
export const GRAPHSPEC_CATALOG: Record<string, { label: string; spec: GraphSpec }> = {
  single_pipe: { label: "1. Single Pipe (1 LLM)", spec: SINGLE_PIPE },
  two_pipe_chain: { label: "2. Two-Pipe Chain (Extract + LLM)", spec: TWO_PIPE_CHAIN },
  simple_sequence: { label: "3. Simple Sequence (3 pipes)", spec: SIMPLE_SEQUENCE },
  long_sequence: { label: "4. Long Sequence (6 pipes)", spec: LONG_SEQUENCE },
  simple_parallel: { label: "5. Simple Parallel (2 branches)", spec: SIMPLE_PARALLEL },
  three_way_parallel: { label: "6. Three-Way Parallel", spec: THREE_WAY_PARALLEL },
  simple_condition: { label: "7. Simple Condition", spec: SIMPLE_CONDITION },
  simple_batch: { label: "8. Simple Batch", spec: SIMPLE_BATCH },
  cv_screening: { label: "9. CV Screening Pipeline", spec: CV_SCREENING },
  nested_seq_par_seq: { label: "10. Nested Seq > Par > Seq", spec: NESTED_SEQ_PAR_SEQ },
  nested_seq_cond_seq: { label: "11. Nested Seq > Cond > Seq", spec: NESTED_SEQ_COND_SEQ },
  batch_with_inner_seq: { label: "12. Batch with Inner Sequence", spec: BATCH_WITH_INNER_SEQ },
  diamond_pattern: { label: "13. Diamond Pattern (4-way)", spec: DIAMOND_PATTERN },
  all_pipe_types: { label: "14. All Pipe Types Showcase", spec: ALL_PIPE_TYPES },
  rag_pipeline: { label: "15. RAG Pipeline", spec: RAG_PIPELINE },
  image_pipeline: { label: "16. Image Processing Pipeline", spec: IMAGE_PIPELINE },
  email_triage: { label: "17. Email Triage", spec: EMAIL_TRIAGE },
  code_review: { label: "18. Code Review Pipeline", spec: CODE_REVIEW },
  content_moderation: { label: "19. Content Moderation", spec: CONTENT_MODERATION },
  wide_parallel: { label: "20. Wide Parallel (5 branches)", spec: WIDE_PARALLEL },
  multi_input_converge: { label: "21. Multi-Input Converge", spec: MULTI_INPUT_CONVERGE },
  multi_output_fanout: { label: "22. Multi-Output Fan-out", spec: MULTI_OUTPUT_FANOUT },
  sibling_parallels: { label: "23. Sibling Parallels", spec: SIBLING_PARALLELS },
  deep_nesting: { label: "24. Deep Nesting (3 levels)", spec: DEEP_NESTING },
  all_controller_types: { label: "25. All Controller Types", spec: ALL_CONTROLLER_TYPES },
};
