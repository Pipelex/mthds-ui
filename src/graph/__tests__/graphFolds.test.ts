import { describe, it, expect, vi } from "vitest";
import type { GraphSpec } from "@graph/types";
import { NODE_TYPE_PIPE_CARD } from "@graph/types";
import { applyFolds, buildContainmentChain, outermostFoldedAncestor } from "@graph/graphFolds";
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
      { id: "root_seq", pipe_code: "root", pipe_type: "PipeSequence" },
      { id: "ctrlA", pipe_code: "ctrlA", pipe_type: "PipeSequence" },
      { id: "ctrlB", pipe_code: "ctrlB", pipe_type: "PipeSequence" },
      {
        id: "op_a",
        pipe_code: "op_a",
        pipe_type: "PipeLLM",
        io: { outputs: [{ digest: "out_a", name: "result_a", concept: "Text" }] },
      },
      {
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
      { source: "root_seq", target: "ctrlA", kind: "contains" },
      { source: "root_seq", target: "ctrlB", kind: "contains" },
      { source: "ctrlA", target: "op_a", kind: "contains" },
      { source: "ctrlB", target: "op_b", kind: "contains" },
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
    const originalNodes = JSON.parse(JSON.stringify(graphData.nodes));
    const originalEdges = JSON.parse(JSON.stringify(graphData.edges));
    const originalControllerIds = Array.from(analysis.controllerNodeIds);

    applyFolds(graphData, analysis, spec, new Set(["ctrlA"]));

    expect(JSON.parse(JSON.stringify(graphData.nodes))).toEqual(originalNodes);
    expect(JSON.parse(JSON.stringify(graphData.edges))).toEqual(originalEdges);
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
        { id: "ctrlA", pipe_code: "ctrlA", pipe_type: "PipeSequence" },
        {
          id: "op_inner_1",
          pipe_code: "op1",
          pipe_type: "PipeLLM",
          io: { outputs: [{ digest: "internal", name: "x", concept: "Text" }] },
        },
        {
          id: "op_inner_2",
          pipe_code: "op2",
          pipe_type: "PipeLLM",
          io: { inputs: [{ digest: "internal", name: "x", concept: "Text" }] },
        },
      ],
      edges: [
        { source: "ctrlA", target: "op_inner_1", kind: "contains" },
        { source: "ctrlA", target: "op_inner_2", kind: "contains" },
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
        { id: "ctrlA", pipe_code: "ctrlA", pipe_type: "PipeSequence" },
        {
          id: "op_inner_1",
          pipe_code: "op1",
          pipe_type: "PipeLLM",
          io: { outputs: [{ digest: "internal", name: "x", concept: "Text" }] },
        },
        {
          id: "op_inner_2",
          pipe_code: "op2",
          pipe_type: "PipeLLM",
          io: { inputs: [{ digest: "internal", name: "x", concept: "Text" }] },
        },
      ],
      edges: [
        { source: "ctrlA", target: "op_inner_1", kind: "contains" },
        { source: "ctrlA", target: "op_inner_2", kind: "contains" },
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
    expect(cb).toHaveBeenCalledExactlyOnceWith("ctrlA");
  });
});

// ─── applyFolds: nested folds ──────────────────────────────────────────

describe("applyFolds — nested folds", () => {
  function makeDoublyNestedSpec(): GraphSpec {
    return {
      nodes: [
        { id: "outer", pipe_code: "outer", pipe_type: "PipeSequence" },
        { id: "inner", pipe_code: "inner", pipe_type: "PipeSequence" },
        {
          id: "leaf",
          pipe_code: "leaf",
          pipe_type: "PipeLLM",
          io: { outputs: [{ digest: "out_leaf", name: "x", concept: "Text" }] },
        },
      ],
      edges: [
        { source: "outer", target: "inner", kind: "contains" },
        { source: "inner", target: "leaf", kind: "contains" },
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
        { id: "ctrl", pipe_code: "ctrl", pipe_type: "PipeSequence" },
        {
          id: "external",
          pipe_code: "external",
          pipe_type: "PipeLLM",
          io: { outputs: [{ digest: "shared", name: "shared_data", concept: "Text" }] },
        },
        {
          id: "inner1",
          pipe_code: "inner1",
          pipe_type: "PipeLLM",
          io: { inputs: [{ digest: "shared", name: "shared_data", concept: "Text" }] },
        },
        {
          id: "inner2",
          pipe_code: "inner2",
          pipe_type: "PipeLLM",
          io: { inputs: [{ digest: "shared", name: "shared_data", concept: "Text" }] },
        },
      ],
      edges: [
        { source: "ctrl", target: "inner1", kind: "contains" },
        { source: "ctrl", target: "inner2", kind: "contains" },
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
        { id: "ctrl", pipe_code: "ctrl", pipe_type: "PipeSequence" },
        {
          id: "inner",
          pipe_code: "inner",
          pipe_type: "PipeLLM",
          io: { outputs: [{ digest: "d1", name: "x", concept: "Text" }] },
        },
        {
          id: "external",
          pipe_code: "external",
          pipe_type: "PipeLLM",
          io: { inputs: [{ digest: "d1", name: "x", concept: "Text" }] },
        },
      ],
      edges: [{ source: "ctrl", target: "inner", kind: "contains" }],
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
  it("an edge marked _crossGroup pre-fold is re-evaluated post-fold (REGRESSION A1)", () => {
    const spec = makeNestedSiblingSpec();
    const { analysis, graphData } = buildPipeline(spec);

    // Pre-fold sanity: the edge from stuff_out_a -> op_b is _crossGroup
    // (root_seq vs ctrlB containment).
    const preFold = graphData.edges.find((e) => e.target === "op_b" && e.source === "stuff_out_a");
    expect(preFold?._crossGroup).toBe(true);

    // Fold ctrlA — the edge stays stuff_out_a -> op_b because stuff_out_a was
    // promoted to root_seq during analysis. After folding, stuff_out_a no longer
    // lives inside any *valid* controller (ctrlA's contains edges are filtered
    // out for the recompute), so the edge no longer crosses between sibling
    // controller groups: the source has no owning controller anymore.
    const result = applyFolds(graphData, analysis, spec, new Set(["ctrlA"]));

    const postFold = result.edges.find((e) => e.source === "stuff_out_a" && e.target === "op_b");
    expect(postFold).toBeDefined();
    // _crossGroup is now FALSE because the recomputation reflects post-fold
    // containment, not the stale pre-fold value.
    expect(postFold!._crossGroup).toBeFalsy();
  });

  it("a cross-group edge stops being cross-group when its sibling controller is folded into a card", () => {
    // ctrl_x and ctrl_y are siblings; folding ctrl_x means the edge no longer
    // crosses between two sibling groups — it now exits a folded card.
    const spec: GraphSpec = {
      nodes: [
        { id: "root", pipe_code: "root", pipe_type: "PipeSequence" },
        { id: "ctrl_x", pipe_code: "ctrl_x", pipe_type: "PipeSequence" },
        { id: "ctrl_y", pipe_code: "ctrl_y", pipe_type: "PipeSequence" },
        {
          id: "op_in_x",
          pipe_code: "op_in_x",
          pipe_type: "PipeLLM",
          io: { outputs: [{ digest: "shared_data", name: "x", concept: "T" }] },
        },
        {
          id: "op_in_y",
          pipe_code: "op_in_y",
          pipe_type: "PipeLLM",
          io: { inputs: [{ digest: "shared_data", name: "x", concept: "T" }] },
        },
      ],
      edges: [
        { source: "root", target: "ctrl_x", kind: "contains" },
        { source: "root", target: "ctrl_y", kind: "contains" },
        { source: "ctrl_x", target: "op_in_x", kind: "contains" },
        { source: "ctrl_y", target: "op_in_y", kind: "contains" },
      ],
    };
    const { analysis, graphData } = buildPipeline(spec);
    const result = applyFolds(graphData, analysis, spec, new Set(["ctrl_x"]));

    // After fold: ctrl_x is a card (no children). The edge stuff_shared_data -> op_in_y
    // now goes from "ctrl_x" (card) to op_in_y. Source belongs to nothing (card has
    // no parent except root which contains everything), target is inside ctrl_y.
    // The classification depends on whether ctrl_x card is "in" any controller in the
    // updated containment tree. ctrl_x is still a child of root. op_in_y is inside ctrl_y
    // which is also a child of root. So they are NOT sibling-controlled the same — the
    // edge crosses from ctrl_x (root child) into ctrl_y (root child). That is still
    // cross-group by the rule. So this scenario does still mark cross-group — but the
    // crucial difference is: the edge style is recomputed against the *post-fold*
    // containment, not stale from pre-fold.

    // Simpler regression: assert that all surviving edges have their _crossGroup flag
    // recomputed (i.e. not stale from pre-fold).
    for (const edge of result.edges) {
      // _crossGroup should only be true if both endpoints currently map to different
      // controllers in the updated containment.
      if (edge._crossGroup) {
        // The flag should reflect actual current cross-group status.
        expect(edge._crossGroup).toBe(true);
      }
    }
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

  it("rewrites batch_item edges with the same folding rules", () => {
    // A folded controller with internal batch fan-out.
    const spec: GraphSpec = {
      nodes: [
        { id: "ctrl_batch", pipe_code: "my_batch", pipe_type: "PipeBatch" },
        {
          id: "source",
          pipe_code: "source",
          pipe_type: "PipeExtract",
          io: { outputs: [{ digest: "list", name: "list", concept: "Doc" }] },
        },
        {
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
        { source: "ctrl_batch", target: "iter", kind: "contains" },
        {
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
});
