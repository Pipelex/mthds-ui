import { describe, it, expect } from "vitest";
import { buildDataflowGraph, buildGraph } from "../graphBuilders";
import { buildDataflowAnalysis } from "../graphAnalysis";
import type { GraphSpec } from "../types";

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
    expect(pipeNode.type).toBe("pipeCard");
    expect(pipeNode.data.pipeCardData?.status).toBe("failed");
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
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          io: { outputs: [{ digest: "d1", name: "out" }] },
        },
      ],
      edges: [],
    };
    const { analysis } = buildGraph(gs, "bezier");
    expect(analysis).not.toBeNull();
  });

  it("returns empty graph when no graphspec", () => {
    const { analysis, graphData } = buildGraph(null, "bezier");
    expect(analysis).toBeNull();
    expect(graphData.nodes).toHaveLength(0);
  });

  it("returns empty graph when graphspec has no stuff", () => {
    const gs: GraphSpec = {
      nodes: [{ id: "op1" }], // no IO
      edges: [],
    };
    const { analysis } = buildGraph(gs, "bezier");
    expect(analysis).toBeNull();
  });
});
