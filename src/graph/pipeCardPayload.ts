import type { PipeCallNode, PipeCardPayload } from "./types";

/**
 * Build a PipeCardPayload from a pipe-call node.
 *
 * `validateGraphSpec` guarantees the pipe-call node's `pipe_code`, `pipe_type`,
 * `description`, `status`, and `io` are present and well-formed, so this
 * function reads them directly with no fallback synthesis.
 */
export function buildPipeCardPayload(node: PipeCallNode): PipeCardPayload {
  return {
    pipeCode: node.pipe_code,
    pipeType: node.pipe_type,
    description: node.description,
    status: node.status,
    inputs: node.io.inputs.map((i) => ({ name: i.name, concept: i.concept ?? "" })),
    outputs: node.io.outputs.map((o) => ({ name: o.name, concept: o.concept ?? "" })),
  };
}
