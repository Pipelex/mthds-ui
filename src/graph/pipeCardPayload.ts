import type {
  DataflowAnalysis,
  GraphSpec,
  GraphSpecNode,
  PipeCardPayload,
  PipeType,
} from "./types";

/** Fallback description for operators when neither the node nor the registry carries one. */
function defaultDescription(pipeType: PipeType, pipeCode: string | undefined): string {
  const code = pipeCode || "this step";
  const verb: Partial<Record<PipeType, string>> = {
    PipeLLM: "Analyze and generate output using",
    PipeExtract: "Extract content from",
    PipeCompose: "Compose output using",
    PipeImgGen: "Generate image for",
    PipeSearch: "Search the web for",
    PipeFunc: "Process data in",
  };
  return `${verb[pipeType] || "Execute"} ${code.replace(/_/g, " ")}`;
}

/**
 * Build a PipeCardPayload from a GraphSpecNode + GraphSpec + DataflowAnalysis.
 *
 * Operator/controller distinction uses `analysis.controllerNodeIds` (single source of truth)
 * rather than string-matching against `pipe_type`.
 */
export function buildPipeCardPayload(
  node: GraphSpecNode,
  graphspec: GraphSpec,
  analysis: DataflowAnalysis,
): PipeCardPayload {
  const pipeType = node.pipe_type;
  const pipeCode = node.pipe_code || node.id;
  const isController = analysis.controllerNodeIds.has(node.id);

  const inputs = (node.io?.inputs ?? []).map((i) => ({
    name: i.name ?? "",
    concept: i.concept ?? "",
  }));
  const outputs = (node.io?.outputs ?? []).map((o) => ({
    name: o.name ?? "",
    concept: o.concept ?? "",
  }));

  const registryDescription = node.pipe_code
    ? graphspec.pipe_registry?.[node.pipe_code]?.description
    : undefined;

  let description: string | undefined;
  if (node.description) {
    description = node.description;
  } else if (registryDescription) {
    description = registryDescription;
  } else if (isController) {
    description = undefined;
  } else {
    description = defaultDescription(pipeType, node.pipe_code);
  }

  return {
    pipeCode,
    pipeType,
    description,
    status: node.status ?? "scheduled",
    inputs,
    outputs,
  };
}
