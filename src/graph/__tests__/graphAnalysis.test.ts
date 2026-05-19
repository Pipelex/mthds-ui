import { describe, it, expect } from "vitest";
import { buildDataflowAnalysis, buildChildToControllerMap } from "../graphAnalysis";
import type { GraphSpec } from "../types";

describe("buildDataflowAnalysis", () => {
  it("returns null for null input", () => {
    expect(buildDataflowAnalysis(null)).toBeNull();
  });

  it("returns empty registries for an empty graph", () => {
    const gs: GraphSpec = { nodes: [], edges: [] };
    const result = buildDataflowAnalysis(gs)!;
    expect(Object.keys(result.stuffRegistry)).toHaveLength(0);
    expect(Object.keys(result.stuffProducers)).toHaveLength(0);
    expect(Object.keys(result.stuffConsumers)).toHaveLength(0);
    expect(result.controllerNodeIds.size).toBe(0);
    expect(result.childNodeIds.size).toBe(0);
  });

  it("builds containment tree from contains edges", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "ctrl",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl",
          pipe_type: "PipeSequence",
        },
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "op1",
          pipe_type: "PipeFunc",
        },
        {
          pipe_code: "op2",
          kind: "operator",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "op2",
          pipe_type: "PipeFunc",
        },
      ],
      edges: [
        { id: "e0", source: "ctrl", target: "op1", kind: "contains" },
        { id: "e1", source: "ctrl", target: "op2", kind: "contains" },
      ],
    };
    const result = buildDataflowAnalysis(gs)!;
    expect(result.containmentTree["ctrl"]).toEqual(["op1", "op2"]);
    expect(result.controllerNodeIds.has("ctrl")).toBe(true);
    expect(result.childNodeIds.has("op1")).toBe(true);
    expect(result.childNodeIds.has("op2")).toBe(true);
  });

  it("detects controller nodes as those with children", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "ctrl",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl",
          pipe_type: "PipeSequence",
        },
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "op1",
          pipe_type: "PipeFunc",
        },
      ],
      edges: [{ id: "e2", source: "ctrl", target: "op1", kind: "contains" }],
    };
    const result = buildDataflowAnalysis(gs)!;
    expect(result.controllerNodeIds.has("ctrl")).toBe(true);
    expect(result.controllerNodeIds.has("op1")).toBe(false);
  });

  it("registers stuff from node IO outputs", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: {
            inputs: [],
            outputs: [{ digest: "d1", name: "result", concept: "Text", content_type: "text" }],
          },
        },
      ],
      edges: [],
    };
    const result = buildDataflowAnalysis(gs)!;
    expect(result.stuffRegistry["d1"]).toEqual({
      name: "result",
      concept: "Text",
      contentType: "text",
    });
    expect(result.stuffProducers["d1"]).toBe("op1");
  });

  it("registers stuff from node IO inputs", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d1", name: "input_data", concept: "Number" }] },
        },
      ],
      edges: [],
    };
    const result = buildDataflowAnalysis(gs)!;
    expect(result.stuffRegistry["d1"]).toEqual({
      name: "input_data",
      concept: "Number",
      contentType: undefined,
    });
    expect(result.stuffConsumers["d1"]).toEqual(["op1"]);
  });

  it("does not track controllers as producers/consumers", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "ctrl",
          kind: "controller",
          status: "succeeded",
          id: "ctrl",
          pipe_type: "PipeSequence",
          io: {
            outputs: [{ digest: "d1", name: "out" }],
            inputs: [{ digest: "d2", name: "in" }],
          },
        },
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "op1",
          pipe_type: "PipeFunc",
        },
      ],
      edges: [{ id: "e3", source: "ctrl", target: "op1", kind: "contains" }],
    };
    const result = buildDataflowAnalysis(gs)!;
    expect(result.stuffProducers["d1"]).toBeUndefined();
    expect(result.stuffConsumers["d2"]).toBeUndefined();
    // But stuff should still be registered
    expect(result.stuffRegistry["d1"]).toBeDefined();
    expect(result.stuffRegistry["d2"]).toBeDefined();
  });

  it("does not overwrite existing stuff registry entries with duplicates", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "first", concept: "Text" }] },
        },
        {
          pipe_code: "op2",
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d1", name: "second", concept: "Number" }] },
        },
      ],
      edges: [],
    };
    const result = buildDataflowAnalysis(gs)!;
    // First registration wins
    expect(result.stuffRegistry["d1"].name).toBe("first");
    expect(result.stuffRegistry["d1"].concept).toBe("Text");
  });

  it("tracks multiple consumers for the same digest", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d1", name: "in" }] },
        },
        {
          pipe_code: "op2",
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d1", name: "in" }] },
        },
        {
          pipe_code: "op3",
          kind: "operator",
          status: "succeeded",
          id: "op3",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "out" }] },
        },
      ],
      edges: [],
    };
    const result = buildDataflowAnalysis(gs)!;
    expect(result.stuffConsumers["d1"]).toEqual(["op1", "op2"]);
  });
});

describe("buildChildToControllerMap", () => {
  it("maps direct children from containment tree", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "ctrl",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl",
          pipe_type: "PipeSequence",
        },
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "op1",
          pipe_type: "PipeFunc",
        },
        {
          pipe_code: "op2",
          kind: "operator",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "op2",
          pipe_type: "PipeFunc",
        },
      ],
      edges: [
        { id: "e4", source: "ctrl", target: "op1", kind: "contains" },
        { id: "e5", source: "ctrl", target: "op2", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const map = buildChildToControllerMap(gs, analysis);
    expect(map["op1"]).toBe("ctrl");
    expect(map["op2"]).toBe("ctrl");
  });

  it("assigns stuff to controller of its producer when consumed inside", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "ctrl",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl",
          pipe_type: "PipeSequence",
        },
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "out" }] },
        },
        {
          pipe_code: "op2",
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d1", name: "in" }] },
        },
      ],
      edges: [
        { id: "e6", source: "ctrl", target: "op1", kind: "contains" },
        { id: "e7", source: "ctrl", target: "op2", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const map = buildChildToControllerMap(gs, analysis);
    expect(map["stuff_d1"]).toBe("ctrl");
  });

  it("handles nested controllers", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "root",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "root",
          pipe_type: "PipeSequence",
        },
        {
          pipe_code: "inner",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "inner",
          pipe_type: "PipeSequence",
        },
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "op1",
          pipe_type: "PipeFunc",
        },
      ],
      edges: [
        { id: "e8", source: "root", target: "inner", kind: "contains" },
        { id: "e9", source: "inner", target: "op1", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const map = buildChildToControllerMap(gs, analysis);
    expect(map["inner"]).toBe("root");
    expect(map["op1"]).toBe("inner");
  });

  it("assigns stuff produced by controllers to parent controller when consumed there", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "root",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "root",
          pipe_type: "PipeSequence",
        },
        {
          pipe_code: "inner",
          kind: "controller",
          status: "succeeded",
          id: "inner",
          pipe_type: "PipeSequence",
          io: { inputs: [], outputs: [{ digest: "d1", name: "ctrl_out" }] },
        },
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "op1",
          pipe_type: "PipeFunc",
        },
        {
          pipe_code: "op2",
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d1", name: "in" }] },
        },
      ],
      edges: [
        { id: "e10", source: "root", target: "inner", kind: "contains" },
        { id: "e11", source: "inner", target: "op1", kind: "contains" },
        { id: "e12", source: "root", target: "op2", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const map = buildChildToControllerMap(gs, analysis);
    // inner is a controller, its output stuff goes to root (parent controller)
    // because op2 consumes it and is inside root
    expect(map["stuff_d1"]).toBe("root");
  });

  it("assigns batch_item stuff to PipeBatch controller", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "root",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "root",
          pipe_type: "PipeSequence",
        },
        {
          pipe_code: "batch_ctrl",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "batch_ctrl",
          pipe_type: "PipeBatch",
        },
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d_src", name: "src" }] },
        },
      ],
      edges: [
        { id: "e13", source: "root", target: "batch_ctrl", kind: "contains" },
        { id: "e14", source: "batch_ctrl", target: "op1", kind: "contains" },
        {
          id: "e15",
          source: "batch_ctrl",
          target: "op1",
          kind: "batch_item",
          source_stuff_digest: "d_src",
          target_stuff_digest: "d_tgt",
        },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const map = buildChildToControllerMap(gs, analysis);
    expect(map["stuff_d_tgt"]).toBe("batch_ctrl");
  });

  it("controller with no children produces empty map for that controller", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "ctrl",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl",
          pipe_type: "PipeSequence",
        },
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "op1",
          pipe_type: "PipeFunc",
        },
      ],
      edges: [{ id: "e16", source: "ctrl", target: "op1", kind: "contains" }],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const map = buildChildToControllerMap(gs, analysis);
    // op1 is the only child
    expect(map["op1"]).toBe("ctrl");
    // ctrl itself is not in the map as a child (no parent)
    expect(map["ctrl"]).toBeUndefined();
  });

  it("batch_item from non-controller source does not assign stuff", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "out" }] },
        },
        {
          pipe_code: "op2",
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d2", name: "in" }] },
        },
      ],
      edges: [
        {
          id: "e17",
          source: "op1",
          target: "op2",
          kind: "batch_item",
          source_stuff_digest: "d1",
          target_stuff_digest: "d2",
        },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const map = buildChildToControllerMap(gs, analysis);
    // op1 is not a controller, so batch_item assignment doesn't apply
    expect(map["stuff_d2"]).toBeUndefined();
  });

  it("stuff produced by a controller's child maps to that controller when consumed inside", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "root",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "root",
          pipe_type: "PipeSequence",
        },
        {
          pipe_code: "ctrl",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl",
          pipe_type: "PipeSequence",
        },
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "out" }] },
        },
        {
          pipe_code: "op2",
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d2", name: "other" }] },
        },
        {
          pipe_code: "op3",
          kind: "operator",
          status: "succeeded",
          id: "op3",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d1", name: "in" }] },
        },
        {
          pipe_code: "op4",
          kind: "operator",
          status: "succeeded",
          id: "op4",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d2", name: "in" }] },
        },
      ],
      edges: [
        { id: "e18", source: "root", target: "ctrl", kind: "contains" },
        { id: "e19", source: "ctrl", target: "op1", kind: "contains" },
        { id: "e20", source: "ctrl", target: "op3", kind: "contains" },
        { id: "e21", source: "root", target: "op2", kind: "contains" },
        { id: "e22", source: "root", target: "op4", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const map = buildChildToControllerMap(gs, analysis);
    // stuff_d1 is produced by op1, consumed by op3 — both inside ctrl → maps to ctrl
    expect(map["stuff_d1"]).toBe("ctrl");
    // stuff_d2 is produced by op2, consumed by op4 — both inside root → maps to root
    expect(map["stuff_d2"]).toBe("root");
  });

  it("promotes stuff with no consumers to root level", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "ctrl",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl",
          pipe_type: "PipeSequence",
        },
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "final_output" }] },
        },
      ],
      edges: [{ id: "e23", source: "ctrl", target: "op1", kind: "contains" }],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const map = buildChildToControllerMap(gs, analysis);
    // stuff_d1 has no consumers → promoted to root (removed from map)
    expect(map["stuff_d1"]).toBeUndefined();
  });

  it("promotes stuff when all consumers are outside the producer's controller", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "root",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "root",
          pipe_type: "PipeSequence",
        },
        {
          pipe_code: "inner",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "inner",
          pipe_type: "PipeSequence",
        },
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "out" }] },
        },
        {
          pipe_code: "op2",
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d1", name: "in" }] },
        },
      ],
      edges: [
        { id: "e24", source: "root", target: "inner", kind: "contains" },
        { id: "e25", source: "inner", target: "op1", kind: "contains" },
        { id: "e26", source: "root", target: "op2", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const map = buildChildToControllerMap(gs, analysis);
    // stuff_d1 produced inside inner, consumed by op2 inside root but NOT inside inner
    // → promoted from inner to root
    expect(map["stuff_d1"]).toBe("root");
  });

  it("does not promote stuff involved in batch edges with no operator consumers", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "batch_ctrl",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "batch_ctrl",
          pipe_type: "PipeBatch",
        },
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "result" }] },
        },
      ],
      edges: [
        { id: "e27", source: "batch_ctrl", target: "op1", kind: "contains" },
        {
          id: "e28",
          source: "op1",
          target: "batch_ctrl",
          kind: "batch_aggregate",
          source_stuff_digest: "d1",
          target_stuff_digest: "d_agg",
        },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const map = buildChildToControllerMap(gs, analysis);
    // stuff_d1 has no operator consumers but IS in a batch_aggregate edge → stays
    expect(map["stuff_d1"]).toBe("batch_ctrl");
  });
});

// ─── buildDataflowAnalysis — additional edge cases ──────────────────────────

describe("buildDataflowAnalysis — edge cases", () => {
  it("ignores non-contains edges for containment tree", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [{ digest: "d1", name: "out" }] },
        },
        {
          pipe_code: "op2",
          kind: "operator",
          status: "succeeded",
          id: "op2",
          pipe_type: "PipeFunc",
          io: { outputs: [], inputs: [{ digest: "d1", name: "in" }] },
        },
      ],
      edges: [
        { id: "e29", source: "op1", target: "op2", kind: "data" },
        {
          id: "e30",
          source: "op1",
          target: "op2",
          kind: "batch_item",
          source_stuff_digest: "d1",
          target_stuff_digest: "d1",
        },
      ],
    };
    const result = buildDataflowAnalysis(gs)!;
    expect(Object.keys(result.containmentTree)).toHaveLength(0);
    expect(result.controllerNodeIds.size).toBe(0);
  });

  it("handles nodes with empty IO object", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: { inputs: [], outputs: [] },
        },
      ],
      edges: [],
    };
    const result = buildDataflowAnalysis(gs)!;
    expect(Object.keys(result.stuffRegistry)).toHaveLength(0);
  });

  it("handles nodes with undefined IO", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "op1",
          pipe_type: "PipeFunc",
        },
      ],
      edges: [],
    };
    const result = buildDataflowAnalysis(gs)!;
    expect(Object.keys(result.stuffRegistry)).toHaveLength(0);
  });

  it("skips IO items without digest", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_type: "PipeFunc",
          io: {
            inputs: [{ name: "in_no_digest" }],
            outputs: [{ name: "out_no_digest" }],
          },
        },
      ],
      edges: [],
    };
    const result = buildDataflowAnalysis(gs)!;
    expect(Object.keys(result.stuffRegistry)).toHaveLength(0);
    expect(Object.keys(result.stuffProducers)).toHaveLength(0);
    expect(Object.keys(result.stuffConsumers)).toHaveLength(0);
  });

  it("handles duplicate contains edges gracefully", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          pipe_code: "ctrl",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl",
          pipe_type: "PipeSequence",
        },
        {
          pipe_code: "op1",
          kind: "operator",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "op1",
          pipe_type: "PipeFunc",
        },
      ],
      edges: [
        { id: "e31", source: "ctrl", target: "op1", kind: "contains" },
        { id: "e32", source: "ctrl", target: "op1", kind: "contains" },
      ],
    };
    const result = buildDataflowAnalysis(gs)!;
    // op1 appears twice in the containment tree
    expect(result.containmentTree["ctrl"]).toEqual(["op1", "op1"]);
    expect(result.controllerNodeIds.has("ctrl")).toBe(true);
  });
});
