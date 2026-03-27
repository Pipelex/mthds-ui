import type { GraphSpec } from "@graph/types";

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
