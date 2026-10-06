import type { CardNode, GraphSpecMode, GraphSpecNodeIoItem, PipeCardPayload } from "./types";
import { multiplicitySuffix } from "./types";

/** An io item as a card pill: its name, and its concept with the multiplicity marker (`Document[]`). */
function ioPill(item: GraphSpecNodeIoItem): { name: string; concept: string } {
  return {
    name: item.name,
    concept: item.concept ? item.concept + multiplicitySuffix(item.multiplicity) : "",
  };
}

/**
 * Build a PipeCardPayload from a card node: a pipe-call node, or a binding
 * node, whose card names its `from` path where a pipe card names its pipe code.
 *
 * `validateGraphSpec` guarantees the node's `pipe_code`, `pipe_type`,
 * `description`, `status`, and `io` are present and well-formed, so this
 * function reads them directly with no fallback synthesis.
 */
export function buildPipeCardPayload(node: CardNode, graphMode?: GraphSpecMode): PipeCardPayload {
  const payload: PipeCardPayload = {
    pipeCode: node.pipe_code,
    pipeType: node.pipe_type,
    description: node.description,
    status: node.status,
    inputs: node.io.inputs.map(ioPill),
    outputs: node.io.outputs.map(ioPill),
  };
  if (graphMode !== undefined) payload.graphMode = graphMode;
  if (node.tags !== undefined) payload.tags = node.tags;
  return payload;
}
