import type { GraphSpec } from "@graph/types";

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
