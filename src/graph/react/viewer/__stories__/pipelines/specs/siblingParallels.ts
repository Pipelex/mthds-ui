import type { GraphSpec } from "@graph/types";

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
