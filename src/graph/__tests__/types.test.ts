import { describe, it, expect } from "vitest";
import {
  stuffNodeId,
  isStuffNodeId,
  stuffDigestFromId,
  nodeWidth,
  nodeHeight,
  NODE_TYPE_PIPE_CARD,
  NODE_TYPE_STUFF,
  NODE_TYPE_CONTROLLER,
  STUFF_ID_PREFIX,
  CONTROLLER_PADDING_X,
  CONTROLLER_PADDING_TOP,
  CONTROLLER_PADDING_BOTTOM,
  ARROW_CLOSED_MARKER,
  isPluralMultiplicity,
  multiplicitySuffix,
  problemFailingPipe,
  isFailingPipeNode,
} from "../types";
import type { GraphSpecNode } from "../types";
import { buildProblem } from "mthds/errors";
import { BINDING_FAILED_PROBLEM, makeGraphNode, makeStuffNode } from "./testUtils";

describe("stuffNodeId", () => {
  it("prefixes digest with stuff_", () => {
    expect(stuffNodeId("abc123")).toBe("stuff_abc123");
  });

  it("handles empty string digest", () => {
    expect(stuffNodeId("")).toBe("stuff_");
  });

  it("handles digest with special characters", () => {
    expect(stuffNodeId("a_b-c.d")).toBe("stuff_a_b-c.d");
  });
});

describe("isStuffNodeId", () => {
  it("returns true for stuff_xxx", () => {
    expect(isStuffNodeId("stuff_abc")).toBe(true);
  });

  it("returns true for stuff_ with empty digest", () => {
    expect(isStuffNodeId("stuff_")).toBe(true);
  });

  it("returns false for operator node id", () => {
    expect(isStuffNodeId("op1")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isStuffNodeId("")).toBe(false);
  });

  it("returns false for 'stuff' without underscore", () => {
    expect(isStuffNodeId("stuff")).toBe(false);
  });

  it("returns false for partial prefix", () => {
    expect(isStuffNodeId("stuf_abc")).toBe(false);
  });
});

describe("stuffDigestFromId", () => {
  it("strips stuff_ prefix", () => {
    expect(stuffDigestFromId("stuff_abc123")).toBe("abc123");
  });

  it("returns empty string for stuff_ only", () => {
    expect(stuffDigestFromId("stuff_")).toBe("");
  });

  it("handles digest with underscores (does not over-strip)", () => {
    expect(stuffDigestFromId("stuff_a_b_c")).toBe("a_b_c");
  });
});

describe("nodeWidth", () => {
  it("returns style.width when set as number", () => {
    const node = makeGraphNode("n1", { style: { width: 250 } });
    expect(nodeWidth(node)).toBe(250);
  });

  it("parses style.width when set as string like '200px'", () => {
    const node = makeGraphNode("n1", { style: { width: "180px" } });
    expect(nodeWidth(node)).toBe(180);
  });

  it("returns 200 fallback when no style", () => {
    const node = makeGraphNode("n1");
    expect(nodeWidth(node)).toBe(200);
  });

  it("returns 200 fallback when width is undefined", () => {
    const node = makeGraphNode("n1", { style: {} });
    expect(nodeWidth(node)).toBe(200);
  });

  it("returns 200 fallback when width is NaN string", () => {
    const node = makeGraphNode("n1", { style: { width: "auto" } });
    expect(nodeWidth(node)).toBe(200);
  });

  it("returns 200 fallback when width is 0", () => {
    const node = makeGraphNode("n1", { style: { width: 0 } });
    expect(nodeWidth(node)).toBe(200);
  });

  it("returns 200 fallback when width is negative", () => {
    const node = makeGraphNode("n1", { style: { width: -10 } });
    expect(nodeWidth(node)).toBe(200);
  });
});

describe("nodeHeight", () => {
  it("returns style.height when set as number", () => {
    const node = makeGraphNode("n1", { style: { height: 150 } });
    expect(nodeHeight(node)).toBe(150);
  });

  it("parses style.height when set as string", () => {
    const node = makeGraphNode("n1", { style: { height: "100px" } });
    expect(nodeHeight(node)).toBe(100);
  });

  it("returns 60 for stuff nodes (data.isStuff = true)", () => {
    const node = makeStuffNode("d1");
    // Remove explicit height style to test default
    delete node.style?.height;
    expect(nodeHeight(node)).toBe(60);
  });

  it("returns 70 for pipe nodes (default)", () => {
    const node = makeGraphNode("n1");
    expect(nodeHeight(node)).toBe(70);
  });

  it("returns default when height is NaN string", () => {
    const node = makeGraphNode("n1", { style: { height: "auto" } });
    expect(nodeHeight(node)).toBe(70);
  });

  it("returns default when height is 0", () => {
    const node = makeGraphNode("n1", { style: { height: 0 } });
    expect(nodeHeight(node)).toBe(70);
  });
});

describe("constants", () => {
  it("NODE_TYPE_PIPE_CARD equals 'pipeCard'", () => {
    expect(NODE_TYPE_PIPE_CARD).toBe("pipeCard");
  });

  it("NODE_TYPE_STUFF equals 'default'", () => {
    expect(NODE_TYPE_STUFF).toBe("default");
  });

  it("NODE_TYPE_CONTROLLER equals 'controllerGroup'", () => {
    expect(NODE_TYPE_CONTROLLER).toBe("controllerGroup");
  });

  it("STUFF_ID_PREFIX equals 'stuff_'", () => {
    expect(STUFF_ID_PREFIX).toBe("stuff_");
  });

  it("CONTROLLER_PADDING_X is a positive number", () => {
    expect(CONTROLLER_PADDING_X).toBeGreaterThan(0);
  });

  it("CONTROLLER_PADDING_TOP is a positive number", () => {
    expect(CONTROLLER_PADDING_TOP).toBeGreaterThan(0);
  });

  it("CONTROLLER_PADDING_BOTTOM is a positive number", () => {
    expect(CONTROLLER_PADDING_BOTTOM).toBeGreaterThan(0);
  });

  it("ARROW_CLOSED_MARKER equals 'arrowclosed'", () => {
    expect(ARROW_CLOSED_MARKER).toBe("arrowclosed");
  });
});

describe("stuff multiplicity", () => {
  it("marks a variable-length list as []", () => {
    expect(isPluralMultiplicity(true)).toBe(true);
    expect(multiplicitySuffix(true)).toBe("[]");
  });

  it("marks a fixed count of two or more as [N]", () => {
    expect(isPluralMultiplicity(2)).toBe(true);
    expect(multiplicitySuffix(5)).toBe("[5]");
  });

  it("reads a count of one as single, as the standard does", () => {
    expect(isPluralMultiplicity(1)).toBe(false);
    expect(multiplicitySuffix(1)).toBe("");
  });

  it.each([null, false, undefined])("reads %s as single", (multiplicity) => {
    expect(isPluralMultiplicity(multiplicity)).toBe(false);
    expect(multiplicitySuffix(multiplicity)).toBe("");
  });

  it.each([0, -3, 2.5, Number.NaN])("reads the malformed count %s as single", (multiplicity) => {
    expect(isPluralMultiplicity(multiplicity)).toBe(false);
    expect(multiplicitySuffix(multiplicity)).toBe("");
  });
});

describe("the failing pipe of a problem", () => {
  const located = (pipe?: string) =>
    buildProblem(
      "pipe.function_raised",
      { pipe: "score_match", function: "funcs.score.score_match" },
      pipe === undefined ? {} : { location: { pipe } },
    );

  function failedNode(pipeCode: string, error = located("score_match")): GraphSpecNode {
    return {
      id: pipeCode,
      kind: "operator",
      pipe_code: pipeCode,
      pipe_type: "PipeFunc",
      status: "failed",
      io: { inputs: [], outputs: [] },
      error,
    };
  }

  it("reads the pipe the problem's location names", () => {
    expect(problemFailingPipe(located("score_match"))).toBe("score_match");
  });

  it("places no failure when the problem locates no pipe, or an empty one", () => {
    expect(problemFailingPipe(located())).toBeUndefined();
    expect(problemFailingPipe({ ...located(), location: { input: "cv" } })).toBeUndefined();
    expect(problemFailingPipe({ ...located(), location: { pipe: "" } })).toBeUndefined();
  });

  it("marks the failed node whose own problem locates it", () => {
    expect(isFailingPipeNode(failedNode("score_match"))).toBe(true);
  });

  it("leaves a failed controller whose problem locates a pipe beneath it unmarked", () => {
    const controller: GraphSpecNode = {
      ...failedNode("screen_candidate"),
      kind: "controller",
      pipe_type: "PipeSequence",
    };
    expect(isFailingPipeNode(controller)).toBe(false);
  });

  it("never marks a failed binding, even one whose path spells the sequence its problem locates", () => {
    // A binding step is no pipe, so its problem locates the sequence holding
    // it; a `from` path that is that sequence's code makes the names collide.
    const binding: GraphSpecNode = {
      ...failedNode("review_catalog", BINDING_FAILED_PROBLEM),
      kind: "binding",
      pipe_type: "BindingStep",
    };
    expect(problemFailingPipe(BINDING_FAILED_PROBLEM)).toBe(binding.pipe_code);
    expect(isFailingPipeNode(binding)).toBe(false);
  });

  it("marks no node that did not fail, carries no problem, or carries one locating nothing", () => {
    expect(isFailingPipeNode({ ...failedNode("score_match"), status: "running" })).toBe(false);
    expect(isFailingPipeNode({ ...failedNode("score_match"), error: undefined })).toBe(false);
    expect(isFailingPipeNode(failedNode("score_match", located()))).toBe(false);
  });
});
