import type { GraphSpec } from "@graph/types";

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
