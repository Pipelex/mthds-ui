import type { GraphSpec } from "@graph/types";

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
