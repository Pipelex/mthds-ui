/**
 * Direction parity tests: all four directions produce structurally equivalent graph output.
 * Same nodes, same edges, same types — just different positions.
 */
import { describe, it, expect } from "vitest";
import { runFullPipeline } from "./testUtils";
import { DRY_RUN_CATALOG, LIVE_RUN_CATALOG } from "@graph/react/viewer/__stories__/mockGraphSpec";
import type { GraphDirection, GraphSpec } from "../types";

const ALL_CATALOG_ENTRIES: [string, { label: string; spec: GraphSpec }][] = [
  ...Object.entries(DRY_RUN_CATALOG),
  ...Object.entries(LIVE_RUN_CATALOG),
];

const ALL_DIRECTIONS: GraphDirection[] = ["LR", "RL", "TB", "BT"];

// Generate all unique pairs of directions for parity comparison
const DIRECTION_PAIRS: [GraphDirection, GraphDirection][] = [];
for (let i = 0; i < ALL_DIRECTIONS.length; i++) {
  for (let j = i + 1; j < ALL_DIRECTIONS.length; j++) {
    DIRECTION_PAIRS.push([ALL_DIRECTIONS[i], ALL_DIRECTIONS[j]]);
  }
}

describe("direction parity: all directions produce equivalent graph structures", () => {
  describe.each(DIRECTION_PAIRS)("%s vs %s", (dirA, dirB) => {
    it.each(ALL_CATALOG_ENTRIES)("%s: same nodes, edges, and types", async (_key, { spec }) => {
      const a = await runFullPipeline(spec, { direction: dirA, showControllers: true });
      const b = await runFullPipeline(spec, { direction: dirB, showControllers: true });

      expect(a.appNodes.map((n) => n.id).sort()).toEqual(b.appNodes.map((n) => n.id).sort());
      expect(a.appEdges.map((e) => e.id).sort()).toEqual(b.appEdges.map((e) => e.id).sort());
      expect(a.appNodes.map((n) => `${n.id}:${n.type}`).sort()).toEqual(
        b.appNodes.map((n) => `${n.id}:${n.type}`).sort(),
      );
    });
  });
});
