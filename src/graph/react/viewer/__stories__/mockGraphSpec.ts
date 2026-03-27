import type { GraphSpec } from "../../../types";

// Auto-generated from real MTHDS pipeline runs.
// Do not edit manually — regenerate by running the pipelines.

// ─── Dry-Run GraphSpecs (mock inference) ────────────────────────────

export const DRY_SINGLE_PIPE: GraphSpec = {
  nodes: [
    {
      id: "c43a0672-6183-4c75-bdbc-8a72827bc306:node_0",
      pipe_code: "summarize",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text",
            digest: "8jGRG",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "summary",
            digest: "59EJv",
            concept: "Summary",
          },
        ],
      },
    },
  ],
  edges: [],
};

export const DRY_TWO_PIPE_CHAIN: GraphSpec = {
  nodes: [
    {
      id: "728cd073-678c-4553-ab00-5c50641e964d:node_0",
      pipe_code: "extract_and_analyze",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "RBBqZ",
            concept: "Document",
            content_type: "uMogxfBkvxSXyZRJkJrD",
          },
        ],
        outputs: [
          {
            name: "analysis",
            digest: "XafiD",
            concept: "Analysis",
          },
        ],
      },
    },
    {
      id: "728cd073-678c-4553-ab00-5c50641e964d:node_1",
      pipe_code: "extract_document",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "RBBqZ",
            concept: "Document",
            content_type: "uMogxfBkvxSXyZRJkJrD",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "MaUC7",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "728cd073-678c-4553-ab00-5c50641e964d:node_2",
      pipe_code: "analyze_pages",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "MaUC7",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "analysis",
            digest: "XafiD",
            concept: "Analysis",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "728cd073-678c-4553-ab00-5c50641e964d:node_0",
      target: "728cd073-678c-4553-ab00-5c50641e964d:node_1",
      kind: "contains",
      id: "728cd073-678c-4553-ab00-5c50641e964d:edge_0",
    },
    {
      source: "728cd073-678c-4553-ab00-5c50641e964d:node_0",
      target: "728cd073-678c-4553-ab00-5c50641e964d:node_2",
      kind: "contains",
      id: "728cd073-678c-4553-ab00-5c50641e964d:edge_1",
    },
    {
      source: "728cd073-678c-4553-ab00-5c50641e964d:node_1",
      target: "728cd073-678c-4553-ab00-5c50641e964d:node_2",
      kind: "data",
      id: "728cd073-678c-4553-ab00-5c50641e964d:edge_2",
      label: "pages",
    },
  ],
};

export const DRY_SIMPLE_SEQUENCE: GraphSpec = {
  nodes: [
    {
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_0",
      pipe_code: "extract_analyze_report",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "PfNb6",
            concept: "Document",
            content_type: "YQVQGFxdnVJDkKInwvck",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "6WD5P",
            concept: "Report",
          },
        ],
      },
    },
    {
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_1",
      pipe_code: "extract_pages",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "PfNb6",
            concept: "Document",
            content_type: "YQVQGFxdnVJDkKInwvck",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "4DuTY",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_2",
      pipe_code: "analyze_content",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "4DuTY",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "analysis",
            digest: "4mVak",
            concept: "Analysis",
          },
        ],
      },
    },
    {
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_3",
      pipe_code: "compose_report",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "4mVak",
            concept: "Analysis",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "6WD5P",
            concept: "Report",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_0",
      target: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_1",
      kind: "contains",
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:edge_0",
    },
    {
      source: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_0",
      target: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_2",
      kind: "contains",
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:edge_1",
    },
    {
      source: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_0",
      target: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_3",
      kind: "contains",
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:edge_2",
    },
    {
      source: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_1",
      target: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_2",
      kind: "data",
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:edge_3",
      label: "pages",
    },
    {
      source: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_2",
      target: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_3",
      kind: "data",
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:edge_4",
      label: "analysis",
    },
  ],
};

export const DRY_LONG_SEQUENCE: GraphSpec = {
  nodes: [
    {
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0",
      pipe_code: "ingest_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "kmqJ3",
            concept: "Document",
            content_type: "iXXdIfVwELClLbmvoMxT",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "cszCC",
            concept: "ValidationReport",
          },
        ],
      },
    },
    {
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_1",
      pipe_code: "extract_raw",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "kmqJ3",
            concept: "Document",
            content_type: "iXXdIfVwELClLbmvoMxT",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "39otC",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_2",
      pipe_code: "clean_text",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "39otC",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "clean_text",
            digest: "NsQBx",
            concept: "CleanText",
          },
        ],
      },
    },
    {
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_3",
      pipe_code: "chunk_text",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "clean_text",
            digest: "NsQBx",
            concept: "CleanText",
          },
        ],
        outputs: [
          {
            name: "chunks",
            digest: "ZeXeg",
            concept: "TextChunk",
          },
        ],
      },
    },
    {
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_4",
      pipe_code: "embed_chunks",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "chunks",
            digest: "ZeXeg",
            concept: "TextChunk",
          },
        ],
        outputs: [
          {
            name: "embeddings",
            digest: "cisjq",
            concept: "Embedding",
          },
        ],
      },
    },
    {
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_5",
      pipe_code: "build_index",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "embeddings",
            digest: "cisjq",
            concept: "Embedding",
          },
        ],
        outputs: [
          {
            name: "index",
            digest: "D3pXc",
            concept: "VectorIndex",
          },
        ],
      },
    },
    {
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_6",
      pipe_code: "validate_index",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "index",
            digest: "D3pXc",
            concept: "VectorIndex",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "cszCC",
            concept: "ValidationReport",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_1",
      kind: "contains",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_0",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_2",
      kind: "contains",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_1",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_3",
      kind: "contains",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_2",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_4",
      kind: "contains",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_3",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_5",
      kind: "contains",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_4",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_6",
      kind: "contains",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_5",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_1",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_2",
      kind: "data",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_6",
      label: "pages",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_2",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_3",
      kind: "data",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_7",
      label: "clean_text",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_3",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_4",
      kind: "data",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_8",
      label: "chunks",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_4",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_5",
      kind: "data",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_9",
      label: "embeddings",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_5",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_6",
      kind: "data",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_10",
      label: "index",
    },
  ],
};

export const DRY_SIMPLE_PARALLEL: GraphSpec = {
  nodes: [
    {
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_0",
      pipe_code: "dual_analysis_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text",
            digest: "78tjd",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "P7bAf",
            concept: "AnalysisReport",
          },
        ],
      },
    },
    {
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1",
      pipe_code: "parallel_analyze",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text",
            digest: "78tjd",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "sentiment",
            digest: "mapoe",
            concept: "Sentiment",
          },
          {
            name: "keywords",
            digest: "S937N",
            concept: "Keyword",
          },
        ],
      },
    },
    {
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_2",
      pipe_code: "analyze_sentiment",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text",
            digest: "78tjd",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "sentiment",
            digest: "mapoe",
            concept: "Sentiment",
          },
        ],
      },
    },
    {
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_3",
      pipe_code: "extract_keywords",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text",
            digest: "78tjd",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "keywords",
            digest: "S937N",
            concept: "Keyword",
          },
        ],
      },
    },
    {
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_4",
      pipe_code: "merge_results",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "sentiment",
            digest: "mapoe",
            concept: "Sentiment",
          },
          {
            name: "keywords",
            digest: "S937N",
            concept: "Keyword",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "P7bAf",
            concept: "AnalysisReport",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_0",
      target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1",
      kind: "contains",
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:edge_0",
    },
    {
      source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1",
      target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_2",
      kind: "contains",
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:edge_1",
    },
    {
      source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1",
      target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_3",
      kind: "contains",
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:edge_2",
    },
    {
      source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_0",
      target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_4",
      kind: "contains",
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:edge_3",
    },
    {
      source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1",
      target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_4",
      kind: "data",
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:edge_4",
      label: "sentiment",
    },
    {
      source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1",
      target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_4",
      kind: "data",
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:edge_5",
      label: "keywords",
    },
  ],
};

export const DRY_THREE_WAY_PARALLEL: GraphSpec = {
  nodes: [
    {
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_0",
      pipe_code: "multi_format_report",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "dKew3",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "Ng5i9",
            concept: "Report",
          },
        ],
      },
    },
    {
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_1",
      pipe_code: "analyze_data",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "dKew3",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "insight",
            digest: "Xvht7",
            concept: "Insight",
          },
        ],
      },
    },
    {
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      pipe_code: "generate_outputs",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "insight",
            digest: "Xvht7",
            concept: "Insight",
          },
        ],
        outputs: [
          {
            name: "chart_spec",
            digest: "SMoSo",
            concept: "ChartSpec",
          },
          {
            name: "table_data",
            digest: "NRNpt",
            concept: "TableData",
          },
          {
            name: "narrative",
            digest: "ZGgaf",
            concept: "Narrative",
          },
        ],
      },
    },
    {
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_3",
      pipe_code: "generate_chart",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "insight",
            digest: "Xvht7",
            concept: "Insight",
          },
        ],
        outputs: [
          {
            name: "chart_spec",
            digest: "SMoSo",
            concept: "ChartSpec",
          },
        ],
      },
    },
    {
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_4",
      pipe_code: "generate_table",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "insight",
            digest: "Xvht7",
            concept: "Insight",
          },
        ],
        outputs: [
          {
            name: "table_data",
            digest: "NRNpt",
            concept: "TableData",
          },
        ],
      },
    },
    {
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_5",
      pipe_code: "write_narrative",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "insight",
            digest: "Xvht7",
            concept: "Insight",
          },
        ],
        outputs: [
          {
            name: "narrative",
            digest: "ZGgaf",
            concept: "Narrative",
          },
        ],
      },
    },
    {
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_6",
      pipe_code: "assemble_report",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "chart_spec",
            digest: "SMoSo",
            concept: "ChartSpec",
          },
          {
            name: "table_data",
            digest: "NRNpt",
            concept: "TableData",
          },
          {
            name: "narrative",
            digest: "ZGgaf",
            concept: "Narrative",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "Ng5i9",
            concept: "Report",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_0",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_1",
      kind: "contains",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_0",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_0",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      kind: "contains",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_1",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_3",
      kind: "contains",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_2",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_4",
      kind: "contains",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_3",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_5",
      kind: "contains",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_4",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_0",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_6",
      kind: "contains",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_5",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_1",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      kind: "data",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_6",
      label: "insight",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_1",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_3",
      kind: "data",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_7",
      label: "insight",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_1",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_4",
      kind: "data",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_8",
      label: "insight",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_1",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_5",
      kind: "data",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_9",
      label: "insight",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_6",
      kind: "data",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_10",
      label: "chart_spec",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_6",
      kind: "data",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_11",
      label: "table_data",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_6",
      kind: "data",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_12",
      label: "narrative",
    },
  ],
};

export const DRY_SIMPLE_CONDITION: GraphSpec = {
  nodes: [
    {
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_0",
      pipe_code: "translate_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text",
            digest: "3zfd8",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "translated_text",
            digest: "nYimK",
            concept: "TranslatedText",
          },
        ],
      },
    },
    {
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_1",
      pipe_code: "detect_language",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text",
            digest: "3zfd8",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "classified",
            digest: "4FRbz",
            concept: "ClassifiedText",
          },
        ],
      },
    },
    {
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_2",
      pipe_code: "route_translation",
      pipe_type: "PipeCondition",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "4FRbz",
            concept: "ClassifiedText",
          },
        ],
        outputs: [
          {
            name: "translated",
            digest: "nYimK",
            concept: "TranslatedText",
          },
        ],
      },
    },
    {
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_3",
      pipe_code: "passthrough",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "4FRbz",
            concept: "ClassifiedText",
          },
        ],
        outputs: [
          {
            name: "translated_text",
            digest: "3hs8Y",
            concept: "TranslatedText",
          },
        ],
      },
    },
    {
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_4",
      pipe_code: "translate_french",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "4FRbz",
            concept: "ClassifiedText",
          },
        ],
        outputs: [
          {
            name: "translated_text",
            digest: "VmCUe",
            concept: "TranslatedText",
          },
        ],
      },
    },
    {
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_5",
      pipe_code: "translate_other",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "4FRbz",
            concept: "ClassifiedText",
          },
        ],
        outputs: [
          {
            name: "translated_text",
            digest: "nYimK",
            concept: "TranslatedText",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_0",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_1",
      kind: "contains",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_0",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_0",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_2",
      kind: "contains",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_1",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_2",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_3",
      kind: "contains",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_2",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_2",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_4",
      kind: "contains",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_3",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_2",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_5",
      kind: "contains",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_4",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_1",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_2",
      kind: "data",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_5",
      label: "classified",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_1",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_3",
      kind: "data",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_6",
      label: "classified",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_1",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_4",
      kind: "data",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_7",
      label: "classified",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_1",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_5",
      kind: "data",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_8",
      label: "classified",
    },
  ],
};

export const DRY_SIMPLE_BATCH: GraphSpec = {
  nodes: [
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_0",
      pipe_code: "batch_ocr_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GGmy9",
            concept: "Document",
            content_type: "GLEKWCCSkxSlgmDPwblf",
          },
        ],
        outputs: [
          {
            name: "document_summary",
            digest: "5K2mv",
            concept: "DocumentSummary",
          },
        ],
      },
    },
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_1",
      pipe_code: "extract_pages",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GGmy9",
            concept: "Document",
            content_type: "GLEKWCCSkxSlgmDPwblf",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "6WjY7",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      pipe_code: "summarize_page_batch",
      pipe_type: "PipeBatch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "6WjY7",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "page_summaries",
            digest: "HJ6Sh",
            concept: "PageSummary",
          },
        ],
      },
    },
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_3",
      pipe_code: "summarize_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "6WjY7-branch-0",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "page_summary",
            digest: "ZX6ZQ-branch-0",
            concept: "PageSummary",
          },
        ],
      },
    },
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_4",
      pipe_code: "summarize_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "6WjY7-branch-1",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "page_summary",
            digest: "ZX6ZQ-branch-1",
            concept: "PageSummary",
          },
        ],
      },
    },
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_5",
      pipe_code: "summarize_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "6WjY7-branch-2",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "page_summary",
            digest: "ZX6ZQ-branch-2",
            concept: "PageSummary",
          },
        ],
      },
    },
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_6",
      pipe_code: "summarize_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "6WjY7-branch-3",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "page_summary",
            digest: "ZX6ZQ-branch-3",
            concept: "PageSummary",
          },
        ],
      },
    },
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_7",
      pipe_code: "combine_summaries",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page_summaries",
            digest: "HJ6Sh",
            concept: "PageSummary",
          },
        ],
        outputs: [
          {
            name: "document_summary",
            digest: "5K2mv",
            concept: "DocumentSummary",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_0",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_1",
      kind: "contains",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_0",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_0",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      kind: "contains",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_1",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_3",
      kind: "contains",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_2",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_4",
      kind: "contains",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_3",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_5",
      kind: "contains",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_4",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_6",
      kind: "contains",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_5",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_0",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_7",
      kind: "contains",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_6",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_1",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      kind: "data",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_7",
      label: "pages",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_7",
      kind: "data",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_8",
      label: "page_summaries",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_3",
      kind: "batch_item",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_9",
      label: "[0]",
      source_stuff_digest: "6WjY7",
      target_stuff_digest: "6WjY7-branch-0",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_4",
      kind: "batch_item",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_10",
      label: "[1]",
      source_stuff_digest: "6WjY7",
      target_stuff_digest: "6WjY7-branch-1",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_5",
      kind: "batch_item",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_11",
      label: "[2]",
      source_stuff_digest: "6WjY7",
      target_stuff_digest: "6WjY7-branch-2",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_6",
      kind: "batch_item",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_12",
      label: "[3]",
      source_stuff_digest: "6WjY7",
      target_stuff_digest: "6WjY7-branch-3",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_3",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      kind: "batch_aggregate",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_13",
      label: "[0]",
      source_stuff_digest: "ZX6ZQ-branch-0",
      target_stuff_digest: "HJ6Sh",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_4",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      kind: "batch_aggregate",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_14",
      label: "[1]",
      source_stuff_digest: "ZX6ZQ-branch-1",
      target_stuff_digest: "HJ6Sh",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_5",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      kind: "batch_aggregate",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_15",
      label: "[2]",
      source_stuff_digest: "ZX6ZQ-branch-2",
      target_stuff_digest: "HJ6Sh",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_6",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      kind: "batch_aggregate",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_16",
      label: "[3]",
      source_stuff_digest: "ZX6ZQ-branch-3",
      target_stuff_digest: "HJ6Sh",
    },
  ],
};

export const DRY_CV_SCREENING: GraphSpec = {
  nodes: [
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_0",
      pipe_code: "cv_screening",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "cv",
            digest: "9bebx",
            concept: "Document",
            content_type: "ouQZdWewOzmZDqhZWBqz",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "XfJHf",
            concept: "Report",
          },
        ],
      },
    },
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_1",
      pipe_code: "extract_cv",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "cv",
            digest: "9bebx",
            concept: "Document",
            content_type: "ouQZdWewOzmZDqhZWBqz",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "N64J4",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      pipe_code: "analyze_candidate",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "N64J4",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "profile",
            digest: "ET7xV",
            concept: "CandidateProfile",
          },
        ],
      },
    },
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_3",
      pipe_code: "enrich_candidate",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "profile",
            digest: "ET7xV",
            concept: "CandidateProfile",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "ZZiMz",
            concept: "SearchResult",
          },
          {
            name: "card_image",
            digest: "CT6tg",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_4",
      pipe_code: "search_candidate",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "profile",
            digest: "ET7xV",
            concept: "CandidateProfile",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "ZZiMz",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_5",
      pipe_code: "generate_card",
      pipe_type: "PipeImgGen",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "profile",
            digest: "ET7xV",
            concept: "CandidateProfile",
          },
        ],
        outputs: [
          {
            name: "card_image",
            digest: "CT6tg",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_6",
      pipe_code: "score_match",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "profile",
            digest: "ET7xV",
            concept: "CandidateProfile",
          },
          {
            name: "search_result",
            digest: "ZZiMz",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "match",
            digest: "iE3Jw",
            concept: "MatchScore",
          },
        ],
      },
    },
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_7",
      pipe_code: "compose_report",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "profile",
            digest: "ET7xV",
            concept: "CandidateProfile",
          },
          {
            name: "match",
            digest: "iE3Jw",
            concept: "MatchScore",
          },
          {
            name: "card_image",
            digest: "CT6tg",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "XfJHf",
            concept: "Report",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_0",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_1",
      kind: "contains",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_0",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_0",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      kind: "contains",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_1",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_0",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_3",
      kind: "contains",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_2",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_3",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_4",
      kind: "contains",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_3",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_3",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_5",
      kind: "contains",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_4",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_0",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_6",
      kind: "contains",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_5",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_0",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_7",
      kind: "contains",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_6",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_1",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_7",
      label: "pages",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_3",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_8",
      label: "profile",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_4",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_9",
      label: "profile",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_5",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_10",
      label: "profile",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_6",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_11",
      label: "profile",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_3",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_6",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_12",
      label: "search_result",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_7",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_13",
      label: "profile",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_6",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_7",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_14",
      label: "match",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_3",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_7",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_15",
      label: "card_image",
    },
  ],
};

export const DRY_NESTED_SEQ_PAR_SEQ: GraphSpec = {
  nodes: [
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_0",
      pipe_code: "etl_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GJjh6",
            concept: "Document",
            content_type: "cBbZuyDgZTDQXMQNmwIP",
          },
        ],
        outputs: [
          {
            name: "processed",
            digest: "gDG4S",
            concept: "ProcessedContent",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_1",
      pipe_code: "extract_content",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GJjh6",
            concept: "Document",
            content_type: "cBbZuyDgZTDQXMQNmwIP",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "DuJZ4",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_2",
      pipe_code: "dual_process",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "DuJZ4",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "clean_text",
            digest: "ZEUXM",
            concept: "EnrichedText",
          },
          {
            name: "processed_image",
            digest: "W48NM",
            concept: "ProcessedImage",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_3",
      pipe_code: "text_branch",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "DuJZ4",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "clean_text",
            digest: "ZEUXM",
            concept: "EnrichedText",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_4",
      pipe_code: "clean_text",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "DuJZ4",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "clean_text",
            digest: "WKoXW",
            concept: "CleanText",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_5",
      pipe_code: "enrich_text",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "clean_text",
            digest: "WKoXW",
            concept: "CleanText",
          },
        ],
        outputs: [
          {
            name: "enriched",
            digest: "ZEUXM",
            concept: "EnrichedText",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_6",
      pipe_code: "image_branch",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "DuJZ4",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "processed_image",
            digest: "W48NM",
            concept: "ProcessedImage",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_7",
      pipe_code: "extract_images",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "DuJZ4",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "described",
            digest: "n3DWm",
            concept: "Text",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_8",
      pipe_code: "caption_images",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "described",
            digest: "n3DWm",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "captioned",
            digest: "W48NM",
            concept: "ProcessedImage",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_9",
      pipe_code: "combine_results",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "clean_text",
            digest: "ZEUXM",
            concept: "EnrichedText",
          },
          {
            name: "processed_image",
            digest: "W48NM",
            concept: "ProcessedImage",
          },
        ],
        outputs: [
          {
            name: "processed",
            digest: "gDG4S",
            concept: "ProcessedContent",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_0",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_1",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_0",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_0",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_2",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_1",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_2",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_3",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_2",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_3",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_4",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_3",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_3",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_5",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_4",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_2",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_6",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_5",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_6",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_7",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_6",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_6",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_8",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_7",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_0",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_9",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_8",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_1",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_2",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_9",
      label: "pages",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_1",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_3",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_10",
      label: "pages",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_1",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_4",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_11",
      label: "pages",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_4",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_5",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_12",
      label: "clean_text",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_1",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_6",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_13",
      label: "pages",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_1",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_7",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_14",
      label: "pages",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_7",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_8",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_15",
      label: "described",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_2",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_9",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_16",
      label: "clean_text",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_2",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_9",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_17",
      label: "processed_image",
    },
  ],
};

export const DRY_NESTED_SEQ_COND_SEQ: GraphSpec = {
  nodes: [
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_0",
      pipe_code: "smart_responder",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "request",
            digest: "4FySt",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "polished",
            digest: "BNevK",
            concept: "Response",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      pipe_code: "classify_request",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "request",
            digest: "4FySt",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "classified",
            digest: "ST5QL",
            concept: "ClassifiedRequest",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_2",
      pipe_code: "route_response",
      pipe_type: "PipeCondition",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "ST5QL",
            concept: "ClassifiedRequest",
          },
        ],
        outputs: [
          {
            name: "response",
            digest: "BNevK",
            concept: "Response",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_3",
      pipe_code: "image_response_path",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "ST5QL",
            concept: "ClassifiedRequest",
          },
        ],
        outputs: [
          {
            name: "captioned",
            digest: "VFaCF",
            concept: "Response",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_4",
      pipe_code: "generate_response_image",
      pipe_type: "PipeImgGen",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "ST5QL",
            concept: "ClassifiedRequest",
          },
        ],
        outputs: [
          {
            name: "image",
            digest: "8h4iJ",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_5",
      pipe_code: "caption_response",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "image",
            digest: "8h4iJ",
            concept: "Image",
            content_type: "image/jpeg",
          },
          {
            name: "classified",
            digest: "ST5QL",
            concept: "ClassifiedRequest",
          },
        ],
        outputs: [
          {
            name: "captioned",
            digest: "VFaCF",
            concept: "Response",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_6",
      pipe_code: "text_response_path",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "ST5QL",
            concept: "ClassifiedRequest",
          },
        ],
        outputs: [
          {
            name: "polished",
            digest: "BNevK",
            concept: "Response",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_7",
      pipe_code: "draft_text",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "ST5QL",
            concept: "ClassifiedRequest",
          },
        ],
        outputs: [
          {
            name: "draft",
            digest: "KhwxR",
            concept: "DraftResponse",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_8",
      pipe_code: "polish_text",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "draft",
            digest: "KhwxR",
            concept: "DraftResponse",
          },
        ],
        outputs: [
          {
            name: "polished",
            digest: "BNevK",
            concept: "Response",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_0",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_0",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_0",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_2",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_1",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_2",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_3",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_2",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_3",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_4",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_3",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_3",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_5",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_4",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_2",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_6",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_5",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_6",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_7",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_6",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_6",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_8",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_7",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_2",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_8",
      label: "classified",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_3",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_9",
      label: "classified",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_4",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_10",
      label: "classified",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_4",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_5",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_11",
      label: "image",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_5",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_12",
      label: "classified",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_6",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_13",
      label: "classified",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_7",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_14",
      label: "classified",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_7",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_8",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_15",
      label: "draft",
    },
  ],
};

export const DRY_BATCH_WITH_INNER_SEQ: GraphSpec = {
  nodes: [
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_0",
      pipe_code: "batch_enrich",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GxmA2",
            concept: "Document",
            content_type: "SWhyBqZtPGivGDKyEqiZ",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "W5YFk",
            concept: "EnrichmentReport",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_1",
      pipe_code: "load_records",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GxmA2",
            concept: "Document",
            content_type: "SWhyBqZtPGivGDKyEqiZ",
          },
        ],
        outputs: [
          {
            name: "records",
            digest: "4y4hH",
            concept: "Record",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      pipe_code: "enrich_single_batch",
      pipe_type: "PipeBatch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "records",
            digest: "4y4hH",
            concept: "Record",
          },
        ],
        outputs: [
          {
            name: "enriched_records",
            digest: "Ekmga",
            concept: "EnrichedRecord",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_3",
      pipe_code: "enrich_single",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-0",
            concept: "Record",
          },
        ],
        outputs: [
          {
            name: "enriched",
            digest: "kv53N",
            concept: "EnrichedRecord",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_4",
      pipe_code: "lookup_details",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-0",
            concept: "Record",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "F9mtA",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_5",
      pipe_code: "format_entry",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-0",
            concept: "Record",
          },
          {
            name: "search_result",
            digest: "F9mtA",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "enriched",
            digest: "kv53N",
            concept: "EnrichedRecord",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_6",
      pipe_code: "enrich_single",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-1",
            concept: "Record",
          },
        ],
        outputs: [
          {
            name: "enriched",
            digest: "34nKb",
            concept: "EnrichedRecord",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_7",
      pipe_code: "lookup_details",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-1",
            concept: "Record",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "dMxg9",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_8",
      pipe_code: "format_entry",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-1",
            concept: "Record",
          },
          {
            name: "search_result",
            digest: "dMxg9",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "enriched",
            digest: "34nKb",
            concept: "EnrichedRecord",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_9",
      pipe_code: "enrich_single",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-2",
            concept: "Record",
          },
        ],
        outputs: [
          {
            name: "enriched",
            digest: "cespV",
            concept: "EnrichedRecord",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_10",
      pipe_code: "lookup_details",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-2",
            concept: "Record",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "LyRZf",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_11",
      pipe_code: "format_entry",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-2",
            concept: "Record",
          },
          {
            name: "search_result",
            digest: "LyRZf",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "enriched",
            digest: "cespV",
            concept: "EnrichedRecord",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_12",
      pipe_code: "export_results",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "enriched_records",
            digest: "Ekmga",
            concept: "EnrichedRecord",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "W5YFk",
            concept: "EnrichmentReport",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_0",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_1",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_0",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_0",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_1",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_3",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_2",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_3",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_4",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_3",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_3",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_5",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_4",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_6",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_5",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_6",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_7",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_6",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_6",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_8",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_7",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_9",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_8",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_9",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_10",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_9",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_9",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_11",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_10",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_0",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_12",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_11",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_1",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      kind: "data",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_12",
      label: "records",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_4",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_5",
      kind: "data",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_13",
      label: "search_result",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_7",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_8",
      kind: "data",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_14",
      label: "search_result",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_10",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_11",
      kind: "data",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_15",
      label: "search_result",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_12",
      kind: "data",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_16",
      label: "enriched_records",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_3",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_17",
      label: "[0]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-0",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_4",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_18",
      label: "[0]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-0",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_5",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_19",
      label: "[0]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-0",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_6",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_20",
      label: "[1]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-1",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_7",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_21",
      label: "[1]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-1",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_8",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_22",
      label: "[1]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-1",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_9",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_23",
      label: "[2]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-2",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_10",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_24",
      label: "[2]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-2",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_11",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_25",
      label: "[2]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-2",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_3",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      kind: "batch_aggregate",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_26",
      label: "[0]",
      source_stuff_digest: "kv53N",
      target_stuff_digest: "Ekmga",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_6",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      kind: "batch_aggregate",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_27",
      label: "[1]",
      source_stuff_digest: "34nKb",
      target_stuff_digest: "Ekmga",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_9",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      kind: "batch_aggregate",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_28",
      label: "[2]",
      source_stuff_digest: "cespV",
      target_stuff_digest: "Ekmga",
    },
  ],
};

export const DRY_DIAMOND_PATTERN: GraphSpec = {
  nodes: [
    {
      id: "49faea64-c900-4ad7-91f4-43001da4b749:node_0",
      pipe_code: "diamond_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "gkZS4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "merged",
            digest: "nTNoM",
            concept: "MergedResult",
          },
        ],
      },
    },
    {
      id: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      pipe_code: "quad_process",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "gkZS4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "alpha_result",
            digest: "Swvhy",
            concept: "ProcessedData",
          },
          {
            name: "beta_result",
            digest: "kdou8",
            concept: "SearchResult",
          },
          {
            name: "gamma_result",
            digest: "3Zw93",
            concept: "ProcessedData",
          },
          {
            name: "delta_result",
            digest: "U9ics",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "49faea64-c900-4ad7-91f4-43001da4b749:node_2",
      pipe_code: "process_alpha",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "gkZS4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "alpha_result",
            digest: "Swvhy",
            concept: "ProcessedData",
          },
        ],
      },
    },
    {
      id: "49faea64-c900-4ad7-91f4-43001da4b749:node_3",
      pipe_code: "process_beta",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "gkZS4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "beta_result",
            digest: "kdou8",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "49faea64-c900-4ad7-91f4-43001da4b749:node_4",
      pipe_code: "process_gamma",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "gkZS4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "gamma_result",
            digest: "3Zw93",
            concept: "ProcessedData",
          },
        ],
      },
    },
    {
      id: "49faea64-c900-4ad7-91f4-43001da4b749:node_5",
      pipe_code: "process_delta",
      pipe_type: "PipeImgGen",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "gkZS4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "delta_result",
            digest: "U9ics",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "49faea64-c900-4ad7-91f4-43001da4b749:node_6",
      pipe_code: "merge_all",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "alpha_result",
            digest: "Swvhy",
            concept: "ProcessedData",
          },
          {
            name: "beta_result",
            digest: "kdou8",
            concept: "SearchResult",
          },
          {
            name: "gamma_result",
            digest: "3Zw93",
            concept: "ProcessedData",
          },
          {
            name: "delta_result",
            digest: "U9ics",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
        outputs: [
          {
            name: "merged",
            digest: "nTNoM",
            concept: "MergedResult",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_0",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      kind: "contains",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_0",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_2",
      kind: "contains",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_1",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_3",
      kind: "contains",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_2",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_4",
      kind: "contains",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_3",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_5",
      kind: "contains",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_4",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_0",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_6",
      kind: "contains",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_5",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_6",
      kind: "data",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_6",
      label: "alpha_result",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_6",
      kind: "data",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_7",
      label: "beta_result",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_6",
      kind: "data",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_8",
      label: "gamma_result",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_6",
      kind: "data",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_9",
      label: "delta_result",
    },
  ],
};

export const DRY_ALL_PIPE_TYPES: GraphSpec = {
  nodes: [
    {
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_0",
      pipe_code: "all_types_chain",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "U3Cfz",
            concept: "Document",
            content_type: "qBJdTXzyuqwQgBoGRwMg",
          },
        ],
        outputs: [
          {
            name: "output",
            digest: "GEF8q",
            concept: "FinalOutput",
          },
        ],
      },
    },
    {
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_1",
      pipe_code: "step_extract",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "U3Cfz",
            concept: "Document",
            content_type: "qBJdTXzyuqwQgBoGRwMg",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "KrURW",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_2",
      pipe_code: "step_llm",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "KrURW",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "analysis",
            digest: "C3gVB",
            concept: "Analysis",
          },
        ],
      },
    },
    {
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_3",
      pipe_code: "step_search",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "C3gVB",
            concept: "Analysis",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "StcQX",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_4",
      pipe_code: "step_imggen",
      pipe_type: "PipeImgGen",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "C3gVB",
            concept: "Analysis",
          },
        ],
        outputs: [
          {
            name: "visualization",
            digest: "h5Jtc",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_5",
      pipe_code: "step_compose",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "C3gVB",
            concept: "Analysis",
          },
          {
            name: "search_result",
            digest: "StcQX",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "output",
            digest: "GEF8q",
            concept: "FinalOutput",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_0",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_1",
      kind: "contains",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_0",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_0",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_2",
      kind: "contains",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_1",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_0",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_3",
      kind: "contains",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_2",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_0",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_4",
      kind: "contains",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_3",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_0",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_5",
      kind: "contains",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_4",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_1",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_2",
      kind: "data",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_5",
      label: "pages",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_2",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_3",
      kind: "data",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_6",
      label: "analysis",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_2",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_4",
      kind: "data",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_7",
      label: "analysis",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_2",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_5",
      kind: "data",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_8",
      label: "analysis",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_3",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_5",
      kind: "data",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_9",
      label: "search_result",
    },
  ],
};

export const DRY_RAG_PIPELINE: GraphSpec = {
  nodes: [
    {
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_0",
      pipe_code: "rag_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "question",
            digest: "FckqG",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "answer",
            digest: "EdKdY",
            concept: "Answer",
          },
        ],
      },
    },
    {
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_1",
      pipe_code: "embed_query",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "question",
            digest: "FckqG",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "query_embedding",
            digest: "eFYGF",
            concept: "QueryEmbedding",
          },
        ],
      },
    },
    {
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_2",
      pipe_code: "parallel_search",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query_embedding",
            digest: "eFYGF",
            concept: "QueryEmbedding",
          },
          {
            name: "question",
            digest: "FckqG",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "vector_results",
            digest: "nAV68",
            concept: "SearchResult",
          },
          {
            name: "keyword_results",
            digest: "SfaH8",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_3",
      pipe_code: "vector_search",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query_embedding",
            digest: "eFYGF",
            concept: "QueryEmbedding",
          },
        ],
        outputs: [
          {
            name: "vector_results",
            digest: "nAV68",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_4",
      pipe_code: "keyword_search",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "question",
            digest: "FckqG",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "keyword_results",
            digest: "SfaH8",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_5",
      pipe_code: "rerank_results",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "vector_results",
            digest: "nAV68",
            concept: "SearchResult",
          },
          {
            name: "keyword_results",
            digest: "SfaH8",
            concept: "SearchResult",
          },
          {
            name: "question",
            digest: "FckqG",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "context",
            digest: "W9DKh",
            concept: "RankedContext",
          },
        ],
      },
    },
    {
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_6",
      pipe_code: "generate_answer",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "question",
            digest: "FckqG",
            concept: "Text",
          },
          {
            name: "context",
            digest: "W9DKh",
            concept: "RankedContext",
          },
        ],
        outputs: [
          {
            name: "answer",
            digest: "EdKdY",
            concept: "Answer",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_0",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_1",
      kind: "contains",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_0",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_0",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_2",
      kind: "contains",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_1",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_2",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_3",
      kind: "contains",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_2",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_2",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_4",
      kind: "contains",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_3",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_0",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_5",
      kind: "contains",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_4",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_0",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_6",
      kind: "contains",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_5",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_1",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_2",
      kind: "data",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_6",
      label: "query_embedding",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_1",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_3",
      kind: "data",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_7",
      label: "query_embedding",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_2",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_5",
      kind: "data",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_8",
      label: "vector_results",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_2",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_5",
      kind: "data",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_9",
      label: "keyword_results",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_5",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_6",
      kind: "data",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_10",
      label: "context",
    },
  ],
};

export const DRY_IMAGE_PIPELINE: GraphSpec = {
  nodes: [
    {
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_0",
      pipe_code: "image_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "image",
            digest: "NdCsP",
            concept: "Image",
            content_type: "hbfmIRVFSfvVzoOcDgqF",
          },
        ],
        outputs: [
          {
            name: "entry",
            digest: "LrjRz",
            concept: "CatalogEntry",
          },
        ],
      },
    },
    {
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_1",
      pipe_code: "parallel_analyze",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "image",
            digest: "NdCsP",
            concept: "Image",
            content_type: "hbfmIRVFSfvVzoOcDgqF",
          },
        ],
        outputs: [
          {
            name: "description",
            digest: "Ty5ae",
            concept: "Description",
          },
          {
            name: "tags",
            digest: "am757",
            concept: "TagList",
          },
          {
            name: "thumbnail",
            digest: "SRveo",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_2",
      pipe_code: "describe_image",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "image",
            digest: "NdCsP",
            concept: "Image",
            content_type: "hbfmIRVFSfvVzoOcDgqF",
          },
        ],
        outputs: [
          {
            name: "description",
            digest: "Ty5ae",
            concept: "Description",
          },
        ],
      },
    },
    {
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_3",
      pipe_code: "classify_image",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "image",
            digest: "NdCsP",
            concept: "Image",
            content_type: "hbfmIRVFSfvVzoOcDgqF",
          },
        ],
        outputs: [
          {
            name: "tags",
            digest: "am757",
            concept: "TagList",
          },
        ],
      },
    },
    {
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_4",
      pipe_code: "generate_thumbnail",
      pipe_type: "PipeImgGen",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "image",
            digest: "NdCsP",
            concept: "Image",
            content_type: "hbfmIRVFSfvVzoOcDgqF",
          },
        ],
        outputs: [
          {
            name: "thumbnail",
            digest: "SRveo",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_5",
      pipe_code: "build_catalog",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "description",
            digest: "Ty5ae",
            concept: "Description",
          },
          {
            name: "tags",
            digest: "am757",
            concept: "TagList",
          },
        ],
        outputs: [
          {
            name: "entry",
            digest: "LrjRz",
            concept: "CatalogEntry",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_0",
      target: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_1",
      kind: "contains",
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:edge_0",
    },
    {
      source: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_1",
      target: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_2",
      kind: "contains",
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:edge_1",
    },
    {
      source: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_1",
      target: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_3",
      kind: "contains",
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:edge_2",
    },
    {
      source: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_1",
      target: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_4",
      kind: "contains",
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:edge_3",
    },
    {
      source: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_0",
      target: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_5",
      kind: "contains",
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:edge_4",
    },
    {
      source: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_1",
      target: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_5",
      kind: "data",
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:edge_5",
      label: "description",
    },
    {
      source: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_1",
      target: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_5",
      kind: "data",
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:edge_6",
      label: "tags",
    },
  ],
};

export const DRY_EMAIL_TRIAGE: GraphSpec = {
  nodes: [
    {
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_0",
      pipe_code: "email_triage",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "553ff",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "inbox_digest",
            digest: "d7D5T",
            concept: "InboxDigest",
          },
        ],
      },
    },
    {
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_1",
      pipe_code: "search_inbox",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "553ff",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "A5yG5",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_2",
      pipe_code: "classify_email",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "search_result",
            digest: "A5yG5",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "classified",
            digest: "XKHTE",
            concept: "EmailClassification",
          },
        ],
      },
    },
    {
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_3",
      pipe_code: "route_email",
      pipe_type: "PipeCondition",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "XKHTE",
            concept: "EmailClassification",
          },
        ],
        outputs: [
          {
            name: "digest",
            digest: "d7D5T",
            concept: "InboxDigest",
          },
        ],
      },
    },
    {
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_4",
      pipe_code: "flag_for_review",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "XKHTE",
            concept: "EmailClassification",
          },
        ],
        outputs: [
          {
            name: "inbox_digest",
            digest: "dMrXd",
            concept: "InboxDigest",
          },
        ],
      },
    },
    {
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_5",
      pipe_code: "generate_auto_reply",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "XKHTE",
            concept: "EmailClassification",
          },
        ],
        outputs: [
          {
            name: "inbox_digest",
            digest: "d7D5T",
            concept: "InboxDigest",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_0",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_1",
      kind: "contains",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_0",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_0",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_2",
      kind: "contains",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_1",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_0",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_3",
      kind: "contains",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_2",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_3",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_4",
      kind: "contains",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_3",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_3",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_5",
      kind: "contains",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_4",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_1",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_2",
      kind: "data",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_5",
      label: "search_result",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_2",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_3",
      kind: "data",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_6",
      label: "classified",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_2",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_4",
      kind: "data",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_7",
      label: "classified",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_2",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_5",
      kind: "data",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_8",
      label: "classified",
    },
  ],
};

export const DRY_CODE_REVIEW: GraphSpec = {
  nodes: [
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_0",
      pipe_code: "review_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pr_url",
            digest: "AGp39",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "review",
            digest: "YFC4h",
            concept: "CodeReview",
          },
        ],
      },
    },
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_1",
      pipe_code: "fetch_diff",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pr_url",
            digest: "AGp39",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "diff",
            digest: "XXobo",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      pipe_code: "parallel_checks",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "diff",
            digest: "XXobo",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "security_findings",
            digest: "cPVZL",
            concept: "ReviewFinding",
          },
          {
            name: "style_findings",
            digest: "YKD6M",
            concept: "ReviewFinding",
          },
          {
            name: "logic_findings",
            digest: "67RRg",
            concept: "ReviewFinding",
          },
          {
            name: "perf_findings",
            digest: "3FLdF",
            concept: "ReviewFinding",
          },
        ],
      },
    },
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_3",
      pipe_code: "security_check",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "diff",
            digest: "XXobo",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "security_findings",
            digest: "cPVZL",
            concept: "ReviewFinding",
          },
        ],
      },
    },
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_4",
      pipe_code: "style_check",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "diff",
            digest: "XXobo",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "style_findings",
            digest: "YKD6M",
            concept: "ReviewFinding",
          },
        ],
      },
    },
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_5",
      pipe_code: "logic_check",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "diff",
            digest: "XXobo",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "logic_findings",
            digest: "67RRg",
            concept: "ReviewFinding",
          },
        ],
      },
    },
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_6",
      pipe_code: "perf_check",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "diff",
            digest: "XXobo",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "perf_findings",
            digest: "3FLdF",
            concept: "ReviewFinding",
          },
        ],
      },
    },
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_7",
      pipe_code: "compose_review",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "security_findings",
            digest: "cPVZL",
            concept: "ReviewFinding",
          },
          {
            name: "style_findings",
            digest: "YKD6M",
            concept: "ReviewFinding",
          },
          {
            name: "logic_findings",
            digest: "67RRg",
            concept: "ReviewFinding",
          },
          {
            name: "perf_findings",
            digest: "3FLdF",
            concept: "ReviewFinding",
          },
        ],
        outputs: [
          {
            name: "review",
            digest: "YFC4h",
            concept: "CodeReview",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_0",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_1",
      kind: "contains",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_0",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_0",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      kind: "contains",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_1",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_3",
      kind: "contains",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_2",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_4",
      kind: "contains",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_3",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_5",
      kind: "contains",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_4",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_6",
      kind: "contains",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_5",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_0",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_7",
      kind: "contains",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_6",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_1",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_7",
      label: "diff",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_1",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_3",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_8",
      label: "diff",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_1",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_4",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_9",
      label: "diff",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_1",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_5",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_10",
      label: "diff",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_1",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_6",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_11",
      label: "diff",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_7",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_12",
      label: "security_findings",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_7",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_13",
      label: "style_findings",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_7",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_14",
      label: "logic_findings",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_7",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_15",
      label: "perf_findings",
    },
  ],
};

export const DRY_CONTENT_MODERATION: GraphSpec = {
  nodes: [
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_0",
      pipe_code: "moderation_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "content",
            digest: "fDdx4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "moderation_result",
            digest: "bXPWz",
            concept: "ModerationResult",
          },
        ],
      },
    },
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_1",
      pipe_code: "parallel_checks",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "content",
            digest: "fDdx4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "text_score",
            digest: "bme7c",
            concept: "SafetyScore",
          },
          {
            name: "image_score",
            digest: "NhpWm",
            concept: "SafetyScore",
          },
        ],
      },
    },
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_2",
      pipe_code: "check_text_safety",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "content",
            digest: "fDdx4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "text_score",
            digest: "bme7c",
            concept: "SafetyScore",
          },
        ],
      },
    },
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_3",
      pipe_code: "check_image_safety",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "content",
            digest: "fDdx4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "image_score",
            digest: "NhpWm",
            concept: "SafetyScore",
          },
        ],
      },
    },
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_4",
      pipe_code: "make_decision",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text_score",
            digest: "bme7c",
            concept: "SafetyScore",
          },
          {
            name: "image_score",
            digest: "NhpWm",
            concept: "SafetyScore",
          },
        ],
        outputs: [
          {
            name: "decision",
            digest: "nn7t3",
            concept: "Decision",
          },
        ],
      },
    },
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_5",
      pipe_code: "route_action",
      pipe_type: "PipeCondition",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "decision",
            digest: "nn7t3",
            concept: "Decision",
          },
        ],
        outputs: [
          {
            name: "result",
            digest: "bXPWz",
            concept: "ModerationResult",
          },
        ],
      },
    },
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_6",
      pipe_code: "approve_content",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "decision",
            digest: "nn7t3",
            concept: "Decision",
          },
        ],
        outputs: [
          {
            name: "moderation_result",
            digest: "aMAnn",
            concept: "ModerationResult",
          },
        ],
      },
    },
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_7",
      pipe_code: "reject_content",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "decision",
            digest: "nn7t3",
            concept: "Decision",
          },
        ],
        outputs: [
          {
            name: "moderation_result",
            digest: "bXPWz",
            concept: "ModerationResult",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_0",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_1",
      kind: "contains",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_0",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_1",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_2",
      kind: "contains",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_1",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_1",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_3",
      kind: "contains",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_2",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_0",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_4",
      kind: "contains",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_3",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_0",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_5",
      kind: "contains",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_4",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_5",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_6",
      kind: "contains",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_5",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_5",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_7",
      kind: "contains",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_6",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_1",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_4",
      kind: "data",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_7",
      label: "text_score",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_1",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_4",
      kind: "data",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_8",
      label: "image_score",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_4",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_5",
      kind: "data",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_9",
      label: "decision",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_4",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_6",
      kind: "data",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_10",
      label: "decision",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_4",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_7",
      kind: "data",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_11",
      label: "decision",
    },
  ],
};

export const DRY_WIDE_PARALLEL: GraphSpec = {
  nodes: [
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_0",
      pipe_code: "wide_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "Q9qnT",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "collected",
            digest: "PnLJF",
            concept: "CollectedResults",
          },
        ],
      },
    },
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      pipe_code: "five_way_split",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "Q9qnT",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "alpha",
            digest: "3L2zW",
            concept: "ProcessedData",
          },
          {
            name: "beta",
            digest: "VJWzx",
            concept: "SearchResult",
          },
          {
            name: "gamma",
            digest: "XGYVR",
            concept: "Image",
            content_type: "image/jpeg",
          },
          {
            name: "delta",
            digest: "ZEM5c",
            concept: "ProcessedData",
          },
          {
            name: "epsilon",
            digest: "dBLGW",
            concept: "ProcessedData",
          },
        ],
      },
    },
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_2",
      pipe_code: "process_alpha",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "Q9qnT",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "alpha",
            digest: "3L2zW",
            concept: "ProcessedData",
          },
        ],
      },
    },
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_3",
      pipe_code: "process_beta",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "Q9qnT",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "beta",
            digest: "VJWzx",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_4",
      pipe_code: "process_gamma",
      pipe_type: "PipeImgGen",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "Q9qnT",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "gamma",
            digest: "XGYVR",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_5",
      pipe_code: "process_delta",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "Q9qnT",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "delta",
            digest: "ZEM5c",
            concept: "ProcessedData",
          },
        ],
      },
    },
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_6",
      pipe_code: "process_epsilon",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "Q9qnT",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "epsilon",
            digest: "dBLGW",
            concept: "ProcessedData",
          },
        ],
      },
    },
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_7",
      pipe_code: "collect_all",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "alpha",
            digest: "3L2zW",
            concept: "ProcessedData",
          },
          {
            name: "beta",
            digest: "VJWzx",
            concept: "SearchResult",
          },
          {
            name: "gamma",
            digest: "XGYVR",
            concept: "Image",
            content_type: "image/jpeg",
          },
          {
            name: "delta",
            digest: "ZEM5c",
            concept: "ProcessedData",
          },
          {
            name: "epsilon",
            digest: "dBLGW",
            concept: "ProcessedData",
          },
        ],
        outputs: [
          {
            name: "collected",
            digest: "PnLJF",
            concept: "CollectedResults",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_0",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      kind: "contains",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_0",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_2",
      kind: "contains",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_1",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_3",
      kind: "contains",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_2",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_4",
      kind: "contains",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_3",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_5",
      kind: "contains",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_4",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_6",
      kind: "contains",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_5",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_0",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_7",
      kind: "contains",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_6",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_7",
      kind: "data",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_7",
      label: "alpha",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_7",
      kind: "data",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_8",
      label: "beta",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_7",
      kind: "data",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_9",
      label: "gamma",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_7",
      kind: "data",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_10",
      label: "delta",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_7",
      kind: "data",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_11",
      label: "epsilon",
    },
  ],
};

export const DRY_MULTI_INPUT_CONVERGE: GraphSpec = {
  nodes: [
    {
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_0",
      pipe_code: "multi_source_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "6WSjP",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "combined",
            digest: "iKyzt",
            concept: "CombinedData",
          },
        ],
      },
    },
    {
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      pipe_code: "gather_sources",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "6WSjP",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "api_data",
            digest: "ff533",
            concept: "SearchResult",
          },
          {
            name: "web_data",
            digest: "UsuUS",
            concept: "SearchResult",
          },
          {
            name: "academic_data",
            digest: "GvF6e",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_2",
      pipe_code: "fetch_api",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "6WSjP",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "api_data",
            digest: "ff533",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_3",
      pipe_code: "search_web",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "6WSjP",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "web_data",
            digest: "UsuUS",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_4",
      pipe_code: "search_academic",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "6WSjP",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "academic_data",
            digest: "GvF6e",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_5",
      pipe_code: "combine_sources",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "api_data",
            digest: "ff533",
            concept: "SearchResult",
          },
          {
            name: "web_data",
            digest: "UsuUS",
            concept: "SearchResult",
          },
          {
            name: "academic_data",
            digest: "GvF6e",
            concept: "SearchResult",
          },
          {
            name: "query",
            digest: "6WSjP",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "combined",
            digest: "iKyzt",
            concept: "CombinedData",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_0",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      kind: "contains",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_0",
    },
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_2",
      kind: "contains",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_1",
    },
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_3",
      kind: "contains",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_2",
    },
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_4",
      kind: "contains",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_3",
    },
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_0",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_5",
      kind: "contains",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_4",
    },
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_5",
      kind: "data",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_5",
      label: "api_data",
    },
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_5",
      kind: "data",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_6",
      label: "web_data",
    },
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_5",
      kind: "data",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_7",
      label: "academic_data",
    },
  ],
};

export const DRY_MULTI_OUTPUT_FANOUT: GraphSpec = {
  nodes: [
    {
      id: "1b506fae-799c-4450-84c3-f63483d8816f:node_0",
      pipe_code: "fanout_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GiZsC",
            concept: "Document",
            content_type: "fyYehvawToFPHQufcTEL",
          },
        ],
        outputs: [
          {
            name: "distribution_report",
            digest: "NRdmv",
            concept: "DistributionReport",
          },
        ],
      },
    },
    {
      id: "1b506fae-799c-4450-84c3-f63483d8816f:node_1",
      pipe_code: "deep_analyze",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GiZsC",
            concept: "Document",
            content_type: "fyYehvawToFPHQufcTEL",
          },
        ],
        outputs: [
          {
            name: "analysis",
            digest: "Csqpo",
            concept: "Analysis",
          },
        ],
      },
    },
    {
      id: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      pipe_code: "distribute",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "Csqpo",
            concept: "Analysis",
          },
        ],
        outputs: [
          {
            name: "summary",
            digest: "RY65q",
            concept: "Summary",
          },
          {
            name: "index_entry",
            digest: "Nbayc",
            concept: "IndexEntry",
          },
          {
            name: "sentiment_log",
            digest: "mYvqf",
            concept: "SentimentLog",
          },
        ],
      },
    },
    {
      id: "1b506fae-799c-4450-84c3-f63483d8816f:node_3",
      pipe_code: "store_summary",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "Csqpo",
            concept: "Analysis",
          },
        ],
        outputs: [
          {
            name: "summary",
            digest: "RY65q",
            concept: "Summary",
          },
        ],
      },
    },
    {
      id: "1b506fae-799c-4450-84c3-f63483d8816f:node_4",
      pipe_code: "index_entities",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "Csqpo",
            concept: "Analysis",
          },
        ],
        outputs: [
          {
            name: "index_entry",
            digest: "Nbayc",
            concept: "IndexEntry",
          },
        ],
      },
    },
    {
      id: "1b506fae-799c-4450-84c3-f63483d8816f:node_5",
      pipe_code: "log_sentiment",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "Csqpo",
            concept: "Analysis",
          },
        ],
        outputs: [
          {
            name: "sentiment_log",
            digest: "mYvqf",
            concept: "SentimentLog",
          },
        ],
      },
    },
    {
      id: "1b506fae-799c-4450-84c3-f63483d8816f:node_6",
      pipe_code: "report",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "summary",
            digest: "RY65q",
            concept: "Summary",
          },
          {
            name: "index_entry",
            digest: "Nbayc",
            concept: "IndexEntry",
          },
          {
            name: "sentiment_log",
            digest: "mYvqf",
            concept: "SentimentLog",
          },
        ],
        outputs: [
          {
            name: "distribution_report",
            digest: "NRdmv",
            concept: "DistributionReport",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_0",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_1",
      kind: "contains",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_0",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_0",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      kind: "contains",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_1",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_3",
      kind: "contains",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_2",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_4",
      kind: "contains",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_3",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_5",
      kind: "contains",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_4",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_0",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_6",
      kind: "contains",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_5",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_1",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      kind: "data",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_6",
      label: "analysis",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_1",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_3",
      kind: "data",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_7",
      label: "analysis",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_1",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_4",
      kind: "data",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_8",
      label: "analysis",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_1",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_5",
      kind: "data",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_9",
      label: "analysis",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_6",
      kind: "data",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_10",
      label: "summary",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_6",
      kind: "data",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_11",
      label: "index_entry",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_6",
      kind: "data",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_12",
      label: "sentiment_log",
    },
  ],
};

export const DRY_SIBLING_PARALLELS: GraphSpec = {
  nodes: [
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_0",
      pipe_code: "double_parallel_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "9o3qh",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "final",
            digest: "i5Xcj",
            concept: "ProcessedResult",
          },
        ],
      },
    },
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      pipe_code: "gather_phase",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "9o3qh",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "source_a",
            digest: "G6mkX",
            concept: "SearchResult",
          },
          {
            name: "source_b",
            digest: "AVz8f",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_2",
      pipe_code: "gather_source_a",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "9o3qh",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "source_a",
            digest: "G6mkX",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_3",
      pipe_code: "gather_source_b",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "9o3qh",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "source_b",
            digest: "AVz8f",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      pipe_code: "process_phase",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "source_a",
            digest: "G6mkX",
            concept: "SearchResult",
          },
          {
            name: "source_b",
            digest: "AVz8f",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "result_x",
            digest: "7EyG2",
            concept: "GatheredData",
          },
          {
            name: "result_y",
            digest: "Egt2R",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_5",
      pipe_code: "transform_x",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "source_a",
            digest: "G6mkX",
            concept: "SearchResult",
          },
          {
            name: "source_b",
            digest: "AVz8f",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "result_x",
            digest: "7EyG2",
            concept: "GatheredData",
          },
        ],
      },
    },
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_6",
      pipe_code: "transform_y",
      pipe_type: "PipeImgGen",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "source_a",
            digest: "G6mkX",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "result_y",
            digest: "Egt2R",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_7",
      pipe_code: "finalize",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "result_x",
            digest: "7EyG2",
            concept: "GatheredData",
          },
          {
            name: "result_y",
            digest: "Egt2R",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
        outputs: [
          {
            name: "final",
            digest: "i5Xcj",
            concept: "ProcessedResult",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_0",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      kind: "contains",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_0",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_2",
      kind: "contains",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_1",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_3",
      kind: "contains",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_2",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_0",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      kind: "contains",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_3",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_5",
      kind: "contains",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_4",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_6",
      kind: "contains",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_5",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_0",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_7",
      kind: "contains",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_6",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      kind: "data",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_7",
      label: "source_a",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      kind: "data",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_8",
      label: "source_b",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_5",
      kind: "data",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_9",
      label: "source_a",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_5",
      kind: "data",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_10",
      label: "source_b",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_6",
      kind: "data",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_11",
      label: "source_a",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_7",
      kind: "data",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_12",
      label: "result_x",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_7",
      kind: "data",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_13",
      label: "result_y",
    },
  ],
};

export const DRY_DEEP_NESTING: GraphSpec = {
  nodes: [
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_0",
      pipe_code: "deep_nested_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "93F2L",
            concept: "Document",
            content_type: "ErHCzIWdYgKisyEXdgmg",
          },
        ],
        outputs: [
          {
            name: "final",
            digest: "FNfLP",
            concept: "FinalOutput",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_1",
      pipe_code: "extract_input",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "93F2L",
            concept: "Document",
            content_type: "ErHCzIWdYgKisyEXdgmg",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "7kbRi",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_2",
      pipe_code: "level_2_parallel",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "7kbRi",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "batch_result",
            digest: "8Yd76",
            concept: "BatchResult",
          },
          {
            name: "search_summary",
            digest: "BXAZh",
            concept: "SearchSummary",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      pipe_code: "batch_branch",
      pipe_type: "PipeBatch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "7kbRi",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "batch_result",
            digest: "8Yd76",
            concept: "BatchResult",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_4",
      pipe_code: "search_branch",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "7kbRi",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "search_summary",
            digest: "BXAZh",
            concept: "SearchSummary",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_5",
      pipe_code: "search_context",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "7kbRi",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "ku2iq",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_6",
      pipe_code: "summarize_search",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "search_result",
            digest: "ku2iq",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "search_summary",
            digest: "BXAZh",
            concept: "SearchSummary",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_7",
      pipe_code: "process_single_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "7kbRi-branch-0",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "batch_result",
            digest: "ETNBD-branch-0",
            concept: "BatchResult",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_8",
      pipe_code: "process_single_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "7kbRi-branch-1",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "batch_result",
            digest: "ETNBD-branch-1",
            concept: "BatchResult",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_9",
      pipe_code: "process_single_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "7kbRi-branch-2",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "batch_result",
            digest: "ETNBD-branch-2",
            concept: "BatchResult",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_10",
      pipe_code: "process_single_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "7kbRi-branch-3",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "batch_result",
            digest: "ETNBD-branch-3",
            concept: "BatchResult",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_11",
      pipe_code: "exit_combine",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "batch_result",
            digest: "8Yd76",
            concept: "BatchResult",
          },
          {
            name: "search_summary",
            digest: "BXAZh",
            concept: "SearchSummary",
          },
        ],
        outputs: [
          {
            name: "final",
            digest: "FNfLP",
            concept: "FinalOutput",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_0",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_1",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_0",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_0",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_2",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_1",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_2",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_2",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_2",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_4",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_3",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_4",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_5",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_4",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_4",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_6",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_5",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_7",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_6",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_8",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_7",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_9",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_8",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_10",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_9",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_0",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_11",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_10",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_1",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_2",
      kind: "data",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_11",
      label: "pages",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_1",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      kind: "data",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_12",
      label: "pages",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_1",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_4",
      kind: "data",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_13",
      label: "pages",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_1",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_5",
      kind: "data",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_14",
      label: "pages",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_5",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_6",
      kind: "data",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_15",
      label: "search_result",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_2",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_11",
      kind: "data",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_16",
      label: "batch_result",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_2",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_11",
      kind: "data",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_17",
      label: "search_summary",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_7",
      kind: "batch_item",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_18",
      label: "[0]",
      source_stuff_digest: "7kbRi",
      target_stuff_digest: "7kbRi-branch-0",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_8",
      kind: "batch_item",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_19",
      label: "[1]",
      source_stuff_digest: "7kbRi",
      target_stuff_digest: "7kbRi-branch-1",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_9",
      kind: "batch_item",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_20",
      label: "[2]",
      source_stuff_digest: "7kbRi",
      target_stuff_digest: "7kbRi-branch-2",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_10",
      kind: "batch_item",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_21",
      label: "[3]",
      source_stuff_digest: "7kbRi",
      target_stuff_digest: "7kbRi-branch-3",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_7",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      kind: "batch_aggregate",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_22",
      label: "[0]",
      source_stuff_digest: "ETNBD-branch-0",
      target_stuff_digest: "8Yd76",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_8",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      kind: "batch_aggregate",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_23",
      label: "[1]",
      source_stuff_digest: "ETNBD-branch-1",
      target_stuff_digest: "8Yd76",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_9",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      kind: "batch_aggregate",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_24",
      label: "[2]",
      source_stuff_digest: "ETNBD-branch-2",
      target_stuff_digest: "8Yd76",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_10",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      kind: "batch_aggregate",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_25",
      label: "[3]",
      source_stuff_digest: "ETNBD-branch-3",
      target_stuff_digest: "8Yd76",
    },
  ],
};

export const DRY_ALL_CONTROLLER_TYPES: GraphSpec = {
  nodes: [
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_0",
      pipe_code: "all_controllers",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "guzYC",
            concept: "Document",
            content_type: "flrMqOblMSSRXxPtEriv",
          },
        ],
        outputs: [
          {
            name: "final_report",
            digest: "Q2Rn6",
            concept: "FinalReport",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_1",
      pipe_code: "extract_input",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "guzYC",
            concept: "Document",
            content_type: "flrMqOblMSSRXxPtEriv",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "nDesx",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_2",
      pipe_code: "parallel_classify",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "nDesx",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "analysis",
            digest: "LuLCo",
            concept: "Text",
          },
          {
            name: "search_result",
            digest: "eE6cc",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_3",
      pipe_code: "analyze_content",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "nDesx",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "analysis",
            digest: "LuLCo",
            concept: "Text",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_4",
      pipe_code: "search_context",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "nDesx",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "eE6cc",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      pipe_code: "batch_process_batch",
      pipe_type: "PipeBatch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "nDesx",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "page_results",
            digest: "XgbFX",
            concept: "ProcessedItem",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_6",
      pipe_code: "batch_process",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "nDesx-branch-0",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "processed_item",
            digest: "Fy8wj-branch-0",
            concept: "ProcessedItem",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_7",
      pipe_code: "batch_process",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "nDesx-branch-1",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "processed_item",
            digest: "Fy8wj-branch-1",
            concept: "ProcessedItem",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_8",
      pipe_code: "batch_process",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "nDesx-branch-2",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "processed_item",
            digest: "Fy8wj-branch-2",
            concept: "ProcessedItem",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_9",
      pipe_code: "batch_process",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "nDesx-branch-3",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "processed_item",
            digest: "Fy8wj-branch-3",
            concept: "ProcessedItem",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_10",
      pipe_code: "classify_content",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "LuLCo",
            concept: "Text",
          },
          {
            name: "search_result",
            digest: "eE6cc",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "classified",
            digest: "V5KZk",
            concept: "ClassifiedItem",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_11",
      pipe_code: "route_processing",
      pipe_type: "PipeCondition",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "V5KZk",
            concept: "ClassifiedItem",
          },
        ],
        outputs: [
          {
            name: "processed",
            digest: "Q2Rn6",
            concept: "FinalReport",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_12",
      pipe_code: "process_data",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "V5KZk",
            concept: "ClassifiedItem",
          },
        ],
        outputs: [
          {
            name: "final_report",
            digest: "nMNVW",
            concept: "FinalReport",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_13",
      pipe_code: "process_text",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "V5KZk",
            concept: "ClassifiedItem",
          },
        ],
        outputs: [
          {
            name: "final_report",
            digest: "Q2Rn6",
            concept: "FinalReport",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_0",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_1",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_0",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_0",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_2",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_1",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_2",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_3",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_2",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_2",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_4",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_3",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_0",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_4",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_6",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_5",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_7",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_6",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_8",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_7",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_9",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_8",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_0",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_10",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_9",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_0",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_11",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_10",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_11",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_12",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_11",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_11",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_13",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_12",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_1",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_2",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_13",
      label: "pages",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_1",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_3",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_14",
      label: "pages",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_1",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_4",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_15",
      label: "pages",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_1",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_16",
      label: "pages",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_2",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_10",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_17",
      label: "analysis",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_2",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_10",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_18",
      label: "search_result",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_10",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_11",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_19",
      label: "classified",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_10",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_12",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_20",
      label: "classified",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_10",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_13",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_21",
      label: "classified",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_6",
      kind: "batch_item",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_22",
      label: "[0]",
      source_stuff_digest: "nDesx",
      target_stuff_digest: "nDesx-branch-0",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_7",
      kind: "batch_item",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_23",
      label: "[1]",
      source_stuff_digest: "nDesx",
      target_stuff_digest: "nDesx-branch-1",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_8",
      kind: "batch_item",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_24",
      label: "[2]",
      source_stuff_digest: "nDesx",
      target_stuff_digest: "nDesx-branch-2",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_9",
      kind: "batch_item",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_25",
      label: "[3]",
      source_stuff_digest: "nDesx",
      target_stuff_digest: "nDesx-branch-3",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_6",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      kind: "batch_aggregate",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_26",
      label: "[0]",
      source_stuff_digest: "Fy8wj-branch-0",
      target_stuff_digest: "XgbFX",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_7",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      kind: "batch_aggregate",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_27",
      label: "[1]",
      source_stuff_digest: "Fy8wj-branch-1",
      target_stuff_digest: "XgbFX",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_8",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      kind: "batch_aggregate",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_28",
      label: "[2]",
      source_stuff_digest: "Fy8wj-branch-2",
      target_stuff_digest: "XgbFX",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_9",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      kind: "batch_aggregate",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_29",
      label: "[3]",
      source_stuff_digest: "Fy8wj-branch-3",
      target_stuff_digest: "XgbFX",
    },
  ],
};

// ─── Live-Run GraphSpecs (real inference) ────────────────────────────

export const LIVE_SINGLE_PIPE: GraphSpec = {
  nodes: [
    {
      id: "c43a0672-6183-4c75-bdbc-8a72827bc306:node_0",
      pipe_code: "summarize",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text",
            digest: "8jGRG",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "summary",
            digest: "59EJv",
            concept: "Summary",
          },
        ],
      },
    },
  ],
  edges: [],
};

export const LIVE_TWO_PIPE_CHAIN: GraphSpec = {
  nodes: [
    {
      id: "728cd073-678c-4553-ab00-5c50641e964d:node_0",
      pipe_code: "extract_and_analyze",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "RBBqZ",
            concept: "Document",
            content_type: "uMogxfBkvxSXyZRJkJrD",
          },
        ],
        outputs: [
          {
            name: "analysis",
            digest: "XafiD",
            concept: "Analysis",
          },
        ],
      },
    },
    {
      id: "728cd073-678c-4553-ab00-5c50641e964d:node_1",
      pipe_code: "extract_document",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "RBBqZ",
            concept: "Document",
            content_type: "uMogxfBkvxSXyZRJkJrD",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "MaUC7",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "728cd073-678c-4553-ab00-5c50641e964d:node_2",
      pipe_code: "analyze_pages",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "MaUC7",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "analysis",
            digest: "XafiD",
            concept: "Analysis",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "728cd073-678c-4553-ab00-5c50641e964d:node_0",
      target: "728cd073-678c-4553-ab00-5c50641e964d:node_1",
      kind: "contains",
      id: "728cd073-678c-4553-ab00-5c50641e964d:edge_0",
    },
    {
      source: "728cd073-678c-4553-ab00-5c50641e964d:node_0",
      target: "728cd073-678c-4553-ab00-5c50641e964d:node_2",
      kind: "contains",
      id: "728cd073-678c-4553-ab00-5c50641e964d:edge_1",
    },
    {
      source: "728cd073-678c-4553-ab00-5c50641e964d:node_1",
      target: "728cd073-678c-4553-ab00-5c50641e964d:node_2",
      kind: "data",
      id: "728cd073-678c-4553-ab00-5c50641e964d:edge_2",
      label: "pages",
    },
  ],
};

export const LIVE_SIMPLE_SEQUENCE: GraphSpec = {
  nodes: [
    {
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_0",
      pipe_code: "extract_analyze_report",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "PfNb6",
            concept: "Document",
            content_type: "YQVQGFxdnVJDkKInwvck",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "6WD5P",
            concept: "Report",
          },
        ],
      },
    },
    {
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_1",
      pipe_code: "extract_pages",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "PfNb6",
            concept: "Document",
            content_type: "YQVQGFxdnVJDkKInwvck",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "4DuTY",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_2",
      pipe_code: "analyze_content",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "4DuTY",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "analysis",
            digest: "4mVak",
            concept: "Analysis",
          },
        ],
      },
    },
    {
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_3",
      pipe_code: "compose_report",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "4mVak",
            concept: "Analysis",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "6WD5P",
            concept: "Report",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_0",
      target: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_1",
      kind: "contains",
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:edge_0",
    },
    {
      source: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_0",
      target: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_2",
      kind: "contains",
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:edge_1",
    },
    {
      source: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_0",
      target: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_3",
      kind: "contains",
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:edge_2",
    },
    {
      source: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_1",
      target: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_2",
      kind: "data",
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:edge_3",
      label: "pages",
    },
    {
      source: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_2",
      target: "415c5e6a-abf6-405c-831a-4b598b14e48e:node_3",
      kind: "data",
      id: "415c5e6a-abf6-405c-831a-4b598b14e48e:edge_4",
      label: "analysis",
    },
  ],
};

export const LIVE_LONG_SEQUENCE: GraphSpec = {
  nodes: [
    {
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0",
      pipe_code: "ingest_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "kmqJ3",
            concept: "Document",
            content_type: "iXXdIfVwELClLbmvoMxT",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "cszCC",
            concept: "ValidationReport",
          },
        ],
      },
    },
    {
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_1",
      pipe_code: "extract_raw",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "kmqJ3",
            concept: "Document",
            content_type: "iXXdIfVwELClLbmvoMxT",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "39otC",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_2",
      pipe_code: "clean_text",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "39otC",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "clean_text",
            digest: "NsQBx",
            concept: "CleanText",
          },
        ],
      },
    },
    {
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_3",
      pipe_code: "chunk_text",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "clean_text",
            digest: "NsQBx",
            concept: "CleanText",
          },
        ],
        outputs: [
          {
            name: "chunks",
            digest: "ZeXeg",
            concept: "TextChunk",
          },
        ],
      },
    },
    {
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_4",
      pipe_code: "embed_chunks",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "chunks",
            digest: "ZeXeg",
            concept: "TextChunk",
          },
        ],
        outputs: [
          {
            name: "embeddings",
            digest: "cisjq",
            concept: "Embedding",
          },
        ],
      },
    },
    {
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_5",
      pipe_code: "build_index",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "embeddings",
            digest: "cisjq",
            concept: "Embedding",
          },
        ],
        outputs: [
          {
            name: "index",
            digest: "D3pXc",
            concept: "VectorIndex",
          },
        ],
      },
    },
    {
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_6",
      pipe_code: "validate_index",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "index",
            digest: "D3pXc",
            concept: "VectorIndex",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "cszCC",
            concept: "ValidationReport",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_1",
      kind: "contains",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_0",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_2",
      kind: "contains",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_1",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_3",
      kind: "contains",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_2",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_4",
      kind: "contains",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_3",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_5",
      kind: "contains",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_4",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_0",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_6",
      kind: "contains",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_5",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_1",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_2",
      kind: "data",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_6",
      label: "pages",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_2",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_3",
      kind: "data",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_7",
      label: "clean_text",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_3",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_4",
      kind: "data",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_8",
      label: "chunks",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_4",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_5",
      kind: "data",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_9",
      label: "embeddings",
    },
    {
      source: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_5",
      target: "daaefcc1-8916-4be2-9982-71b1431cc5db:node_6",
      kind: "data",
      id: "daaefcc1-8916-4be2-9982-71b1431cc5db:edge_10",
      label: "index",
    },
  ],
};

export const LIVE_SIMPLE_PARALLEL: GraphSpec = {
  nodes: [
    {
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_0",
      pipe_code: "dual_analysis_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text",
            digest: "78tjd",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "P7bAf",
            concept: "AnalysisReport",
          },
        ],
      },
    },
    {
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1",
      pipe_code: "parallel_analyze",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text",
            digest: "78tjd",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "sentiment",
            digest: "mapoe",
            concept: "Sentiment",
          },
          {
            name: "keywords",
            digest: "S937N",
            concept: "Keyword",
          },
        ],
      },
    },
    {
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_2",
      pipe_code: "analyze_sentiment",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text",
            digest: "78tjd",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "sentiment",
            digest: "mapoe",
            concept: "Sentiment",
          },
        ],
      },
    },
    {
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_3",
      pipe_code: "extract_keywords",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text",
            digest: "78tjd",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "keywords",
            digest: "S937N",
            concept: "Keyword",
          },
        ],
      },
    },
    {
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_4",
      pipe_code: "merge_results",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "sentiment",
            digest: "mapoe",
            concept: "Sentiment",
          },
          {
            name: "keywords",
            digest: "S937N",
            concept: "Keyword",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "P7bAf",
            concept: "AnalysisReport",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_0",
      target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1",
      kind: "contains",
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:edge_0",
    },
    {
      source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1",
      target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_2",
      kind: "contains",
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:edge_1",
    },
    {
      source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1",
      target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_3",
      kind: "contains",
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:edge_2",
    },
    {
      source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_0",
      target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_4",
      kind: "contains",
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:edge_3",
    },
    {
      source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1",
      target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_4",
      kind: "data",
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:edge_4",
      label: "sentiment",
    },
    {
      source: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_1",
      target: "3f944e87-efa0-4031-a63c-2dae0dccfd86:node_4",
      kind: "data",
      id: "3f944e87-efa0-4031-a63c-2dae0dccfd86:edge_5",
      label: "keywords",
    },
  ],
};

export const LIVE_THREE_WAY_PARALLEL: GraphSpec = {
  nodes: [
    {
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_0",
      pipe_code: "multi_format_report",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "dKew3",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "Ng5i9",
            concept: "Report",
          },
        ],
      },
    },
    {
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_1",
      pipe_code: "analyze_data",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "dKew3",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "insight",
            digest: "Xvht7",
            concept: "Insight",
          },
        ],
      },
    },
    {
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      pipe_code: "generate_outputs",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "insight",
            digest: "Xvht7",
            concept: "Insight",
          },
        ],
        outputs: [
          {
            name: "chart_spec",
            digest: "SMoSo",
            concept: "ChartSpec",
          },
          {
            name: "table_data",
            digest: "NRNpt",
            concept: "TableData",
          },
          {
            name: "narrative",
            digest: "ZGgaf",
            concept: "Narrative",
          },
        ],
      },
    },
    {
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_3",
      pipe_code: "generate_chart",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "insight",
            digest: "Xvht7",
            concept: "Insight",
          },
        ],
        outputs: [
          {
            name: "chart_spec",
            digest: "SMoSo",
            concept: "ChartSpec",
          },
        ],
      },
    },
    {
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_4",
      pipe_code: "generate_table",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "insight",
            digest: "Xvht7",
            concept: "Insight",
          },
        ],
        outputs: [
          {
            name: "table_data",
            digest: "NRNpt",
            concept: "TableData",
          },
        ],
      },
    },
    {
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_5",
      pipe_code: "write_narrative",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "insight",
            digest: "Xvht7",
            concept: "Insight",
          },
        ],
        outputs: [
          {
            name: "narrative",
            digest: "ZGgaf",
            concept: "Narrative",
          },
        ],
      },
    },
    {
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_6",
      pipe_code: "assemble_report",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "chart_spec",
            digest: "SMoSo",
            concept: "ChartSpec",
          },
          {
            name: "table_data",
            digest: "NRNpt",
            concept: "TableData",
          },
          {
            name: "narrative",
            digest: "ZGgaf",
            concept: "Narrative",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "Ng5i9",
            concept: "Report",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_0",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_1",
      kind: "contains",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_0",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_0",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      kind: "contains",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_1",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_3",
      kind: "contains",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_2",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_4",
      kind: "contains",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_3",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_5",
      kind: "contains",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_4",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_0",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_6",
      kind: "contains",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_5",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_1",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      kind: "data",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_6",
      label: "insight",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_1",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_3",
      kind: "data",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_7",
      label: "insight",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_1",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_4",
      kind: "data",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_8",
      label: "insight",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_1",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_5",
      kind: "data",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_9",
      label: "insight",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_6",
      kind: "data",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_10",
      label: "chart_spec",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_6",
      kind: "data",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_11",
      label: "table_data",
    },
    {
      source: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_2",
      target: "49d10c29-db6a-462c-ae97-2c12e59a322c:node_6",
      kind: "data",
      id: "49d10c29-db6a-462c-ae97-2c12e59a322c:edge_12",
      label: "narrative",
    },
  ],
};

export const LIVE_SIMPLE_CONDITION: GraphSpec = {
  nodes: [
    {
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_0",
      pipe_code: "translate_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text",
            digest: "3zfd8",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "translated_text",
            digest: "nYimK",
            concept: "TranslatedText",
          },
        ],
      },
    },
    {
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_1",
      pipe_code: "detect_language",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text",
            digest: "3zfd8",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "classified",
            digest: "4FRbz",
            concept: "ClassifiedText",
          },
        ],
      },
    },
    {
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_2",
      pipe_code: "route_translation",
      pipe_type: "PipeCondition",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "4FRbz",
            concept: "ClassifiedText",
          },
        ],
        outputs: [
          {
            name: "translated",
            digest: "nYimK",
            concept: "TranslatedText",
          },
        ],
      },
    },
    {
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_3",
      pipe_code: "passthrough",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "4FRbz",
            concept: "ClassifiedText",
          },
        ],
        outputs: [
          {
            name: "translated_text",
            digest: "3hs8Y",
            concept: "TranslatedText",
          },
        ],
      },
    },
    {
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_4",
      pipe_code: "translate_french",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "4FRbz",
            concept: "ClassifiedText",
          },
        ],
        outputs: [
          {
            name: "translated_text",
            digest: "VmCUe",
            concept: "TranslatedText",
          },
        ],
      },
    },
    {
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_5",
      pipe_code: "translate_other",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "4FRbz",
            concept: "ClassifiedText",
          },
        ],
        outputs: [
          {
            name: "translated_text",
            digest: "nYimK",
            concept: "TranslatedText",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_0",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_1",
      kind: "contains",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_0",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_0",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_2",
      kind: "contains",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_1",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_2",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_3",
      kind: "contains",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_2",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_2",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_4",
      kind: "contains",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_3",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_2",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_5",
      kind: "contains",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_4",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_1",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_2",
      kind: "data",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_5",
      label: "classified",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_1",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_3",
      kind: "data",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_6",
      label: "classified",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_1",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_4",
      kind: "data",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_7",
      label: "classified",
    },
    {
      source: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_1",
      target: "2f4c3318-a504-49d0-8548-e7af231f84d3:node_5",
      kind: "data",
      id: "2f4c3318-a504-49d0-8548-e7af231f84d3:edge_8",
      label: "classified",
    },
  ],
};

export const LIVE_SIMPLE_BATCH: GraphSpec = {
  nodes: [
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_0",
      pipe_code: "batch_ocr_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GGmy9",
            concept: "Document",
            content_type: "GLEKWCCSkxSlgmDPwblf",
          },
        ],
        outputs: [
          {
            name: "document_summary",
            digest: "5K2mv",
            concept: "DocumentSummary",
          },
        ],
      },
    },
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_1",
      pipe_code: "extract_pages",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GGmy9",
            concept: "Document",
            content_type: "GLEKWCCSkxSlgmDPwblf",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "6WjY7",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      pipe_code: "summarize_page_batch",
      pipe_type: "PipeBatch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "6WjY7",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "page_summaries",
            digest: "HJ6Sh",
            concept: "PageSummary",
          },
        ],
      },
    },
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_3",
      pipe_code: "summarize_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "6WjY7-branch-0",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "page_summary",
            digest: "ZX6ZQ-branch-0",
            concept: "PageSummary",
          },
        ],
      },
    },
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_4",
      pipe_code: "summarize_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "6WjY7-branch-1",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "page_summary",
            digest: "ZX6ZQ-branch-1",
            concept: "PageSummary",
          },
        ],
      },
    },
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_5",
      pipe_code: "summarize_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "6WjY7-branch-2",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "page_summary",
            digest: "ZX6ZQ-branch-2",
            concept: "PageSummary",
          },
        ],
      },
    },
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_6",
      pipe_code: "summarize_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "6WjY7-branch-3",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "page_summary",
            digest: "ZX6ZQ-branch-3",
            concept: "PageSummary",
          },
        ],
      },
    },
    {
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_7",
      pipe_code: "combine_summaries",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page_summaries",
            digest: "HJ6Sh",
            concept: "PageSummary",
          },
        ],
        outputs: [
          {
            name: "document_summary",
            digest: "5K2mv",
            concept: "DocumentSummary",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_0",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_1",
      kind: "contains",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_0",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_0",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      kind: "contains",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_1",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_3",
      kind: "contains",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_2",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_4",
      kind: "contains",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_3",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_5",
      kind: "contains",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_4",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_6",
      kind: "contains",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_5",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_0",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_7",
      kind: "contains",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_6",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_1",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      kind: "data",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_7",
      label: "pages",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_7",
      kind: "data",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_8",
      label: "page_summaries",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_3",
      kind: "batch_item",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_9",
      label: "[0]",
      source_stuff_digest: "6WjY7",
      target_stuff_digest: "6WjY7-branch-0",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_4",
      kind: "batch_item",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_10",
      label: "[1]",
      source_stuff_digest: "6WjY7",
      target_stuff_digest: "6WjY7-branch-1",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_5",
      kind: "batch_item",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_11",
      label: "[2]",
      source_stuff_digest: "6WjY7",
      target_stuff_digest: "6WjY7-branch-2",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_6",
      kind: "batch_item",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_12",
      label: "[3]",
      source_stuff_digest: "6WjY7",
      target_stuff_digest: "6WjY7-branch-3",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_3",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      kind: "batch_aggregate",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_13",
      label: "[0]",
      source_stuff_digest: "ZX6ZQ-branch-0",
      target_stuff_digest: "HJ6Sh",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_4",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      kind: "batch_aggregate",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_14",
      label: "[1]",
      source_stuff_digest: "ZX6ZQ-branch-1",
      target_stuff_digest: "HJ6Sh",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_5",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      kind: "batch_aggregate",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_15",
      label: "[2]",
      source_stuff_digest: "ZX6ZQ-branch-2",
      target_stuff_digest: "HJ6Sh",
    },
    {
      source: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_6",
      target: "4331b5a4-7e1c-4bf2-ab93-206631519674:node_2",
      kind: "batch_aggregate",
      id: "4331b5a4-7e1c-4bf2-ab93-206631519674:edge_16",
      label: "[3]",
      source_stuff_digest: "ZX6ZQ-branch-3",
      target_stuff_digest: "HJ6Sh",
    },
  ],
};

export const LIVE_CV_SCREENING: GraphSpec = {
  nodes: [
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_0",
      pipe_code: "cv_screening",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "cv",
            digest: "9bebx",
            concept: "Document",
            content_type: "ouQZdWewOzmZDqhZWBqz",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "XfJHf",
            concept: "Report",
          },
        ],
      },
    },
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_1",
      pipe_code: "extract_cv",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "cv",
            digest: "9bebx",
            concept: "Document",
            content_type: "ouQZdWewOzmZDqhZWBqz",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "N64J4",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      pipe_code: "analyze_candidate",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "N64J4",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "profile",
            digest: "ET7xV",
            concept: "CandidateProfile",
          },
        ],
      },
    },
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_3",
      pipe_code: "enrich_candidate",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "profile",
            digest: "ET7xV",
            concept: "CandidateProfile",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "ZZiMz",
            concept: "SearchResult",
          },
          {
            name: "card_image",
            digest: "CT6tg",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_4",
      pipe_code: "search_candidate",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "profile",
            digest: "ET7xV",
            concept: "CandidateProfile",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "ZZiMz",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_5",
      pipe_code: "generate_card",
      pipe_type: "PipeImgGen",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "profile",
            digest: "ET7xV",
            concept: "CandidateProfile",
          },
        ],
        outputs: [
          {
            name: "card_image",
            digest: "CT6tg",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_6",
      pipe_code: "score_match",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "profile",
            digest: "ET7xV",
            concept: "CandidateProfile",
          },
          {
            name: "search_result",
            digest: "ZZiMz",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "match",
            digest: "iE3Jw",
            concept: "MatchScore",
          },
        ],
      },
    },
    {
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_7",
      pipe_code: "compose_report",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "profile",
            digest: "ET7xV",
            concept: "CandidateProfile",
          },
          {
            name: "match",
            digest: "iE3Jw",
            concept: "MatchScore",
          },
          {
            name: "card_image",
            digest: "CT6tg",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "XfJHf",
            concept: "Report",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_0",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_1",
      kind: "contains",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_0",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_0",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      kind: "contains",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_1",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_0",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_3",
      kind: "contains",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_2",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_3",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_4",
      kind: "contains",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_3",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_3",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_5",
      kind: "contains",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_4",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_0",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_6",
      kind: "contains",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_5",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_0",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_7",
      kind: "contains",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_6",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_1",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_7",
      label: "pages",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_3",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_8",
      label: "profile",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_4",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_9",
      label: "profile",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_5",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_10",
      label: "profile",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_6",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_11",
      label: "profile",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_3",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_6",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_12",
      label: "search_result",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_2",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_7",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_13",
      label: "profile",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_6",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_7",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_14",
      label: "match",
    },
    {
      source: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_3",
      target: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:node_7",
      kind: "data",
      id: "84dfdd5e-40a5-44b6-9929-ade1426e98d2:edge_15",
      label: "card_image",
    },
  ],
};

export const LIVE_NESTED_SEQ_PAR_SEQ: GraphSpec = {
  nodes: [
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_0",
      pipe_code: "etl_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GJjh6",
            concept: "Document",
            content_type: "cBbZuyDgZTDQXMQNmwIP",
          },
        ],
        outputs: [
          {
            name: "processed",
            digest: "gDG4S",
            concept: "ProcessedContent",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_1",
      pipe_code: "extract_content",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GJjh6",
            concept: "Document",
            content_type: "cBbZuyDgZTDQXMQNmwIP",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "DuJZ4",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_2",
      pipe_code: "dual_process",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "DuJZ4",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "clean_text",
            digest: "ZEUXM",
            concept: "EnrichedText",
          },
          {
            name: "processed_image",
            digest: "W48NM",
            concept: "ProcessedImage",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_3",
      pipe_code: "text_branch",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "DuJZ4",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "clean_text",
            digest: "ZEUXM",
            concept: "EnrichedText",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_4",
      pipe_code: "clean_text",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "DuJZ4",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "clean_text",
            digest: "WKoXW",
            concept: "CleanText",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_5",
      pipe_code: "enrich_text",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "clean_text",
            digest: "WKoXW",
            concept: "CleanText",
          },
        ],
        outputs: [
          {
            name: "enriched",
            digest: "ZEUXM",
            concept: "EnrichedText",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_6",
      pipe_code: "image_branch",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "DuJZ4",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "processed_image",
            digest: "W48NM",
            concept: "ProcessedImage",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_7",
      pipe_code: "extract_images",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "DuJZ4",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "described",
            digest: "n3DWm",
            concept: "Text",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_8",
      pipe_code: "caption_images",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "described",
            digest: "n3DWm",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "captioned",
            digest: "W48NM",
            concept: "ProcessedImage",
          },
        ],
      },
    },
    {
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_9",
      pipe_code: "combine_results",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "clean_text",
            digest: "ZEUXM",
            concept: "EnrichedText",
          },
          {
            name: "processed_image",
            digest: "W48NM",
            concept: "ProcessedImage",
          },
        ],
        outputs: [
          {
            name: "processed",
            digest: "gDG4S",
            concept: "ProcessedContent",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_0",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_1",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_0",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_0",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_2",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_1",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_2",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_3",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_2",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_3",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_4",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_3",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_3",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_5",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_4",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_2",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_6",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_5",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_6",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_7",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_6",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_6",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_8",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_7",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_0",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_9",
      kind: "contains",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_8",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_1",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_2",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_9",
      label: "pages",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_1",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_3",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_10",
      label: "pages",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_1",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_4",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_11",
      label: "pages",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_4",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_5",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_12",
      label: "clean_text",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_1",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_6",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_13",
      label: "pages",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_1",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_7",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_14",
      label: "pages",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_7",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_8",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_15",
      label: "described",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_2",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_9",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_16",
      label: "clean_text",
    },
    {
      source: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_2",
      target: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:node_9",
      kind: "data",
      id: "83fb0fd8-ae8c-4971-a6e5-07b2e8d42488:edge_17",
      label: "processed_image",
    },
  ],
};

export const LIVE_NESTED_SEQ_COND_SEQ: GraphSpec = {
  nodes: [
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_0",
      pipe_code: "smart_responder",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "request",
            digest: "4FySt",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "polished",
            digest: "BNevK",
            concept: "Response",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      pipe_code: "classify_request",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "request",
            digest: "4FySt",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "classified",
            digest: "ST5QL",
            concept: "ClassifiedRequest",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_2",
      pipe_code: "route_response",
      pipe_type: "PipeCondition",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "ST5QL",
            concept: "ClassifiedRequest",
          },
        ],
        outputs: [
          {
            name: "response",
            digest: "BNevK",
            concept: "Response",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_3",
      pipe_code: "image_response_path",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "ST5QL",
            concept: "ClassifiedRequest",
          },
        ],
        outputs: [
          {
            name: "captioned",
            digest: "VFaCF",
            concept: "Response",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_4",
      pipe_code: "generate_response_image",
      pipe_type: "PipeImgGen",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "ST5QL",
            concept: "ClassifiedRequest",
          },
        ],
        outputs: [
          {
            name: "image",
            digest: "8h4iJ",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_5",
      pipe_code: "caption_response",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "image",
            digest: "8h4iJ",
            concept: "Image",
            content_type: "image/jpeg",
          },
          {
            name: "classified",
            digest: "ST5QL",
            concept: "ClassifiedRequest",
          },
        ],
        outputs: [
          {
            name: "captioned",
            digest: "VFaCF",
            concept: "Response",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_6",
      pipe_code: "text_response_path",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "ST5QL",
            concept: "ClassifiedRequest",
          },
        ],
        outputs: [
          {
            name: "polished",
            digest: "BNevK",
            concept: "Response",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_7",
      pipe_code: "draft_text",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "ST5QL",
            concept: "ClassifiedRequest",
          },
        ],
        outputs: [
          {
            name: "draft",
            digest: "KhwxR",
            concept: "DraftResponse",
          },
        ],
      },
    },
    {
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_8",
      pipe_code: "polish_text",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "draft",
            digest: "KhwxR",
            concept: "DraftResponse",
          },
        ],
        outputs: [
          {
            name: "polished",
            digest: "BNevK",
            concept: "Response",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_0",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_0",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_0",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_2",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_1",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_2",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_3",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_2",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_3",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_4",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_3",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_3",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_5",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_4",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_2",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_6",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_5",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_6",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_7",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_6",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_6",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_8",
      kind: "contains",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_7",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_2",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_8",
      label: "classified",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_3",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_9",
      label: "classified",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_4",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_10",
      label: "classified",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_4",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_5",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_11",
      label: "image",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_5",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_12",
      label: "classified",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_6",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_13",
      label: "classified",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_1",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_7",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_14",
      label: "classified",
    },
    {
      source: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_7",
      target: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:node_8",
      kind: "data",
      id: "e177d2c2-c7c7-4ea1-82ad-1fb5f057d047:edge_15",
      label: "draft",
    },
  ],
};

export const LIVE_BATCH_WITH_INNER_SEQ: GraphSpec = {
  nodes: [
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_0",
      pipe_code: "batch_enrich",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GxmA2",
            concept: "Document",
            content_type: "SWhyBqZtPGivGDKyEqiZ",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "W5YFk",
            concept: "EnrichmentReport",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_1",
      pipe_code: "load_records",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GxmA2",
            concept: "Document",
            content_type: "SWhyBqZtPGivGDKyEqiZ",
          },
        ],
        outputs: [
          {
            name: "records",
            digest: "4y4hH",
            concept: "Record",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      pipe_code: "enrich_single_batch",
      pipe_type: "PipeBatch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "records",
            digest: "4y4hH",
            concept: "Record",
          },
        ],
        outputs: [
          {
            name: "enriched_records",
            digest: "Ekmga",
            concept: "EnrichedRecord",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_3",
      pipe_code: "enrich_single",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-0",
            concept: "Record",
          },
        ],
        outputs: [
          {
            name: "enriched",
            digest: "kv53N",
            concept: "EnrichedRecord",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_4",
      pipe_code: "lookup_details",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-0",
            concept: "Record",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "F9mtA",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_5",
      pipe_code: "format_entry",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-0",
            concept: "Record",
          },
          {
            name: "search_result",
            digest: "F9mtA",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "enriched",
            digest: "kv53N",
            concept: "EnrichedRecord",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_6",
      pipe_code: "enrich_single",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-1",
            concept: "Record",
          },
        ],
        outputs: [
          {
            name: "enriched",
            digest: "34nKb",
            concept: "EnrichedRecord",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_7",
      pipe_code: "lookup_details",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-1",
            concept: "Record",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "dMxg9",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_8",
      pipe_code: "format_entry",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-1",
            concept: "Record",
          },
          {
            name: "search_result",
            digest: "dMxg9",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "enriched",
            digest: "34nKb",
            concept: "EnrichedRecord",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_9",
      pipe_code: "enrich_single",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-2",
            concept: "Record",
          },
        ],
        outputs: [
          {
            name: "enriched",
            digest: "cespV",
            concept: "EnrichedRecord",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_10",
      pipe_code: "lookup_details",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-2",
            concept: "Record",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "LyRZf",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_11",
      pipe_code: "format_entry",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "record",
            digest: "4y4hH-branch-2",
            concept: "Record",
          },
          {
            name: "search_result",
            digest: "LyRZf",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "enriched",
            digest: "cespV",
            concept: "EnrichedRecord",
          },
        ],
      },
    },
    {
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:node_12",
      pipe_code: "export_results",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "enriched_records",
            digest: "Ekmga",
            concept: "EnrichedRecord",
          },
        ],
        outputs: [
          {
            name: "report",
            digest: "W5YFk",
            concept: "EnrichmentReport",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_0",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_1",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_0",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_0",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_1",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_3",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_2",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_3",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_4",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_3",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_3",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_5",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_4",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_6",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_5",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_6",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_7",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_6",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_6",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_8",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_7",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_9",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_8",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_9",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_10",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_9",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_9",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_11",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_10",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_0",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_12",
      kind: "contains",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_11",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_1",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      kind: "data",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_12",
      label: "records",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_4",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_5",
      kind: "data",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_13",
      label: "search_result",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_7",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_8",
      kind: "data",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_14",
      label: "search_result",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_10",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_11",
      kind: "data",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_15",
      label: "search_result",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_12",
      kind: "data",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_16",
      label: "enriched_records",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_3",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_17",
      label: "[0]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-0",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_4",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_18",
      label: "[0]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-0",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_5",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_19",
      label: "[0]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-0",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_6",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_20",
      label: "[1]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-1",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_7",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_21",
      label: "[1]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-1",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_8",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_22",
      label: "[1]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-1",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_9",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_23",
      label: "[2]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-2",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_10",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_24",
      label: "[2]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-2",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_11",
      kind: "batch_item",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_25",
      label: "[2]",
      source_stuff_digest: "4y4hH",
      target_stuff_digest: "4y4hH-branch-2",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_3",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      kind: "batch_aggregate",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_26",
      label: "[0]",
      source_stuff_digest: "kv53N",
      target_stuff_digest: "Ekmga",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_6",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      kind: "batch_aggregate",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_27",
      label: "[1]",
      source_stuff_digest: "34nKb",
      target_stuff_digest: "Ekmga",
    },
    {
      source: "f6da930c-d8eb-4391-abc8-5891777b4470:node_9",
      target: "f6da930c-d8eb-4391-abc8-5891777b4470:node_2",
      kind: "batch_aggregate",
      id: "f6da930c-d8eb-4391-abc8-5891777b4470:edge_28",
      label: "[2]",
      source_stuff_digest: "cespV",
      target_stuff_digest: "Ekmga",
    },
  ],
};

export const LIVE_DIAMOND_PATTERN: GraphSpec = {
  nodes: [
    {
      id: "49faea64-c900-4ad7-91f4-43001da4b749:node_0",
      pipe_code: "diamond_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "gkZS4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "merged",
            digest: "nTNoM",
            concept: "MergedResult",
          },
        ],
      },
    },
    {
      id: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      pipe_code: "quad_process",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "gkZS4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "alpha_result",
            digest: "Swvhy",
            concept: "ProcessedData",
          },
          {
            name: "beta_result",
            digest: "kdou8",
            concept: "SearchResult",
          },
          {
            name: "gamma_result",
            digest: "3Zw93",
            concept: "ProcessedData",
          },
          {
            name: "delta_result",
            digest: "U9ics",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "49faea64-c900-4ad7-91f4-43001da4b749:node_2",
      pipe_code: "process_alpha",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "gkZS4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "alpha_result",
            digest: "Swvhy",
            concept: "ProcessedData",
          },
        ],
      },
    },
    {
      id: "49faea64-c900-4ad7-91f4-43001da4b749:node_3",
      pipe_code: "process_beta",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "gkZS4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "beta_result",
            digest: "kdou8",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "49faea64-c900-4ad7-91f4-43001da4b749:node_4",
      pipe_code: "process_gamma",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "gkZS4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "gamma_result",
            digest: "3Zw93",
            concept: "ProcessedData",
          },
        ],
      },
    },
    {
      id: "49faea64-c900-4ad7-91f4-43001da4b749:node_5",
      pipe_code: "process_delta",
      pipe_type: "PipeImgGen",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "gkZS4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "delta_result",
            digest: "U9ics",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "49faea64-c900-4ad7-91f4-43001da4b749:node_6",
      pipe_code: "merge_all",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "alpha_result",
            digest: "Swvhy",
            concept: "ProcessedData",
          },
          {
            name: "beta_result",
            digest: "kdou8",
            concept: "SearchResult",
          },
          {
            name: "gamma_result",
            digest: "3Zw93",
            concept: "ProcessedData",
          },
          {
            name: "delta_result",
            digest: "U9ics",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
        outputs: [
          {
            name: "merged",
            digest: "nTNoM",
            concept: "MergedResult",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_0",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      kind: "contains",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_0",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_2",
      kind: "contains",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_1",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_3",
      kind: "contains",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_2",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_4",
      kind: "contains",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_3",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_5",
      kind: "contains",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_4",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_0",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_6",
      kind: "contains",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_5",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_6",
      kind: "data",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_6",
      label: "alpha_result",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_6",
      kind: "data",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_7",
      label: "beta_result",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_6",
      kind: "data",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_8",
      label: "gamma_result",
    },
    {
      source: "49faea64-c900-4ad7-91f4-43001da4b749:node_1",
      target: "49faea64-c900-4ad7-91f4-43001da4b749:node_6",
      kind: "data",
      id: "49faea64-c900-4ad7-91f4-43001da4b749:edge_9",
      label: "delta_result",
    },
  ],
};

export const LIVE_ALL_PIPE_TYPES: GraphSpec = {
  nodes: [
    {
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_0",
      pipe_code: "all_types_chain",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "U3Cfz",
            concept: "Document",
            content_type: "qBJdTXzyuqwQgBoGRwMg",
          },
        ],
        outputs: [
          {
            name: "output",
            digest: "GEF8q",
            concept: "FinalOutput",
          },
        ],
      },
    },
    {
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_1",
      pipe_code: "step_extract",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "U3Cfz",
            concept: "Document",
            content_type: "qBJdTXzyuqwQgBoGRwMg",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "KrURW",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_2",
      pipe_code: "step_llm",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "KrURW",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "analysis",
            digest: "C3gVB",
            concept: "Analysis",
          },
        ],
      },
    },
    {
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_3",
      pipe_code: "step_search",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "C3gVB",
            concept: "Analysis",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "StcQX",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_4",
      pipe_code: "step_imggen",
      pipe_type: "PipeImgGen",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "C3gVB",
            concept: "Analysis",
          },
        ],
        outputs: [
          {
            name: "visualization",
            digest: "h5Jtc",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_5",
      pipe_code: "step_compose",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "C3gVB",
            concept: "Analysis",
          },
          {
            name: "search_result",
            digest: "StcQX",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "output",
            digest: "GEF8q",
            concept: "FinalOutput",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_0",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_1",
      kind: "contains",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_0",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_0",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_2",
      kind: "contains",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_1",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_0",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_3",
      kind: "contains",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_2",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_0",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_4",
      kind: "contains",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_3",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_0",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_5",
      kind: "contains",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_4",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_1",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_2",
      kind: "data",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_5",
      label: "pages",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_2",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_3",
      kind: "data",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_6",
      label: "analysis",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_2",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_4",
      kind: "data",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_7",
      label: "analysis",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_2",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_5",
      kind: "data",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_8",
      label: "analysis",
    },
    {
      source: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_3",
      target: "49d1a4d8-b475-4578-860e-d924f270cf9b:node_5",
      kind: "data",
      id: "49d1a4d8-b475-4578-860e-d924f270cf9b:edge_9",
      label: "search_result",
    },
  ],
};

export const LIVE_RAG_PIPELINE: GraphSpec = {
  nodes: [
    {
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_0",
      pipe_code: "rag_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "question",
            digest: "FckqG",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "answer",
            digest: "EdKdY",
            concept: "Answer",
          },
        ],
      },
    },
    {
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_1",
      pipe_code: "embed_query",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "question",
            digest: "FckqG",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "query_embedding",
            digest: "eFYGF",
            concept: "QueryEmbedding",
          },
        ],
      },
    },
    {
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_2",
      pipe_code: "parallel_search",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query_embedding",
            digest: "eFYGF",
            concept: "QueryEmbedding",
          },
          {
            name: "question",
            digest: "FckqG",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "vector_results",
            digest: "nAV68",
            concept: "SearchResult",
          },
          {
            name: "keyword_results",
            digest: "SfaH8",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_3",
      pipe_code: "vector_search",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query_embedding",
            digest: "eFYGF",
            concept: "QueryEmbedding",
          },
        ],
        outputs: [
          {
            name: "vector_results",
            digest: "nAV68",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_4",
      pipe_code: "keyword_search",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "question",
            digest: "FckqG",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "keyword_results",
            digest: "SfaH8",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_5",
      pipe_code: "rerank_results",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "vector_results",
            digest: "nAV68",
            concept: "SearchResult",
          },
          {
            name: "keyword_results",
            digest: "SfaH8",
            concept: "SearchResult",
          },
          {
            name: "question",
            digest: "FckqG",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "context",
            digest: "W9DKh",
            concept: "RankedContext",
          },
        ],
      },
    },
    {
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_6",
      pipe_code: "generate_answer",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "question",
            digest: "FckqG",
            concept: "Text",
          },
          {
            name: "context",
            digest: "W9DKh",
            concept: "RankedContext",
          },
        ],
        outputs: [
          {
            name: "answer",
            digest: "EdKdY",
            concept: "Answer",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_0",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_1",
      kind: "contains",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_0",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_0",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_2",
      kind: "contains",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_1",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_2",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_3",
      kind: "contains",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_2",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_2",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_4",
      kind: "contains",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_3",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_0",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_5",
      kind: "contains",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_4",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_0",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_6",
      kind: "contains",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_5",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_1",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_2",
      kind: "data",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_6",
      label: "query_embedding",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_1",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_3",
      kind: "data",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_7",
      label: "query_embedding",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_2",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_5",
      kind: "data",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_8",
      label: "vector_results",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_2",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_5",
      kind: "data",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_9",
      label: "keyword_results",
    },
    {
      source: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_5",
      target: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:node_6",
      kind: "data",
      id: "4a27da58-3667-4c8e-b9f9-c8db511c1a93:edge_10",
      label: "context",
    },
  ],
};

export const LIVE_IMAGE_PIPELINE: GraphSpec = {
  nodes: [
    {
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_0",
      pipe_code: "image_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "image",
            digest: "NdCsP",
            concept: "Image",
            content_type: "hbfmIRVFSfvVzoOcDgqF",
          },
        ],
        outputs: [
          {
            name: "entry",
            digest: "LrjRz",
            concept: "CatalogEntry",
          },
        ],
      },
    },
    {
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_1",
      pipe_code: "parallel_analyze",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "image",
            digest: "NdCsP",
            concept: "Image",
            content_type: "hbfmIRVFSfvVzoOcDgqF",
          },
        ],
        outputs: [
          {
            name: "description",
            digest: "Ty5ae",
            concept: "Description",
          },
          {
            name: "tags",
            digest: "am757",
            concept: "TagList",
          },
          {
            name: "thumbnail",
            digest: "SRveo",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_2",
      pipe_code: "describe_image",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "image",
            digest: "NdCsP",
            concept: "Image",
            content_type: "hbfmIRVFSfvVzoOcDgqF",
          },
        ],
        outputs: [
          {
            name: "description",
            digest: "Ty5ae",
            concept: "Description",
          },
        ],
      },
    },
    {
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_3",
      pipe_code: "classify_image",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "image",
            digest: "NdCsP",
            concept: "Image",
            content_type: "hbfmIRVFSfvVzoOcDgqF",
          },
        ],
        outputs: [
          {
            name: "tags",
            digest: "am757",
            concept: "TagList",
          },
        ],
      },
    },
    {
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_4",
      pipe_code: "generate_thumbnail",
      pipe_type: "PipeImgGen",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "image",
            digest: "NdCsP",
            concept: "Image",
            content_type: "hbfmIRVFSfvVzoOcDgqF",
          },
        ],
        outputs: [
          {
            name: "thumbnail",
            digest: "SRveo",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_5",
      pipe_code: "build_catalog",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "description",
            digest: "Ty5ae",
            concept: "Description",
          },
          {
            name: "tags",
            digest: "am757",
            concept: "TagList",
          },
        ],
        outputs: [
          {
            name: "entry",
            digest: "LrjRz",
            concept: "CatalogEntry",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_0",
      target: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_1",
      kind: "contains",
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:edge_0",
    },
    {
      source: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_1",
      target: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_2",
      kind: "contains",
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:edge_1",
    },
    {
      source: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_1",
      target: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_3",
      kind: "contains",
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:edge_2",
    },
    {
      source: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_1",
      target: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_4",
      kind: "contains",
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:edge_3",
    },
    {
      source: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_0",
      target: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_5",
      kind: "contains",
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:edge_4",
    },
    {
      source: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_1",
      target: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_5",
      kind: "data",
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:edge_5",
      label: "description",
    },
    {
      source: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_1",
      target: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:node_5",
      kind: "data",
      id: "89b750b7-9aa9-4ddc-9f71-d6f1f98825ee:edge_6",
      label: "tags",
    },
  ],
};

export const LIVE_EMAIL_TRIAGE: GraphSpec = {
  nodes: [
    {
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_0",
      pipe_code: "email_triage",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "553ff",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "inbox_digest",
            digest: "d7D5T",
            concept: "InboxDigest",
          },
        ],
      },
    },
    {
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_1",
      pipe_code: "search_inbox",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "553ff",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "A5yG5",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_2",
      pipe_code: "classify_email",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "search_result",
            digest: "A5yG5",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "classified",
            digest: "XKHTE",
            concept: "EmailClassification",
          },
        ],
      },
    },
    {
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_3",
      pipe_code: "route_email",
      pipe_type: "PipeCondition",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "XKHTE",
            concept: "EmailClassification",
          },
        ],
        outputs: [
          {
            name: "digest",
            digest: "d7D5T",
            concept: "InboxDigest",
          },
        ],
      },
    },
    {
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_4",
      pipe_code: "flag_for_review",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "XKHTE",
            concept: "EmailClassification",
          },
        ],
        outputs: [
          {
            name: "inbox_digest",
            digest: "dMrXd",
            concept: "InboxDigest",
          },
        ],
      },
    },
    {
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_5",
      pipe_code: "generate_auto_reply",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "XKHTE",
            concept: "EmailClassification",
          },
        ],
        outputs: [
          {
            name: "inbox_digest",
            digest: "d7D5T",
            concept: "InboxDigest",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_0",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_1",
      kind: "contains",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_0",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_0",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_2",
      kind: "contains",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_1",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_0",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_3",
      kind: "contains",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_2",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_3",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_4",
      kind: "contains",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_3",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_3",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_5",
      kind: "contains",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_4",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_1",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_2",
      kind: "data",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_5",
      label: "search_result",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_2",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_3",
      kind: "data",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_6",
      label: "classified",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_2",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_4",
      kind: "data",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_7",
      label: "classified",
    },
    {
      source: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_2",
      target: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:node_5",
      kind: "data",
      id: "b2620e0e-114b-4d93-9ad5-c151a9bc759b:edge_8",
      label: "classified",
    },
  ],
};

export const LIVE_CODE_REVIEW: GraphSpec = {
  nodes: [
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_0",
      pipe_code: "review_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pr_url",
            digest: "AGp39",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "review",
            digest: "YFC4h",
            concept: "CodeReview",
          },
        ],
      },
    },
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_1",
      pipe_code: "fetch_diff",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pr_url",
            digest: "AGp39",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "diff",
            digest: "XXobo",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      pipe_code: "parallel_checks",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "diff",
            digest: "XXobo",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "security_findings",
            digest: "cPVZL",
            concept: "ReviewFinding",
          },
          {
            name: "style_findings",
            digest: "YKD6M",
            concept: "ReviewFinding",
          },
          {
            name: "logic_findings",
            digest: "67RRg",
            concept: "ReviewFinding",
          },
          {
            name: "perf_findings",
            digest: "3FLdF",
            concept: "ReviewFinding",
          },
        ],
      },
    },
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_3",
      pipe_code: "security_check",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "diff",
            digest: "XXobo",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "security_findings",
            digest: "cPVZL",
            concept: "ReviewFinding",
          },
        ],
      },
    },
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_4",
      pipe_code: "style_check",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "diff",
            digest: "XXobo",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "style_findings",
            digest: "YKD6M",
            concept: "ReviewFinding",
          },
        ],
      },
    },
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_5",
      pipe_code: "logic_check",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "diff",
            digest: "XXobo",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "logic_findings",
            digest: "67RRg",
            concept: "ReviewFinding",
          },
        ],
      },
    },
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_6",
      pipe_code: "perf_check",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "diff",
            digest: "XXobo",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "perf_findings",
            digest: "3FLdF",
            concept: "ReviewFinding",
          },
        ],
      },
    },
    {
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_7",
      pipe_code: "compose_review",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "security_findings",
            digest: "cPVZL",
            concept: "ReviewFinding",
          },
          {
            name: "style_findings",
            digest: "YKD6M",
            concept: "ReviewFinding",
          },
          {
            name: "logic_findings",
            digest: "67RRg",
            concept: "ReviewFinding",
          },
          {
            name: "perf_findings",
            digest: "3FLdF",
            concept: "ReviewFinding",
          },
        ],
        outputs: [
          {
            name: "review",
            digest: "YFC4h",
            concept: "CodeReview",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_0",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_1",
      kind: "contains",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_0",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_0",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      kind: "contains",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_1",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_3",
      kind: "contains",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_2",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_4",
      kind: "contains",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_3",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_5",
      kind: "contains",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_4",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_6",
      kind: "contains",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_5",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_0",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_7",
      kind: "contains",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_6",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_1",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_7",
      label: "diff",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_1",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_3",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_8",
      label: "diff",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_1",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_4",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_9",
      label: "diff",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_1",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_5",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_10",
      label: "diff",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_1",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_6",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_11",
      label: "diff",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_7",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_12",
      label: "security_findings",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_7",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_13",
      label: "style_findings",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_7",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_14",
      label: "logic_findings",
    },
    {
      source: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_2",
      target: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:node_7",
      kind: "data",
      id: "85f4c145-d5c4-445c-bb67-d7aa5b2830cc:edge_15",
      label: "perf_findings",
    },
  ],
};

export const LIVE_CONTENT_MODERATION: GraphSpec = {
  nodes: [
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_0",
      pipe_code: "moderation_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "content",
            digest: "fDdx4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "moderation_result",
            digest: "bXPWz",
            concept: "ModerationResult",
          },
        ],
      },
    },
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_1",
      pipe_code: "parallel_checks",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "content",
            digest: "fDdx4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "text_score",
            digest: "bme7c",
            concept: "SafetyScore",
          },
          {
            name: "image_score",
            digest: "NhpWm",
            concept: "SafetyScore",
          },
        ],
      },
    },
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_2",
      pipe_code: "check_text_safety",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "content",
            digest: "fDdx4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "text_score",
            digest: "bme7c",
            concept: "SafetyScore",
          },
        ],
      },
    },
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_3",
      pipe_code: "check_image_safety",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "content",
            digest: "fDdx4",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "image_score",
            digest: "NhpWm",
            concept: "SafetyScore",
          },
        ],
      },
    },
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_4",
      pipe_code: "make_decision",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "text_score",
            digest: "bme7c",
            concept: "SafetyScore",
          },
          {
            name: "image_score",
            digest: "NhpWm",
            concept: "SafetyScore",
          },
        ],
        outputs: [
          {
            name: "decision",
            digest: "nn7t3",
            concept: "Decision",
          },
        ],
      },
    },
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_5",
      pipe_code: "route_action",
      pipe_type: "PipeCondition",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "decision",
            digest: "nn7t3",
            concept: "Decision",
          },
        ],
        outputs: [
          {
            name: "result",
            digest: "bXPWz",
            concept: "ModerationResult",
          },
        ],
      },
    },
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_6",
      pipe_code: "approve_content",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "decision",
            digest: "nn7t3",
            concept: "Decision",
          },
        ],
        outputs: [
          {
            name: "moderation_result",
            digest: "aMAnn",
            concept: "ModerationResult",
          },
        ],
      },
    },
    {
      id: "7710057b-d391-42de-8736-debebc39ac16:node_7",
      pipe_code: "reject_content",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "decision",
            digest: "nn7t3",
            concept: "Decision",
          },
        ],
        outputs: [
          {
            name: "moderation_result",
            digest: "bXPWz",
            concept: "ModerationResult",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_0",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_1",
      kind: "contains",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_0",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_1",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_2",
      kind: "contains",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_1",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_1",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_3",
      kind: "contains",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_2",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_0",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_4",
      kind: "contains",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_3",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_0",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_5",
      kind: "contains",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_4",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_5",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_6",
      kind: "contains",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_5",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_5",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_7",
      kind: "contains",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_6",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_1",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_4",
      kind: "data",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_7",
      label: "text_score",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_1",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_4",
      kind: "data",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_8",
      label: "image_score",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_4",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_5",
      kind: "data",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_9",
      label: "decision",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_4",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_6",
      kind: "data",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_10",
      label: "decision",
    },
    {
      source: "7710057b-d391-42de-8736-debebc39ac16:node_4",
      target: "7710057b-d391-42de-8736-debebc39ac16:node_7",
      kind: "data",
      id: "7710057b-d391-42de-8736-debebc39ac16:edge_11",
      label: "decision",
    },
  ],
};

export const LIVE_WIDE_PARALLEL: GraphSpec = {
  nodes: [
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_0",
      pipe_code: "wide_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "Q9qnT",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "collected",
            digest: "PnLJF",
            concept: "CollectedResults",
          },
        ],
      },
    },
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      pipe_code: "five_way_split",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "Q9qnT",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "alpha",
            digest: "3L2zW",
            concept: "ProcessedData",
          },
          {
            name: "beta",
            digest: "VJWzx",
            concept: "SearchResult",
          },
          {
            name: "gamma",
            digest: "XGYVR",
            concept: "Image",
            content_type: "image/jpeg",
          },
          {
            name: "delta",
            digest: "ZEM5c",
            concept: "ProcessedData",
          },
          {
            name: "epsilon",
            digest: "dBLGW",
            concept: "ProcessedData",
          },
        ],
      },
    },
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_2",
      pipe_code: "process_alpha",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "Q9qnT",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "alpha",
            digest: "3L2zW",
            concept: "ProcessedData",
          },
        ],
      },
    },
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_3",
      pipe_code: "process_beta",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "Q9qnT",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "beta",
            digest: "VJWzx",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_4",
      pipe_code: "process_gamma",
      pipe_type: "PipeImgGen",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "Q9qnT",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "gamma",
            digest: "XGYVR",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_5",
      pipe_code: "process_delta",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "Q9qnT",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "delta",
            digest: "ZEM5c",
            concept: "ProcessedData",
          },
        ],
      },
    },
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_6",
      pipe_code: "process_epsilon",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "data",
            digest: "Q9qnT",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "epsilon",
            digest: "dBLGW",
            concept: "ProcessedData",
          },
        ],
      },
    },
    {
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_7",
      pipe_code: "collect_all",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "alpha",
            digest: "3L2zW",
            concept: "ProcessedData",
          },
          {
            name: "beta",
            digest: "VJWzx",
            concept: "SearchResult",
          },
          {
            name: "gamma",
            digest: "XGYVR",
            concept: "Image",
            content_type: "image/jpeg",
          },
          {
            name: "delta",
            digest: "ZEM5c",
            concept: "ProcessedData",
          },
          {
            name: "epsilon",
            digest: "dBLGW",
            concept: "ProcessedData",
          },
        ],
        outputs: [
          {
            name: "collected",
            digest: "PnLJF",
            concept: "CollectedResults",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_0",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      kind: "contains",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_0",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_2",
      kind: "contains",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_1",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_3",
      kind: "contains",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_2",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_4",
      kind: "contains",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_3",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_5",
      kind: "contains",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_4",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_6",
      kind: "contains",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_5",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_0",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_7",
      kind: "contains",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_6",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_7",
      kind: "data",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_7",
      label: "alpha",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_7",
      kind: "data",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_8",
      label: "beta",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_7",
      kind: "data",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_9",
      label: "gamma",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_7",
      kind: "data",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_10",
      label: "delta",
    },
    {
      source: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_1",
      target: "7f780e87-e50f-4a73-9ac0-579ff84391e8:node_7",
      kind: "data",
      id: "7f780e87-e50f-4a73-9ac0-579ff84391e8:edge_11",
      label: "epsilon",
    },
  ],
};

export const LIVE_MULTI_INPUT_CONVERGE: GraphSpec = {
  nodes: [
    {
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_0",
      pipe_code: "multi_source_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "6WSjP",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "combined",
            digest: "iKyzt",
            concept: "CombinedData",
          },
        ],
      },
    },
    {
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      pipe_code: "gather_sources",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "6WSjP",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "api_data",
            digest: "ff533",
            concept: "SearchResult",
          },
          {
            name: "web_data",
            digest: "UsuUS",
            concept: "SearchResult",
          },
          {
            name: "academic_data",
            digest: "GvF6e",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_2",
      pipe_code: "fetch_api",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "6WSjP",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "api_data",
            digest: "ff533",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_3",
      pipe_code: "search_web",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "6WSjP",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "web_data",
            digest: "UsuUS",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_4",
      pipe_code: "search_academic",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "6WSjP",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "academic_data",
            digest: "GvF6e",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_5",
      pipe_code: "combine_sources",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "api_data",
            digest: "ff533",
            concept: "SearchResult",
          },
          {
            name: "web_data",
            digest: "UsuUS",
            concept: "SearchResult",
          },
          {
            name: "academic_data",
            digest: "GvF6e",
            concept: "SearchResult",
          },
          {
            name: "query",
            digest: "6WSjP",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "combined",
            digest: "iKyzt",
            concept: "CombinedData",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_0",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      kind: "contains",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_0",
    },
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_2",
      kind: "contains",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_1",
    },
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_3",
      kind: "contains",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_2",
    },
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_4",
      kind: "contains",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_3",
    },
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_0",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_5",
      kind: "contains",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_4",
    },
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_5",
      kind: "data",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_5",
      label: "api_data",
    },
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_5",
      kind: "data",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_6",
      label: "web_data",
    },
    {
      source: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_1",
      target: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:node_5",
      kind: "data",
      id: "8d83d799-7719-4bb8-b19b-3ee47a6c078b:edge_7",
      label: "academic_data",
    },
  ],
};

export const LIVE_MULTI_OUTPUT_FANOUT: GraphSpec = {
  nodes: [
    {
      id: "1b506fae-799c-4450-84c3-f63483d8816f:node_0",
      pipe_code: "fanout_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GiZsC",
            concept: "Document",
            content_type: "fyYehvawToFPHQufcTEL",
          },
        ],
        outputs: [
          {
            name: "distribution_report",
            digest: "NRdmv",
            concept: "DistributionReport",
          },
        ],
      },
    },
    {
      id: "1b506fae-799c-4450-84c3-f63483d8816f:node_1",
      pipe_code: "deep_analyze",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "GiZsC",
            concept: "Document",
            content_type: "fyYehvawToFPHQufcTEL",
          },
        ],
        outputs: [
          {
            name: "analysis",
            digest: "Csqpo",
            concept: "Analysis",
          },
        ],
      },
    },
    {
      id: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      pipe_code: "distribute",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "Csqpo",
            concept: "Analysis",
          },
        ],
        outputs: [
          {
            name: "summary",
            digest: "RY65q",
            concept: "Summary",
          },
          {
            name: "index_entry",
            digest: "Nbayc",
            concept: "IndexEntry",
          },
          {
            name: "sentiment_log",
            digest: "mYvqf",
            concept: "SentimentLog",
          },
        ],
      },
    },
    {
      id: "1b506fae-799c-4450-84c3-f63483d8816f:node_3",
      pipe_code: "store_summary",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "Csqpo",
            concept: "Analysis",
          },
        ],
        outputs: [
          {
            name: "summary",
            digest: "RY65q",
            concept: "Summary",
          },
        ],
      },
    },
    {
      id: "1b506fae-799c-4450-84c3-f63483d8816f:node_4",
      pipe_code: "index_entities",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "Csqpo",
            concept: "Analysis",
          },
        ],
        outputs: [
          {
            name: "index_entry",
            digest: "Nbayc",
            concept: "IndexEntry",
          },
        ],
      },
    },
    {
      id: "1b506fae-799c-4450-84c3-f63483d8816f:node_5",
      pipe_code: "log_sentiment",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "Csqpo",
            concept: "Analysis",
          },
        ],
        outputs: [
          {
            name: "sentiment_log",
            digest: "mYvqf",
            concept: "SentimentLog",
          },
        ],
      },
    },
    {
      id: "1b506fae-799c-4450-84c3-f63483d8816f:node_6",
      pipe_code: "report",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "summary",
            digest: "RY65q",
            concept: "Summary",
          },
          {
            name: "index_entry",
            digest: "Nbayc",
            concept: "IndexEntry",
          },
          {
            name: "sentiment_log",
            digest: "mYvqf",
            concept: "SentimentLog",
          },
        ],
        outputs: [
          {
            name: "distribution_report",
            digest: "NRdmv",
            concept: "DistributionReport",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_0",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_1",
      kind: "contains",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_0",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_0",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      kind: "contains",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_1",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_3",
      kind: "contains",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_2",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_4",
      kind: "contains",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_3",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_5",
      kind: "contains",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_4",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_0",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_6",
      kind: "contains",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_5",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_1",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      kind: "data",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_6",
      label: "analysis",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_1",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_3",
      kind: "data",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_7",
      label: "analysis",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_1",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_4",
      kind: "data",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_8",
      label: "analysis",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_1",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_5",
      kind: "data",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_9",
      label: "analysis",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_6",
      kind: "data",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_10",
      label: "summary",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_6",
      kind: "data",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_11",
      label: "index_entry",
    },
    {
      source: "1b506fae-799c-4450-84c3-f63483d8816f:node_2",
      target: "1b506fae-799c-4450-84c3-f63483d8816f:node_6",
      kind: "data",
      id: "1b506fae-799c-4450-84c3-f63483d8816f:edge_12",
      label: "sentiment_log",
    },
  ],
};

export const LIVE_SIBLING_PARALLELS: GraphSpec = {
  nodes: [
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_0",
      pipe_code: "double_parallel_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "9o3qh",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "final",
            digest: "i5Xcj",
            concept: "ProcessedResult",
          },
        ],
      },
    },
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      pipe_code: "gather_phase",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "9o3qh",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "source_a",
            digest: "G6mkX",
            concept: "SearchResult",
          },
          {
            name: "source_b",
            digest: "AVz8f",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_2",
      pipe_code: "gather_source_a",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "9o3qh",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "source_a",
            digest: "G6mkX",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_3",
      pipe_code: "gather_source_b",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "query",
            digest: "9o3qh",
            concept: "Text",
          },
        ],
        outputs: [
          {
            name: "source_b",
            digest: "AVz8f",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      pipe_code: "process_phase",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "source_a",
            digest: "G6mkX",
            concept: "SearchResult",
          },
          {
            name: "source_b",
            digest: "AVz8f",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "result_x",
            digest: "7EyG2",
            concept: "GatheredData",
          },
          {
            name: "result_y",
            digest: "Egt2R",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_5",
      pipe_code: "transform_x",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "source_a",
            digest: "G6mkX",
            concept: "SearchResult",
          },
          {
            name: "source_b",
            digest: "AVz8f",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "result_x",
            digest: "7EyG2",
            concept: "GatheredData",
          },
        ],
      },
    },
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_6",
      pipe_code: "transform_y",
      pipe_type: "PipeImgGen",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "source_a",
            digest: "G6mkX",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "result_y",
            digest: "Egt2R",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
      },
    },
    {
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_7",
      pipe_code: "finalize",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "result_x",
            digest: "7EyG2",
            concept: "GatheredData",
          },
          {
            name: "result_y",
            digest: "Egt2R",
            concept: "Image",
            content_type: "image/jpeg",
          },
        ],
        outputs: [
          {
            name: "final",
            digest: "i5Xcj",
            concept: "ProcessedResult",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_0",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      kind: "contains",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_0",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_2",
      kind: "contains",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_1",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_3",
      kind: "contains",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_2",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_0",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      kind: "contains",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_3",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_5",
      kind: "contains",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_4",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_6",
      kind: "contains",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_5",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_0",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_7",
      kind: "contains",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_6",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      kind: "data",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_7",
      label: "source_a",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      kind: "data",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_8",
      label: "source_b",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_5",
      kind: "data",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_9",
      label: "source_a",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_5",
      kind: "data",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_10",
      label: "source_b",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_1",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_6",
      kind: "data",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_11",
      label: "source_a",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_7",
      kind: "data",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_12",
      label: "result_x",
    },
    {
      source: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_4",
      target: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:node_7",
      kind: "data",
      id: "24577d6c-a4b1-41ac-89b9-3d1dd6667515:edge_13",
      label: "result_y",
    },
  ],
};

export const LIVE_DEEP_NESTING: GraphSpec = {
  nodes: [
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_0",
      pipe_code: "deep_nested_pipeline",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "93F2L",
            concept: "Document",
            content_type: "ErHCzIWdYgKisyEXdgmg",
          },
        ],
        outputs: [
          {
            name: "final",
            digest: "FNfLP",
            concept: "FinalOutput",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_1",
      pipe_code: "extract_input",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "93F2L",
            concept: "Document",
            content_type: "ErHCzIWdYgKisyEXdgmg",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "7kbRi",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_2",
      pipe_code: "level_2_parallel",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "7kbRi",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "batch_result",
            digest: "8Yd76",
            concept: "BatchResult",
          },
          {
            name: "search_summary",
            digest: "BXAZh",
            concept: "SearchSummary",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      pipe_code: "batch_branch",
      pipe_type: "PipeBatch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "7kbRi",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "batch_result",
            digest: "8Yd76",
            concept: "BatchResult",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_4",
      pipe_code: "search_branch",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "7kbRi",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "search_summary",
            digest: "BXAZh",
            concept: "SearchSummary",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_5",
      pipe_code: "search_context",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "7kbRi",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "ku2iq",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_6",
      pipe_code: "summarize_search",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "search_result",
            digest: "ku2iq",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "search_summary",
            digest: "BXAZh",
            concept: "SearchSummary",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_7",
      pipe_code: "process_single_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "7kbRi-branch-0",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "batch_result",
            digest: "ETNBD-branch-0",
            concept: "BatchResult",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_8",
      pipe_code: "process_single_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "7kbRi-branch-1",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "batch_result",
            digest: "ETNBD-branch-1",
            concept: "BatchResult",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_9",
      pipe_code: "process_single_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "7kbRi-branch-2",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "batch_result",
            digest: "ETNBD-branch-2",
            concept: "BatchResult",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_10",
      pipe_code: "process_single_page",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "7kbRi-branch-3",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "batch_result",
            digest: "ETNBD-branch-3",
            concept: "BatchResult",
          },
        ],
      },
    },
    {
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_11",
      pipe_code: "exit_combine",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "batch_result",
            digest: "8Yd76",
            concept: "BatchResult",
          },
          {
            name: "search_summary",
            digest: "BXAZh",
            concept: "SearchSummary",
          },
        ],
        outputs: [
          {
            name: "final",
            digest: "FNfLP",
            concept: "FinalOutput",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_0",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_1",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_0",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_0",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_2",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_1",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_2",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_2",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_2",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_4",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_3",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_4",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_5",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_4",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_4",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_6",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_5",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_7",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_6",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_8",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_7",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_9",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_8",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_10",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_9",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_0",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_11",
      kind: "contains",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_10",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_1",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_2",
      kind: "data",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_11",
      label: "pages",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_1",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      kind: "data",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_12",
      label: "pages",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_1",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_4",
      kind: "data",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_13",
      label: "pages",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_1",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_5",
      kind: "data",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_14",
      label: "pages",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_5",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_6",
      kind: "data",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_15",
      label: "search_result",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_2",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_11",
      kind: "data",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_16",
      label: "batch_result",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_2",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_11",
      kind: "data",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_17",
      label: "search_summary",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_7",
      kind: "batch_item",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_18",
      label: "[0]",
      source_stuff_digest: "7kbRi",
      target_stuff_digest: "7kbRi-branch-0",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_8",
      kind: "batch_item",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_19",
      label: "[1]",
      source_stuff_digest: "7kbRi",
      target_stuff_digest: "7kbRi-branch-1",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_9",
      kind: "batch_item",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_20",
      label: "[2]",
      source_stuff_digest: "7kbRi",
      target_stuff_digest: "7kbRi-branch-2",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_10",
      kind: "batch_item",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_21",
      label: "[3]",
      source_stuff_digest: "7kbRi",
      target_stuff_digest: "7kbRi-branch-3",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_7",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      kind: "batch_aggregate",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_22",
      label: "[0]",
      source_stuff_digest: "ETNBD-branch-0",
      target_stuff_digest: "8Yd76",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_8",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      kind: "batch_aggregate",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_23",
      label: "[1]",
      source_stuff_digest: "ETNBD-branch-1",
      target_stuff_digest: "8Yd76",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_9",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      kind: "batch_aggregate",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_24",
      label: "[2]",
      source_stuff_digest: "ETNBD-branch-2",
      target_stuff_digest: "8Yd76",
    },
    {
      source: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_10",
      target: "da551a7d-8076-4025-b0f2-7a9afe929f9c:node_3",
      kind: "batch_aggregate",
      id: "da551a7d-8076-4025-b0f2-7a9afe929f9c:edge_25",
      label: "[3]",
      source_stuff_digest: "ETNBD-branch-3",
      target_stuff_digest: "8Yd76",
    },
  ],
};

export const LIVE_ALL_CONTROLLER_TYPES: GraphSpec = {
  nodes: [
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_0",
      pipe_code: "all_controllers",
      pipe_type: "PipeSequence",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "guzYC",
            concept: "Document",
            content_type: "flrMqOblMSSRXxPtEriv",
          },
        ],
        outputs: [
          {
            name: "final_report",
            digest: "Q2Rn6",
            concept: "FinalReport",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_1",
      pipe_code: "extract_input",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "document",
            digest: "guzYC",
            concept: "Document",
            content_type: "flrMqOblMSSRXxPtEriv",
          },
        ],
        outputs: [
          {
            name: "pages",
            digest: "nDesx",
            concept: "Page",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_2",
      pipe_code: "parallel_classify",
      pipe_type: "PipeParallel",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "nDesx",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "analysis",
            digest: "LuLCo",
            concept: "Text",
          },
          {
            name: "search_result",
            digest: "eE6cc",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_3",
      pipe_code: "analyze_content",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "nDesx",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "analysis",
            digest: "LuLCo",
            concept: "Text",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_4",
      pipe_code: "search_context",
      pipe_type: "PipeSearch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "nDesx",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "search_result",
            digest: "eE6cc",
            concept: "SearchResult",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      pipe_code: "batch_process_batch",
      pipe_type: "PipeBatch",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "pages",
            digest: "nDesx",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "page_results",
            digest: "XgbFX",
            concept: "ProcessedItem",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_6",
      pipe_code: "batch_process",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "nDesx-branch-0",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "processed_item",
            digest: "Fy8wj-branch-0",
            concept: "ProcessedItem",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_7",
      pipe_code: "batch_process",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "nDesx-branch-1",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "processed_item",
            digest: "Fy8wj-branch-1",
            concept: "ProcessedItem",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_8",
      pipe_code: "batch_process",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "nDesx-branch-2",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "processed_item",
            digest: "Fy8wj-branch-2",
            concept: "ProcessedItem",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_9",
      pipe_code: "batch_process",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "page",
            digest: "nDesx-branch-3",
            concept: "Page",
          },
        ],
        outputs: [
          {
            name: "processed_item",
            digest: "Fy8wj-branch-3",
            concept: "ProcessedItem",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_10",
      pipe_code: "classify_content",
      pipe_type: "PipeLLM",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "analysis",
            digest: "LuLCo",
            concept: "Text",
          },
          {
            name: "search_result",
            digest: "eE6cc",
            concept: "SearchResult",
          },
        ],
        outputs: [
          {
            name: "classified",
            digest: "V5KZk",
            concept: "ClassifiedItem",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_11",
      pipe_code: "route_processing",
      pipe_type: "PipeCondition",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "V5KZk",
            concept: "ClassifiedItem",
          },
        ],
        outputs: [
          {
            name: "processed",
            digest: "Q2Rn6",
            concept: "FinalReport",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_12",
      pipe_code: "process_data",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "V5KZk",
            concept: "ClassifiedItem",
          },
        ],
        outputs: [
          {
            name: "final_report",
            digest: "nMNVW",
            concept: "FinalReport",
          },
        ],
      },
    },
    {
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_13",
      pipe_code: "process_text",
      pipe_type: "PipeCompose",
      status: "succeeded",
      io: {
        inputs: [
          {
            name: "classified",
            digest: "V5KZk",
            concept: "ClassifiedItem",
          },
        ],
        outputs: [
          {
            name: "final_report",
            digest: "Q2Rn6",
            concept: "FinalReport",
          },
        ],
      },
    },
  ],
  edges: [
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_0",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_1",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_0",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_0",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_2",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_1",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_2",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_3",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_2",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_2",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_4",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_3",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_0",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_4",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_6",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_5",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_7",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_6",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_8",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_7",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_9",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_8",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_0",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_10",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_9",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_0",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_11",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_10",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_11",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_12",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_11",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_11",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_13",
      kind: "contains",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_12",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_1",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_2",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_13",
      label: "pages",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_1",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_3",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_14",
      label: "pages",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_1",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_4",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_15",
      label: "pages",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_1",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_16",
      label: "pages",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_2",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_10",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_17",
      label: "analysis",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_2",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_10",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_18",
      label: "search_result",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_10",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_11",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_19",
      label: "classified",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_10",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_12",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_20",
      label: "classified",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_10",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_13",
      kind: "data",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_21",
      label: "classified",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_6",
      kind: "batch_item",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_22",
      label: "[0]",
      source_stuff_digest: "nDesx",
      target_stuff_digest: "nDesx-branch-0",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_7",
      kind: "batch_item",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_23",
      label: "[1]",
      source_stuff_digest: "nDesx",
      target_stuff_digest: "nDesx-branch-1",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_8",
      kind: "batch_item",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_24",
      label: "[2]",
      source_stuff_digest: "nDesx",
      target_stuff_digest: "nDesx-branch-2",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_9",
      kind: "batch_item",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_25",
      label: "[3]",
      source_stuff_digest: "nDesx",
      target_stuff_digest: "nDesx-branch-3",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_6",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      kind: "batch_aggregate",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_26",
      label: "[0]",
      source_stuff_digest: "Fy8wj-branch-0",
      target_stuff_digest: "XgbFX",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_7",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      kind: "batch_aggregate",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_27",
      label: "[1]",
      source_stuff_digest: "Fy8wj-branch-1",
      target_stuff_digest: "XgbFX",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_8",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      kind: "batch_aggregate",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_28",
      label: "[2]",
      source_stuff_digest: "Fy8wj-branch-2",
      target_stuff_digest: "XgbFX",
    },
    {
      source: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_9",
      target: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:node_5",
      kind: "batch_aggregate",
      id: "e9ff2e2f-5cb5-4161-943d-06abc8247fbe:edge_29",
      label: "[3]",
      source_stuff_digest: "Fy8wj-branch-3",
      target_stuff_digest: "XgbFX",
    },
  ],
};

// ─── Catalogs ────────────────────────────────────────────────────────

export const DRY_RUN_CATALOG: Record<string, { label: string; spec: GraphSpec }> = {
  DRY_SINGLE_PIPE: { label: "01 - Single PipeLLM", spec: DRY_SINGLE_PIPE },
  DRY_TWO_PIPE_CHAIN: { label: "02 - Two-Pipe Chain", spec: DRY_TWO_PIPE_CHAIN },
  DRY_SIMPLE_SEQUENCE: { label: "03 - Simple 3-Pipe Sequence", spec: DRY_SIMPLE_SEQUENCE },
  DRY_LONG_SEQUENCE: { label: "04 - Long 6-Pipe Sequence", spec: DRY_LONG_SEQUENCE },
  DRY_SIMPLE_PARALLEL: { label: "05 - Simple Parallel (2 branches)", spec: DRY_SIMPLE_PARALLEL },
  DRY_THREE_WAY_PARALLEL: { label: "06 - Three-Way Parallel", spec: DRY_THREE_WAY_PARALLEL },
  DRY_SIMPLE_CONDITION: { label: "07 - Simple Condition", spec: DRY_SIMPLE_CONDITION },
  DRY_SIMPLE_BATCH: { label: "08 - Simple Batch", spec: DRY_SIMPLE_BATCH },
  DRY_CV_SCREENING: { label: "09 - CV Screening Pipeline", spec: DRY_CV_SCREENING },
  DRY_NESTED_SEQ_PAR_SEQ: {
    label: "10 - Nested Seq > Parallel > Seq",
    spec: DRY_NESTED_SEQ_PAR_SEQ,
  },
  DRY_NESTED_SEQ_COND_SEQ: {
    label: "11 - Nested Seq > Condition > Seq",
    spec: DRY_NESTED_SEQ_COND_SEQ,
  },
  DRY_BATCH_WITH_INNER_SEQ: {
    label: "12 - Batch with Inner Sequence",
    spec: DRY_BATCH_WITH_INNER_SEQ,
  },
  DRY_DIAMOND_PATTERN: { label: "13 - Diamond Pattern", spec: DRY_DIAMOND_PATTERN },
  DRY_ALL_PIPE_TYPES: { label: "14 - All Pipe Types", spec: DRY_ALL_PIPE_TYPES },
  DRY_RAG_PIPELINE: { label: "15 - RAG Pipeline", spec: DRY_RAG_PIPELINE },
  DRY_IMAGE_PIPELINE: { label: "16 - Image Processing", spec: DRY_IMAGE_PIPELINE },
  DRY_EMAIL_TRIAGE: { label: "17 - Email Triage", spec: DRY_EMAIL_TRIAGE },
  DRY_CODE_REVIEW: { label: "18 - Code Review", spec: DRY_CODE_REVIEW },
  DRY_CONTENT_MODERATION: { label: "19 - Content Moderation", spec: DRY_CONTENT_MODERATION },
  DRY_WIDE_PARALLEL: { label: "20 - Wide Parallel (5 branches)", spec: DRY_WIDE_PARALLEL },
  DRY_MULTI_INPUT_CONVERGE: { label: "21 - Multi-Input Converge", spec: DRY_MULTI_INPUT_CONVERGE },
  DRY_MULTI_OUTPUT_FANOUT: { label: "22 - Multi-Output Fan-out", spec: DRY_MULTI_OUTPUT_FANOUT },
  DRY_SIBLING_PARALLELS: { label: "23 - Sibling Parallels", spec: DRY_SIBLING_PARALLELS },
  DRY_DEEP_NESTING: { label: "24 - Deep Nesting", spec: DRY_DEEP_NESTING },
  DRY_ALL_CONTROLLER_TYPES: { label: "25 - All Controller Types", spec: DRY_ALL_CONTROLLER_TYPES },
};

export const LIVE_RUN_CATALOG: Record<string, { label: string; spec: GraphSpec }> = {
  LIVE_SINGLE_PIPE: { label: "01 - Single PipeLLM", spec: LIVE_SINGLE_PIPE },
  LIVE_TWO_PIPE_CHAIN: { label: "02 - Two-Pipe Chain", spec: LIVE_TWO_PIPE_CHAIN },
  LIVE_SIMPLE_SEQUENCE: { label: "03 - Simple 3-Pipe Sequence", spec: LIVE_SIMPLE_SEQUENCE },
  LIVE_LONG_SEQUENCE: { label: "04 - Long 6-Pipe Sequence", spec: LIVE_LONG_SEQUENCE },
  LIVE_SIMPLE_PARALLEL: { label: "05 - Simple Parallel (2 branches)", spec: LIVE_SIMPLE_PARALLEL },
  LIVE_THREE_WAY_PARALLEL: { label: "06 - Three-Way Parallel", spec: LIVE_THREE_WAY_PARALLEL },
  LIVE_SIMPLE_CONDITION: { label: "07 - Simple Condition", spec: LIVE_SIMPLE_CONDITION },
  LIVE_SIMPLE_BATCH: { label: "08 - Simple Batch", spec: LIVE_SIMPLE_BATCH },
  LIVE_CV_SCREENING: { label: "09 - CV Screening Pipeline", spec: LIVE_CV_SCREENING },
  LIVE_NESTED_SEQ_PAR_SEQ: {
    label: "10 - Nested Seq > Parallel > Seq",
    spec: LIVE_NESTED_SEQ_PAR_SEQ,
  },
  LIVE_NESTED_SEQ_COND_SEQ: {
    label: "11 - Nested Seq > Condition > Seq",
    spec: LIVE_NESTED_SEQ_COND_SEQ,
  },
  LIVE_BATCH_WITH_INNER_SEQ: {
    label: "12 - Batch with Inner Sequence",
    spec: LIVE_BATCH_WITH_INNER_SEQ,
  },
  LIVE_DIAMOND_PATTERN: { label: "13 - Diamond Pattern", spec: LIVE_DIAMOND_PATTERN },
  LIVE_ALL_PIPE_TYPES: { label: "14 - All Pipe Types", spec: LIVE_ALL_PIPE_TYPES },
  LIVE_RAG_PIPELINE: { label: "15 - RAG Pipeline", spec: LIVE_RAG_PIPELINE },
  LIVE_IMAGE_PIPELINE: { label: "16 - Image Processing", spec: LIVE_IMAGE_PIPELINE },
  LIVE_EMAIL_TRIAGE: { label: "17 - Email Triage", spec: LIVE_EMAIL_TRIAGE },
  LIVE_CODE_REVIEW: { label: "18 - Code Review", spec: LIVE_CODE_REVIEW },
  LIVE_CONTENT_MODERATION: { label: "19 - Content Moderation", spec: LIVE_CONTENT_MODERATION },
  LIVE_WIDE_PARALLEL: { label: "20 - Wide Parallel (5 branches)", spec: LIVE_WIDE_PARALLEL },
  LIVE_MULTI_INPUT_CONVERGE: {
    label: "21 - Multi-Input Converge",
    spec: LIVE_MULTI_INPUT_CONVERGE,
  },
  LIVE_MULTI_OUTPUT_FANOUT: { label: "22 - Multi-Output Fan-out", spec: LIVE_MULTI_OUTPUT_FANOUT },
  LIVE_SIBLING_PARALLELS: { label: "23 - Sibling Parallels", spec: LIVE_SIBLING_PARALLELS },
  LIVE_DEEP_NESTING: { label: "24 - Deep Nesting", spec: LIVE_DEEP_NESTING },
  LIVE_ALL_CONTROLLER_TYPES: {
    label: "25 - All Controller Types",
    spec: LIVE_ALL_CONTROLLER_TYPES,
  },
};
