import type { GraphSpecMode, GraphSpecNodeIoItem, PipeCallNode, PipeCardPayload } from "./types";
import { multiplicitySuffix } from "./types";

/** An io item as a card pill: its name, and its concept with the multiplicity marker (`Document[]`). */
function ioPill(item: GraphSpecNodeIoItem): { name: string; concept: string } {
  return {
    name: item.name,
    concept: item.concept ? item.concept + multiplicitySuffix(item.multiplicity) : "",
  };
}

/**
 * Build a PipeCardPayload from a pipe-call node.
 *
 * `validateGraphSpec` guarantees the pipe-call node's `pipe_code`, `pipe_type`,
 * `description`, `status`, and `io` are present and well-formed, so this
 * function reads them directly with no fallback synthesis.
 */
export function buildPipeCardPayload(
  node: PipeCallNode,
  graphMode?: GraphSpecMode,
): PipeCardPayload {
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
