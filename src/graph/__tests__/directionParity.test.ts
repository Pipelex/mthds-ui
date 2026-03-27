/**
 * Direction parity tests: LR and TB produce structurally equivalent graph output.
 * Same nodes, same edges, same types — just different positions.
 */
import { describe, it, expect } from "vitest";
import { runFullPipeline } from "./testUtils";
import { DRY_RUN_CATALOG, LIVE_RUN_CATALOG } from "@graph/react/viewer/__stories__/mockGraphSpec";
import type { GraphSpec } from "../types";

const ALL_CATALOG_ENTRIES: [string, { label: string; spec: GraphSpec }][] = [
  ...Object.entries(DRY_RUN_CATALOG),
  ...Object.entries(LIVE_RUN_CATALOG),
];

describe("direction parity: LR vs TB produce equivalent graph structures", () => {
  it.each(ALL_CATALOG_ENTRIES)("%s: same node IDs in both directions", (_key, { spec }) => {
    const lr = runFullPipeline(spec, { direction: "LR", showControllers: true });
    const tb = runFullPipeline(spec, { direction: "TB", showControllers: true });

    const lrIds = lr.appNodes.map((n) => n.id).sort();
    const tbIds = tb.appNodes.map((n) => n.id).sort();
    expect(lrIds).toEqual(tbIds);
  });

  it.each(ALL_CATALOG_ENTRIES)("%s: same edge IDs in both directions", (_key, { spec }) => {
    const lr = runFullPipeline(spec, { direction: "LR", showControllers: true });
    const tb = runFullPipeline(spec, { direction: "TB", showControllers: true });

    const lrEdgeIds = lr.appEdges.map((e) => e.id).sort();
    const tbEdgeIds = tb.appEdges.map((e) => e.id).sort();
    expect(lrEdgeIds).toEqual(tbEdgeIds);
  });

  it.each(ALL_CATALOG_ENTRIES)("%s: same node types in both directions", (_key, { spec }) => {
    const lr = runFullPipeline(spec, { direction: "LR", showControllers: true });
    const tb = runFullPipeline(spec, { direction: "TB", showControllers: true });

    const lrTypes = lr.appNodes.map((n) => `${n.id}:${n.type}`).sort();
    const tbTypes = tb.appNodes.map((n) => `${n.id}:${n.type}`).sort();
    expect(lrTypes).toEqual(tbTypes);
  });
});
