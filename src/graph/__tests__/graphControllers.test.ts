import { describe, it, expect } from "vitest";
import {
  buildControllerNodes,
  applyControllers,
  MAX_VISIBLE_CONTROLLER_CHILDREN,
} from "../graphControllers";
import { buildDataflowAnalysis } from "../graphAnalysis";
import { CONTROLLER_PADDING_X, CONTROLLER_PADDING_TOP, CONTROLLER_PADDING_BOTTOM } from "../types";
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

// ─── MAX_VISIBLE_CONTROLLER_CHILDREN ────────────────────────────────────────

describe("MAX_VISIBLE_CONTROLLER_CHILDREN", () => {
  it("equals 5", () => {
    expect(MAX_VISIBLE_CONTROLLER_CHILDREN).toBe(5);
  });
});

// ─── Auto-collapse behaviour ────────────────────────────────────────────────

/** Build a spec with a controller of the given type containing N operator children. */
function makeControllerSpec(
  pipeType: string,
  childCount: number,
): { gs: GraphSpec; layoutedNodes: GraphNode[]; layoutedEdges: GraphEdge[] } {
  const nodes: GraphSpec["nodes"] = [
    { id: "root" },
    {
      id: "ctrl",
      pipe_code: "ctrl",
      pipe_type: pipeType as GraphSpec["nodes"][number]["pipe_type"],
    },
  ];
  const edges: GraphSpec["edges"] = [{ source: "root", target: "ctrl", kind: "contains" }];
  const layoutedNodes: GraphNode[] = [];
  const layoutedEdges: GraphEdge[] = [];

  for (let i = 0; i < childCount; i++) {
    const opId = `op${i}`;
    nodes.push({
      id: opId,
      pipe_code: opId,
      pipe_type: "PipeFunc",
      io: {
        outputs: [{ digest: `d_out_${i}`, name: `out_${i}` }],
        ...(i > 0 ? { inputs: [{ digest: `d_out_${i - 1}`, name: `in_${i}` }] } : {}),
      },
    });
    edges.push({ source: "ctrl", target: opId, kind: "contains" });
    layoutedNodes.push(
      makeNode(opId, {
        type: "pipeCard",
        data: { isPipe: true, isStuff: false, labelText: opId },
        position: { x: i * 250, y: 100 },
        style: { width: "200px", height: "120px" },
      }),
    );
  }

  return { gs: { nodes, edges }, layoutedNodes, layoutedEdges };
}

type GraphEdge = import("../types").GraphEdge;

describe("applyControllers — auto-collapse", () => {
  it("PipeParallel with >5 children auto-collapses", () => {
    const { gs, layoutedNodes, layoutedEdges } = makeControllerSpec("PipeParallel", 8);
    const analysis = buildDataflowAnalysis(gs)!;
    const result = applyControllers(layoutedNodes, layoutedEdges, gs, analysis, true);

    const ctrl = result.nodes.find((n) => n.id === "ctrl");
    expect(ctrl?.data.isCollapsed).toBe(true);
  });

  it("PipeBatch with >5 children auto-collapses", () => {
    const { gs, layoutedNodes, layoutedEdges } = makeControllerSpec("PipeBatch", 8);
    const analysis = buildDataflowAnalysis(gs)!;
    const result = applyControllers(layoutedNodes, layoutedEdges, gs, analysis, true);

    const ctrl = result.nodes.find((n) => n.id === "ctrl");
    expect(ctrl?.data.isCollapsed).toBe(true);
  });

  it("PipeSequence never auto-collapses even with >5 children", () => {
    const { gs, layoutedNodes, layoutedEdges } = makeControllerSpec("PipeSequence", 8);
    const analysis = buildDataflowAnalysis(gs)!;
    const result = applyControllers(layoutedNodes, layoutedEdges, gs, analysis, true);

    const ctrl = result.nodes.find((n) => n.id === "ctrl");
    expect(ctrl?.data.isCollapsed).toBeFalsy();
  });

  it("PipeCondition never auto-collapses even with >5 children", () => {
    const { gs, layoutedNodes, layoutedEdges } = makeControllerSpec("PipeCondition", 8);
    const analysis = buildDataflowAnalysis(gs)!;
    const result = applyControllers(layoutedNodes, layoutedEdges, gs, analysis, true);

    const ctrl = result.nodes.find((n) => n.id === "ctrl");
    expect(ctrl?.data.isCollapsed).toBeFalsy();
  });

  it("PipeParallel with exactly 5 children does NOT collapse", () => {
    const { gs, layoutedNodes, layoutedEdges } = makeControllerSpec("PipeParallel", 5);
    const analysis = buildDataflowAnalysis(gs)!;
    const result = applyControllers(layoutedNodes, layoutedEdges, gs, analysis, true);

    const ctrl = result.nodes.find((n) => n.id === "ctrl");
    expect(ctrl?.data.isCollapsed).toBeFalsy();
  });

  it("expandedControllers overrides auto-collapse", () => {
    const { gs, layoutedNodes, layoutedEdges } = makeControllerSpec("PipeParallel", 8);
    const analysis = buildDataflowAnalysis(gs)!;
    const result = applyControllers(
      layoutedNodes,
      layoutedEdges,
      gs,
      analysis,
      true,
      new Set(["ctrl"]),
    );

    const ctrl = result.nodes.find((n) => n.id === "ctrl");
    expect(ctrl?.data.isCollapsed).toBeFalsy();
    // All 8 children should be visible
    const ops = result.nodes.filter((n) => n.id.startsWith("op"));
    expect(ops).toHaveLength(8);
  });

  it("onToggleCollapse callback is injected into controller data", () => {
    const { gs, layoutedNodes, layoutedEdges } = makeControllerSpec("PipeParallel", 8);
    const analysis = buildDataflowAnalysis(gs)!;
    const calls: string[] = [];
    const result = applyControllers(
      layoutedNodes,
      layoutedEdges,
      gs,
      analysis,
      true,
      undefined,
      (id) => calls.push(id),
    );

    const ctrl = result.nodes.find((n) => n.id === "ctrl");
    expect(ctrl?.data.onToggleCollapse).toBeTypeOf("function");
    (ctrl!.data.onToggleCollapse as () => void)();
    expect(calls).toEqual(["ctrl"]);
  });

  it("childCount is set on controller data", () => {
    const { gs, layoutedNodes, layoutedEdges } = makeControllerSpec("PipeParallel", 8);
    const analysis = buildDataflowAnalysis(gs)!;
    const result = applyControllers(layoutedNodes, layoutedEdges, gs, analysis, true);

    const ctrl = result.nodes.find((n) => n.id === "ctrl");
    expect(ctrl?.data.childCount).toBe(8);
  });
});

// ─── Hidden node filtering ──────────────────────────────────────────────────

describe("applyControllers — hidden nodes when collapsed", () => {
  it("hides children beyond MAX_VISIBLE_CONTROLLER_CHILDREN", () => {
    const { gs, layoutedNodes, layoutedEdges } = makeControllerSpec("PipeParallel", 8);
    const analysis = buildDataflowAnalysis(gs)!;
    const result = applyControllers(layoutedNodes, layoutedEdges, gs, analysis, true);

    const ops = result.nodes.filter((n) => n.id.startsWith("op"));
    expect(ops).toHaveLength(MAX_VISIBLE_CONTROLLER_CHILDREN);
  });

  it("removes edges to hidden nodes", () => {
    const { gs, layoutedNodes } = makeControllerSpec("PipeParallel", 8);
    const analysis = buildDataflowAnalysis(gs)!;
    // Create edges between all nodes
    const edges: GraphEdge[] = [];
    for (let i = 0; i < 7; i++) {
      edges.push({
        id: `e${i}`,
        source: `op${i}`,
        target: `op${i + 1}`,
        type: "bezier",
      });
    }
    const result = applyControllers(layoutedNodes, edges, gs, analysis, true);

    // All remaining edges should only reference visible node IDs
    const visibleIds = new Set(result.nodes.map((n) => n.id));
    for (const edge of result.edges) {
      expect(visibleIds.has(edge.source)).toBe(true);
      expect(visibleIds.has(edge.target)).toBe(true);
    }
  });
});

// ─── buildControllerNodes — padding ─────────────────────────────────────────

describe("buildControllerNodes — bounding box and padding", () => {
  it("base padding at depth 0 matches constants", () => {
    // Single controller with one child — no parent controller, so no position conversion
    const gs: GraphSpec = {
      nodes: [{ id: "ctrl", pipe_code: "ctrl" }, { id: "op1" }],
      edges: [{ source: "ctrl", target: "op1", kind: "contains" }],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const layoutedNodes = [
      makeNode("op1", {
        position: { x: 100, y: 100 },
        style: { width: "200px", height: "120px" },
      }),
    ];
    const ctrlNodes = buildControllerNodes(gs, analysis, layoutedNodes);
    const ctrl = ctrlNodes.find((n) => n.id === "ctrl")!;

    // ctrl is at depth 0 (no child controllers), so depthScale = 1
    const expectedX = 100 - CONTROLLER_PADDING_X;
    const expectedY = 100 - CONTROLLER_PADDING_TOP;
    expect(ctrl.position.x).toBe(expectedX);
    expect(ctrl.position.y).toBe(expectedY);

    const expectedW = 200 + 2 * CONTROLLER_PADDING_X;
    const expectedH = 120 + CONTROLLER_PADDING_TOP + CONTROLLER_PADDING_BOTTOM;
    expect(parseFloat(ctrl.style!.width as string)).toBe(expectedW);
    expect(parseFloat(ctrl.style!.height as string)).toBe(expectedH);
  });

  it("padding scales +15% per nesting level", () => {
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
    const layoutedNodes = [
      makeNode("op1", {
        position: { x: 200, y: 200 },
        style: { width: "200px", height: "120px" },
      }),
    ];
    const ctrlNodes = buildControllerNodes(gs, analysis, layoutedNodes);

    // outer has depth 1 (contains inner which has depth 0)
    const outer = ctrlNodes.find((n) => n.id === "outer")!;
    const inner = ctrlNodes.find((n) => n.id === "inner")!;

    // inner is depth 0, outer is depth 1
    // outer padding should be scaled by 1 + 1*0.15 = 1.15
    const innerW = parseFloat(inner.style!.width as string);
    const outerW = parseFloat(outer.style!.width as string);
    expect(outerW).toBeGreaterThan(innerW);
  });

  it("includes stuff children in bounding box", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "root" },
        { id: "ctrl", pipe_code: "ctrl" },
        { id: "op1", io: { outputs: [{ digest: "d1", name: "out" }] } },
        { id: "op2", io: { inputs: [{ digest: "d1", name: "in" }] } },
      ],
      edges: [
        { source: "root", target: "ctrl", kind: "contains" },
        { source: "ctrl", target: "op1", kind: "contains" },
        { source: "ctrl", target: "op2", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const layoutedNodes = [
      makeNode("op1", {
        position: { x: 100, y: 100 },
        style: { width: "200px", height: "120px" },
      }),
      makeNode("op2", {
        position: { x: 100, y: 300 },
        style: { width: "200px", height: "120px" },
      }),
      // Stuff node further to the right (consumed by op2 so stays inside ctrl)
      makeNode("stuff_d1", {
        data: { isPipe: false, isStuff: true, labelText: "out" },
        position: { x: 400, y: 100 },
        style: { width: "140px", height: "60px" },
      }),
    ];
    const ctrlNodes = buildControllerNodes(gs, analysis, layoutedNodes);
    const ctrl = ctrlNodes.find((n) => n.id === "ctrl")!;

    // The controller's width should accommodate the stuff node at x=400 + 140px
    const ctrlRight = ctrl.position.x + parseFloat(ctrl.style!.width as string);
    expect(ctrlRight).toBeGreaterThanOrEqual(400 + 140);
  });
});
