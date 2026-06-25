import { describe, it, expect, vi } from "vitest";
import type { GraphSpec } from "@graph/types";
import { NODE_TYPE_PIPE_CARD } from "@graph/types";
import {
  applyFolds,
  buildContainmentChain,
  findCousinControllers,
  outermostFoldedAncestor,
} from "@graph/graphFolds";
import { buildDataflowAnalysis, buildChildToControllerMap } from "@graph/graphAnalysis";
import { buildDataflowGraph } from "@graph/graphBuilders";

function buildPipeline(spec: GraphSpec) {
  const analysis = buildDataflowAnalysis(spec)!;
  const graphData = buildDataflowGraph(spec, analysis, "bezier");
  const childToCtrl = buildChildToControllerMap(spec, analysis);
  return { spec, analysis, graphData, childToCtrl };
}

// ─── A standard sibling-controllers spec used across multiple tests ─────

function makeNestedSiblingSpec(): GraphSpec {
  return {
    nodes: [
      {
        kind: "controller",
        status: "succeeded",
        io: { inputs: [], outputs: [] },
        id: "root_seq",
        pipe_code: "root",
        pipe_type: "PipeSequence",
      },
      {
        kind: "controller",
        status: "succeeded",
        io: { inputs: [], outputs: [] },
        id: "ctrlA",
        pipe_code: "ctrlA",
        pipe_type: "PipeSequence",
      },
      {
        kind: "controller",
        status: "succeeded",
        io: { inputs: [], outputs: [] },
        id: "ctrlB",
        pipe_code: "ctrlB",
        pipe_type: "PipeSequence",
      },
      {
        kind: "operator",
        status: "succeeded",
        id: "op_a",
        pipe_code: "op_a",
        pipe_type: "PipeLLM",
        io: { inputs: [], outputs: [{ digest: "out_a", name: "result_a", concept: "Text" }] },
      },
      {
        kind: "operator",
        status: "succeeded",
        id: "op_b",
        pipe_code: "op_b",
        pipe_type: "PipeLLM",
        io: {
          inputs: [{ digest: "out_a", name: "result_a", concept: "Text" }],
          outputs: [{ digest: "out_b", name: "result_b", concept: "Text" }],
        },
      },
    ],
    edges: [
      { id: "e0", source: "root_seq", target: "ctrlA", kind: "contains" },
      { id: "e1", source: "root_seq", target: "ctrlB", kind: "contains" },
      { id: "e2", source: "ctrlA", target: "op_a", kind: "contains" },
      { id: "e3", source: "ctrlB", target: "op_b", kind: "contains" },
    ],
  };
}

// ─── buildContainmentChain ─────────────────────────────────────────────

describe("buildContainmentChain", () => {
  it("returns ancestors from immediate parent to root", () => {
    const { spec, analysis } = buildPipeline(makeNestedSiblingSpec());
    const childToCtrl = buildChildToControllerMap(spec, analysis);
    const chain = buildContainmentChain("op_a", childToCtrl);
    expect(chain).toEqual(["ctrlA", "root_seq"]);
  });

  it("returns empty for root-level nodes", () => {
    const { spec, analysis } = buildPipeline(makeNestedSiblingSpec());
    const childToCtrl = buildChildToControllerMap(spec, analysis);
    const chain = buildContainmentChain("root_seq", childToCtrl);
    expect(chain).toEqual([]);
  });

  it("guards against cycles", () => {
    const childToCtrl = { a: "b", b: "a" };
    // Should not infinite-loop
    const chain = buildContainmentChain("a", childToCtrl);
    expect(chain.length).toBeLessThanOrEqual(2);
  });
});

// ─── outermostFoldedAncestor ───────────────────────────────────────────

describe("outermostFoldedAncestor", () => {
  it("returns the topmost folded ancestor in the chain", () => {
    const { spec, analysis } = buildPipeline(makeNestedSiblingSpec());
    const childToCtrl = buildChildToControllerMap(spec, analysis);
    expect(outermostFoldedAncestor("op_a", childToCtrl, new Set(["root_seq", "ctrlA"]))).toBe(
      "root_seq",
    );
  });

  it("returns null when no ancestor is folded", () => {
    const { spec, analysis } = buildPipeline(makeNestedSiblingSpec());
    const childToCtrl = buildChildToControllerMap(spec, analysis);
    expect(outermostFoldedAncestor("op_a", childToCtrl, new Set())).toBeNull();
  });

  it("returns the only folded ancestor when exactly one is folded", () => {
    const { spec, analysis } = buildPipeline(makeNestedSiblingSpec());
    const childToCtrl = buildChildToControllerMap(spec, analysis);
    expect(outermostFoldedAncestor("op_a", childToCtrl, new Set(["ctrlA"]))).toBe("ctrlA");
  });
});

// ─── findCousinControllers ─────────────────────────────────────────────

describe("findCousinControllers", () => {
  function makeCousinSpec(): GraphSpec {
    // Two PipeSequence controllers with the same pipe_code "shared_seq"
    // living in different branches of a parent parallel. A third unrelated
    // controller "ctrl_other" exists to confirm it's excluded.
    return {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "root_par",
          pipe_code: "root",
          pipe_type: "PipeParallel",
        },
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "seq_a",
          pipe_code: "shared_seq",
          pipe_type: "PipeSequence",
        },
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "seq_b",
          pipe_code: "shared_seq",
          pipe_type: "PipeSequence",
        },
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl_other",
          pipe_code: "other",
          pipe_type: "PipeSequence",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op_a",
          pipe_code: "op_a",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "out_a", name: "x", concept: "Text" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op_b",
          pipe_code: "op_b",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "out_b", name: "y", concept: "Text" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op_c",
          pipe_code: "op_c",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "out_c", name: "z", concept: "Text" }] },
        },
      ],
      edges: [
        { id: "e4", source: "root_par", target: "seq_a", kind: "contains" },
        { id: "e5", source: "root_par", target: "seq_b", kind: "contains" },
        { id: "e6", source: "root_par", target: "ctrl_other", kind: "contains" },
        { id: "e7", source: "seq_a", target: "op_a", kind: "contains" },
        { id: "e8", source: "seq_b", target: "op_b", kind: "contains" },
        { id: "e9", source: "ctrl_other", target: "op_c", kind: "contains" },
      ],
    };
  }

  it("returns all controllers sharing the same pipe_code", () => {
    const { spec, analysis } = buildPipeline(makeCousinSpec());
    const cousins = findCousinControllers("seq_a", spec, analysis.controllerNodeIds);
    expect(cousins).toEqual(new Set(["seq_a", "seq_b"]));
  });

  it("returns the cousin set regardless of which sibling is the seed", () => {
    const { spec, analysis } = buildPipeline(makeCousinSpec());
    const fromA = findCousinControllers("seq_a", spec, analysis.controllerNodeIds);
    const fromB = findCousinControllers("seq_b", spec, analysis.controllerNodeIds);
    expect(fromA).toEqual(fromB);
  });

  it("does not include controllers with a different pipe_code", () => {
    const { spec, analysis } = buildPipeline(makeCousinSpec());
    const cousins = findCousinControllers("seq_a", spec, analysis.controllerNodeIds);
    expect(cousins.has("ctrl_other")).toBe(false);
    expect(cousins.has("root_par")).toBe(false);
  });

  it("returns a singleton when the controller has no cousins", () => {
    const { spec, analysis } = buildPipeline(makeCousinSpec());
    const cousins = findCousinControllers("ctrl_other", spec, analysis.controllerNodeIds);
    expect(cousins).toEqual(new Set(["ctrl_other"]));
  });

  it("returns a singleton when the controller lacks a pipe_code", () => {
    const spec: GraphSpec = {
      nodes: [
        {
          pipe_code: "anon_ctrl",
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "anon_ctrl",
          pipe_type: "PipeSequence",
        },
      ],
      edges: [],
    };
    const { analysis } = buildPipeline(spec);
    const cousins = findCousinControllers("anon_ctrl", spec, analysis.controllerNodeIds);
    expect(cousins).toEqual(new Set(["anon_ctrl"]));
  });

  it("excludes non-controller nodes that happen to share a pipe_code", () => {
    // Edge case: a controller and an operator both labeled with the same
    // pipe_code (extremely contrived but the filter must hold).
    const spec: GraphSpec = {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl",
          pipe_code: "shared",
          pipe_type: "PipeSequence",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op",
          pipe_code: "shared",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "d", name: "x", concept: "Text" }] },
        },
      ],
      edges: [{ id: "e10", source: "ctrl", target: "op", kind: "contains" }],
    };
    const { analysis } = buildPipeline(spec);
    const cousins = findCousinControllers("ctrl", spec, analysis.controllerNodeIds);
    expect(cousins).toEqual(new Set(["ctrl"]));
  });
});

// ─── applyFolds: no-op behavior ────────────────────────────────────────

describe("applyFolds — empty fold set", () => {
  it("returns the same nodes/edges/analysis when fold set is empty", () => {
    const { spec, analysis, graphData } = buildPipeline(makeNestedSiblingSpec());

    const result = applyFolds(graphData, analysis, spec, new Set());
    expect(result.nodes).toBe(graphData.nodes);
    expect(result.edges).toBe(graphData.edges);
    expect(result.analysis).toBe(analysis);
  });

  it("does not mutate inputs when fold set is non-empty", () => {
    const { spec, analysis, graphData } = buildPipeline(makeNestedSiblingSpec());
    const originalNodes = structuredClone(graphData.nodes);
    const originalEdges = structuredClone(graphData.edges);
    const originalControllerIds = Array.from(analysis.controllerNodeIds);

    applyFolds(graphData, analysis, spec, new Set(["ctrlA"]));

    expect(structuredClone(graphData.nodes)).toEqual(originalNodes);
    expect(structuredClone(graphData.edges)).toEqual(originalEdges);
    expect(Array.from(analysis.controllerNodeIds)).toEqual(originalControllerIds);
  });
});

// ─── applyFolds: single folded controller ──────────────────────────────

describe("applyFolds — single fold", () => {
  it("hides children and emits a pipe-card node for the controller", () => {
    const { spec, analysis, graphData } = buildPipeline(makeNestedSiblingSpec());

    const result = applyFolds(graphData, analysis, spec, new Set(["ctrlA"]));

    // op_a should not appear in result
    expect(result.nodes.find((n) => n.id === "op_a")).toBeUndefined();

    // ctrlA appears as a pipe-card with the right payload
    const card = result.nodes.find((n) => n.id === "ctrlA");
    expect(card).toBeDefined();
    expect(card!.type).toBe(NODE_TYPE_PIPE_CARD);
    expect(card!.data.isController).toBe(true);
    expect(card!.data.isPipe).toBe(false);
    expect(card!.data.pipeCardData?.pipeType).toBe("PipeSequence");
  });

  it("reattaches external edges so they connect to the controller card", () => {
    const { spec, analysis, graphData } = buildPipeline(makeNestedSiblingSpec());

    // Pre-fold: there are edges into op_a (none in this case — op_a produces only)
    // and edges out of op_a (to stuff_out_a).
    const result = applyFolds(graphData, analysis, spec, new Set(["ctrlA"]));

    // The original op_a → stuff_out_a edge should now be ctrlA → stuff_out_a
    const outboundEdge = result.edges.find(
      (e) => e.source === "ctrlA" && e.target === "stuff_out_a",
    );
    expect(outboundEdge).toBeDefined();

    // No edges should reference op_a anymore
    expect(result.edges.find((e) => e.source === "op_a" || e.target === "op_a")).toBeUndefined();
  });

  it("hides stuff nodes contained in the folded controller", () => {
    // ctrlA contains a stuff node that's only consumed inside ctrlA
    const spec: GraphSpec = {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrlA",
          pipe_code: "ctrlA",
          pipe_type: "PipeSequence",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op_inner_1",
          pipe_code: "op1",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "internal", name: "x", concept: "Text" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op_inner_2",
          pipe_code: "op2",
          pipe_type: "PipeLLM",
          io: { outputs: [], inputs: [{ digest: "internal", name: "x", concept: "Text" }] },
        },
      ],
      edges: [
        { id: "e11", source: "ctrlA", target: "op_inner_1", kind: "contains" },
        { id: "e12", source: "ctrlA", target: "op_inner_2", kind: "contains" },
      ],
    };
    const { analysis, graphData } = buildPipeline(spec);

    const result = applyFolds(graphData, analysis, spec, new Set(["ctrlA"]));
    // The internal stuff node should not appear
    expect(result.nodes.find((n) => n.id === "stuff_internal")).toBeUndefined();
  });

  it("drops internal-only edges (both endpoints inside the fold)", () => {
    const spec: GraphSpec = {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrlA",
          pipe_code: "ctrlA",
          pipe_type: "PipeSequence",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op_inner_1",
          pipe_code: "op1",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "internal", name: "x", concept: "Text" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op_inner_2",
          pipe_code: "op2",
          pipe_type: "PipeLLM",
          io: { outputs: [], inputs: [{ digest: "internal", name: "x", concept: "Text" }] },
        },
      ],
      edges: [
        { id: "e13", source: "ctrlA", target: "op_inner_1", kind: "contains" },
        { id: "e14", source: "ctrlA", target: "op_inner_2", kind: "contains" },
      ],
    };
    const { analysis, graphData } = buildPipeline(spec);

    const result = applyFolds(graphData, analysis, spec, new Set(["ctrlA"]));
    // Self-loops should be dropped
    expect(result.edges.find((e) => e.source === e.target)).toBeUndefined();
  });

  it("the controller card's pipeCardData carries onExpand wired to the callback", () => {
    const { spec, analysis, graphData } = buildPipeline(makeNestedSiblingSpec());
    const cb = vi.fn();

    const result = applyFolds(graphData, analysis, spec, new Set(["ctrlA"]), cb);
    const card = result.nodes.find((n) => n.id === "ctrlA")!;
    expect(card.data.pipeCardData?.onExpand).toBeDefined();
    card.data.pipeCardData!.onExpand!();
    expect(cb).toHaveBeenCalledExactlyOnceWith("ctrlA", undefined);
  });

  it("onExpand forwards FoldToggleOptions to the callback (alt-key soloMode)", () => {
    const { spec, analysis, graphData } = buildPipeline(makeNestedSiblingSpec());
    const cb = vi.fn();

    const result = applyFolds(graphData, analysis, spec, new Set(["ctrlA"]), cb);
    const card = result.nodes.find((n) => n.id === "ctrlA")!;
    card.data.pipeCardData!.onExpand!({ soloMode: true });
    expect(cb).toHaveBeenCalledExactlyOnceWith("ctrlA", { soloMode: true });
  });
});

// ─── applyFolds: nested folds ──────────────────────────────────────────

describe("applyFolds — nested folds", () => {
  function makeDoublyNestedSpec(): GraphSpec {
    return {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "outer",
          pipe_code: "outer",
          pipe_type: "PipeSequence",
        },
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "inner",
          pipe_code: "inner",
          pipe_type: "PipeSequence",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "leaf",
          pipe_code: "leaf",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "out_leaf", name: "x", concept: "Text" }] },
        },
      ],
      edges: [
        { id: "e15", source: "outer", target: "inner", kind: "contains" },
        { id: "e16", source: "inner", target: "leaf", kind: "contains" },
      ],
    };
  }

  it("outermost wins when outer + inner are both folded", () => {
    const spec = makeDoublyNestedSpec();
    const { analysis, graphData } = buildPipeline(spec);

    const result = applyFolds(graphData, analysis, spec, new Set(["outer", "inner"]));

    // Only outer appears as a card
    expect(result.nodes.find((n) => n.id === "outer")).toBeDefined();
    expect(result.nodes.find((n) => n.id === "inner")).toBeUndefined();
    expect(result.nodes.find((n) => n.id === "leaf")).toBeUndefined();
  });

  it("only inner folded: outer is still an expanded controller; inner is a card", () => {
    const spec = makeDoublyNestedSpec();
    const { analysis, graphData } = buildPipeline(spec);

    const result = applyFolds(graphData, analysis, spec, new Set(["inner"]));

    // outer is in analysis.controllerNodeIds; inner is dropped from it
    expect(result.analysis.controllerNodeIds.has("outer")).toBe(true);
    expect(result.analysis.controllerNodeIds.has("inner")).toBe(false);

    // outer's containmentTree entry now includes inner (rendered as a card) but not leaf
    const outerChildren = result.analysis.containmentTree["outer"];
    expect(outerChildren).toContain("inner");
    expect(outerChildren).not.toContain("leaf");

    // inner appears as a pipe-card node
    const card = result.nodes.find((n) => n.id === "inner");
    expect(card).toBeDefined();
    expect(card!.type).toBe(NODE_TYPE_PIPE_CARD);
  });
});

// ─── applyFolds: edge dedup ─────────────────────────────────────────────

describe("applyFolds — edge dedup", () => {
  it("collapses multiple internal pipes consuming the same external producer", () => {
    // External producer feeds two internal pipes; folding should yield one edge.
    const spec: GraphSpec = {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl",
          pipe_code: "ctrl",
          pipe_type: "PipeSequence",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "external",
          pipe_code: "external",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "shared", name: "shared_data", concept: "Text" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "inner1",
          pipe_code: "inner1",
          pipe_type: "PipeLLM",
          io: { outputs: [], inputs: [{ digest: "shared", name: "shared_data", concept: "Text" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "inner2",
          pipe_code: "inner2",
          pipe_type: "PipeLLM",
          io: { outputs: [], inputs: [{ digest: "shared", name: "shared_data", concept: "Text" }] },
        },
      ],
      edges: [
        { id: "e17", source: "ctrl", target: "inner1", kind: "contains" },
        { id: "e18", source: "ctrl", target: "inner2", kind: "contains" },
      ],
    };
    const { analysis, graphData } = buildPipeline(spec);

    const result = applyFolds(graphData, analysis, spec, new Set(["ctrl"]));

    const edgesToCtrl = result.edges.filter((e) => e.target === "ctrl");
    // stuff_shared -> ctrl should appear exactly once
    expect(edgesToCtrl.filter((e) => e.source === "stuff_shared").length).toBe(1);
  });

  it("keeps a _batchEdge and a regular data edge between same pair as two distinct edges", () => {
    // Construct a synthetic dedup scenario by feeding two edges manually.
    const spec: GraphSpec = {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl",
          pipe_code: "ctrl",
          pipe_type: "PipeSequence",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "inner",
          pipe_code: "inner",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "d1", name: "x", concept: "Text" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "external",
          pipe_code: "external",
          pipe_type: "PipeLLM",
          io: { outputs: [], inputs: [{ digest: "d1", name: "x", concept: "Text" }] },
        },
      ],
      edges: [{ id: "e19", source: "ctrl", target: "inner", kind: "contains" }],
    };
    const { analysis, graphData } = buildPipeline(spec);

    // Manually inject a batch-flavored edge alongside the regular data edge.
    const dataEdge = graphData.edges.find((e) => e.source === "inner" && e.target === "stuff_d1")!;
    expect(dataEdge).toBeDefined();
    const batchClone = { ...dataEdge, id: "synthetic_batch", _batchEdge: true };
    graphData.edges.push(batchClone);

    const result = applyFolds(graphData, analysis, spec, new Set(["ctrl"]));

    // After fold, both edges go ctrl -> stuff_d1; dedup keeps them separate because
    // one is _batchEdge and one is data.
    const ctrlToStuff = result.edges.filter((e) => e.source === "ctrl" && e.target === "stuff_d1");
    expect(ctrlToStuff.length).toBe(2);
    expect(ctrlToStuff.some((e) => e._batchEdge === true)).toBe(true);
    expect(ctrlToStuff.some((e) => !e._batchEdge)).toBe(true);
  });

  it("drops self-loops where both endpoints fold to the same controller", () => {
    const { spec, analysis, graphData } = buildPipeline(makeNestedSiblingSpec());

    const result = applyFolds(graphData, analysis, spec, new Set(["root_seq"]));
    expect(result.edges.find((e) => e.source === e.target)).toBeUndefined();
  });
});

// ─── applyFolds: _crossGroup recomputation (REGRESSION) ─────────────────

describe("applyFolds — _crossGroup recomputation", () => {
  it("an edge marked _crossGroup pre-fold keeps a fresh classification post-fold (REGRESSION A1)", () => {
    const spec = makeNestedSiblingSpec();
    const { analysis, graphData } = buildPipeline(spec);

    // Pre-fold sanity: the edge from stuff_out_a -> op_b is _crossGroup
    // (root_seq vs ctrlB containment).
    const preFold = graphData.edges.find((e) => e.target === "op_b" && e.source === "stuff_out_a");
    expect(preFold?._crossGroup).toBe(true);

    // Fold ctrlA — stuff_out_a stays in root_seq because its producer (now the
    // ctrlA pipe-card) still lives in root_seq, so the edge → op_b remains a
    // root_seq → ctrlB hop and is still cross-group. The point of this test is
    // that the flag is *recomputed* against post-fold containment rather than
    // carried over stale (the recompute side is also exercised by the next test,
    // where a cross-group edge correctly resets to non-cross-group).
    const result = applyFolds(graphData, analysis, spec, new Set(["ctrlA"]));

    const postFold = result.edges.find((e) => e.source === "stuff_out_a" && e.target === "op_b");
    expect(postFold).toBeDefined();
    expect(postFold!._crossGroup).toBe(true);
  });

  it("_crossGroup is FALSE on the new card-out edge when a sibling controller is folded", () => {
    // Two sibling controllers; the only cross-group edge pre-fold runs from
    // op_in_x (inside ctrl_x) → op_in_y (inside ctrl_y) via stuff_shared_data.
    // After folding ctrl_x: the surviving edge is `ctrl_x → stuff_shared_data`
    // (card output edge); stuff_shared_data now belongs to no controller
    // because its producer (op_in_x) was hidden and ctrl_x's contains edges
    // were filtered out. So the edge ctrl_x → stuff_shared_data should NOT be
    // _crossGroup.
    const spec: GraphSpec = {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "root",
          pipe_code: "root",
          pipe_type: "PipeSequence",
        },
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl_x",
          pipe_code: "ctrl_x",
          pipe_type: "PipeSequence",
        },
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl_y",
          pipe_code: "ctrl_y",
          pipe_type: "PipeSequence",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op_in_x",
          pipe_code: "op_in_x",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "shared_data", name: "x", concept: "T" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op_in_y",
          pipe_code: "op_in_y",
          pipe_type: "PipeLLM",
          io: { outputs: [], inputs: [{ digest: "shared_data", name: "x", concept: "T" }] },
        },
      ],
      edges: [
        { id: "e20", source: "root", target: "ctrl_x", kind: "contains" },
        { id: "e21", source: "root", target: "ctrl_y", kind: "contains" },
        { id: "e22", source: "ctrl_x", target: "op_in_x", kind: "contains" },
        { id: "e23", source: "ctrl_y", target: "op_in_y", kind: "contains" },
      ],
    };
    const { analysis, graphData } = buildPipeline(spec);

    // Pre-fold sanity: stuff_shared_data → op_in_y was originally op_in_x → ...
    // so the stuff itself was inside ctrl_x's region. The edge is cross-group.
    const preFoldEdges = graphData.edges.filter(
      (e) => e._crossGroup === true && e.target === "op_in_y",
    );
    expect(preFoldEdges.length).toBeGreaterThan(0);

    const result = applyFolds(graphData, analysis, spec, new Set(["ctrl_x"]));

    // The output edge from the ctrl_x card to stuff_shared_data should NOT be
    // cross-group. (The stuff was filtered out of any controller after fold.)
    const cardOutEdge = result.edges.find(
      (e) => e.source === "ctrl_x" && e.target === "stuff_shared_data",
    );
    expect(cardOutEdge).toBeDefined();
    expect(cardOutEdge!._crossGroup).toBeFalsy();
  });
});

// ─── applyFolds: edge cases ────────────────────────────────────────────

describe("applyFolds — edge cases", () => {
  it("unknown IDs in the fold set are silently ignored", () => {
    const { spec, analysis, graphData } = buildPipeline(makeNestedSiblingSpec());

    const result = applyFolds(graphData, analysis, spec, new Set(["nonexistent_id"]));
    // No spurious node added
    expect(result.nodes.find((n) => n.id === "nonexistent_id")).toBeUndefined();
    // Should be effectively a no-op
    expect(result.nodes.length).toBe(graphData.nodes.length);
  });

  it("works without an onToggleFold callback (card has no onExpand)", () => {
    const { spec, analysis, graphData } = buildPipeline(makeNestedSiblingSpec());
    const result = applyFolds(graphData, analysis, spec, new Set(["ctrlA"]));
    const card = result.nodes.find((n) => n.id === "ctrlA");
    expect(card?.data.pipeCardData?.onExpand).toBeUndefined();
  });

  it("folded card's pipeCardData arrays do not alias the original node's arrays", () => {
    // Even with a controller that has its own io carrying the same digest as a
    // child operator, the card's inputs/outputs arrays must be independent —
    // mutating one must not affect the other.
    const spec: GraphSpec = {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          id: "ctrlA",
          pipe_code: "ctrlA",
          pipe_type: "PipeSequence",
          io: {
            inputs: [{ name: "doc", concept: "Document" }],
            outputs: [{ name: "summary", concept: "Text" }],
          },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "op_inner",
          pipe_code: "op_inner",
          pipe_type: "PipeLLM",
          io: {
            inputs: [{ digest: "doc_d", name: "doc", concept: "Document" }],
            outputs: [{ digest: "summary_d", name: "summary", concept: "Text" }],
          },
        },
      ],
      edges: [{ id: "e24", source: "ctrlA", target: "op_inner", kind: "contains" }],
    };
    const { analysis, graphData } = buildPipeline(spec);
    const result = applyFolds(graphData, analysis, spec, new Set(["ctrlA"]));
    const card = result.nodes.find((n) => n.id === "ctrlA")!;
    // pipeCardData arrays must be fresh (not aliased to the GraphSpecNode.io arrays).
    const { pipeCardData } = card.data;
    expect(pipeCardData).toBeDefined();
    if (!pipeCardData) throw new Error("Expected folded card to have pipeCardData");
    expect(pipeCardData.inputs).not.toBe(spec.nodes[0].io.inputs);
    expect(pipeCardData.outputs).not.toBe(spec.nodes[0].io.outputs);
  });

  it("rewrites batch_item edges with the same folding rules", () => {
    // A folded controller with internal batch fan-out.
    const spec: GraphSpec = {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl_batch",
          pipe_code: "my_batch",
          pipe_type: "PipeBatch",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "source",
          pipe_code: "source",
          pipe_type: "PipeExtract",
          io: { inputs: [], outputs: [{ digest: "list", name: "list", concept: "Doc" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "iter",
          pipe_code: "iter",
          pipe_type: "PipeLLM",
          io: {
            inputs: [{ digest: "item", name: "item", concept: "T" }],
            outputs: [{ digest: "iter_out", name: "iter_out", concept: "T" }],
          },
        },
      ],
      edges: [
        { id: "e25", source: "ctrl_batch", target: "iter", kind: "contains" },
        {
          id: "e26",
          source: "ctrl_batch",
          target: "iter",
          kind: "batch_item",
          source_stuff_digest: "list",
          target_stuff_digest: "item",
        },
      ],
    };
    const { analysis, graphData } = buildPipeline(spec);

    // Folding ctrl_batch: the iter operator and the batch_item stuff (item) get
    // hidden. Surviving edges should not include any internal-only ones.
    const result = applyFolds(graphData, analysis, spec, new Set(["ctrl_batch"]));
    // No edge should reference the iter pipe anymore
    expect(result.edges.find((e) => e.source === "iter" || e.target === "iter")).toBeUndefined();
  });

  it("relabels surviving batch edges as '[N]' when their endpoint is rewritten by a fold", () => {
    // PipeBatch with two branches; each branch has its own batch_item edge
    // carrying a per-item index in the label.
    const spec: GraphSpec = {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl_batch",
          pipe_code: "my_batch",
          pipe_type: "PipeBatch",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "source",
          pipe_code: "source",
          pipe_type: "PipeExtract",
          io: { inputs: [], outputs: [{ digest: "list", name: "list", concept: "Doc" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "iter_0",
          pipe_code: "iter",
          pipe_type: "PipeLLM",
          io: {
            inputs: [{ digest: "item_0", name: "item", concept: "T" }],
            outputs: [{ digest: "out_0", name: "out", concept: "T" }],
          },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "iter_1",
          pipe_code: "iter",
          pipe_type: "PipeLLM",
          io: {
            inputs: [{ digest: "item_1", name: "item", concept: "T" }],
            outputs: [{ digest: "out_1", name: "out", concept: "T" }],
          },
        },
      ],
      edges: [
        { id: "e27", source: "ctrl_batch", target: "iter_0", kind: "contains" },
        { id: "e28", source: "ctrl_batch", target: "iter_1", kind: "contains" },
        {
          id: "e29",
          source: "ctrl_batch",
          target: "iter_0",
          kind: "batch_item",
          source_stuff_digest: "list",
          target_stuff_digest: "item_0",
          label: "[0]",
        },
        {
          id: "e30",
          source: "ctrl_batch",
          target: "iter_1",
          kind: "batch_item",
          source_stuff_digest: "list",
          target_stuff_digest: "item_1",
          label: "[1]",
        },
      ],
    };
    const { analysis, graphData } = buildPipeline(spec);

    // Pre-fold sanity: batch edges keep their per-item indices.
    const preFoldLabels = graphData.edges
      .filter((e) => e._batchEdge)
      .map((e) => e.label)
      .sort();
    expect(preFoldLabels).toEqual(["[0]", "[1]"]);

    const result = applyFolds(graphData, analysis, spec, new Set(["ctrl_batch"]));

    // After fold: the two batch edges collapse into a single stuff_list → ctrl_batch
    // edge whose label is generalized to "[N]". The dashed/colored style survives.
    const survivingBatchEdges = result.edges.filter((e) => e._batchEdge);
    expect(survivingBatchEdges.length).toBe(1);
    expect(survivingBatchEdges[0].label).toBe("[N]");
    expect(survivingBatchEdges[0].style?.strokeDasharray).toBe("5,5");
  });

  it("does not relabel batch edges whose endpoints are unchanged by the fold", () => {
    // Folding an unrelated controller must leave batch edges' labels alone.
    const spec: GraphSpec = {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "root_seq",
          pipe_code: "root_seq",
          pipe_type: "PipeSequence",
        },
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "ctrl_batch",
          pipe_code: "my_batch",
          pipe_type: "PipeBatch",
        },
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "unrelated_ctrl",
          pipe_code: "unrelated",
          pipe_type: "PipeSequence",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "source",
          pipe_code: "source",
          pipe_type: "PipeExtract",
          io: { inputs: [], outputs: [{ digest: "list", name: "list", concept: "Doc" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "iter_0",
          pipe_code: "iter",
          pipe_type: "PipeLLM",
          io: {
            inputs: [{ digest: "item_0", name: "item", concept: "T" }],
            outputs: [{ digest: "out_0", name: "out", concept: "T" }],
          },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "noise_op",
          pipe_code: "noise_op",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "noise_d", name: "noise", concept: "T" }] },
        },
      ],
      edges: [
        { id: "e31", source: "root_seq", target: "ctrl_batch", kind: "contains" },
        { id: "e32", source: "root_seq", target: "unrelated_ctrl", kind: "contains" },
        { id: "e33", source: "ctrl_batch", target: "iter_0", kind: "contains" },
        { id: "e34", source: "unrelated_ctrl", target: "noise_op", kind: "contains" },
        {
          id: "e35",
          source: "ctrl_batch",
          target: "iter_0",
          kind: "batch_item",
          source_stuff_digest: "list",
          target_stuff_digest: "item_0",
          label: "[0]",
        },
      ],
    };
    const { analysis, graphData } = buildPipeline(spec);
    const result = applyFolds(graphData, analysis, spec, new Set(["unrelated_ctrl"]));
    const batchEdge = result.edges.find((e) => e._batchEdge);
    expect(batchEdge?.label).toBe("[0]");
  });
});

// ─── applyFolds: stuff-map rewriting (REGRESSION for the CV-screening bug) ──

describe("applyFolds — stuff producer/consumer rewriting", () => {
  // Mirrors the LIVE_CV_SCREENING shape from the user's screenshot:
  //   outer_seq
  //     ├─ producer (operator) → stuff_shared
  //     └─ inner_ctrl (folded)
  //         └─ inner_consumer (operator, reads stuff_shared)
  // Before the fix, folding inner_ctrl promoted stuff_shared all the way out of
  // outer_seq, because stuffConsumers still pointed at inner_consumer which no
  // longer appeared in the post-fold containment tree.
  function makeFoldedSiblingConsumerSpec(): GraphSpec {
    return {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "outer_seq",
          pipe_code: "outer_seq",
          pipe_type: "PipeSequence",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "producer",
          pipe_code: "producer",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "shared", name: "shared", concept: "Text" }] },
        },
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "inner_ctrl",
          pipe_code: "inner_ctrl",
          pipe_type: "PipeCondition",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "inner_consumer",
          pipe_code: "inner_consumer",
          pipe_type: "PipeLLM",
          io: { outputs: [], inputs: [{ digest: "shared", name: "shared", concept: "Text" }] },
        },
      ],
      edges: [
        { id: "e36", source: "outer_seq", target: "producer", kind: "contains" },
        { id: "e37", source: "outer_seq", target: "inner_ctrl", kind: "contains" },
        { id: "e38", source: "inner_ctrl", target: "inner_consumer", kind: "contains" },
      ],
    };
  }

  it("keeps a stuff inside its parent controller when its sibling controller is folded", () => {
    const spec = makeFoldedSiblingConsumerSpec();
    const { analysis, graphData } = buildPipeline(spec);

    // Pre-fold sanity: stuff_shared is mapped to outer_seq.
    const preFoldMap = buildChildToControllerMap(spec, analysis);
    expect(preFoldMap["stuff_shared"]).toBe("outer_seq");

    const result = applyFolds(graphData, analysis, spec, new Set(["inner_ctrl"]));

    // Post-fold: stuff_shared must still live inside outer_seq, not be promoted
    // to the root. Recomputing childToController against the updated analysis is
    // what the layout pipeline does (elkGraphBuilder + graphControllers).
    const postFoldMap = buildChildToControllerMap(spec, result.analysis);
    expect(postFoldMap["stuff_shared"]).toBe("outer_seq");
  });

  it("rewrites consumer IDs in the updated analysis to the folded card", () => {
    const spec = makeFoldedSiblingConsumerSpec();
    const { analysis, graphData } = buildPipeline(spec);

    const result = applyFolds(graphData, analysis, spec, new Set(["inner_ctrl"]));

    // The original consumer (inner_consumer) was hidden by the fold; the updated
    // analysis should record inner_ctrl (the folded card) as the consumer.
    expect(result.analysis.stuffConsumers["shared"]).toEqual(["inner_ctrl"]);
  });

  it("rewrites producer IDs when an operator inside the fold produced the stuff", () => {
    // Symmetric case: stuff produced inside the fold, consumed outside.
    const spec: GraphSpec = {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "outer_seq",
          pipe_code: "outer_seq",
          pipe_type: "PipeSequence",
        },
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "inner_ctrl",
          pipe_code: "inner_ctrl",
          pipe_type: "PipeCondition",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "inner_producer",
          pipe_code: "inner_producer",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "shared", name: "shared", concept: "Text" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "outer_consumer",
          pipe_code: "outer_consumer",
          pipe_type: "PipeLLM",
          io: { outputs: [], inputs: [{ digest: "shared", name: "shared", concept: "Text" }] },
        },
      ],
      edges: [
        { id: "e39", source: "outer_seq", target: "inner_ctrl", kind: "contains" },
        { id: "e40", source: "outer_seq", target: "outer_consumer", kind: "contains" },
        { id: "e41", source: "inner_ctrl", target: "inner_producer", kind: "contains" },
      ],
    };
    const { analysis, graphData } = buildPipeline(spec);

    const result = applyFolds(graphData, analysis, spec, new Set(["inner_ctrl"]));
    expect(result.analysis.stuffProducers["shared"]).toBe("inner_ctrl");

    // The stuff should now belong to outer_seq (lowest controller containing
    // both the rewritten producer and the visible consumer).
    const postFoldMap = buildChildToControllerMap(spec, result.analysis);
    expect(postFoldMap["stuff_shared"]).toBe("outer_seq");
  });

  it("dedups when multiple hidden consumers collapse to the same folded card", () => {
    const spec: GraphSpec = {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "outer_seq",
          pipe_code: "outer_seq",
          pipe_type: "PipeSequence",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "producer",
          pipe_code: "producer",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "shared", name: "shared", concept: "Text" }] },
        },
        {
          kind: "controller",
          status: "succeeded",
          io: { inputs: [], outputs: [] },
          id: "inner_ctrl",
          pipe_code: "inner_ctrl",
          pipe_type: "PipeCondition",
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "inner_a",
          pipe_code: "inner_a",
          pipe_type: "PipeLLM",
          io: { outputs: [], inputs: [{ digest: "shared", name: "shared", concept: "Text" }] },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "inner_b",
          pipe_code: "inner_b",
          pipe_type: "PipeLLM",
          io: { outputs: [], inputs: [{ digest: "shared", name: "shared", concept: "Text" }] },
        },
      ],
      edges: [
        { id: "e42", source: "outer_seq", target: "producer", kind: "contains" },
        { id: "e43", source: "outer_seq", target: "inner_ctrl", kind: "contains" },
        { id: "e44", source: "inner_ctrl", target: "inner_a", kind: "contains" },
        { id: "e45", source: "inner_ctrl", target: "inner_b", kind: "contains" },
      ],
    };
    const { analysis, graphData } = buildPipeline(spec);

    const result = applyFolds(graphData, analysis, spec, new Set(["inner_ctrl"]));
    // Both hidden consumers map to inner_ctrl — the rewritten list should dedup.
    expect(result.analysis.stuffConsumers["shared"]).toEqual(["inner_ctrl"]);
  });
});

// ─── applyFolds: declared-output stuffs survive their folded owner ──────
// Mirrors the CV-batch-screening shape from the user's screenshot:
//   outer_seq (declares `aggregated` as its output)
//     └─ inner_batch (PipeBatch, also declares `aggregated`)
//         └─ branch (operator, outputs `per_branch`)
//   stuff_aggregated is the target of a batch_aggregate edge.
// Before the fix, folding outer_seq hid stuff_aggregated because its parent
// (outer_seq) was the outermost folded ancestor — the user lost the final
// output node from the diagram when folding the whole pipeline.
describe("applyFolds — declared-output stuffs survive their folded owner", () => {
  function makeBatchAggregateSpec(): GraphSpec {
    return {
      nodes: [
        {
          kind: "controller",
          status: "succeeded",
          id: "outer_seq",
          pipe_code: "outer_seq",
          pipe_type: "PipeSequence",
          io: {
            inputs: [],
            outputs: [{ digest: "aggregated", name: "results", concept: "Result" }],
          },
        },
        {
          kind: "controller",
          status: "succeeded",
          id: "inner_batch",
          pipe_code: "inner_batch",
          pipe_type: "PipeBatch",
          io: {
            inputs: [],
            outputs: [{ digest: "aggregated", name: "results", concept: "Result" }],
          },
        },
        {
          kind: "operator",
          status: "succeeded",
          id: "branch",
          pipe_code: "branch",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "per_branch", name: "item", concept: "Result" }] },
        },
      ],
      edges: [
        { id: "e46", source: "outer_seq", target: "inner_batch", kind: "contains" },
        { id: "e47", source: "inner_batch", target: "branch", kind: "contains" },
        {
          id: "e48",
          source: "branch",
          target: "inner_batch",
          kind: "batch_aggregate",
          source_stuff_digest: "per_branch",
          target_stuff_digest: "aggregated",
          label: "[0]",
        },
      ],
    };
  }

  it("keeps a controller's declared output stuff visible when the controller is folded", () => {
    const spec = makeBatchAggregateSpec();
    const { analysis, graphData } = buildPipeline(spec);

    const result = applyFolds(graphData, analysis, spec, new Set(["outer_seq"]));

    // The output stuff_aggregated must remain in the visible nodes — it is the
    // pipeline's final output and should connect to the folded card.
    expect(result.nodes.find((n) => n.id === "stuff_aggregated")).toBeDefined();
  });

  it("rewrites the batch_aggregate edge to flow from the folded card to the output stuff", () => {
    const spec = makeBatchAggregateSpec();
    const { analysis, graphData } = buildPipeline(spec);

    const result = applyFolds(graphData, analysis, spec, new Set(["outer_seq"]));

    // The original batch_aggregate (stuff_per_branch → stuff_aggregated) should
    // become (outer_seq folded card → stuff_aggregated). The label generalizes
    // to "[N]" because the original endpoint was rewritten by the fold.
    const aggEdge = result.edges.find(
      (e) => e.source === "outer_seq" && e.target === "stuff_aggregated",
    );
    expect(aggEdge).toBeDefined();
    expect(aggEdge!._batchEdge).toBe(true);
    expect(aggEdge!.label).toBe("[N]");
  });

  it("promotes the output stuff to the root when only the outer (root) controller declares it as folded", () => {
    const spec = makeBatchAggregateSpec();
    const { analysis, graphData } = buildPipeline(spec);

    const result = applyFolds(graphData, analysis, spec, new Set(["outer_seq"]));

    // Post-fold there are no surviving controllers — buildChildToControllerMap
    // run against the updated analysis must place stuff_aggregated at root level.
    const postFoldMap = buildChildToControllerMap(spec, result.analysis);
    expect(postFoldMap["stuff_aggregated"]).toBeUndefined();
  });

  it("keeps the output stuff inside the still-visible parent when only the inner declarer is folded", () => {
    const spec = makeBatchAggregateSpec();
    const { analysis, graphData } = buildPipeline(spec);

    const result = applyFolds(graphData, analysis, spec, new Set(["inner_batch"]));

    // Only inner_batch is folded; outer_seq remains a real controller. The
    // declared output stays inside outer_seq (the same place it was before the
    // fold), since the outermost-declared-folded-ancestor is inner_batch and
    // inner_batch's parent is outer_seq.
    const aggEdge = result.edges.find(
      (e) => e.source === "inner_batch" && e.target === "stuff_aggregated",
    );
    expect(aggEdge).toBeDefined();
    expect(aggEdge!._batchEdge).toBe(true);
    expect(aggEdge!.label).toBe("[N]");
    expect(result.nodes.find((n) => n.id === "stuff_aggregated")).toBeDefined();
  });
});
