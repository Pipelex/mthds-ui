import { describe, it, expect } from "vitest";
import { buildDataflowAnalysis } from "../graphAnalysis";
import { buildControllerNodes, applyControllers } from "../graphControllers";
import type { GraphSpec } from "../types";

/** Direct cycle: A contains B, B contains A. */
function makeDirectCycle(): GraphSpec {
  return {
    nodes: [
      { id: "A", pipe_type: "PipeSequence" },
      { id: "B", pipe_type: "PipeSequence" },
      {
        id: "op1",
        pipe_code: "op1",
        pipe_type: "PipeFunc",
        io: { outputs: [{ digest: "d1", name: "out", concept: "Text" }] },
      },
    ],
    edges: [
      { source: "A", target: "B", kind: "contains" },
      { source: "B", target: "A", kind: "contains" },
      { source: "A", target: "op1", kind: "contains" },
    ],
  };
}

describe("cycle detection in buildControllerNodes (getDepth)", () => {
  it("throws when depth computation encounters a cycle", () => {
    const gs = makeDirectCycle();
    const analysis = buildDataflowAnalysis(gs)!;

    // Create minimal layouted nodes to feed buildControllerNodes
    // We need the operator node in the list so the controller has children
    const layoutedNodes = [
      {
        id: "op1",
        type: "pipeCard",
        data: { isPipe: true, isStuff: false, labelText: "op1" },
        position: { x: 0, y: 0 },
        style: { width: 200, height: 120 },
      },
    ];

    expect(() =>
      buildControllerNodes(gs, analysis, layoutedNodes as import("../types").GraphNode[]),
    ).toThrow(/[Cc]ycle/);
  });
});

describe("cycle detection in applyControllers (getContainmentDepth)", () => {
  it("throws when parent chain forms a cycle", () => {
    const gs = makeDirectCycle();
    const analysis = buildDataflowAnalysis(gs)!;

    const layoutedNodes = [
      {
        id: "op1",
        type: "pipeCard",
        data: { isPipe: true, isStuff: false, labelText: "op1" },
        position: { x: 100, y: 100 },
        style: { width: 200, height: 120 },
      },
    ];

    expect(() =>
      applyControllers(layoutedNodes as import("../types").GraphNode[], [], gs, analysis, true),
    ).toThrow(/[Cc]ycle/);
  });
});
