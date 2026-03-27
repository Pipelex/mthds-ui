import type { GraphSpec } from "@graph/types";

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
