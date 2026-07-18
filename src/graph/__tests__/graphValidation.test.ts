import { describe, it, expect } from "vitest";
import type { GraphNodeData, GraphSpec, ValidationIssue } from "@graph/types";
import {
  applyValidationDecorations,
  buildValidationDecorations,
  resolveIssueTargetNodeId,
} from "@graph/graphValidation";

/**
 * Minimal spec: a root sequence containing two invocations of the same pipe
 * (`analyze`) plus one distinct operator. Ids mirror the static walk's
 * hierarchical scheme; containment is expressed via the childToCtrl map the
 * viewer builds from the dataflow analysis.
 */
function makeSpec(): GraphSpec {
  const node = (
    id: string,
    pipeCode: string,
    kind: "controller" | "operator",
    domainCode = "demo",
  ) => ({
    id,
    kind,
    status: "scheduled" as const,
    pipe_code: pipeCode,
    domain_code: domainCode,
    pipe_type: kind === "controller" ? ("PipeSequence" as const) : ("PipeLLM" as const),
    io: { inputs: [], outputs: [] },
  });
  return {
    nodes: [
      node("demo.main", "main", "controller"),
      node("demo.main/step_1", "analyze", "operator"),
      node("demo.main/step_2", "analyze", "operator"),
      node("demo.main/step_3", "summarize", "operator"),
    ],
    edges: [],
    meta: { format: "mthds", mode: "static" },
  };
}

/**
 * Two domains declaring the same pipe code: the root sequence invokes
 * `screening.analyze` twice (one under a nested controller) and
 * `helpers.analyze` once. Only the qualified ref may separate them.
 */
function makeCollidingSpec(): GraphSpec {
  const node = (
    id: string,
    pipeCode: string,
    domainCode: string,
    kind: "controller" | "operator" = "operator",
  ) => ({
    id,
    kind,
    status: "scheduled" as const,
    pipe_code: pipeCode,
    domain_code: domainCode,
    pipe_type: kind === "controller" ? ("PipeSequence" as const) : ("PipeLLM" as const),
    io: { inputs: [], outputs: [] },
  });
  return {
    nodes: [
      node("screening.main", "main", "screening", "controller"),
      node("screening.main/step_1", "analyze", "screening"),
      node("screening.main/step_2", "prep", "screening", "controller"),
      node("screening.main/step_2/step_1", "analyze", "screening"),
      node("screening.main/step_3", "analyze", "helpers"),
    ],
    edges: [],
    meta: { format: "mthds", mode: "static" },
  };
}

const COLLIDING_CHILD_TO_CTRL = {
  "screening.main/step_1": "screening.main",
  "screening.main/step_2": "screening.main",
  "screening.main/step_2/step_1": "screening.main/step_2",
  "screening.main/step_3": "screening.main",
};

const CHILD_TO_CTRL = {
  "demo.main/step_1": "demo.main",
  "demo.main/step_2": "demo.main",
  "demo.main/step_3": "demo.main",
};

const NO_FOLDS = new Set<string>();

function issue(overrides: Partial<ValidationIssue>): ValidationIssue {
  return { severity: "error", message: "broken", ...overrides };
}

describe("buildValidationDecorations", () => {
  it("decorates the exact node for a nodeId-targeted issue", () => {
    const decorations = buildValidationDecorations(
      [issue({ nodeId: "demo.main/step_2" })],
      makeSpec(),
      CHILD_TO_CTRL,
      NO_FOLDS,
    );
    expect([...decorations.keys()]).toEqual(["demo.main/step_2"]);
    expect(decorations.get("demo.main/step_2")).toEqual({
      severity: "error",
      count: 1,
      lines: ["broken"],
    });
  });

  it("decorates every invocation for a pipeRef-targeted issue", () => {
    const decorations = buildValidationDecorations(
      [issue({ pipeRef: "demo.analyze" })],
      makeSpec(),
      CHILD_TO_CTRL,
      NO_FOLDS,
    );
    expect([...decorations.keys()].sort()).toEqual(["demo.main/step_1", "demo.main/step_2"]);
  });

  it("decorates only the matching domain's nodes when two domains share a pipe code", () => {
    const decorations = buildValidationDecorations(
      [issue({ pipeRef: "screening.analyze" })],
      makeCollidingSpec(),
      COLLIDING_CHILD_TO_CTRL,
      NO_FOLDS,
    );
    // `helpers.analyze` (step_3) shares the bare code but not the domain.
    expect([...decorations.keys()].sort()).toEqual([
      "screening.main/step_1",
      "screening.main/step_2/step_1",
    ]);
  });

  it("rolls a colliding-code issue up onto the right domain's controller only", () => {
    const decorations = buildValidationDecorations(
      [issue({ pipeRef: "screening.analyze" })],
      makeCollidingSpec(),
      COLLIDING_CHILD_TO_CTRL,
      new Set(["screening.main/step_2"]),
    );
    // The nested invocation rolls up onto its folded controller; the sibling
    // `helpers.analyze` stays undecorated.
    expect([...decorations.keys()].sort()).toEqual([
      "screening.main/step_1",
      "screening.main/step_2",
    ]);
  });

  it("never matches nodes that carry no domain_code", () => {
    const spec = makeCollidingSpec();
    for (const node of spec.nodes) delete node.domain_code;
    const decorations = buildValidationDecorations(
      [issue({ pipeRef: "screening.analyze" })],
      spec,
      COLLIDING_CHILD_TO_CTRL,
      NO_FOLDS,
    );
    expect(decorations.size).toBe(0);
  });

  it("prefers nodeId over pipeRef when both are set", () => {
    const decorations = buildValidationDecorations(
      [issue({ nodeId: "demo.main/step_3", pipeRef: "demo.analyze" })],
      makeSpec(),
      CHILD_TO_CTRL,
      NO_FOLDS,
    );
    expect([...decorations.keys()]).toEqual(["demo.main/step_3"]);
  });

  it("aggregates per node: worst severity wins, counts add, lines append", () => {
    const decorations = buildValidationDecorations(
      [
        issue({ nodeId: "demo.main/step_2", severity: "warning", message: "odd" }),
        issue({ nodeId: "demo.main/step_2", message: "bad", suggestedFix: "declare the output" }),
      ],
      makeSpec(),
      CHILD_TO_CTRL,
      NO_FOLDS,
    );
    expect(decorations.get("demo.main/step_2")).toEqual({
      severity: "error",
      count: 2,
      lines: ["odd", "bad", "Fix: declare the output"],
    });
  });

  it("keeps a warning-only node at warning severity", () => {
    const decorations = buildValidationDecorations(
      [issue({ nodeId: "demo.main/step_1", severity: "warning" })],
      makeSpec(),
      CHILD_TO_CTRL,
      NO_FOLDS,
    );
    expect(decorations.get("demo.main/step_1")?.severity).toBe("warning");
  });

  it("rolls descendants' issues up onto a folded ancestor", () => {
    const decorations = buildValidationDecorations(
      [
        issue({ pipeRef: "demo.analyze" }),
        issue({ nodeId: "demo.main/step_3", severity: "warning" }),
      ],
      makeSpec(),
      CHILD_TO_CTRL,
      new Set(["demo.main"]),
    );
    expect([...decorations.keys()]).toEqual(["demo.main"]);
    // Two `analyze` invocations + one step_3 warning roll up to 3.
    expect(decorations.get("demo.main")).toMatchObject({ severity: "error", count: 3 });
  });

  it("leaves untargeted issues and unknown targets panel-only", () => {
    const decorations = buildValidationDecorations(
      [
        issue({}), // no target
        issue({ nodeId: "demo.main/step_9" }), // never became a node — maps to itself
        issue({ pipeRef: "demo.nonexistent" }),
      ],
      makeSpec(),
      CHILD_TO_CTRL,
      NO_FOLDS,
    );
    // The unknown nodeId still lands in the map, but no rendered node has that
    // id, so nothing is decorated; the untargeted issues produce nothing.
    expect(decorations.has("demo.main/step_1")).toBe(false);
    expect(decorations.has("demo.main/step_3")).toBe(false);
    expect([...decorations.keys()]).toEqual(["demo.main/step_9"]);
  });

  it("returns an empty map for missing issues or graphspec", () => {
    expect(buildValidationDecorations(undefined, makeSpec(), CHILD_TO_CTRL, NO_FOLDS).size).toBe(0);
    expect(buildValidationDecorations([], makeSpec(), CHILD_TO_CTRL, NO_FOLDS).size).toBe(0);
    expect(buildValidationDecorations([issue({})], null, CHILD_TO_CTRL, NO_FOLDS).size).toBe(0);
  });
});

describe("resolveIssueTargetNodeId", () => {
  const rendered = new Set([
    "demo.main",
    "demo.main/step_1",
    "demo.main/step_2",
    "demo.main/step_3",
  ]);

  it("resolves a nodeId-targeted issue to its rendered node", () => {
    expect(
      resolveIssueTargetNodeId(
        issue({ nodeId: "demo.main/step_2" }),
        makeSpec(),
        CHILD_TO_CTRL,
        NO_FOLDS,
        rendered,
      ),
    ).toBe("demo.main/step_2");
  });

  it("resolves a pipeRef-targeted issue to the first rendered invocation", () => {
    expect(
      resolveIssueTargetNodeId(
        issue({ pipeRef: "demo.analyze" }),
        makeSpec(),
        CHILD_TO_CTRL,
        NO_FOLDS,
        rendered,
      ),
    ).toBe("demo.main/step_1");
  });

  it("remaps through folds to the folded ancestor", () => {
    expect(
      resolveIssueTargetNodeId(
        issue({ nodeId: "demo.main/step_2" }),
        makeSpec(),
        CHILD_TO_CTRL,
        new Set(["demo.main"]),
        new Set(["demo.main"]),
      ),
    ).toBe("demo.main");
  });

  it("returns null for panel-only issues and unrendered targets", () => {
    expect(resolveIssueTargetNodeId(issue({}), makeSpec(), CHILD_TO_CTRL, NO_FOLDS, rendered)).toBe(
      null,
    );
    expect(
      resolveIssueTargetNodeId(
        issue({ nodeId: "demo.main/step_9" }),
        makeSpec(),
        CHILD_TO_CTRL,
        NO_FOLDS,
        rendered,
      ),
    ).toBe(null);
    expect(
      resolveIssueTargetNodeId(issue({ nodeId: "x" }), null, CHILD_TO_CTRL, NO_FOLDS, rendered),
    ).toBe(null);
  });
});

describe("applyValidationDecorations", () => {
  function makeRenderedNode(id: string, withPayload: boolean) {
    const data: GraphNodeData = { isPipe: true, isStuff: false, labelText: id };
    if (withPayload) {
      data.pipeCardData = {
        pipeCode: id,
        pipeType: "PipeLLM",
        status: "scheduled",
        inputs: [],
        outputs: [],
      };
    }
    return { id, data };
  }

  it("stamps the decoration on node data and the pipe-card payload", () => {
    const decorations = new Map([
      ["a", { severity: "error" as const, count: 2, lines: ["x", "y"] }],
    ]);
    const [decorated] = applyValidationDecorations([makeRenderedNode("a", true)], decorations);
    expect(decorated.data.validation).toEqual({ severity: "error", count: 2, lines: ["x", "y"] });
    expect(decorated.data.pipeCardData?.validation).toEqual(decorated.data.validation);
  });

  it("returns undecorated nodes untouched (identity)", () => {
    const node = makeRenderedNode("b", true);
    const [result] = applyValidationDecorations([node], new Map());
    expect(result).toBe(node);
  });

  it("stamps the badge-click handler on decorated nodes only", () => {
    const onBadgeClick = () => {};
    const decorations = new Map([["a", { severity: "error" as const, count: 1, lines: ["x"] }]]);
    const [decorated, plain] = applyValidationDecorations(
      [makeRenderedNode("a", true), makeRenderedNode("b", true)],
      decorations,
      onBadgeClick,
    );
    expect(decorated.data.onValidationBadgeClick).toBe(onBadgeClick);
    expect(decorated.data.pipeCardData?.onValidationBadgeClick).toBe(onBadgeClick);
    expect(plain.data.onValidationBadgeClick).toBeUndefined();
  });

  it("clears a stale stamp when the node's issues disappear", () => {
    const node = makeRenderedNode("c", true);
    node.data.validation = { severity: "error", count: 1, lines: ["gone"] };
    node.data.pipeCardData!.validation = node.data.validation;
    const [result] = applyValidationDecorations([node], new Map());
    expect(result.data.validation).toBeUndefined();
    expect(result.data.pipeCardData?.validation).toBeUndefined();
  });
});
