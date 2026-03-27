import { describe, it, expect } from "vitest";
import { buildControllerNodes, applyControllers } from "../graphControllers";
import { buildDataflowAnalysis } from "../graphAnalysis";
import type { GraphNode, GraphSpec } from "../types";

function makeNode(id: string, overrides?: Partial<GraphNode>): GraphNode {
  return {
    id,
    type: "default",
    data: { isPipe: true, isStuff: false, labelText: id },
    position: { x: 100, y: 100 },
    style: { width: "200px" },
    ...overrides,
  };
}

describe("buildControllerNodes", () => {
  it("creates controller group nodes wrapping children", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "root" },
        { id: "ctrl", pipe_code: "my_ctrl", pipe_type: "PipeSequence" },
        { id: "op1", pipe_code: "op1" },
      ],
      edges: [
        { source: "root", target: "ctrl", kind: "contains" },
        { source: "ctrl", target: "op1", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const layoutedNodes = [makeNode("op1")];
    const ctrlNodes = buildControllerNodes(gs, analysis, layoutedNodes);

    // root + ctrl are both created
    expect(ctrlNodes).toHaveLength(2);
    const ctrl = ctrlNodes.find((n) => n.id === "ctrl")!;
    expect(ctrl.type).toBe("controllerGroup");
    expect(ctrl.data.isController).toBe(true);
    expect(ctrl.data.pipeType).toBe("PipeSequence");
  });

  it("includes root controller", () => {
    const gs: GraphSpec = {
      nodes: [{ id: "root" }, { id: "op1" }],
      edges: [{ source: "root", target: "op1", kind: "contains" }],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const layoutedNodes = [makeNode("op1")];
    const ctrlNodes = buildControllerNodes(gs, analysis, layoutedNodes);

    // root controller is now included
    expect(ctrlNodes).toHaveLength(1);
    expect(ctrlNodes[0].id).toBe("root");
  });

  it("handles nested controllers", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "root" },
        { id: "outer", pipe_code: "outer_ctrl" },
        { id: "inner", pipe_code: "inner_ctrl" },
        { id: "op1" },
      ],
      edges: [
        { source: "root", target: "outer", kind: "contains" },
        { source: "outer", target: "inner", kind: "contains" },
        { source: "inner", target: "op1", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const layoutedNodes = [makeNode("op1")];
    const ctrlNodes = buildControllerNodes(gs, analysis, layoutedNodes);

    // All three controllers are created: root, outer, inner
    expect(ctrlNodes).toHaveLength(3);
    const ids = ctrlNodes.map((n) => n.id);
    expect(ids).toContain("root");
    expect(ids).toContain("outer");
    expect(ids).toContain("inner");
  });

  it("names batch controllers without implicit distinction", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "root" },
        { id: "ctrl", pipe_code: "my_pipe_batch", pipe_type: "PipeBatch" },
        { id: "op1" },
      ],
      edges: [
        { source: "root", target: "ctrl", kind: "contains" },
        { source: "ctrl", target: "op1", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const layoutedNodes = [makeNode("op1")];
    const ctrlNodes = buildControllerNodes(gs, analysis, layoutedNodes);

    // root + ctrl
    expect(ctrlNodes).toHaveLength(2);
    const ctrl = ctrlNodes.find((n) => n.id === "ctrl")!;
    expect(ctrl.data.label).toBe("my_pipe_batch");
    expect(ctrl.data.pipeType).toBe("PipeBatch");
    expect(ctrl.data.pipeCode).toBe("my_pipe_batch");
  });

  it("sets parentId on children after building", () => {
    const gs: GraphSpec = {
      nodes: [{ id: "root" }, { id: "ctrl" }, { id: "op1" }],
      edges: [
        { source: "root", target: "ctrl", kind: "contains" },
        { source: "ctrl", target: "op1", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const layoutedNodes = [makeNode("op1")];
    buildControllerNodes(gs, analysis, layoutedNodes);

    // After building, the child node should have parentId set
    expect(layoutedNodes[0].parentId).toBe("ctrl");
    expect(layoutedNodes[0].extent).toBe("parent");
  });
});

describe("applyControllers", () => {
  it("returns nodes unchanged when showControllers is false", () => {
    const nodes = [makeNode("a")];
    const result = applyControllers(nodes, [], null, null, false);
    expect(result.nodes).toEqual(nodes);
  });

  it("returns nodes unchanged when analysis is null", () => {
    const nodes = [makeNode("a")];
    const result = applyControllers(nodes, [], null, null, true);
    expect(result.nodes).toEqual(nodes);
  });

  it("returns nodes unchanged when graphspec is null", () => {
    const gs: GraphSpec = { nodes: [], edges: [] };
    const analysis = buildDataflowAnalysis(gs);
    const nodes = [makeNode("a")];
    const result = applyControllers(nodes, [], null, analysis, true);
    expect(result.nodes).toEqual(nodes);
  });

  it("prepends controller nodes before children", () => {
    const gs: GraphSpec = {
      nodes: [{ id: "root" }, { id: "ctrl", pipe_code: "ctrl" }, { id: "op1" }],
      edges: [
        { source: "root", target: "ctrl", kind: "contains" },
        { source: "ctrl", target: "op1", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const layoutedNodes = [makeNode("op1")];
    const result = applyControllers(layoutedNodes, [], gs, analysis, true);

    // Controller node should come before its children
    const ctrlIdx = result.nodes.findIndex((n) => n.id === "ctrl");
    const childIdx = result.nodes.findIndex((n) => n.id === "op1");
    expect(ctrlIdx).toBeLessThan(childIdx);
  });

  it("sorts parent nodes before children for ReactFlow", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "root" },
        { id: "outer", pipe_code: "outer" },
        { id: "inner", pipe_code: "inner" },
        { id: "op1" },
      ],
      edges: [
        { source: "root", target: "outer", kind: "contains" },
        { source: "outer", target: "inner", kind: "contains" },
        { source: "inner", target: "op1", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const layoutedNodes = [makeNode("op1")];
    const result = applyControllers(layoutedNodes, [], gs, analysis, true);

    const outerIdx = result.nodes.findIndex((n) => n.id === "outer");
    const innerIdx = result.nodes.findIndex((n) => n.id === "inner");
    const opIdx = result.nodes.findIndex((n) => n.id === "op1");
    expect(outerIdx).toBeLessThan(innerIdx);
    expect(innerIdx).toBeLessThan(opIdx);
  });
});
