import type { GraphSpec } from "@graph/types";

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
