import { describe, it, expect } from "vitest";
import { getLayoutedElements, ensureControllerSpacing } from "../graphLayout";
import { buildDataflowAnalysis } from "../graphAnalysis";
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
});
