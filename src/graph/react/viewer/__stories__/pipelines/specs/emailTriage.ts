import type { GraphSpec } from "@graph/types";

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
