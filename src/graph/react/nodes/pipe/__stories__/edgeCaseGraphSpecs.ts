import type { ConceptInfo, GraphSpec, GraphSpecNode, PipeBlueprintUnion } from "@graph/types";
import type { PipeCardData } from "../pipeCardTypes";

const DOMAIN = "edge_cases";

const DOCUMENT: ConceptInfo = {
  code: "Document",
  domain_code: "native",
  description: "A document",
  structure_class_name: "DocumentContent",
  refines: null,
};

/**
 * The registry entry a card's blueprint facts come from, for the fixtures that
 * carry one: a document step's format is read from its blueprint, never its node.
 */
function registryFor(data: PipeCardData): Record<string, PipeBlueprintUnion> | undefined {
  if (data.pipeType !== "PipeDocGen" || !data.docGenFormat) return undefined;
  return {
    [`${DOMAIN}.${data.pipeCode}`]: {
      type: "PipeDocGen",
      pipe_category: "PipeOperator",
      code: data.pipeCode,
      domain_code: DOMAIN,
      description: data.description ?? "",
      inputs: {},
      output: { concept: DOCUMENT, multiplicity: null },
      doc_gen_format: data.docGenFormat,
    },
  };
}

/**
 * Convert a PipeCardData edge-case fixture into a minimal GraphSpec
 * that the GraphViewer can render (pipe card + stuff nodes + edges).
 */
export function toGraphSpec(data: PipeCardData): GraphSpec {
  const pipeId = `edge-case:${data.pipeCode}`;

  const node: GraphSpecNode = {
    kind: "operator",
    id: pipeId,
    pipe_code: data.pipeCode,
    pipe_type: data.pipeType,
    description: data.description,
    domain_code: DOMAIN,
    status: data.status,
    io: {
      inputs: data.inputs.map((inp, i) => ({
        name: inp.name,
        digest: `in_${i}`,
        concept: inp.concept,
      })),
      outputs: data.outputs.map((out, i) => ({
        name: out.name,
        digest: `out_${i}`,
        concept: out.concept,
      })),
    },
  };

  const pipeRegistry = registryFor(data);
  return {
    nodes: [node],
    edges: [],
    meta: { format: "mthds" },
    ...(pipeRegistry ? { pipe_registry: pipeRegistry } : {}),
  };
}
