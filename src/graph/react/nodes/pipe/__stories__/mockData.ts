import type { GraphSpecNode, GraphNodeData } from "../../../../types";
import type { PipeOperatorType, PipeStatus, PipeCardData } from "../pipeCardTypes";

export type { PipeOperatorType, PipeStatus, PipeCardData };

// ─── Mock pipe card data per type ────────────────────────────────────────

export const MOCK_PIPES: Record<PipeOperatorType, PipeCardData> = {
  PipeLLM: {
    pipeCode: "analyze_match",
    pipeType: "PipeLLM",
    description: "Evaluate how well the candidate CV matches the job requirements",
    status: "succeeded",
    inputs: [
      { name: "cv_pages", concept: "Page" },
      { name: "job_requirements", concept: "JobRequirements" },
    ],
    outputs: [{ name: "result", concept: "MatchResult" }],
    tags: {
      model: "$writing-factual",
      system_prompt: "You are an expert HR analyst...",
      prompt: "Analyze the following CV against the job requirements...",
    },
  },

  PipeExtract: {
    pipeCode: "extract_cv",
    pipeType: "PipeExtract",
    description: "Extract text content from a CV PDF document",
    status: "succeeded",
    inputs: [{ name: "cv_pdf", concept: "Document" }],
    outputs: [{ name: "pages", concept: "Page[]" }],
    tags: {
      model: "@default-text-from-pdf",
    },
  },

  PipeCompose: {
    pipeCode: "compose_report",
    pipeType: "PipeCompose",
    description: "Compose a structured interview report from analysis results",
    status: "succeeded",
    inputs: [
      { name: "match_result", concept: "MatchResult" },
      { name: "interview_questions", concept: "InterviewQuestions" },
    ],
    outputs: [{ name: "report", concept: "InterviewReport" }],
    tags: {
      template: "construct",
      construct_fields: "summary, questions, recommendation",
    },
  },

  PipeImgGen: {
    pipeCode: "generate_profile_card",
    pipeType: "PipeImgGen",
    description: "Generate a visual profile card for the candidate",
    status: "succeeded",
    inputs: [{ name: "candidate_profile", concept: "CandidateProfile" }],
    outputs: [{ name: "card_image", concept: "Image" }],
    tags: {
      model: "$imagen-3",
      aspect_ratio: "16:9",
      prompt: "Professional profile card for {{ candidate_profile.name }}...",
    },
  },

  PipeSearch: {
    pipeCode: "search_candidate_online",
    pipeType: "PipeSearch",
    description: "Search the web for additional candidate information",
    status: "succeeded",
    inputs: [{ name: "candidate_profile", concept: "CandidateProfile" }],
    outputs: [{ name: "search_results", concept: "SearchResult" }],
    tags: {
      model: "$standard",
      prompt: "Find professional information about {{ candidate_profile.name }}",
      max_results: "5",
    },
  },

  PipeFunc: {
    pipeCode: "normalize_scores",
    pipeType: "PipeFunc",
    description: "Normalize candidate match scores to a 0-100 scale",
    status: "succeeded",
    inputs: [{ name: "raw_scores", concept: "RawScores" }],
    outputs: [{ name: "normalized", concept: "NormalizedScores" }],
    tags: {
      function_name: "normalize_match_scores",
    },
  },
};

// ─── Helpers to build GraphNodeData from PipeCardData ────────────────────

export function toGraphNodeData(pipe: PipeCardData): GraphNodeData {
  return {
    isPipe: true,
    isStuff: false,
    labelText: pipe.pipeCode,
    pipeCode: pipe.pipeCode,
    pipeType: pipe.pipeType,
    nodeData: toGraphSpecNode(pipe),
    labelDescriptor: {
      kind: "pipe",
      label: pipe.pipeCode,
      isFailed: pipe.status === "failed",
    },
  };
}

export function toGraphSpecNode(pipe: PipeCardData): GraphSpecNode {
  return {
    id: `mock:${pipe.pipeCode}`,
    pipe_code: pipe.pipeCode,
    pipe_type: pipe.pipeType,
    status: pipe.status,
    io: {
      inputs: pipe.inputs.map((i) => ({ name: i.name, concept: i.concept })),
      outputs: pipe.outputs.map((o) => ({ name: o.name, concept: o.concept })),
    },
  };
}

/** Create a variant of a mock pipe with a different status */
export function withStatus(pipe: PipeCardData, status: PipeStatus): PipeCardData {
  return { ...pipe, status };
}
