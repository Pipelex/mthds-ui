import { describe, it, expect } from "vitest";
import { buildDataflowGraph, buildGraph } from "../graphBuilders";
import { buildDataflowAnalysis } from "../graphAnalysis";
import type { GraphSpec } from "../types";

describe("buildDataflowGraph", () => {
  it("creates pipe and stuff nodes with label descriptors", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_code: "my_pipe",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "result", concept: "Text" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_code: "consumer_pipe",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d1", name: "result", concept: "Text" }] },
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
          kind: "operator",
          id: "op1",
          pipe_code: "failing",
          pipe_type: "PipeFunc",
          status: "failed",
          io: { inputs: [], outputs: [{ digest: "d1", name: "out" }] },
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
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: {
            outputs: [{ digest: "d1", name: "out" }],
            inputs: [{ digest: "d2", name: "in" }],
          },
        },
      ],
      edges: [
        {
          id: "e0",
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
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: {
            outputs: [{ digest: "d1", name: "out1" }],
            inputs: [{ digest: "d2", name: "in1" }],
          },
        },
      ],
      edges: [
        {
          id: "e1",
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
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "root",
          pipe_type: "PipeSequence",
        },
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrlA",
          pipe_type: "PipeSequence",
        },
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrlB",
          pipe_type: "PipeSequence",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "out" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d1", name: "in" }] },
        },
      ],
      edges: [
        { id: "e2", source: "root", target: "ctrlA", kind: "contains" },
        { id: "e3", source: "root", target: "ctrlB", kind: "contains" },
        { id: "e4", source: "ctrlA", target: "op1", kind: "contains" },
        { id: "e5", source: "ctrlB", target: "op2", kind: "contains" },
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
    const gs: GraphSpec = {
      nodes: [
        {
          kind: "operator",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "op1",
          pipe_type: "PipeFunc",
        },
      ],
      edges: [],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes, edges } = buildDataflowGraph(gs, analysis, "bezier");
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it("handles nodes with missing fields gracefully", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ name: "d1", digest: "d1" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ name: "d1", digest: "d1" }] },
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
      label: "d1",
      concept: "",
    });
  });
});

describe("buildGraph", () => {
  it("selects dataflow mode when graphspec has stuff", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "out" }] },
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
      nodes: [
        {
          kind: "operator",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "op1",
          pipe_type: "PipeFunc",
        },
      ], // no IO
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
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_code: "op1",
          pipe_type: "PipeFunc",
          io: {
            inputs: [],
            outputs: [
              { digest: "short", name: "x", concept: "T" },
              { digest: "long", name: "very_long_variable_name", concept: "VeryLongConceptName" },
            ],
          },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_code: "op2",
          pipe_type: "PipeFunc",
          io: {
            outputs: [],
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
        {
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "x" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d1", name: "x" }] },
        },
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
        {
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "out" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d1", name: "in" }] },
        },
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
          kind: "operator",
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

  it("maps empty IO arrays when no inputs/outputs", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_code: "op",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "out" }] },
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
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: {
            inputs: [{ digest: "d2", name: "item" }],
            outputs: [{ digest: "d1", name: "list" }],
          },
        },
      ],
      edges: [
        {
          id: "e6",
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
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: {
            inputs: [{ digest: "d2", name: "item" }],
            outputs: [{ digest: "d1", name: "result" }],
          },
        },
      ],
      edges: [
        {
          id: "e7",
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
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: {
            inputs: [{ digest: "d2", name: "item" }],
            outputs: [{ digest: "d1", name: "list" }],
          },
        },
      ],
      edges: [
        {
          id: "e8",
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
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "root",
          pipe_type: "PipeSequence",
        },
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrlA",
          pipe_type: "PipeSequence",
        },
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrlB",
          pipe_type: "PipeSequence",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "out" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d1", name: "in" }] },
        },
      ],
      edges: [
        { id: "e9", source: "root", target: "ctrlA", kind: "contains" },
        { id: "e10", source: "root", target: "ctrlB", kind: "contains" },
        { id: "e11", source: "ctrlA", target: "op1", kind: "contains" },
        { id: "e12", source: "ctrlB", target: "op2", kind: "contains" },
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
        {
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "out" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d1", name: "in" }] },
        },
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

// Node sorting by controller groups was removed (dagre-specific optimization).
// ELK handles node ordering via hierarchical children[] natively.
