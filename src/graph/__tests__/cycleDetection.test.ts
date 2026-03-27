import { describe, it, expect } from "vitest";
import { buildDataflowGraph } from "../graphBuilders";
import { buildDataflowAnalysis } from "../graphAnalysis";
import { ensureControllerSpacing, getLayoutedElements } from "../graphLayout";
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

/** Self-containment: A contains A. */
function makeSelfContainment(): GraphSpec {
  return {
    nodes: [
      { id: "A", pipe_type: "PipeSequence" },
      {
        id: "op1",
        pipe_code: "op1",
        pipe_type: "PipeFunc",
        io: { outputs: [{ digest: "d1", name: "out", concept: "Text" }] },
      },
    ],
    edges: [
      { source: "A", target: "A", kind: "contains" },
      { source: "A", target: "op1", kind: "contains" },
    ],
  };
}

describe("cycle detection in buildDataflowGraph (assignOrder)", () => {
  it("throws on direct containment cycle: A contains B, B contains A", () => {
    const gs = makeDirectCycle();
    const analysis = buildDataflowAnalysis(gs)!;
    expect(() => buildDataflowGraph(gs, analysis, "bezier")).toThrow(/[Cc]ycle/);
  });

  it("throws on self-containment: A contains A", () => {
    const gs = makeSelfContainment();
    const analysis = buildDataflowAnalysis(gs)!;
    expect(() => buildDataflowGraph(gs, analysis, "bezier")).toThrow(/[Cc]ycle/);
  });

  it("does not throw on valid deep nesting", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "seq1", pipe_type: "PipeSequence" },
        { id: "seq2", pipe_type: "PipeSequence" },
        { id: "seq3", pipe_type: "PipeSequence" },
        {
          id: "op1",
          pipe_code: "leaf",
          pipe_type: "PipeFunc",
          io: { outputs: [{ digest: "d1", name: "out", concept: "Text" }] },
        },
      ],
      edges: [
        { source: "seq1", target: "seq2", kind: "contains" },
        { source: "seq2", target: "seq3", kind: "contains" },
        { source: "seq3", target: "op1", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    expect(() => buildDataflowGraph(gs, analysis, "bezier")).not.toThrow();
  });
});

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

describe("cycle detection in ensureControllerSpacing", () => {
  it("does not throw for valid specs", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "seq", pipe_type: "PipeSequence" },
        {
          id: "op1",
          pipe_code: "a",
          pipe_type: "PipeFunc",
          io: { outputs: [{ digest: "d1", name: "out", concept: "Text" }] },
        },
        {
          id: "op2",
          pipe_code: "b",
          pipe_type: "PipeFunc",
          io: { inputs: [{ digest: "d1", name: "in", concept: "Text" }] },
        },
      ],
      edges: [
        { source: "seq", target: "op1", kind: "contains" },
        { source: "seq", target: "op2", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes: builtNodes, edges: builtEdges } = buildDataflowGraph(gs, analysis, "bezier");
    const layouted = getLayoutedElements(builtNodes, builtEdges, "LR");
    expect(() => ensureControllerSpacing(layouted.nodes, gs, analysis, "LR")).not.toThrow();
  });
});
