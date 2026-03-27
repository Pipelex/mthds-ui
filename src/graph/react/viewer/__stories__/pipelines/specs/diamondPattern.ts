import type { GraphSpec } from "@graph/types";

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
