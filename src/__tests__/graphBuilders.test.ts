import { describe, it, expect } from "vitest";
import { buildDataflowGraph, buildOrchestrationGraph, buildGraph } from "../graphBuilders";
import { buildDataflowAnalysis } from "../graphAnalysis";
import type { GraphSpec, ViewSpec } from "../types";

describe("buildDataflowGraph", () => {
  it("creates pipe and stuff nodes with label descriptors", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          pipe_code: "my_pipe",
          io: {
            outputs: [{ digest: "d1", name: "result", concept: "Text" }],
          },
        },
        {
          id: "op2",
          pipe_code: "consumer_pipe",
          io: {
            inputs: [{ digest: "d1", name: "result", concept: "Text" }],
          },
        },
      ],
      edges: [],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes, edges } = buildDataflowGraph(gs, analysis, "bezier");

    // Should have 2 pipe nodes + 1 stuff node
    expect(nodes).toHaveLength(3);

    const pipeNode = nodes.find((n) => n.id === "op1")!;
    expect(pipeNode.data.labelDescriptor).toEqual({
      kind: "pipe",
      label: "my_pipe",
      isFailed: false,
    });
    expect(pipeNode.data.isPipe).toBe(true);
    expect(pipeNode.data.isStuff).toBe(false);

    const stuffNode = nodes.find((n) => n.id === "stuff_d1")!;
    expect(stuffNode.data.labelDescriptor).toEqual({
      kind: "stuff",
      label: "result",
      concept: "Text",
    });
    expect(stuffNode.data.isStuff).toBe(true);

    // Should have edges: producer -> stuff -> consumer
    expect(edges).toHaveLength(2);
    const producerEdge = edges.find((e) => e.source === "op1")!;
    expect(producerEdge.target).toBe("stuff_d1");
    const consumerEdge = edges.find((e) => e.target === "op2")!;
    expect(consumerEdge.source).toBe("stuff_d1");
  });

  it("marks failed pipe nodes in label descriptor", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          pipe_code: "failing",
          status: "failed",
          io: {
            outputs: [{ digest: "d1", name: "out" }],
          },
        },
      ],
      edges: [],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes } = buildDataflowGraph(gs, analysis, "bezier");

    const pipeNode = nodes.find((n) => n.id === "op1")!;
    expect(pipeNode.data.labelDescriptor).toMatchObject({ isFailed: true });
    expect(pipeNode.style?.border).toContain("pipe-failed");
  });

  it("creates batch edges with _batchEdge marker", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          io: {
            outputs: [{ digest: "d1", name: "out" }],
            inputs: [{ digest: "d2", name: "in" }],
          },
        },
      ],
      edges: [
        {
          source: "op1",
          target: "op1",
          kind: "batch_item",
          source_stuff_digest: "d1",
          target_stuff_digest: "d2",
        },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { edges } = buildDataflowGraph(gs, analysis, "bezier");

    const batchEdge = edges.find((e) => e._batchEdge);
    expect(batchEdge).toBeDefined();
    expect(batchEdge!.source).toBe("stuff_d1");
    expect(batchEdge!.target).toBe("stuff_d2");
  });
});

describe("buildOrchestrationGraph", () => {
  it("creates nodes with orchestration label descriptors", () => {
    const vs: ViewSpec = {
      nodes: [
        {
          id: "n1",
          label: "my_pipe",
          kind: "operator",
          status: "succeeded",
          ui: { badges: ["v2"] },
          inspector: { pipe_type: "PipeSimple", pipe_code: "my_pipe" },
        },
      ],
      edges: [],
    };
    const { nodes } = buildOrchestrationGraph(vs, "bezier");

    expect(nodes).toHaveLength(1);
    expect(nodes[0].data.labelDescriptor).toEqual({
      kind: "orchestration",
      label: "my_pipe",
      status: "succeeded",
      typeText: "PipeSimple",
      badge: "v2",
    });
  });

  it('uses "Controller" as typeText for controller nodes', () => {
    const vs: ViewSpec = {
      nodes: [
        {
          id: "c1",
          label: "batch_ctrl",
          kind: "controller",
          status: "",
          inspector: { pipe_type: "PipeBatch" },
        },
      ],
      edges: [],
    };
    const { nodes } = buildOrchestrationGraph(vs, "bezier");
    expect(nodes[0].data.labelDescriptor).toMatchObject({ typeText: "Controller" });
  });

  it("maps edges with correct type", () => {
    const vs: ViewSpec = {
      nodes: [
        { id: "n1", label: "a" },
        { id: "n2", label: "b" },
      ],
      edges: [{ id: "e1", source: "n1", target: "n2", kind: "data" }],
    };
    const { edges } = buildOrchestrationGraph(vs, "step");
    expect(edges[0].type).toBe("step");
    expect(edges[0].style?.stroke).toBe("var(--color-edge)");
  });
});

describe("buildDataflowGraph — additional cases", () => {
  it("creates parallel_combine edges between stuff nodes", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          io: {
            outputs: [{ digest: "d1", name: "out1" }],
            inputs: [{ digest: "d2", name: "in1" }],
          },
        },
      ],
      edges: [
        {
          source: "op1",
          target: "op1",
          kind: "parallel_combine",
          source_stuff_digest: "d1",
          target_stuff_digest: "d2",
        },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { edges } = buildDataflowGraph(gs, analysis, "bezier");

    const combineEdge = edges.find(
      (e) => e.source === "stuff_d1" && e.target === "stuff_d2" && !e._batchEdge,
    );
    expect(combineEdge).toBeDefined();
    expect(combineEdge!.style?.stroke).toBe("var(--color-parallel-combine)");
  });

  it("marks cross-group edges between different controller groups", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "root" },
        { id: "ctrlA" },
        { id: "ctrlB" },
        {
          id: "op1",
          io: { outputs: [{ digest: "d1", name: "out" }] },
        },
        {
          id: "op2",
          io: { inputs: [{ digest: "d1", name: "in" }] },
        },
      ],
      edges: [
        { source: "root", target: "ctrlA", kind: "contains" },
        { source: "root", target: "ctrlB", kind: "contains" },
        { source: "ctrlA", target: "op1", kind: "contains" },
        { source: "ctrlB", target: "op2", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { edges } = buildDataflowGraph(gs, analysis, "bezier");

    // The stuff_d1 node is produced by op1 (in ctrlA) and consumed by op2 (in ctrlB)
    // The edge from stuff_d1 -> op2 crosses groups
    const crossEdge = edges.find((e) => e.target === "op2");
    expect(crossEdge?._crossGroup).toBe(true);
  });

  it("handles empty graphspec with no stuff", () => {
    const gs: GraphSpec = { nodes: [{ id: "op1" }], edges: [] };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes, edges } = buildDataflowGraph(gs, analysis, "bezier");
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it("handles nodes with missing fields gracefully", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          io: { outputs: [{ digest: "d1" }] },
        },
        {
          id: "op2",
          io: { inputs: [{ digest: "d1" }] },
        },
      ],
      edges: [],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes } = buildDataflowGraph(gs, analysis, "bezier");

    const stuffNode = nodes.find((n) => n.id === "stuff_d1");
    expect(stuffNode).toBeDefined();
    expect(stuffNode!.data.labelDescriptor).toEqual({
      kind: "stuff",
      label: "data",
      concept: "",
    });
  });
});

describe("buildGraph", () => {
  it("selects dataflow mode when graphspec has stuff", () => {
    const vs: ViewSpec = { nodes: [], edges: [] };
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          io: { outputs: [{ digest: "d1", name: "out" }] },
        },
      ],
      edges: [],
    };
    const { analysis } = buildGraph(vs, gs, "bezier");
    expect(analysis).not.toBeNull();
  });

  it("falls back to orchestration when no graphspec", () => {
    const vs: ViewSpec = {
      nodes: [{ id: "n1", label: "test" }],
      edges: [],
    };
    const { analysis, graphData } = buildGraph(vs, null, "bezier");
    expect(analysis).toBeNull();
    expect(graphData.nodes).toHaveLength(1);
  });

  it("falls back to orchestration when graphspec has no stuff", () => {
    const vs: ViewSpec = {
      nodes: [{ id: "n1", label: "test" }],
      edges: [],
    };
    const gs: GraphSpec = {
      nodes: [{ id: "op1" }], // no IO
      edges: [],
    };
    const { analysis } = buildGraph(vs, gs, "bezier");
    expect(analysis).toBeNull();
  });
});
