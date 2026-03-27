import type { GraphSpec } from "@graph/types";

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
