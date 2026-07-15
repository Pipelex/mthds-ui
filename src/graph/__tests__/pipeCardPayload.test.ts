import { describe, it, expect } from "vitest";
import type { PipeCallNode } from "@graph/types";
import { buildPipeCardPayload } from "@graph/pipeCardPayload";

describe("buildPipeCardPayload", () => {
  it("builds an operator payload from a pipe-call node with full io", () => {
    const node: PipeCallNode = {
      kind: "operator",
      id: "op1",
      pipe_code: "extract_data",
      pipe_type: "PipeExtract",
      description: "Extract data from the document",
      domain_code: "demo",
      status: "succeeded",
      io: {
        inputs: [{ name: "src", concept: "Document" }],
        outputs: [{ name: "result", concept: "Text" }],
      },
    };

    expect(buildPipeCardPayload(node)).toEqual({
      pipeCode: "extract_data",
      pipeType: "PipeExtract",
      description: "Extract data from the document",
      status: "succeeded",
      inputs: [{ name: "src", concept: "Document" }],
      outputs: [{ name: "result", concept: "Text" }],
    });
  });

  it("carries the controller pipeType through unchanged", () => {
    for (const pipeType of [
      "PipeSequence",
      "PipeParallel",
      "PipeCondition",
      "PipeBatch",
    ] as const) {
      const node: PipeCallNode = {
        kind: "controller",
        id: `ctrl_${pipeType}`,
        pipe_code: `my_${pipeType}`,
        pipe_type: pipeType,
        description: `${pipeType} controller`,
        domain_code: "demo",
        status: "succeeded",
        io: { inputs: [], outputs: [] },
      };
      expect(buildPipeCardPayload(node).pipeType).toBe(pipeType);
    }
  });

  it("uses node.description verbatim — the single source of truth", () => {
    const node: PipeCallNode = {
      kind: "operator",
      id: "op1",
      pipe_code: "my_pipe",
      pipe_type: "PipeLLM",
      description: "Node-level description",
      domain_code: "demo",
      status: "succeeded",
      io: { inputs: [], outputs: [] },
    };
    expect(buildPipeCardPayload(node).description).toBe("Node-level description");
  });

  it("defaults a missing io concept to an empty string, keeps the name", () => {
    const node: PipeCallNode = {
      kind: "operator",
      id: "op1",
      pipe_code: "p",
      pipe_type: "PipeFunc",
      description: "Process the data",
      domain_code: "demo",
      status: "succeeded",
      io: {
        inputs: [{ name: "raw", digest: "d1" }],
        outputs: [{ name: "done", concept: "Result", digest: "d2" }],
      },
    };
    const payload = buildPipeCardPayload(node);
    expect(payload.inputs).toEqual([{ name: "raw", concept: "" }]);
    expect(payload.outputs).toEqual([{ name: "done", concept: "Result" }]);
  });

  it("carries the node status through unchanged", () => {
    const node: PipeCallNode = {
      kind: "operator",
      id: "op1",
      pipe_code: "p",
      pipe_type: "PipeFunc",
      description: "Process the data",
      domain_code: "demo",
      status: "canceled",
      io: { inputs: [], outputs: [] },
    };
    expect(buildPipeCardPayload(node).status).toBe("canceled");
  });

  it("carries graph mode and authored tags when provided", () => {
    const node: PipeCallNode = {
      kind: "operator",
      id: "op1",
      pipe_code: "route_yes",
      pipe_type: "PipeLLM",
      description: "Route outcome",
      domain_code: "demo",
      status: "scheduled",
      io: { inputs: [], outputs: [] },
      tags: { outcome: "yes" },
    };

    expect(buildPipeCardPayload(node, "static")).toMatchObject({
      graphMode: "static",
      tags: { outcome: "yes" },
    });
  });
});
