/**
 * Snapshot regression tests: structural fingerprints for all pipeline fixtures.
 * Catches regressions in graph structure (missing nodes, wrong connections, broken containment)
 * without false positives from pixel-level position drift.
 *
 * Fingerprints canonicalize the per-run random `graph_id` and stuff digests
 * (see makeCanonicalizer), so they survive a `make fixtures` regeneration.
 * pipelex's node numbering is itself not fully deterministic for branching
 * pipelines (a condition's branches can be numbered in either order), so a
 * regeneration may still shift a few fingerprints — re-baseline with
 * `vitest -u` after `make fixtures` when that happens.
 */
import { describe, it, expect } from "vitest";
import { runFullPipeline, assertDeterministic } from "./testUtils";
import {
  DRY_RUN_CATALOG,
  DRY_ALL_CONTROLLER_TYPES,
  DRY_DEEP_NESTING,
} from "@graph/react/viewer/__stories__/mockGraphSpec";
import { LIVE_RUN_CATALOG } from "@graph/react/viewer/__stories__/liveGraphSpec";
import { STATIC_RUN_CATALOG } from "@graph/react/viewer/__stories__/staticGraphSpec";
import { makeWideParallel } from "@graph/react/viewer/__stories__/extremeGraphSpecs";
import type { GraphSpec } from "../types";

/**
 * Build a token replacer that scrubs the values pipelex randomizes on every
 * run — the `graph_id` and every stuff `digest` — out of node/edge IDs.
 * Digests are labelled by structural first-appearance order (node order, then
 * io order), so the fingerprint is stable across `make fixtures` regenerations
 * and only changes when the actual graph topology changes.
 */
function makeCanonicalizer(spec: GraphSpec): (id?: string) => string | undefined {
  const tokens = new Map<string, string>();
  if (spec.graph_id) tokens.set(spec.graph_id, "GID");
  let digestCount = 0;
  const noteDigest = (d?: string) => {
    if (d && !tokens.has(d)) tokens.set(d, `d${digestCount++}`);
  };
  for (const node of spec.nodes) {
    for (const io of [...(node.io?.inputs ?? []), ...(node.io?.outputs ?? [])])
      noteDigest(io.digest);
  }
  for (const edge of spec.edges) {
    noteDigest(edge.source_stuff_digest);
    noteDigest(edge.target_stuff_digest);
  }
  return (id) => {
    if (id == null) return id;
    let out = id;
    for (const [from, to] of tokens) out = out.split(from).join(to);
    return out;
  };
}

/** Extract a structural fingerprint that is position- and regeneration-independent. */
async function structuralFingerprint(spec: GraphSpec, direction: "LR" | "TB" = "LR") {
  const result = await runFullPipeline(spec, { direction, showControllers: true });
  const canon = makeCanonicalizer(spec);
  return {
    nodes: result.appNodes.map((n) => ({
      id: canon(n.id),
      type: n.type,
      parentId: canon(n.parentId),
    })),
    edges: result.appEdges.map((e) => ({
      id: canon(e.id),
      source: canon(e.source),
      target: canon(e.target),
    })),
  };
}

// ─── DRY catalog snapshots ─────────────────────────────────────────────────

describe("snapshot regression — DRY catalog", () => {
  it.each(Object.entries(DRY_RUN_CATALOG))("DRY %s matches snapshot", async (_key, { spec }) => {
    const fp = await structuralFingerprint(spec);
    expect(fp).toMatchSnapshot();
  });
});

// ─── LIVE catalog snapshots ────────────────────────────────────────────────

describe("snapshot regression — LIVE catalog", () => {
  it.each(Object.entries(LIVE_RUN_CATALOG))("LIVE %s matches snapshot", async (_key, { spec }) => {
    const fp = await structuralFingerprint(spec);
    expect(fp).toMatchSnapshot();
  });
});

const STATIC_SNAPSHOT_KEYS = [
  "STATIC_SIMPLE_SEQUENCE",
  "STATIC_SIMPLE_CONDITION",
  "STATIC_SIMPLE_BATCH",
  "STATIC_CV_SCREENING",
  "STATIC_DEEP_NESTING",
  "STATIC_WIDE_PARALLEL",
] as const;

describe("snapshot regression — STATIC selected catalog", () => {
  it.each(STATIC_SNAPSHOT_KEYS)("STATIC %s matches snapshot", async (key) => {
    const fp = await structuralFingerprint(STATIC_RUN_CATALOG[key].spec);
    expect(fp).toMatchSnapshot();
  });
});

// ─── Determinism ───────────────────────────────────────────────────────────

describe("determinism: same input always produces same output", () => {
  it("DRY_ALL_CONTROLLER_TYPES: 10 runs produce identical results", async () => {
    await assertDeterministic(DRY_ALL_CONTROLLER_TYPES, 10);
  });

  it("DRY_DEEP_NESTING: 10 runs produce identical results", async () => {
    await assertDeterministic(DRY_DEEP_NESTING, 10);
  });

  it("makeWideParallel(20): 5 runs produce identical results", async () => {
    await assertDeterministic(makeWideParallel(20), 5);
  });
});
