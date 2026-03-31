/**
 * Controller toggle integration tests: showControllers on/off and collapse/expand.
 */
import { describe, it, expect } from "vitest";
import { runFullPipeline, makeParallelSpec } from "./testUtils";
import type { GraphSpec } from "@graph/types";
import {
  DRY_SIMPLE_PARALLEL,
  DRY_ALL_CONTROLLER_TYPES,
} from "@graph/react/viewer/__stories__/mockGraphSpec";
import { makeWideParallel } from "@graph/react/viewer/__stories__/extremeGraphSpecs";

describe("controller toggle", () => {
  it("showControllers=false: no controller group nodes in output", async () => {
    const result = await runFullPipeline(DRY_ALL_CONTROLLER_TYPES, { showControllers: false });
    const controllers = result.appNodes.filter((n) => n.type === "controllerGroup");
    expect(controllers).toHaveLength(0);
  });

  it("showControllers=true: controller group nodes present", async () => {
    const result = await runFullPipeline(DRY_ALL_CONTROLLER_TYPES, { showControllers: true });
    const controllers = result.appNodes.filter((n) => n.type === "controllerGroup");
    expect(controllers.length).toBeGreaterThan(0);
  });

  it("same number of pipe+stuff nodes whether controllers are on or off", async () => {
    const off = await runFullPipeline(DRY_SIMPLE_PARALLEL, { showControllers: false });
    const on = await runFullPipeline(DRY_SIMPLE_PARALLEL, { showControllers: true });

    const offPipeStuff = off.appNodes.filter((n) => n.type !== "controllerGroup");
    const onPipeStuff = on.appNodes.filter((n) => n.type !== "controllerGroup");
    expect(offPipeStuff.length).toBe(onPipeStuff.length);
  });

  it("toggling controllers preserves all edge connections", async () => {
    const off = await runFullPipeline(DRY_SIMPLE_PARALLEL, { showControllers: false });
    const on = await runFullPipeline(DRY_SIMPLE_PARALLEL, { showControllers: true });

    const offEdgeIds = off.appEdges.map((e) => e.id).sort();
    const onEdgeIds = on.appEdges.map((e) => e.id).sort();
    expect(offEdgeIds).toEqual(onEdgeIds);
  });
});

describe("collapse/expand integration", () => {
  it("collapsed PipeParallel(10) shows fewer children than expanded", async () => {
    const spec = makeParallelSpec(10);
    const collapsed = await runFullPipeline(spec, { showControllers: true });
    const expanded = await runFullPipeline(spec, {
      showControllers: true,
      expandedControllers: new Set(["par"]),
    });

    // Collapsed should have fewer nodes than expanded
    expect(collapsed.appNodes.length).toBeLessThan(expanded.appNodes.length);
  });

  it("expanding shows all children", async () => {
    const spec = makeParallelSpec(10);
    const expanded = await runFullPipeline(spec, {
      showControllers: true,
      expandedControllers: new Set(["par"]),
    });

    const pipeNodes = expanded.appNodes.filter((n) => n.type === "pipeCard");
    // Should have source + 10 branches + compose = 12 pipe nodes
    expect(pipeNodes.length).toBeGreaterThanOrEqual(10);
  });

  it("wide parallel auto-collapses with >5 children", async () => {
    const spec = makeWideParallel(10);
    const result = await runFullPipeline(spec, { showControllers: true });

    const controllerNodes = result.appNodes.filter((n) => n.type === "controllerGroup");
    const parallelCtrl = controllerNodes.find((n) => n.data.pipeType === "PipeParallel");
    expect(parallelCtrl?.data.isCollapsed).toBe(true);
  });

  it("parallel with exactly 5 children does NOT auto-collapse", async () => {
    const spec = makeParallelSpec(5);
    const result = await runFullPipeline(spec, { showControllers: true });

    const controllerNodes = result.appNodes.filter((n) => n.type === "controllerGroup");
    const parallelCtrl = controllerNodes.find((n) => n.data.pipeType === "PipeParallel");
    expect(parallelCtrl).toBeDefined();
    expect(parallelCtrl!.data.isCollapsed).toBeFalsy();
  });

  it("stuff nodes inside a hidden inner controller are also hidden", async () => {
    // Outer parallel with >5 children where one child is an inner parallel.
    // When the outer auto-collapses, the inner controller + its stuff nodes
    // should be hidden (the hiddenNodes.has(ctrlId) branch in applyControllers).
    const spec: GraphSpec = {
      nodes: [
        { id: "root_seq", pipe_type: "PipeSequence" },
        { id: "outer_par", pipe_type: "PipeParallel" },
        // 6 children so outer_par auto-collapses (>5)
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `branch_${i}`,
          pipe_code: `branch_${i}`,
          pipe_type: "PipeLLM" as const,
          io: {
            outputs: [{ digest: `br_out_${i}`, name: `out_${i}`, concept: "Text" }],
          },
        })),
        // Inner parallel as the 6th child (will be sliced off → hidden)
        { id: "inner_par", pipe_type: "PipeParallel" },
        {
          id: "inner_op_a",
          pipe_code: "inner_op_a",
          pipe_type: "PipeLLM" as const,
          io: {
            outputs: [{ digest: "inner_out", name: "inner_result", concept: "Text" }],
          },
        },
        {
          id: "inner_op_b",
          pipe_code: "inner_op_b",
          pipe_type: "PipeCompose" as const,
          io: {
            inputs: [{ digest: "inner_out", name: "inner_result", concept: "Text" }],
          },
        },
      ],
      edges: [
        { source: "root_seq", target: "outer_par", kind: "contains" },
        ...Array.from({ length: 5 }, (_, i) => ({
          source: "outer_par",
          target: `branch_${i}`,
          kind: "contains" as const,
        })),
        { source: "outer_par", target: "inner_par", kind: "contains" },
        { source: "inner_par", target: "inner_op_a", kind: "contains" },
        { source: "inner_par", target: "inner_op_b", kind: "contains" },
      ],
    };

    const result = await runFullPipeline(spec, { showControllers: true });

    // inner_par should be hidden (sliced off by collapse)
    expect(result.appNodes.find((n) => n.id === "inner_par")).toBeUndefined();

    // inner operators should also be hidden (descendants of hidden controller)
    expect(result.appNodes.find((n) => n.id === "inner_op_a")).toBeUndefined();
    expect(result.appNodes.find((n) => n.id === "inner_op_b")).toBeUndefined();

    // stuff node connecting the two inner operators should be hidden too
    // (exercises the hiddenNodes.has(ctrlId) branch in applyControllers)
    expect(result.appNodes.find((n) => n.id === "stuff_inner_out")).toBeUndefined();
  });
});
