/**
 * Snapshot regression tests: structural fingerprints for all pipeline fixtures.
 * Catches regressions in graph structure (missing nodes, wrong connections, broken containment)
 * without false positives from pixel-level position drift.
 */
import { describe, it, expect } from "vitest";
import { runFullPipeline, assertDeterministic } from "./testUtils";
import {
  DRY_RUN_CATALOG,
  LIVE_RUN_CATALOG,
  DRY_ALL_CONTROLLER_TYPES,
  DRY_DEEP_NESTING,
} from "../../graph/react/viewer/__stories__/mockGraphSpec";
import { makeWideParallel } from "../../graph/react/viewer/__stories__/extremeGraphSpecs";
import type { GraphSpec } from "../types";

/** Extract a structural fingerprint that is position-independent. */
function structuralFingerprint(spec: GraphSpec, direction: "LR" | "TB" = "LR") {
  const result = runFullPipeline(spec, { direction, showControllers: true });
  return {
    nodes: result.appNodes.map((n) => ({
      id: n.id,
      type: n.type,
      parentId: n.parentId,
    })),
    edges: result.appEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
  };
}

// ─── DRY catalog snapshots ─────────────────────────────────────────────────

describe("snapshot regression — DRY catalog", () => {
  it.each(Object.entries(DRY_RUN_CATALOG))("DRY %s matches snapshot", (_key, { spec }) => {
    const fp = structuralFingerprint(spec);
    expect(fp).toMatchSnapshot();
  });
});

// ─── LIVE catalog snapshots ────────────────────────────────────────────────

describe("snapshot regression — LIVE catalog", () => {
  it.each(Object.entries(LIVE_RUN_CATALOG))("LIVE %s matches snapshot", (_key, { spec }) => {
    const fp = structuralFingerprint(spec);
    expect(fp).toMatchSnapshot();
  });
});

// ─── Determinism ───────────────────────────────────────────────────────────

describe("determinism: same input always produces same output", () => {
  it("DRY_ALL_CONTROLLER_TYPES: 10 runs produce identical results", () => {
    assertDeterministic(DRY_ALL_CONTROLLER_TYPES, 10);
  });

  it("DRY_DEEP_NESTING: 10 runs produce identical results", () => {
    assertDeterministic(DRY_DEEP_NESTING, 10);
  });

  it("makeWideParallel(20): 5 runs produce identical results", () => {
    assertDeterministic(makeWideParallel(20), 5);
  });
});
