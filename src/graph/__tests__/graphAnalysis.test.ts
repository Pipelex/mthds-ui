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
      nodes: [{ id: "ctrl" }, { id: "op1" }, { id: "op2" }],
      edges: [
        { source: "ctrl", target: "op1", kind: "contains" },
        { source: "ctrl", target: "op2", kind: "contains" },
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
      nodes: [{ id: "ctrl" }, { id: "op1" }],
      edges: [{ source: "ctrl", target: "op1", kind: "contains" }],
    };
    const result = buildDataflowAnalysis(gs)!;
    expect(result.controllerNodeIds.has("ctrl")).toBe(true);
    expect(result.controllerNodeIds.has("op1")).toBe(false);
  });

  it("registers stuff from node IO outputs", () => {
    const gs: GraphSpec = {
      nodes: [
        {
          id: "op1",
          io: {
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
          id: "op1",
          io: {
            inputs: [{ digest: "d1", name: "input_data", concept: "Number" }],
          },
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
          id: "ctrl",
          io: {
            outputs: [{ digest: "d1", name: "out" }],
            inputs: [{ digest: "d2", name: "in" }],
          },
        },
        { id: "op1" },
      ],
      edges: [{ source: "ctrl", target: "op1", kind: "contains" }],
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
          id: "op1",
          io: { outputs: [{ digest: "d1", name: "first", concept: "Text" }] },
        },
        {
          id: "op2",
          io: { inputs: [{ digest: "d1", name: "second", concept: "Number" }] },
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
        { id: "op1", io: { inputs: [{ digest: "d1", name: "in" }] } },
        { id: "op2", io: { inputs: [{ digest: "d1", name: "in" }] } },
        { id: "op3", io: { outputs: [{ digest: "d1", name: "out" }] } },
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
      nodes: [{ id: "ctrl" }, { id: "op1" }, { id: "op2" }],
      edges: [
        { source: "ctrl", target: "op1", kind: "contains" },
        { source: "ctrl", target: "op2", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const map = buildChildToControllerMap(gs, analysis);
    expect(map["op1"]).toBe("ctrl");
    expect(map["op2"]).toBe("ctrl");
  });

  it("assigns stuff to controller of its producer", () => {
    const gs: GraphSpec = {
      nodes: [{ id: "ctrl" }, { id: "op1", io: { outputs: [{ digest: "d1", name: "out" }] } }],
      edges: [{ source: "ctrl", target: "op1", kind: "contains" }],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const map = buildChildToControllerMap(gs, analysis);
    expect(map["stuff_d1"]).toBe("ctrl");
  });

  it("handles nested controllers", () => {
    const gs: GraphSpec = {
      nodes: [{ id: "root" }, { id: "inner" }, { id: "op1" }],
      edges: [
        { source: "root", target: "inner", kind: "contains" },
        { source: "inner", target: "op1", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const map = buildChildToControllerMap(gs, analysis);
    expect(map["inner"]).toBe("root");
    expect(map["op1"]).toBe("inner");
  });

  it("assigns stuff produced by controllers to parent controller", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "root" },
        {
          id: "inner",
          io: { outputs: [{ digest: "d1", name: "ctrl_out" }] },
        },
        { id: "op1" },
      ],
      edges: [
        { source: "root", target: "inner", kind: "contains" },
        { source: "inner", target: "op1", kind: "contains" },
      ],
    };
    const analysis = buildDataflowAnalysis(gs)!;
    const map = buildChildToControllerMap(gs, analysis);
    // inner is a controller, its output stuff goes to root (parent controller)
    expect(map["stuff_d1"]).toBe("root");
  });

  it("assigns batch_item stuff to PipeBatch controller", () => {
    const gs: GraphSpec = {
      nodes: [
        { id: "root" },
        { id: "batch_ctrl" },
        { id: "op1", io: { outputs: [{ digest: "d_src", name: "src" }] } },
      ],
      edges: [
        { source: "root", target: "batch_ctrl", kind: "contains" },
        { source: "batch_ctrl", target: "op1", kind: "contains" },
        {
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
});
