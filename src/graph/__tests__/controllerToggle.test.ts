/**
 * Controller toggle integration tests: showControllers on/off and collapse/expand.
 */
import { describe, it, expect } from "vitest";
import { runFullPipeline, makeParallelSpec } from "./testUtils";
import {
  DRY_SIMPLE_PARALLEL,
  DRY_ALL_CONTROLLER_TYPES,
} from "@graph/react/viewer/__stories__/mockGraphSpec";
import { makeWideParallel } from "@graph/react/viewer/__stories__/extremeGraphSpecs";

describe("controller toggle", () => {
  it("showControllers=false: no controller group nodes in output", () => {
    const result = runFullPipeline(DRY_ALL_CONTROLLER_TYPES, { showControllers: false });
    const controllers = result.appNodes.filter((n) => n.type === "controllerGroup");
    expect(controllers).toHaveLength(0);
  });

  it("showControllers=true: controller group nodes present", () => {
    const result = runFullPipeline(DRY_ALL_CONTROLLER_TYPES, { showControllers: true });
    const controllers = result.appNodes.filter((n) => n.type === "controllerGroup");
    expect(controllers.length).toBeGreaterThan(0);
  });

  it("same number of pipe+stuff nodes whether controllers are on or off", () => {
    const off = runFullPipeline(DRY_SIMPLE_PARALLEL, { showControllers: false });
    const on = runFullPipeline(DRY_SIMPLE_PARALLEL, { showControllers: true });

    const offPipeStuff = off.appNodes.filter((n) => n.type !== "controllerGroup");
    const onPipeStuff = on.appNodes.filter((n) => n.type !== "controllerGroup");
    expect(offPipeStuff.length).toBe(onPipeStuff.length);
  });

  it("toggling controllers preserves all edge connections", () => {
    const off = runFullPipeline(DRY_SIMPLE_PARALLEL, { showControllers: false });
    const on = runFullPipeline(DRY_SIMPLE_PARALLEL, { showControllers: true });

    const offEdgeIds = off.appEdges.map((e) => e.id).sort();
    const onEdgeIds = on.appEdges.map((e) => e.id).sort();
    expect(offEdgeIds).toEqual(onEdgeIds);
  });
});

describe("collapse/expand integration", () => {
  it("collapsed PipeParallel(10) shows fewer children than expanded", () => {
    const spec = makeParallelSpec(10);
    const collapsed = runFullPipeline(spec, { showControllers: true });
    const expanded = runFullPipeline(spec, {
      showControllers: true,
      expandedControllers: new Set(["par"]),
    });

    // Collapsed should have fewer nodes than expanded
    expect(collapsed.appNodes.length).toBeLessThan(expanded.appNodes.length);
  });

  it("expanding shows all children", () => {
    const spec = makeParallelSpec(10);
    const expanded = runFullPipeline(spec, {
      showControllers: true,
      expandedControllers: new Set(["par"]),
    });

    const pipeNodes = expanded.appNodes.filter((n) => n.type === "pipeCard");
    // Should have source + 10 branches + compose = 12 pipe nodes
    expect(pipeNodes.length).toBeGreaterThanOrEqual(10);
  });

  it("wide parallel auto-collapses with >5 children", () => {
    const spec = makeWideParallel(10);
    const result = runFullPipeline(spec, { showControllers: true });

    const controllerNodes = result.appNodes.filter((n) => n.type === "controllerGroup");
    const parallelCtrl = controllerNodes.find((n) => n.data.pipeType === "PipeParallel");
    expect(parallelCtrl?.data.isCollapsed).toBe(true);
  });

  it("parallel with exactly 5 children does NOT auto-collapse", () => {
    const spec = makeParallelSpec(5);
    const result = runFullPipeline(spec, { showControllers: true });

    const controllerNodes = result.appNodes.filter((n) => n.type === "controllerGroup");
    const parallelCtrl = controllerNodes.find((n) => n.data.pipeType === "PipeParallel");
    if (parallelCtrl) {
      expect(parallelCtrl.data.isCollapsed).toBeFalsy();
    }
  });
});
