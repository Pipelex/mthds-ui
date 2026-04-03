import type { GraphSpec, GraphSpecNode, ConceptInfo, PipeBlueprintUnion } from "@graph/types";

// ─── Concept registry mock data ────────────────────────────────────────

export const CONCEPT_TEXT: ConceptInfo = {
  code: "Text",
  domain_code: "native",
  description: "Plain text content",
  structure_class_name: "TextContent",
  json_schema: {
    type: "object",
    properties: {
      text: { type: "string", description: "The text content" },
    },
    required: ["text"],
  },
};

export const CONCEPT_SUMMARY: ConceptInfo = {
  code: "Summary",
  domain_code: "cv_screening",
  description: "A structured summary with key points",
  structure_class_name: "cv_screening__Summary",
  refines: "native.Text",
  json_schema: {
    type: "object",
    properties: {
      text: { type: "string", description: "Summary text" },
      key_points: { type: "array", items: { type: "string" }, description: "Key takeaways" },
      confidence: { type: "number", description: "Confidence score 0-1" },
    },
    required: ["text", "key_points"],
  },
};

export const CONCEPT_DOCUMENT: ConceptInfo = {
  code: "Document",
  domain_code: "native",
  description: "A document (PDF, image, etc.)",
  structure_class_name: "DocumentContent",
  json_schema: {
    type: "object",
    properties: {
      file_path: { type: "string", description: "Path to the document" },
      mime_type: { type: "string", description: "MIME type" },
    },
    required: ["file_path"],
  },
};

export const CONCEPT_IMAGE: ConceptInfo = {
  code: "Image",
  domain_code: "native",
  description: "An image",
  structure_class_name: "ImageContent",
  json_schema: {
    type: "object",
    properties: {
      public_url: { type: "string", description: "Public URL of the image" },
      width: { type: "integer", description: "Width in pixels" },
      height: { type: "integer", description: "Height in pixels" },
    },
    required: ["public_url"],
  },
};

// ─── Pipe blueprint mock data ──────────────────────────────────────────

export const PIPE_LLM: PipeBlueprintUnion = {
  type: "PipeLLM",
  pipe_category: "PipeOperator",
  code: "generate_summary",
  domain_code: "cv_screening",
  description: "Generate a structured summary from raw text using an LLM",
  inputs: { text_input: { concept: CONCEPT_TEXT } },
  output: { concept: CONCEPT_SUMMARY },
  llm_prompt_spec: {
    system_prompt_blueprint: {
      template: "You are an expert summarizer. Extract key points concisely.",
      category: "PLAIN_TEXT",
    },
    prompt_blueprint: {
      template: "Summarize the following text:\n\n{{ text_input }}",
      category: "MARKDOWN",
    },
  },
  structuring_method: "DIRECT",
};

export const PIPE_IMG_GEN: PipeBlueprintUnion = {
  type: "PipeImgGen",
  pipe_category: "PipeOperator",
  code: "generate_banner",
  domain_code: "content",
  description: "Generate a banner image from a text prompt",
  inputs: { prompt_text: { concept: CONCEPT_TEXT } },
  output: { concept: CONCEPT_IMAGE },
  img_gen_prompt_blueprint: {
    prompt_blueprint: { template: "A professional banner image for: {{ prompt_text }}" },
    negative_prompt_blueprint: { template: "blurry, low quality, text, watermark" },
  },
  aspect_ratio: "16:9",
  output_format: "png",
};

export const PIPE_SEQUENCE: PipeBlueprintUnion = {
  type: "PipeSequence",
  pipe_category: "PipeController",
  code: "cv_analysis_flow",
  domain_code: "cv_screening",
  description: "Extract text from CV, then generate summary and score",
  inputs: { cv_pdf: { concept: CONCEPT_DOCUMENT } },
  output: { concept: CONCEPT_SUMMARY },
  sequential_sub_pipes: [
    { pipe_code: "extract_cv_text", output_name: "cv_text" },
    { pipe_code: "generate_summary", output_name: "summary" },
    { pipe_code: "compute_score", output_name: "final_score" },
  ],
};

export const PIPE_CONDITION: PipeBlueprintUnion = {
  type: "PipeCondition",
  pipe_category: "PipeController",
  code: "route_by_type",
  domain_code: "routing",
  description: "Route to different processors based on document type",
  inputs: { document: { concept: CONCEPT_DOCUMENT } },
  output: { concept: CONCEPT_TEXT },
  expression: "{{ document.mime_type }}",
  outcome_map: {
    "application/pdf": "process_pdf",
    "image/png": "process_image",
    "image/jpeg": "process_image",
  },
  default_outcome: "process_generic",
};

// ─── Node mock data ────────────────────────────────────────────────────

function makeNode(overrides: Partial<GraphSpecNode> & { id: string }): GraphSpecNode {
  return {
    kind: "operator",
    status: "succeeded",
    timing: {
      started_at: "2024-06-01T12:00:00Z",
      ended_at: "2024-06-01T12:00:02.5Z",
      duration: 2.5,
    },
    io: { inputs: [], outputs: [] },
    ...overrides,
  };
}

export const NODE_LLM = makeNode({
  id: "test:node_0",
  pipe_code: "generate_summary",
  pipe_type: "PipeLLM",
  description: "Generate a structured summary from raw text using an LLM",
  io: {
    inputs: [
      { name: "text_input", concept: "Text", digest: "abc123", content_type: "TextContent" },
    ],
    outputs: [
      {
        name: "summary",
        concept: "Summary",
        digest: "def456",
        data: { text: "The document discusses...", key_points: ["Point 1", "Point 2"] },
        data_text: "The document discusses AI safety...",
      },
    ],
  },
  metrics: { input_tokens: 1250, output_tokens: 350, total_tokens: 1600 },
});

export const NODE_IMG_GEN = makeNode({
  id: "test:node_1",
  pipe_code: "generate_banner",
  pipe_type: "PipeImgGen",
  io: {
    inputs: [{ name: "prompt_text", concept: "Text", digest: "txt001" }],
    outputs: [{ name: "banner", concept: "Image", digest: "img001" }],
  },
});

export const NODE_SEQUENCE = makeNode({
  id: "test:node_2",
  kind: "controller",
  pipe_code: "cv_analysis_flow",
  pipe_type: "PipeSequence",
  timing: { started_at: "2024-06-01T12:00:00Z", ended_at: "2024-06-01T12:00:12Z", duration: 12 },
  io: {
    inputs: [{ name: "cv_pdf", concept: "Document", digest: "doc001" }],
    outputs: [{ name: "summary", concept: "Summary", digest: "sum001" }],
  },
});

export const NODE_CONDITION = makeNode({
  id: "test:node_3",
  kind: "controller",
  pipe_code: "route_by_type",
  pipe_type: "PipeCondition",
  io: {
    inputs: [{ name: "document", concept: "Document", digest: "doc002" }],
    outputs: [{ name: "processed", concept: "Text", digest: "txt002" }],
  },
});

export const NODE_FAILED = makeNode({
  id: "test:node_4",
  pipe_code: "broken_pipe",
  pipe_type: "PipeLLM",
  status: "failed",
  error: {
    error_type: "LLMGenerationError",
    message: "API rate limit exceeded. Please retry after 60 seconds.",
    stack:
      'Traceback:\n  File "pipe_llm.py", line 142\n    raise LLMGenerationError(msg)\nLLMGenerationError: API rate limit exceeded',
  },
  timing: { started_at: "2024-06-01T12:00:00Z", ended_at: "2024-06-01T12:00:01Z", duration: 1 },
});

// ─── Full enriched GraphSpec ───────────────────────────────────────────

export const ENRICHED_SPEC: GraphSpec = {
  graph_id: "enriched-test-001",
  created_at: "2024-06-01T12:00:00Z",
  pipeline_ref: { domain: "cv_screening", main_pipe: "cv_analysis_flow" },
  nodes: [NODE_LLM, NODE_IMG_GEN, NODE_SEQUENCE, NODE_CONDITION, NODE_FAILED],
  edges: [],
  pipe_registry: {
    "cv_screening.generate_summary": PIPE_LLM,
    "content.generate_banner": PIPE_IMG_GEN,
    "cv_screening.cv_analysis_flow": PIPE_SEQUENCE,
    "routing.route_by_type": PIPE_CONDITION,
  },
  concept_registry: {
    "native.Text": CONCEPT_TEXT,
    "cv_screening.Summary": CONCEPT_SUMMARY,
    "native.Document": CONCEPT_DOCUMENT,
    "native.Image": CONCEPT_IMAGE,
  },
};
