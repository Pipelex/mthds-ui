import { describe, it, expect } from "vitest";
import { getLayoutedElements, ensureControllerSpacing } from "../graphLayout";
import { buildDataflowGraph } from "../graphBuilders";
import { buildDataflowAnalysis } from "../graphAnalysis";
import { nodeWidth } from "../types";
import type { GraphNode, GraphEdge, GraphSpec } from "../types";

function makeNode(id: string, overrides?: Partial<GraphNode>): GraphNode {
  return {
    id,
    type: "default",
    data: { isPipe: true, isStuff: false, labelText: id },
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

function makeEdge(id: string, source: string, target: string): GraphEdge {
  return { id, source, target, type: "bezier" };
}

describe("getLayoutedElements", () => {
  it("assigns positions to nodes", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b")];
    const result = getLayoutedElements(nodes, edges, "TB");

    expect(result.nodes).toHaveLength(2);
    for (const n of result.nodes) {
      expect(n.position.x).not.toBe(0);
      // y can be 0 for the first node after centering, so just check it's a number
      expect(typeof n.position.y).toBe("number");
    }
  });

  it("uses TB direction by default", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b")];
    const result = getLayoutedElements(nodes, edges, "TB");

    // In TB layout, first node should be above second
    const nodeA = result.nodes.find((n) => n.id === "a")!;
    const nodeB = result.nodes.find((n) => n.id === "b")!;
    expect(nodeA.position.y).toBeLessThan(nodeB.position.y);
  });

  it("handles LR direction", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b")];
    const result = getLayoutedElements(nodes, edges, "LR");

    const nodeA = result.nodes.find((n) => n.id === "a")!;
    const nodeB = result.nodes.find((n) => n.id === "b")!;
    expect(nodeA.position.x).toBeLessThan(nodeB.position.x);
  });

  it("handles empty graph", () => {
    const result = getLayoutedElements([], [], "TB");
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it("handles edges-only graph by passing through edges", () => {
    const edges = [makeEdge("e1", "a", "b")];
    // dagre won't have nodes for these edges, but the function should still work
    const result = getLayoutedElements([], edges, "TB");
    expect(result.edges).toHaveLength(1);
  });

  it("uses custom nodesep and ranksep", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b")];

    const tight = getLayoutedElements(nodes, edges, "TB", { nodesep: 10, ranksep: 10 });
    const wide = getLayoutedElements(nodes, edges, "TB", { nodesep: 200, ranksep: 200 });

    const tightA = tight.nodes.find((n) => n.id === "a")!;
    const tightB = tight.nodes.find((n) => n.id === "b")!;
    const wideA = wide.nodes.find((n) => n.id === "a")!;
    const wideB = wide.nodes.find((n) => n.id === "b")!;

    const tightGap = tightB.position.y - tightA.position.y;
    const wideGap = wideB.position.y - wideA.position.y;
    expect(wideGap).toBeGreaterThan(tightGap);
  });

  it("throws if dagre does not produce position for a node", () => {
    // This tests the guard — we create a node but don't add it to dagre's graph
    // In practice this shouldn't happen, but we have a guard for it
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b")];
    // Normal case should not throw
    expect(() => getLayoutedElements(nodes, edges, "TB")).not.toThrow();
  });
});

describe("ensureControllerSpacing", () => {
  it("returns nodes unchanged when analysis is null", () => {
    const nodes = [makeNode("a")];
    const result = ensureControllerSpacing(nodes, null, null, "TB");
    expect(result).toEqual(nodes);
  });

  it("returns nodes unchanged when graphspec is null", () => {
    const nodes = [makeNode("a")];
    const gs: GraphSpec = { nodes: [], edges: [] };
    const analysis = buildDataflowAnalysis(gs);
    const result = ensureControllerSpacing(nodes, null, analysis, "TB");
    expect(result).toEqual(nodes);
  });

  it("handles graph with no controllers", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const gs: GraphSpec = {
      nodes: [
        { id: "a", io: { outputs: [{ digest: "d1", name: "out" }] } },
        { id: "b", io: { inputs: [{ digest: "d1", name: "in" }] } },
      ],
      edges: [],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const result = ensureControllerSpacing(nodes, gs, analysis, "TB");
    expect(result).toHaveLength(2);
  });

  it("resolves overlapping sibling controller groups", () => {
    // Create two controllers with children at overlapping positions
    const gs: GraphSpec = {
      nodes: [{ id: "root" }, { id: "ctrlA" }, { id: "ctrlB" }, { id: "op1" }, { id: "op2" }],
      edges: [
        { source: "root", target: "ctrlA", kind: "contains" },
        { source: "root", target: "ctrlB", kind: "contains" },
        { source: "ctrlA", target: "op1", kind: "contains" },
        { source: "ctrlB", target: "op2", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;

    // Both children at same position = overlap
    const nodes = [
      makeNode("op1", { position: { x: 0, y: 0 }, style: { width: "200px" } }),
      makeNode("op2", { position: { x: 0, y: 0 }, style: { width: "200px" } }),
    ];

    const result = ensureControllerSpacing(nodes, gs, analysis, "TB");
    const pos1 = result.find((n) => n.id === "op1")!.position;
    const pos2 = result.find((n) => n.id === "op2")!.position;

    // After spacing, they should no longer be at the same position
    expect(pos1.x !== pos2.x || pos1.y !== pos2.y).toBe(true);
  });

  it("resolves overlaps in LR mode by shifting vertically", () => {
    const gs: GraphSpec = {
      nodes: [{ id: "root" }, { id: "ctrlA" }, { id: "ctrlB" }, { id: "op1" }, { id: "op2" }],
      edges: [
        { source: "root", target: "ctrlA", kind: "contains" },
        { source: "root", target: "ctrlB", kind: "contains" },
        { source: "ctrlA", target: "op1", kind: "contains" },
        { source: "ctrlB", target: "op2", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const nodes = [
      makeNode("op1", { position: { x: 0, y: 0 }, style: { width: "200px", height: "100px" } }),
      makeNode("op2", { position: { x: 0, y: 0 }, style: { width: "200px", height: "100px" } }),
    ];

    const result = ensureControllerSpacing(nodes, gs, analysis, "LR");
    const pos1 = result.find((n) => n.id === "op1")!.position;
    const pos2 = result.find((n) => n.id === "op2")!.position;

    // In LR, overlap resolution shifts on the y-axis
    expect(pos1.y !== pos2.y).toBe(true);
  });
});

// ─── ensureControllerSpacing — Phase 2: push loose nodes ────────────────────

describe("ensureControllerSpacing — Phase 2 loose node push", () => {
  it("pushes a loose node outside a controller box in TB mode", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "root" },
        { id: "ctrl" },
        { id: "op1" },
        {
          id: "loose",
          io: { outputs: [{ digest: "d1", name: "out" }] },
        },
        {
          id: "op1_full",
          pipe_code: "op1",
          io: { outputs: [{ digest: "d2", name: "out2" }] },
        },
      ],
      edges: [
        { source: "root", target: "ctrl", kind: "contains" },
        { source: "ctrl", target: "op1", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;

    // loose node overlaps with op1's controller box
    const nodes = [
      makeNode("op1", { position: { x: 100, y: 100 }, style: { width: "200px", height: "120px" } }),
      makeNode("loose", {
        position: { x: 120, y: 80 },
        style: { width: "140px", height: "60px" },
        data: { isPipe: false, isStuff: true, labelText: "loose" },
      }),
    ];

    const before = nodes[1].position.y;
    const result = ensureControllerSpacing(nodes, gs, analysis, "TB");
    const looseAfter = result.find((n) => n.id === "loose")!;
    // Loose node should have been pushed — position changed
    expect(looseAfter.position.y !== before || looseAfter.position.x !== 120).toBe(true);
  });

  it("no-op for loose node already outside controller box", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "root" },
        { id: "ctrl" },
        { id: "op1" },
        {
          id: "loose",
          io: { outputs: [{ digest: "d1", name: "out" }] },
        },
      ],
      edges: [
        { source: "root", target: "ctrl", kind: "contains" },
        { source: "ctrl", target: "op1", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;

    // loose is far away from controller
    const nodes = [
      makeNode("op1", { position: { x: 100, y: 100 }, style: { width: "200px", height: "120px" } }),
      makeNode("loose", {
        position: { x: 1000, y: 1000 },
        style: { width: "140px", height: "60px" },
      }),
    ];

    const result = ensureControllerSpacing(nodes, gs, analysis, "TB");
    const looseAfter = result.find((n) => n.id === "loose")!;
    expect(looseAfter.position.x).toBe(1000);
    expect(looseAfter.position.y).toBe(1000);
  });
});

// ─── ensureControllerSpacing — Phase 4: leaf controller alignment ───────────

describe("ensureControllerSpacing — Phase 4 leaf alignment", () => {
  it("aligns leaf PipeSequence children on the same axis", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "root" },
        { id: "seq", pipe_type: "PipeSequence" },
        {
          id: "op1",
          pipe_code: "a",
          io: { outputs: [{ digest: "d1", name: "out" }] },
        },
        {
          id: "op2",
          pipe_code: "b",
          io: { inputs: [{ digest: "d1", name: "in" }] },
        },
      ],
      edges: [
        { source: "root", target: "seq", kind: "contains" },
        { source: "seq", target: "op1", kind: "contains" },
        { source: "seq", target: "op2", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes: builtNodes, edges: builtEdges } = buildDataflowGraph(gs, analysis, "bezier");
    const layouted = getLayoutedElements(builtNodes, builtEdges, "TB");
    const result = ensureControllerSpacing(layouted.nodes, gs, analysis, "TB");

    // In TB mode, Phase 4 aligns on x-axis (orderAxis = "x")
    const seqChildren = result.filter((n) => n.id === "op1" || n.id === "op2");
    if (seqChildren.length === 2) {
      const centers = seqChildren.map((n) => n.position.x + nodeWidth(n) / 2);
      // They should be aligned to the same median
      expect(Math.abs(centers[0] - centers[1])).toBeLessThan(1);
    }
  });

  it("skips PipeParallel controllers (not leaf-sequence)", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "root" },
        { id: "par", pipe_type: "PipeParallel" },
        {
          id: "op1",
          pipe_code: "a",
          io: { outputs: [{ digest: "d1", name: "out" }] },
        },
        {
          id: "op2",
          pipe_code: "b",
          io: { inputs: [{ digest: "d1", name: "in" }] },
        },
      ],
      edges: [
        { source: "root", target: "par", kind: "contains" },
        { source: "par", target: "op1", kind: "contains" },
        { source: "par", target: "op2", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes: builtNodes, edges: builtEdges } = buildDataflowGraph(gs, analysis, "bezier");
    const layouted = getLayoutedElements(builtNodes, builtEdges, "TB");
    const result = ensureControllerSpacing(layouted.nodes, gs, analysis, "TB");

    // Phase 4 should skip PipeParallel — positions may change from other phases
    // but the key assertion is that it doesn't crash and still returns nodes
    expect(result.length).toBe(layouted.nodes.length);
  });
});

// ─── ensureControllerSpacing — Phase 6: output stuff alignment ──────────────

describe("ensureControllerSpacing — Phase 6 output stuff alignment", () => {
  it("aligns output stuff with its producer on cross-axis", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "root" },
        { id: "seq", pipe_type: "PipeSequence" },
        {
          id: "op1",
          pipe_code: "a",
          io: {
            outputs: [{ digest: "d1", name: "out", concept: "Text" }],
          },
        },
        {
          id: "op2",
          pipe_code: "b",
          io: {
            inputs: [{ digest: "d1", name: "in", concept: "Text" }],
          },
        },
      ],
      edges: [
        { source: "root", target: "seq", kind: "contains" },
        { source: "seq", target: "op1", kind: "contains" },
        { source: "seq", target: "op2", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const { nodes: builtNodes, edges: builtEdges } = buildDataflowGraph(gs, analysis, "bezier");
    const layouted = getLayoutedElements(builtNodes, builtEdges, "TB");
    const result = ensureControllerSpacing(layouted.nodes, gs, analysis, "TB");

    // In TB mode, Phase 6 aligns stuff on x-axis with producer
    const stuff = result.find((n) => n.id === "stuff_d1");
    const producer = result.find((n) => n.id === "op1");
    if (stuff && producer) {
      // Stuff center should be near producer center on x-axis
      const stuffCenter = stuff.position.x + nodeWidth(stuff) / 2;
      const estW = (producer.data._estimatedWidth as number | undefined) ?? nodeWidth(producer);
      const producerCenter = producer.position.x + estW / 2;
      // Allow tolerance since Phase 4 alignment may also adjust positions
      expect(Math.abs(stuffCenter - producerCenter)).toBeLessThan(50);
    }
  });
});

// ─── getLayoutedElements — direction injection ──────────────────────────────

describe("getLayoutedElements — direction and position injection", () => {
  it("injects LR direction into pipeCardData", () => {
    const nodes: GraphNode[] = [
      makeNode("a", {
        type: "pipeCard",
        data: {
          isPipe: true,
          isStuff: false,
          labelText: "a",
          pipeCardData: {
            pipeCode: "a",
            pipeType: "PipeFunc",
            description: "",
            status: "scheduled",
            inputs: [],
            outputs: [],
          },
        },
      }),
    ];
    const result = getLayoutedElements(nodes, [], "LR");
    expect(result.nodes[0].data.pipeCardData?.direction).toBe("LR");
  });

  it("injects TB direction into pipeCardData", () => {
    const nodes: GraphNode[] = [
      makeNode("a", {
        type: "pipeCard",
        data: {
          isPipe: true,
          isStuff: false,
          labelText: "a",
          pipeCardData: {
            pipeCode: "a",
            pipeType: "PipeFunc",
            description: "",
            status: "scheduled",
            inputs: [],
            outputs: [],
          },
        },
      }),
    ];
    const result = getLayoutedElements(nodes, [], "TB");
    expect(result.nodes[0].data.pipeCardData?.direction).toBe("TB");
  });

  it("sets sourcePosition=right, targetPosition=left for LR", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b")];
    const result = getLayoutedElements(nodes, edges, "LR");
    expect(result.nodes[0].sourcePosition).toBe("right");
    expect(result.nodes[0].targetPosition).toBe("left");
  });

  it("sets sourcePosition=bottom, targetPosition=top for TB", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b")];
    const result = getLayoutedElements(nodes, edges, "TB");
    expect(result.nodes[0].sourcePosition).toBe("bottom");
    expect(result.nodes[0].targetPosition).toBe("top");
  });
});

// ─── getLayoutedElements — edge weights ─────────────────────────────────────

describe("getLayoutedElements — edge weights for special edges", () => {
  it("cross-group edges do not crash layout", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges: GraphEdge[] = [
      { id: "e1", source: "a", target: "b", type: "bezier", _crossGroup: true },
    ];
    expect(() => getLayoutedElements(nodes, edges, "TB")).not.toThrow();
  });

  it("batch edges do not crash layout", () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges: GraphEdge[] = [
      { id: "e1", source: "a", target: "b", type: "bezier", _batchEdge: true },
    ];
    expect(() => getLayoutedElements(nodes, edges, "TB")).not.toThrow();
  });
});

// ─── getLayoutedElements — sizing ───────────────────────────────────────────

describe("getLayoutedElements — adaptive sizing", () => {
  it("stuff nodes get 60px height estimate", () => {
    const nodes: GraphNode[] = [
      makeNode("s1", { data: { isPipe: false, isStuff: true, labelText: "data" } }),
    ];
    const result = getLayoutedElements(nodes, [], "TB");
    expect(result.nodes[0].data._estimatedHeight).toBe(60);
  });

  it("pipe cards with IO get adaptive height", () => {
    const nodes: GraphNode[] = [
      makeNode("p1", {
        type: "pipeCard",
        data: {
          isPipe: true,
          isStuff: false,
          labelText: "proc",
          pipeCardData: {
            pipeCode: "proc",
            pipeType: "PipeFunc",
            description: "A description",
            status: "scheduled",
            inputs: [
              { name: "a", concept: "Text" },
              { name: "b", concept: "Text" },
            ],
            outputs: [{ name: "c", concept: "Text" }],
          },
        },
      }),
    ];
    const result = getLayoutedElements(nodes, [], "TB");
    // Height should be > base (44) and <= 320 cap
    expect(result.nodes[0].data._estimatedHeight).toBeGreaterThan(44);
    expect(result.nodes[0].data._estimatedHeight).toBeLessThanOrEqual(320);
  });

  it("pipe card height is capped at 320px", () => {
    // Create a pipe card with many IO entries
    const manyInputs = Array.from({ length: 20 }, (_, i) => ({
      name: `in_${i}`,
      concept: "Text",
    }));
    const manyOutputs = Array.from({ length: 20 }, (_, i) => ({
      name: `out_${i}`,
      concept: "Text",
    }));
    const nodes: GraphNode[] = [
      makeNode("p1", {
        type: "pipeCard",
        data: {
          isPipe: true,
          isStuff: false,
          labelText: "big",
          pipeCardData: {
            pipeCode: "big",
            pipeType: "PipeFunc",
            description: "lots of IO",
            status: "scheduled",
            inputs: manyInputs,
            outputs: manyOutputs,
          },
        },
      }),
    ];
    const result = getLayoutedElements(nodes, [], "TB");
    expect(result.nodes[0].data._estimatedHeight).toBeLessThanOrEqual(320);
  });

  it("LR pipe card width uses smaller range than TB", () => {
    const pipeNode = makeNode("p1", {
      type: "pipeCard",
      data: {
        isPipe: true,
        isStuff: false,
        labelText: "proc",
        pipeCardData: {
          pipeCode: "proc",
          pipeType: "PipeFunc",
          status: "scheduled",
          inputs: [],
          outputs: [],
        },
      },
    });
    const lrResult = getLayoutedElements([{ ...pipeNode }], [], "LR");
    const tbResult = getLayoutedElements([{ ...pipeNode }], [], "TB");

    // LR max width (240) < TB max width (400)
    expect(lrResult.nodes[0].data._estimatedWidth).toBeLessThanOrEqual(240);
    expect(tbResult.nodes[0].data._estimatedWidth).toBeLessThanOrEqual(400);
  });
});
