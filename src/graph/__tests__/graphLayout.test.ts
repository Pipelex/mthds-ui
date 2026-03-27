import { describe, it, expect } from "vitest";
import { getLayoutedElements } from "../graphLayout";
import type { GraphNode, GraphEdge } from "../types";

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
  it("assigns positions to nodes", async () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b")];
    const result = await getLayoutedElements(nodes, edges, "TB");

    expect(result.nodes).toHaveLength(2);
    for (const n of result.nodes) {
      expect(typeof n.position.x).toBe("number");
      expect(typeof n.position.y).toBe("number");
    }
  });

  it("uses TB direction by default", async () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b")];
    const result = await getLayoutedElements(nodes, edges, "TB");

    // In TB layout, first node should be above second
    const nodeA = result.nodes.find((n) => n.id === "a")!;
    const nodeB = result.nodes.find((n) => n.id === "b")!;
    expect(nodeA.position.y).toBeLessThan(nodeB.position.y);
  });

  it("handles LR direction", async () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b")];
    const result = await getLayoutedElements(nodes, edges, "LR");

    const nodeA = result.nodes.find((n) => n.id === "a")!;
    const nodeB = result.nodes.find((n) => n.id === "b")!;
    expect(nodeA.position.x).toBeLessThan(nodeB.position.x);
  });

  it("handles empty graph", async () => {
    const result = await getLayoutedElements([], [], "TB");
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it("handles edges-only graph by passing through edges", async () => {
    const edges = [makeEdge("e1", "a", "b")];
    const result = await getLayoutedElements([], edges, "TB");
    expect(result.edges).toHaveLength(1);
  });

  it("uses custom nodesep and ranksep", async () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b")];

    const tight = await getLayoutedElements(nodes, edges, "TB", { nodesep: 10, ranksep: 10 });
    const wide = await getLayoutedElements(nodes, edges, "TB", { nodesep: 200, ranksep: 200 });

    const tightA = tight.nodes.find((n) => n.id === "a")!;
    const tightB = tight.nodes.find((n) => n.id === "b")!;
    const wideA = wide.nodes.find((n) => n.id === "a")!;
    const wideB = wide.nodes.find((n) => n.id === "b")!;

    const tightGap = tightB.position.y - tightA.position.y;
    const wideGap = wideB.position.y - wideA.position.y;
    expect(wideGap).toBeGreaterThan(tightGap);
  });

  it("layout does not throw for basic graph", async () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b")];
    await expect(getLayoutedElements(nodes, edges, "TB")).resolves.toBeDefined();
  });
});

// ─── getLayoutedElements — direction injection ──────────────────────────────

describe("getLayoutedElements — direction and position injection", () => {
  it("injects LR direction into pipeCardData", async () => {
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
    const result = await getLayoutedElements(nodes, [], "LR");
    expect(result.nodes[0].data.pipeCardData?.direction).toBe("LR");
  });

  it("injects TB direction into pipeCardData", async () => {
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
    const result = await getLayoutedElements(nodes, [], "TB");
    expect(result.nodes[0].data.pipeCardData?.direction).toBe("TB");
  });

  it("sets sourcePosition=right, targetPosition=left for LR", async () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b")];
    const result = await getLayoutedElements(nodes, edges, "LR");
    expect(result.nodes[0].sourcePosition).toBe("right");
    expect(result.nodes[0].targetPosition).toBe("left");
  });

  it("sets sourcePosition=bottom, targetPosition=top for TB", async () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b")];
    const result = await getLayoutedElements(nodes, edges, "TB");
    expect(result.nodes[0].sourcePosition).toBe("bottom");
    expect(result.nodes[0].targetPosition).toBe("top");
  });
});

// ─── getLayoutedElements — edge weights ─────────────────────────────────────

describe("getLayoutedElements — edge weights for special edges", () => {
  it("cross-group edges do not crash layout", async () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges: GraphEdge[] = [
      { id: "e1", source: "a", target: "b", type: "bezier", _crossGroup: true },
    ];
    await expect(getLayoutedElements(nodes, edges, "TB")).resolves.toBeDefined();
  });

  it("batch edges do not crash layout", async () => {
    const nodes = [makeNode("a"), makeNode("b")];
    const edges: GraphEdge[] = [
      { id: "e1", source: "a", target: "b", type: "bezier", _batchEdge: true },
    ];
    await expect(getLayoutedElements(nodes, edges, "TB")).resolves.toBeDefined();
  });
});

// ─── getLayoutedElements — sizing ───────────────────────────────────────────

describe("getLayoutedElements — adaptive sizing", () => {
  it("stuff nodes get 60px height estimate", async () => {
    const nodes: GraphNode[] = [
      makeNode("s1", { data: { isPipe: false, isStuff: true, labelText: "data" } }),
    ];
    const result = await getLayoutedElements(nodes, [], "TB");
    expect(result.nodes[0].data._estimatedHeight).toBe(60);
  });

  it("pipe cards with IO get adaptive height", async () => {
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
    const result = await getLayoutedElements(nodes, [], "TB");
    // Height should be > base (44) and <= 320 cap
    expect(result.nodes[0].data._estimatedHeight).toBeGreaterThan(44);
    expect(result.nodes[0].data._estimatedHeight).toBeLessThanOrEqual(320);
  });

  it("pipe card height is capped at 320px", async () => {
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
    const result = await getLayoutedElements(nodes, [], "TB");
    expect(result.nodes[0].data._estimatedHeight).toBeLessThanOrEqual(320);
  });

  it("LR pipe card width uses smaller range than TB", async () => {
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
    const lrResult = await getLayoutedElements([{ ...pipeNode }], [], "LR");
    const tbResult = await getLayoutedElements([{ ...pipeNode }], [], "TB");

    // LR max width (240) < TB max width (400)
    expect(lrResult.nodes[0].data._estimatedWidth).toBeLessThanOrEqual(240);
    expect(tbResult.nodes[0].data._estimatedWidth).toBeLessThanOrEqual(400);
  });
});
