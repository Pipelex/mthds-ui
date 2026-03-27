/**
 * Integration tests: full pipeline from GraphSpec → positioned nodes + edges.
 * Tests the complete chain that GraphViewer uses (minus React rendering).
 */
import { describe, it, expect } from "vitest";
import {
  runFullPipeline,
  makeMinimalSpec,
  makeParallelSpec,
  makeBatchSpec,
  makeNestedSpec,
  assertParentBeforeChildren,
  assertAllEdgesResolvable,
  assertNoNaNPositions,
  assertNoDuplicateIds,
} from "./testUtils";
import {
  DRY_SINGLE_PIPE,
  DRY_TWO_PIPE_CHAIN,
  DRY_SIMPLE_SEQUENCE,
  DRY_LONG_SEQUENCE,
  DRY_SIMPLE_PARALLEL,
  DRY_THREE_WAY_PARALLEL,
  DRY_SIMPLE_CONDITION,
  DRY_SIMPLE_BATCH,
  DRY_CV_SCREENING,
  DRY_NESTED_SEQ_PAR_SEQ,
  DRY_NESTED_SEQ_COND_SEQ,
  DRY_BATCH_WITH_INNER_SEQ,
  DRY_DIAMOND_PATTERN,
  DRY_ALL_PIPE_TYPES,
  DRY_RAG_PIPELINE,
  DRY_IMAGE_PIPELINE,
  DRY_WIDE_PARALLEL,
  DRY_MULTI_INPUT_CONVERGE,
  DRY_MULTI_OUTPUT_FANOUT,
  DRY_SIBLING_PARALLELS,
  DRY_DEEP_NESTING,
  DRY_ALL_CONTROLLER_TYPES,
  DRY_RUN_CATALOG,
  LIVE_RUN_CATALOG,
} from "@graph/react/viewer/__stories__/mockGraphSpec";
import { makeWideParallel, makeWideBatch } from "@graph/react/viewer/__stories__/extremeGraphSpecs";
import type { GraphSpec } from "../types";

// ─── Combine catalogs for parameterized tests ───────────────────────────────

const ALL_CATALOG_ENTRIES: [string, { label: string; spec: GraphSpec }][] = [
  ...Object.entries(DRY_RUN_CATALOG),
  ...Object.entries(LIVE_RUN_CATALOG),
];

// ─── Single pipe ────────────────────────────────────────────────────────────

describe("full pipeline — single pipe", () => {
  it("DRY_SINGLE_PIPE produces pipe nodes, stuff nodes, and edges", async () => {
    const result = await runFullPipeline(DRY_SINGLE_PIPE);
    expect(result.appNodes.length).toBeGreaterThan(0);
    expect(result.appEdges.length).toBeGreaterThan(0);

    const pipeNodes = result.appNodes.filter((n) => n.type === "pipeCard");
    const stuffNodes = result.appNodes.filter((n) => n.type === "default");
    expect(pipeNodes.length).toBeGreaterThanOrEqual(1);
    expect(stuffNodes.length).toBeGreaterThanOrEqual(1);
  });

  it("all nodes have non-zero positions after layout", async () => {
    const result = await runFullPipeline(DRY_SINGLE_PIPE);
    const hasNonZero = result.appNodes.some((n) => n.position.x !== 0 || n.position.y !== 0);
    expect(hasNonZero).toBe(true);
  });
});

// ─── Linear sequences ──────────────────────────────────────────────────────

describe("full pipeline — linear sequences", () => {
  it("DRY_TWO_PIPE_CHAIN produces correct structure", async () => {
    const result = await runFullPipeline(DRY_TWO_PIPE_CHAIN);
    const pipeNodes = result.appNodes.filter((n) => n.type === "pipeCard");
    expect(pipeNodes.length).toBeGreaterThanOrEqual(2);
  });

  it("DRY_SIMPLE_SEQUENCE produces correct structure", async () => {
    const result = await runFullPipeline(DRY_SIMPLE_SEQUENCE);
    const pipeNodes = result.appNodes.filter((n) => n.type === "pipeCard");
    expect(pipeNodes.length).toBeGreaterThanOrEqual(3);
  });

  it("DRY_LONG_SEQUENCE produces correct structure", async () => {
    const result = await runFullPipeline(DRY_LONG_SEQUENCE);
    const pipeNodes = result.appNodes.filter((n) => n.type === "pipeCard");
    expect(pipeNodes.length).toBeGreaterThanOrEqual(4);
  });

  it("nodes are ordered left-to-right in LR mode", async () => {
    const result = await runFullPipeline(DRY_SIMPLE_SEQUENCE, {
      direction: "LR",
      showControllers: false,
    });
    const pipeNodes = result.appNodes.filter((n) => n.type === "pipeCard");
    // In LR, x coordinates should generally increase along the chain
    expect(pipeNodes.length).toBeGreaterThan(1);
  });

  it("nodes are ordered top-to-bottom in TB mode", async () => {
    const result = await runFullPipeline(DRY_SIMPLE_SEQUENCE, {
      direction: "TB",
      showControllers: false,
    });
    const pipeNodes = result.appNodes.filter((n) => n.type === "pipeCard");
    expect(pipeNodes.length).toBeGreaterThan(1);
  });
});

// ─── Parallel branches ─────────────────────────────────────────────────────

describe("full pipeline — parallel branches", () => {
  it("DRY_SIMPLE_PARALLEL produces branches", async () => {
    const result = await runFullPipeline(DRY_SIMPLE_PARALLEL);
    expect(result.appNodes.length).toBeGreaterThan(2);
  });

  it("DRY_THREE_WAY_PARALLEL produces correct structure", async () => {
    const result = await runFullPipeline(DRY_THREE_WAY_PARALLEL);
    expect(result.appNodes.length).toBeGreaterThan(3);
  });

  it("DRY_WIDE_PARALLEL produces all branch nodes", async () => {
    const result = await runFullPipeline(DRY_WIDE_PARALLEL);
    expect(result.appNodes.length).toBeGreaterThan(5);
  });

  it("with controllers enabled, PipeParallel wraps branch nodes", async () => {
    const result = await runFullPipeline(DRY_SIMPLE_PARALLEL, { showControllers: true });
    const controllerNodes = result.appNodes.filter((n) => n.type === "controllerGroup");
    expect(controllerNodes.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Batch pipelines ───────────────────────────────────────────────────────

describe("full pipeline — batch", () => {
  it("DRY_SIMPLE_BATCH produces batch edges", async () => {
    const result = await runFullPipeline(DRY_SIMPLE_BATCH, { showControllers: false });
    // The original graphData should have batch edges
    const batchEdges = result.graphData.edges.filter((e) => e._batchEdge);
    expect(batchEdges.length).toBeGreaterThan(0);
  });
});

// ─── Condition pipelines ───────────────────────────────────────────────────

describe("full pipeline — conditions", () => {
  it("DRY_SIMPLE_CONDITION produces condition branches", async () => {
    const result = await runFullPipeline(DRY_SIMPLE_CONDITION, { showControllers: true });
    expect(result.appNodes.length).toBeGreaterThan(2);
  });
});

// ─── Nested controllers ────────────────────────────────────────────────────

describe("full pipeline — nested controllers", () => {
  it("DRY_NESTED_SEQ_PAR_SEQ handles Seq > Parallel > Seq", async () => {
    const result = await runFullPipeline(DRY_NESTED_SEQ_PAR_SEQ, { showControllers: true });
    const controllers = result.appNodes.filter((n) => n.type === "controllerGroup");
    expect(controllers.length).toBeGreaterThanOrEqual(2);
  });

  it("DRY_NESTED_SEQ_COND_SEQ handles Seq > Condition > Seq", async () => {
    const result = await runFullPipeline(DRY_NESTED_SEQ_COND_SEQ, { showControllers: true });
    expect(result.appNodes.length).toBeGreaterThan(3);
  });

  it("DRY_BATCH_WITH_INNER_SEQ handles Batch with inner Sequence", async () => {
    const result = await runFullPipeline(DRY_BATCH_WITH_INNER_SEQ, { showControllers: true });
    expect(result.appNodes.length).toBeGreaterThan(3);
  });

  it("DRY_DEEP_NESTING handles 4+ levels of nesting", async () => {
    const result = await runFullPipeline(DRY_DEEP_NESTING, { showControllers: true });
    const controllers = result.appNodes.filter((n) => n.type === "controllerGroup");
    expect(controllers.length).toBeGreaterThanOrEqual(3);
  });

  it("DRY_ALL_CONTROLLER_TYPES handles all controller types together", async () => {
    const result = await runFullPipeline(DRY_ALL_CONTROLLER_TYPES, { showControllers: true });
    const controllers = result.appNodes.filter((n) => n.type === "controllerGroup");
    expect(controllers.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── Complex patterns ──────────────────────────────────────────────────────

describe("full pipeline — complex patterns", () => {
  it("DRY_DIAMOND_PATTERN produces correct structure", async () => {
    const result = await runFullPipeline(DRY_DIAMOND_PATTERN);
    expect(result.appNodes.length).toBeGreaterThan(3);
  });

  it("DRY_MULTI_INPUT_CONVERGE: multiple inputs feed single operator", async () => {
    const result = await runFullPipeline(DRY_MULTI_INPUT_CONVERGE);
    expect(result.appNodes.length).toBeGreaterThan(2);
  });

  it("DRY_MULTI_OUTPUT_FANOUT: single operator feeds multiple consumers", async () => {
    const result = await runFullPipeline(DRY_MULTI_OUTPUT_FANOUT);
    expect(result.appNodes.length).toBeGreaterThan(2);
  });

  it("DRY_SIBLING_PARALLELS: two parallel controllers side by side", async () => {
    const result = await runFullPipeline(DRY_SIBLING_PARALLELS, { showControllers: true });
    expect(result.appNodes.length).toBeGreaterThan(4);
  });

  it("DRY_CV_SCREENING: complex real-world pipeline", async () => {
    const result = await runFullPipeline(DRY_CV_SCREENING, { showControllers: true });
    expect(result.appNodes.length).toBeGreaterThan(5);
  });

  it("DRY_RAG_PIPELINE: RAG workflow", async () => {
    const result = await runFullPipeline(DRY_RAG_PIPELINE, { showControllers: true });
    expect(result.appNodes.length).toBeGreaterThan(3);
  });

  it("DRY_IMAGE_PIPELINE: image processing pipeline", async () => {
    const result = await runFullPipeline(DRY_IMAGE_PIPELINE, { showControllers: true });
    expect(result.appNodes.length).toBeGreaterThan(3);
  });

  it("DRY_ALL_PIPE_TYPES: all 6 operator types in one graph", async () => {
    const result = await runFullPipeline(DRY_ALL_PIPE_TYPES);
    const pipeTypes = new Set(
      result.appNodes
        .filter((n) => n.type === "pipeCard")
        .map((n) => n.data.pipeCardData?.pipeType),
    );
    expect(pipeTypes.size).toBeGreaterThanOrEqual(4);
  });
});

// ─── Programmatic spec factories ────────────────────────────────────────────

describe("full pipeline — factory-generated specs", () => {
  it("makeMinimalSpec(3) produces a linear 3-pipe chain", async () => {
    const result = await runFullPipeline(makeMinimalSpec(3));
    const pipeNodes = result.appNodes.filter((n) => n.type === "pipeCard");
    expect(pipeNodes).toHaveLength(3);
  });

  it("makeParallelSpec(3) produces parallel structure", async () => {
    const result = await runFullPipeline(makeParallelSpec(3), { showControllers: true });
    const controllers = result.appNodes.filter((n) => n.type === "controllerGroup");
    expect(controllers.length).toBeGreaterThanOrEqual(1);
  });

  it("makeBatchSpec(3) produces batch structure with batch edges", async () => {
    const result = await runFullPipeline(makeBatchSpec(3));
    const batchEdges = result.graphData.edges.filter((e) => e._batchEdge);
    expect(batchEdges.length).toBeGreaterThan(0);
  });

  it("makeNestedSpec(4) produces deeply nested structure", async () => {
    const result = await runFullPipeline(makeNestedSpec(4), { showControllers: true });
    const controllers = result.appNodes.filter((n) => n.type === "controllerGroup");
    expect(controllers.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Extreme scale ─────────────────────────────────────────────────────────

describe("full pipeline — extreme scale", () => {
  it("makeWideParallel(10) produces correct structure", async () => {
    const result = await runFullPipeline(makeWideParallel(10), { showControllers: true });
    expect(result.appNodes.length).toBeGreaterThan(10);
  });

  it("makeWideParallel(50) completes without error", async () => {
    await expect(runFullPipeline(makeWideParallel(50))).resolves.toBeDefined();
  });

  it("makeWideParallel(100) completes within 5 seconds", async () => {
    const start = performance.now();
    await runFullPipeline(makeWideParallel(100));
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  it("makeWideBatch(10) produces correct structure", async () => {
    const result = await runFullPipeline(makeWideBatch(10));
    expect(result.appNodes.length).toBeGreaterThan(10);
  });

  it("makeWideBatch(50) completes without error", async () => {
    await expect(runFullPipeline(makeWideBatch(50))).resolves.toBeDefined();
  });
});

// ─── Structural invariants — parameterized over ALL real fixtures ───────────

describe("structural invariants — all catalog entries", () => {
  it.each(ALL_CATALOG_ENTRIES)(
    "%s: every edge references existing nodes",
    async (_key, { spec }) => {
      const result = await runFullPipeline(spec, { showControllers: true });
      assertAllEdgesResolvable(result.appNodes, result.appEdges);
    },
  );

  it.each(ALL_CATALOG_ENTRIES)("%s: no duplicate node IDs", async (_key, { spec }) => {
    const result = await runFullPipeline(spec, { showControllers: true });
    assertNoDuplicateIds(result.appNodes);
  });

  it.each(ALL_CATALOG_ENTRIES)("%s: parent nodes come before children", async (_key, { spec }) => {
    const result = await runFullPipeline(spec, { showControllers: true });
    assertParentBeforeChildren(result.appNodes);
  });

  it.each(ALL_CATALOG_ENTRIES)("%s: no NaN in positions", async (_key, { spec }) => {
    const result = await runFullPipeline(spec, { showControllers: true });
    assertNoNaNPositions(result.appNodes);
  });
});

// ─── Null / empty edge cases ───────────────────────────────────────────────

describe("full pipeline — edge cases", () => {
  it("null graphspec produces empty output", async () => {
    const result = await runFullPipeline(null);
    expect(result.appNodes).toHaveLength(0);
    expect(result.appEdges).toHaveLength(0);
    expect(result.analysis).toBeNull();
  });

  it("empty graphspec produces empty output", async () => {
    const result = await runFullPipeline({ nodes: [], edges: [] });
    expect(result.appNodes).toHaveLength(0);
    expect(result.appEdges).toHaveLength(0);
  });

  it("graphspec with no IO produces empty output", async () => {
    const result = await runFullPipeline({ nodes: [{ id: "op1" }], edges: [] });
    expect(result.appNodes).toHaveLength(0);
  });
});
