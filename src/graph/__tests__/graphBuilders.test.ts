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

// ─── Stuff node dimensions ──────────────────────────────────────────────────

describe("buildDataflowGraph — stuff node dimensions", () => {
  it("stuff width scales with label/concept length", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          pipe_code: "op1",
          io: {
            outputs: [
              { digest: "short", name: "x", concept: "T" },
              { digest: "long", name: "very_long_variable_name", concept: "VeryLongConceptName" },
            ],
          },
        },
        {
          id: "op2",
          pipe_code: "op2",
          io: {
            inputs: [
              { digest: "short", name: "x", concept: "T" },
              { digest: "long", name: "very_long_variable_name", concept: "VeryLongConceptName" },
            ],
          },
        },
      ],
      edges: [],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes } = buildDataflowGraph(gs, analysis, "bezier");

    const shortStuff = nodes.find((n) => n.id === "stuff_short")!;
    const longStuff = nodes.find((n) => n.id === "stuff_long")!;

    const shortW = parseFloat(shortStuff.style!.width as string);
    const longW = parseFloat(longStuff.style!.width as string);
    expect(longW).toBeGreaterThan(shortW);
  });

  it("stuff width has 140px minimum", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "op1", io: { outputs: [{ digest: "d1", name: "x" }] } },
        { id: "op2", io: { inputs: [{ digest: "d1", name: "x" }] } },
      ],
      edges: [],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes } = buildDataflowGraph(gs, analysis, "bezier");

    const stuff = nodes.find((n) => n.id === "stuff_d1")!;
    const w = parseFloat(stuff.style!.width as string);
    expect(w).toBeGreaterThanOrEqual(140);
  });

  it("stuff nodes have pill-shaped style", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "op1", io: { outputs: [{ digest: "d1", name: "out" }] } },
        { id: "op2", io: { inputs: [{ digest: "d1", name: "in" }] } },
      ],
      edges: [],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes } = buildDataflowGraph(gs, analysis, "bezier");

    const stuff = nodes.find((n) => n.id === "stuff_d1")!;
    expect(stuff.style!.borderRadius).toBe("999px");
    expect(stuff.style!.background).toBe("var(--color-stuff-bg)");
    expect(stuff.style!.border).toBe("2px solid var(--color-stuff-border)");
  });
});

// ─── pipeCardData population ────────────────────────────────────────────────

describe("buildDataflowGraph — pipeCardData population", () => {
  it("maps all pipeCardData fields from GraphSpec node", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          pipe_code: "my_code",
          pipe_type: "PipeLLM",
          description: "Custom description",
          status: "running",
          io: {
            inputs: [{ digest: "d_in", name: "input", concept: "Text" }],
            outputs: [{ digest: "d_out", name: "output", concept: "Number" }],
          },
        },
      ],
      edges: [],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes } = buildDataflowGraph(gs, analysis, "bezier");

    const pipe = nodes.find((n) => n.id === "op1")!;
    expect(pipe.data.pipeCardData).toMatchObject({
      pipeCode: "my_code",
      pipeType: "PipeLLM",
      description: "Custom description",
      status: "running",
      inputs: [{ name: "input", concept: "Text" }],
      outputs: [{ name: "output", concept: "Number" }],
    });
  });

  it("generates a default description when none provided", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          pipe_code: "extract_data",
          pipe_type: "PipeExtract",
          io: { outputs: [{ digest: "d1", name: "out" }] },
        },
      ],
      edges: [],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes } = buildDataflowGraph(gs, analysis, "bezier");

    const pipe = nodes.find((n) => n.id === "op1")!;
    expect(pipe.data.pipeCardData?.description).toContain("Extract content from");
    expect(pipe.data.pipeCardData?.description).toContain("extract data");
  });

  it("defaults to PipeFunc when pipe_type is missing", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          pipe_code: "mystery",
          io: { outputs: [{ digest: "d1", name: "out" }] },
        },
      ],
      edges: [],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes } = buildDataflowGraph(gs, analysis, "bezier");

    const pipe = nodes.find((n) => n.id === "op1")!;
    expect(pipe.data.pipeCardData?.pipeType).toBe("PipeFunc");
  });

  it("defaults status to 'scheduled' when not provided", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          pipe_code: "op",
          io: { outputs: [{ digest: "d1", name: "out" }] },
        },
      ],
      edges: [],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes } = buildDataflowGraph(gs, analysis, "bezier");

    const pipe = nodes.find((n) => n.id === "op1")!;
    expect(pipe.data.pipeCardData?.status).toBe("scheduled");
  });

  it("maps empty IO arrays when no inputs/outputs", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          pipe_code: "op",
          io: { outputs: [{ digest: "d1", name: "out" }] },
        },
      ],
      edges: [],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes } = buildDataflowGraph(gs, analysis, "bezier");

    const pipe = nodes.find((n) => n.id === "op1")!;
    expect(pipe.data.pipeCardData?.inputs).toEqual([]);
    expect(pipe.data.pipeCardData?.outputs).toEqual([{ name: "out", concept: "" }]);
  });
});

// ─── Edge styles ────────────────────────────────────────────────────────────

describe("buildDataflowGraph — edge styles", () => {
  it("batch_item edges have batch_item color", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          io: {
            inputs: [{ digest: "d2", name: "item" }],
            outputs: [{ digest: "d1", name: "list" }],
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

    const batchItemEdge = edges.find((e) => e._batchEdge && e.source === "stuff_d1");
    expect(batchItemEdge).toBeDefined();
    expect(batchItemEdge!.style?.stroke).toBe("var(--color-batch-item)");
  });

  it("batch_aggregate edges have batch_aggregate color", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          io: {
            inputs: [{ digest: "d2", name: "item" }],
            outputs: [{ digest: "d1", name: "result" }],
          },
        },
      ],
      edges: [
        {
          source: "op1",
          target: "op1",
          kind: "batch_aggregate",
          source_stuff_digest: "d1",
          target_stuff_digest: "d2",
        },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { edges } = buildDataflowGraph(gs, analysis, "bezier");

    const aggEdge = edges.find((e) => e._batchEdge && e.source === "stuff_d1");
    expect(aggEdge).toBeDefined();
    expect(aggEdge!.style?.stroke).toBe("var(--color-batch-aggregate)");
  });

  it("batch edges have opacity 0.7", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          io: {
            inputs: [{ digest: "d2", name: "item" }],
            outputs: [{ digest: "d1", name: "list" }],
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
    expect(batchEdge?.style?.opacity).toBe(0.7);
  });

  it("cross-group edges have de-emphasized style", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "root" },
        { id: "ctrlA" },
        { id: "ctrlB" },
        { id: "op1", io: { outputs: [{ digest: "d1", name: "out" }] } },
        { id: "op2", io: { inputs: [{ digest: "d1", name: "in" }] } },
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

    const crossEdge = edges.find((e) => e._crossGroup);
    expect(crossEdge).toBeDefined();
    expect(crossEdge!.style?.strokeWidth).toBe(1.5);
    expect(crossEdge!.style?.opacity).toBe(0.65);
  });

  it("normal edges have stroke width 2 and arrow marker", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "op1", io: { outputs: [{ digest: "d1", name: "out" }] } },
        { id: "op2", io: { inputs: [{ digest: "d1", name: "in" }] } },
      ],
      edges: [],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { edges } = buildDataflowGraph(gs, analysis, "bezier");

    const normalEdge = edges.find((e) => !e._crossGroup && !e._batchEdge);
    expect(normalEdge).toBeDefined();
    expect(normalEdge!.style?.strokeWidth).toBe(2);
    expect(normalEdge!.markerEnd?.type).toBe("arrowclosed");
  });
});

// ─── Node sorting ───────────────────────────────────────────────────────────

describe("buildDataflowGraph — node sorting by controller groups", () => {
  it("nodes in the same controller group are adjacent", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "root" },
        { id: "ctrlA" },
        { id: "ctrlB" },
        {
          id: "opA1",
          pipe_code: "a1",
          io: { outputs: [{ digest: "dA1", name: "out" }] },
        },
        {
          id: "opA2",
          pipe_code: "a2",
          io: { inputs: [{ digest: "dA1", name: "in" }] },
        },
        {
          id: "opB1",
          pipe_code: "b1",
          io: { outputs: [{ digest: "dB1", name: "out" }] },
        },
      ],
      edges: [
        { source: "root", target: "ctrlA", kind: "contains" },
        { source: "root", target: "ctrlB", kind: "contains" },
        { source: "ctrlA", target: "opA1", kind: "contains" },
        { source: "ctrlA", target: "opA2", kind: "contains" },
        { source: "ctrlB", target: "opB1", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes } = buildDataflowGraph(gs, analysis, "bezier");

    // Find the indices of nodes in ctrlA and ctrlB
    const aIndices = nodes
      .map((n, i) => (n.id === "opA1" || n.id === "opA2" || n.id === "stuff_dA1" ? i : -1))
      .filter((i) => i >= 0);
    const bIndices = nodes
      .map((n, i) => (n.id === "opB1" || n.id === "stuff_dB1" ? i : -1))
      .filter((i) => i >= 0);

    if (aIndices.length > 0 && bIndices.length > 0) {
      // All A indices should be either all before or all after B indices
      const allABeforeB = aIndices.every((a) => bIndices.every((b) => a < b));
      const allBBeforeA = bIndices.every((b) => aIndices.every((a) => b < a));
      expect(allABeforeB || allBBeforeA).toBe(true);
    }
  });
});
