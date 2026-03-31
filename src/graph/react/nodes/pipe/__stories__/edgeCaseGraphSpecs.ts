import type { GraphSpec, GraphSpecNode } from "@graph/types";
import type { PipeCardData } from "../pipeCardTypes";

/**
 * Convert a PipeCardData edge-case fixture into a minimal GraphSpec
 * that the GraphViewer can render (pipe card + stuff nodes + edges).
 */
export function toGraphSpec(data: PipeCardData): GraphSpec {
  const pipeId = `edge-case:${data.pipeCode}`;

  const node: GraphSpecNode = {
    id: pipeId,
    pipe_code: data.pipeCode,
    pipe_type: data.pipeType,
    description: data.description,
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

  return { nodes: [node], edges: [] };
}
