import { describe, it, expect } from "vitest";
import type { GraphNode, GraphSpec, SimpleNodePayload } from "@graph/types";
import {
  BINDING_STEP_TYPE,
  EDGE_TYPE_ROUTED,
  NODE_TYPE_SIMPLE_DECISION,
  NODE_TYPE_SIMPLE_FRAME,
  NODE_TYPE_SIMPLE_STEP,
  NODE_TYPE_SIMPLE_TERMINAL,
  STEP_CATEGORY,
} from "@graph/types";
import { buildGraph } from "@graph/graphBuilders";
import {
  makeBatchSpec,
  makeBatchedConditionSpec,
  makeEmptyBindingSpec,
  makeMinimalSpec,
  makeNestedBatchSpec,
  makeNestedSpec,
} from "@graph/__tests__/testUtils";
import { reviewSpec } from "@graph/react/viewer/__stories__/styleReviewFixtures";
import { sentenceCase } from "../humanize";
import {
  SIMPLE_DECISION_WIDTHS,
  SIMPLE_STEP_WIDE_WIDTH,
  SIMPLE_STEP_WIDTH,
  aggregateStatus,
  applySimpleFrames,
  simpleDecisionSize,
  simpleDefaultFolds,
  simpleEdgeLabelSize,
  simpleStepSize,
  simpleTerminalSize,
} from "../simpleStyle";
import { layoutStyle, projectStyle } from "./styleTestUtils";

type Kind = SimpleNodePayload["kind"];

/** The payload variant a kind belongs to (inputs and outputs share one). */
type PayloadOf<K extends Kind> = SimpleNodePayload extends infer P
  ? P extends { kind: infer PK }
    ? K extends PK
      ? P
      : never
    : never
  : never;

function ofKind<K extends Kind>(nodes: GraphNode[], kind: K) {
  return nodes
    .filter((n) => n.data.simple?.kind === kind)
    .map((n) => ({ node: n, simple: n.data.simple as PayloadOf<K> }));
}

function stepByTitle(nodes: GraphNode[], title: string) {
  const found = ofKind(nodes, "step").find((s) => s.simple.title === title);
  if (!found) throw new Error(`no step titled "${title}"`);
  return found.node;
}

/**
 * A batch of two candidates whose decisions take two branches calling pipes of
 * one code, `respond`, in two domains. Without `outcomes`, each branch carries
 * its outcome on its `contains` edge; with them, the edges carry none, as in a
 * pipelex run, and the condition's blueprint maps each outcome to its pipe.
 */
function twoDomainBranchesSpec(outcomes?: Record<string, string>): GraphSpec {
  const spec = makeBatchedConditionSpec(["refused", "matched"]);
  const domainOf: Record<string, string> = {
    write_refusal: "refusals",
    write_questions: "questions",
  };
  spec.nodes = spec.nodes.map((n) => {
    const domain = n.pipe_code ? domainOf[n.pipe_code] : undefined;
    return domain ? { ...n, pipe_code: "respond", domain_code: domain } : n;
  });
  if (!outcomes) return spec;
  spec.edges = spec.edges.map(({ label: _label, ...edge }) => edge);
  const condition = Object.values(reviewSpec("EMAIL_TRIAGE", "live").pipe_registry ?? {}).find(
    (b) => b.type === "PipeCondition",
  );
  if (condition?.type !== "PipeCondition") throw new Error("no condition blueprint");
  spec.pipe_registry = {
    "test.route_by_match": {
      ...condition,
      code: "route_by_match",
      domain_code: "test",
      outcome_map: outcomes,
      default_outcome: "fail",
    },
  };
  return spec;
}

function operators(spec: GraphSpec) {
  return spec.nodes.filter((n) => n.kind === "operator" && n.pipe_type !== BINDING_STEP_TYPE);
}

describe("the simple projection: steps", () => {
  const spec = reviewSpec("CV_SCREENING", "static");
  const { nodes } = projectStyle(spec, "simple");

  it("draws one step per operator, under the operator's own id", () => {
    const steps = ofKind(nodes, "step");
    expect(steps.map((s) => s.node.id).sort()).toEqual(
      operators(spec)
        .map((n) => n.id)
        .sort(),
    );
    for (const { node } of steps) expect(node.type).toBe(NODE_TYPE_SIMPLE_STEP);
  });

  it("titles each step with its pipe's description, as a heading", () => {
    for (const { node, simple } of ofKind(nodes, "step")) {
      const specNode = spec.nodes.find((n) => n.id === node.id);
      expect(specNode?.description).toBeTruthy();
      expect(simple.title).toBe(sentenceCase(specNode?.description ?? ""));
    }
  });

  it("falls back to the humanized pipe code when a pipe has no description", () => {
    const bare: GraphSpec = {
      ...spec,
      nodes: spec.nodes.map((n) => ({ ...n, description: undefined })),
    };
    const titles = ofKind(projectStyle(bare, "simple").nodes, "step").map((s) => s.simple.title);
    expect(titles).toContain("Extract CV");
    expect(titles.every((t) => !t.includes("_"))).toBe(true);
  });

  it("files each step under a plain category", () => {
    const categories = ofKind(nodes, "step").map((s) => s.simple.category);
    expect(categories).toContain(STEP_CATEGORY.AI);
    expect(categories).toContain(STEP_CATEGORY.EXTRACT);
    expect(categories).toContain(STEP_CATEGORY.TEMPLATE);
  });

  it("sizes every node for layout", () => {
    for (const node of nodes) {
      if (node.type === NODE_TYPE_SIMPLE_FRAME) continue;
      expect(node.data.layoutSize?.width).toBeGreaterThan(0);
      expect(node.data.layoutSize?.height).toBeGreaterThan(0);
    }
  });
});

describe("the simple projection: data", () => {
  it("draws only the method's inputs and its main output as data", () => {
    const spec = reviewSpec("RFP_QUALIFIER", "static");
    const { nodes } = projectStyle(spec, "simple");
    const inputs = ofKind(nodes, "input");
    const outputs = ofKind(nodes, "output");
    expect(inputs.map((i) => i.simple.title).sort()).toEqual(["Capabilities", "RFP"]);
    expect(outputs).toHaveLength(1);
    for (const { node } of [...inputs, ...outputs])
      expect(node.type).toBe(NODE_TYPE_SIMPLE_TERMINAL);
    // Every other value is an arrow: the detailed drawing has a node per value.
    const { graphData } = buildGraph(spec, "default");
    const values = graphData.nodes.filter((n) => n.data.isStuff).length;
    expect(values).toBeGreaterThan(inputs.length + outputs.length);
  });

  it("names the final output by its concept, or by its variable when the concept is built in", () => {
    const [bid] = ofKind(
      projectStyle(reviewSpec("RFP_QUALIFIER", "static"), "simple").nodes,
      "output",
    );
    expect(bid.simple.title).toBe("Bid summary");
    expect(bid.simple.subtitle).toBeUndefined();
    const [review] = ofKind(
      projectStyle(reviewSpec("CATALOG_REVIEW", "static"), "simple").nodes,
      "output",
    );
    expect(review.simple.title).toBe("Review");
    expect(review.simple.subtitle).toBe("Text");
  });

  it("names an input by its variable, with its concept underneath when it says more", () => {
    const { nodes } = projectStyle(reviewSpec("EMAIL_TRIAGE", "static"), "simple");
    const [query] = ofKind(nodes, "input");
    expect(query.simple.title).toBe("Query");
    expect(query.simple.subtitle).toBe("Text");
  });

  it("draws a value with two readers as two arrows from the step that produced it", () => {
    const spec = reviewSpec("CV_SCREENING", "static");
    const { nodes, edges } = projectStyle(spec, "simple");
    const analyze = stepByTitle(nodes, "Analyze CV to build candidate profile");
    const readers = edges.filter((e) => e.source === analyze.id).map((e) => e.target);
    expect(readers.length).toBeGreaterThanOrEqual(2);
    expect(new Set(readers).size).toBe(readers.length);
  });

  it("lets the arrow pass through a binding step", () => {
    const spec = reviewSpec("CATALOG_REVIEW", "static");
    expect(spec.nodes.some((n) => n.pipe_type === BINDING_STEP_TYPE)).toBe(true);
    const { nodes, edges } = projectStyle(spec, "simple");
    const ids = new Set(nodes.map((n) => n.id));
    const bindingIds = spec.nodes.filter((n) => n.pipe_type === BINDING_STEP_TYPE).map((n) => n.id);
    for (const id of bindingIds) expect(ids.has(id)).toBe(false);
    for (const edge of edges) {
      expect(ids.has(edge.source)).toBe(true);
      expect(ids.has(edge.target)).toBe(true);
    }
    // The review step reads what the bindings picked: its arrows come from the steps behind them.
    const review = stepByTitle(nodes, "Writes the review sent back to the supplier");
    expect(edges.filter((e) => e.target === review.id).length).toBeGreaterThanOrEqual(2);
  });

  it("draws a binding step that failed, naming the field it was picking", () => {
    const alone = ofKind(projectStyle(makeEmptyBindingSpec("failed"), "simple").nodes, "step");
    expect(alone.map((s) => s.node.id)).toEqual(["bind"]);
    expect(alone[0].simple).toMatchObject({
      title: "Editor note",
      category: STEP_CATEGORY.PICK,
      status: "failed",
    });
    const beside = projectStyle(makeEmptyBindingSpec("failed", { besideProducer: true }), "simple");
    expect(
      ofKind(beside.nodes, "step")
        .map((s) => s.node.id)
        .sort(),
    ).toEqual(["bind", "title"]);
    // One that was skipped is plumbing like any other.
    const skipped = projectStyle(
      makeEmptyBindingSpec("skipped", { besideProducer: true }),
      "simple",
    );
    expect(ofKind(skipped.nodes, "step").map((s) => s.node.id)).toEqual(["title"]);
  });

  it("names, for each node it does not draw, the drawn node standing for it", () => {
    // A batch of one step is drawn as that step, marked "for each".
    const batch = projectStyle(makeBatchSpec(3), "simple");
    expect(batch.standIns?.get("batch")).toBe("iter_0");
    // A sub-method drawn as its steps stands for the first it contains, which
    // in this spec is the batch.
    expect(batch.standIns?.get("root_seq")).toBe("iter_0");

    // A later item's run of a sub-method stands for the first run's first step.
    const nested = projectStyle(makeNestedBatchSpec(), "simple");
    expect(nested.standIns?.get("read_2_2")).toBe("read_1_1");
    expect(nested.standIns?.get("doc_2")).toBe("split_1");

    // A binding step stands for the drawn step that reads what it picked, and
    // one whose result nothing reads for what stands for its sub-method.
    const spec = reviewSpec("CATALOG_REVIEW", "static");
    const catalog = projectStyle(spec, "simple");
    const drawn = new Set(catalog.nodes.map((n) => n.id));
    const bindings = spec.nodes.filter((n) => n.pipe_type === BINDING_STEP_TYPE);
    const consumers = buildGraph(spec, "default").analysis?.stuffConsumers ?? {};
    const readersOf = (binding: (typeof bindings)[number]) =>
      binding.io.outputs.flatMap((o) => consumers[o.digest ?? ""] ?? []);
    expect(bindings.some((b) => readersOf(b).length === 0)).toBe(true);
    for (const binding of bindings) {
      const standIn = catalog.standIns?.get(binding.id);
      expect(standIn).toBeDefined();
      if (readersOf(binding).length > 0) expect(readersOf(binding)).toContain(standIn);
      else expect(standIn).toBe(catalog.standIns?.get("catalog_review.review_catalog"));
    }
    for (const id of catalog.standIns?.values() ?? []) expect(drawn.has(id)).toBe(true);
  });

  it("routes every arrow around the steps in its way", () => {
    const { edges } = projectStyle(reviewSpec("CV_SCREENING", "static"), "simple");
    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) expect(edge.type).toBe(EDGE_TYPE_ROUTED);
  });

  it("passes a value between top-level pipes as an arrow, not as an input or an output", () => {
    const { nodes, edges } = projectStyle(makeMinimalSpec(3), "simple");
    expect(nodes.filter((n) => n.type === NODE_TYPE_SIMPLE_TERMINAL)).toEqual([]);
    expect(edges.map((e) => `${e.source}->${e.target}`).sort()).toEqual(["op0->op1", "op1->op2"]);
  });
});

describe("the simple projection: decisions", () => {
  it("draws a condition as a decision whose arrows carry its outcomes", () => {
    const spec = reviewSpec("SIMPLE_CONDITION", "static");
    const { nodes, edges } = projectStyle(spec, "simple");
    const decisions = nodes.filter((n) => n.type === NODE_TYPE_SIMPLE_DECISION);
    expect(decisions).toHaveLength(1);
    const outgoing = edges.filter((e) => e.source === decisions[0].id);
    expect(outgoing.map((e) => e.label).sort()).toEqual(["English", "French", "Otherwise"]);
    for (const edge of outgoing) {
      expect(edge.labelSize).toEqual(simpleEdgeLabelSize(edge.label ?? ""));
    }
  });

  it("sends a decision's arrow to the first steps of a branch only", () => {
    const { nodes, edges } = projectStyle(reviewSpec("NESTED_SEQ_COND_SEQ", "static"), "simple");
    const [decision] = nodes.filter((n) => n.type === NODE_TYPE_SIMPLE_DECISION);
    const outgoing = edges.filter((e) => e.source === decision.id);
    expect(outgoing).toHaveLength(2);
    expect(new Set(outgoing.map((e) => e.label)).size).toBe(2);
  });

  it("reads a yes-or-no test's outcomes as Yes and No", () => {
    const { nodes, edges } = projectStyle(reviewSpec("AVAILABILITY_ROUTING", "static"), "simple");
    const [decision] = ofKind(nodes, "decision");
    const labels = edges.filter((e) => e.source === decision.node.id).map((e) => e.label);
    expect(labels.sort()).toEqual(["No or otherwise", "Yes"]);
  });

  it("joins the outcomes of a branch taken on several, in every mode", () => {
    for (const mode of ["static", "dry", "live"] as const) {
      const { edges } = projectStyle(reviewSpec("EMAIL_TRIAGE", mode), "simple");
      expect(edges.map((e) => e.label)).toContain("Needs review or otherwise");
    }
  });

  it("labels a branch with the outcomes naming its pipe, domain included", () => {
    const { edges } = projectStyle(
      twoDomainBranchesSpec({ refused: "refusals.respond", matched: "questions.respond" }),
      "simple",
    );
    expect(edges.filter((e) => e.source === "route_1").map((e) => [e.target, e.label])).toEqual([
      ["write_refusal_1", "Refused"],
      ["write_questions_2", "Matched"],
    ]);
  });
});

describe("the simple projection: loops", () => {
  it("marks the step of a single-step batch 'for each', drawn once", () => {
    const { nodes } = projectStyle(reviewSpec("SIMPLE_BATCH", "static"), "simple");
    const marked = ofKind(nodes, "step").filter((s) => s.simple.forEach);
    expect(marked).toHaveLength(1);
    expect(marked[0].simple.forEach).toMatch(/^For each /);
    expect(nodes.some((n) => n.type === NODE_TYPE_SIMPLE_FRAME)).toBe(false);
  });

  it("frames a batch whose branch has several steps", () => {
    const { nodes, analysis } = projectStyle(
      reviewSpec("BATCH_WITH_INNER_SEQ", "static"),
      "simple",
    );
    const frames = ofKind(nodes, "frame");
    expect(frames).toHaveLength(1);
    expect(frames[0].simple.title).toMatch(/^For each /);
    expect([...(analysis?.controllerNodeIds ?? [])]).toEqual([frames[0].node.id]);
    expect(analysis?.containmentTree[frames[0].node.id]?.length).toBeGreaterThanOrEqual(2);
  });

  it("draws a run's batch branch once, whatever the number of items", () => {
    const staticSteps = ofKind(
      projectStyle(reviewSpec("SIMPLE_BATCH", "static"), "simple").nodes,
      "step",
    );
    const dry = reviewSpec("SIMPLE_BATCH", "dry");
    const dryOperators = operators(dry).length;
    const drySteps = ofKind(projectStyle(dry, "simple").nodes, "step");
    expect(dryOperators).toBeGreaterThan(drySteps.length);
    expect(drySteps.map((s) => s.simple.title).sort()).toEqual(
      staticSteps.map((s) => s.simple.title).sort(),
    );
  });

  it("shows a step that ran once per item with the worst of its statuses", () => {
    expect(aggregateStatus(["succeeded", "failed", "running"])).toBe("failed");
    expect(aggregateStatus(["succeeded", "running"])).toBe("running");
    expect(aggregateStatus(["succeeded", "succeeded"])).toBe("succeeded");
    expect(aggregateStatus([])).toBeUndefined();
  });

  it("gives a step inside a batch inside a batch the statuses of every outer item's runs", () => {
    const { nodes } = projectStyle(makeNestedBatchSpec("read_2_2"), "simple");
    const steps = ofKind(nodes, "step");
    expect(steps.map((s) => s.node.id).sort()).toEqual(["read_1_1", "split_1", "summarize_1"]);
    expect(steps.find((s) => s.node.id === "read_1_1")?.simple.status).toBe("failed");
    expect(steps.find((s) => s.node.id === "split_1")?.simple.status).toBe("succeeded");
  });

  it("draws a step through a later item's run when the first item's run has nothing to show", () => {
    // The first document is skipped at its first step, which leaves that run
    // no inputs or outputs, and runs nothing after it.
    const spec = makeNestedBatchSpec();
    const gone = new Set(["pages_1", "read_1_1", "read_1_2", "summarize_1"]);
    spec.nodes = spec.nodes
      .filter((n) => !gone.has(n.id))
      .map((n) =>
        n.id === "split_1"
          ? { ...n, status: "skipped" as const, io: { inputs: [], outputs: [] } }
          : n,
      );
    spec.edges = spec.edges.filter((e) => !gone.has(e.source) && !gone.has(e.target));

    const { nodes, edges } = projectStyle(spec, "simple");
    const steps = ofKind(nodes, "step");
    expect(steps.map((s) => s.node.id).sort()).toEqual(["read_2_1", "split_2", "summarize_2"]);
    expect(steps.find((s) => s.node.id === "split_2")?.simple.status).toBe(
      aggregateStatus(["skipped", "succeeded"]),
    );
    expect(ofKind(nodes, "input").map((i) => i.node.id)).toEqual(["stuff_documents"]);
    expect(edges.some((e) => e.source === "stuff_documents" && e.target === "split_2")).toBe(true);
  });

  it("draws a decision's branch that only a later item took", () => {
    const { nodes, edges } = projectStyle(
      makeBatchedConditionSpec(["refused", "matched", "matched"]),
      "simple",
    );
    expect(ofKind(nodes, "step").map((s) => s.node.id)).toEqual([
      "assess_1",
      "write_refusal_1",
      "write_questions_2",
    ]);
    const [decision] = ofKind(nodes, "decision");
    expect(decision.node.id).toBe("route_1");
    const outgoing = edges.filter((e) => e.source === "route_1");
    expect(outgoing.map((e) => [e.target, e.label])).toEqual([
      ["write_refusal_1", "Refused"],
      ["write_questions_2", "Matched"],
    ]);
    const [frame] = ofKind(nodes, "frame");
    expect(frame.node.id).toBe("screen");
  });

  it("keeps two domains' pipes of one code two steps when different items take them", () => {
    const { nodes, edges } = projectStyle(twoDomainBranchesSpec(), "simple");
    expect(ofKind(nodes, "step").map((s) => s.node.id)).toEqual([
      "assess_1",
      "write_refusal_1",
      "write_questions_2",
    ]);
    expect(edges.filter((e) => e.source === "route_1").map((e) => [e.target, e.label])).toEqual([
      ["write_refusal_1", "Refused"],
      ["write_questions_2", "Matched"],
    ]);
  });

  it("marks the step drawn for a later item 'for each' when the first item's has nothing to show", () => {
    const spec = makeNestedBatchSpec();
    spec.nodes = spec.nodes.map((n) =>
      n.id === "read_1_1"
        ? { ...n, status: "skipped" as const, io: { inputs: [], outputs: [] } }
        : n,
    );
    const steps = ofKind(projectStyle(spec, "simple").nodes, "step");
    const read = steps.find((s) => s.node.id === "read_1_2");
    expect(read?.simple.forEach).toBe("For each page");
  });

  it("draws an inner loop through an item whose list was not empty", () => {
    // The first document has no pages, so its inner loop ran over nothing.
    const spec = makeNestedBatchSpec();
    const gone = new Set(["read_1_1", "read_1_2"]);
    spec.nodes = spec.nodes.filter((n) => !gone.has(n.id));
    spec.edges = spec.edges.filter((e) => !gone.has(e.source) && !gone.has(e.target));

    const { nodes } = projectStyle(spec, "simple");
    const steps = ofKind(nodes, "step");
    expect(steps.map((s) => s.node.id).sort()).toEqual(["read_2_1", "split_1", "summarize_1"]);
    expect(steps.find((s) => s.node.id === "read_2_1")?.simple.forEach).toBe("For each page");
  });

  it("falls back to 'item' while a batch's item name is unwritten", () => {
    // A bundle whose batch has no item name yet: the blueprint holds an empty
    // name, and the static walk draws no item edge.
    const spec = structuredClone(reviewSpec("SIMPLE_BATCH", "static"));
    const batches = Object.values(spec.pipe_registry ?? {}).filter((b) => b.type === "PipeBatch");
    expect(batches.length).toBeGreaterThan(0);
    for (const batch of batches) {
      if (batch.type === "PipeBatch") batch.batch_params.input_item_stuff_name = "";
    }
    spec.edges = spec.edges.filter((e) => e.kind !== "batch_item");
    const marked = ofKind(projectStyle(spec, "simple").nodes, "step").filter(
      (s) => s.simple.forEach,
    );
    expect(marked.map((s) => s.simple.forEach)).toEqual(["For each item"]);
  });
});

describe("the simple projection: folds", () => {
  it("folds sub-methods from the fold depth down, and nothing else", () => {
    const spec = makeNestedSpec(5);
    const { analysis } = buildGraph(spec, "default");
    if (!analysis) throw new Error("no analysis");
    expect([...simpleDefaultFolds(spec, analysis)].sort()).toEqual(["seq_3", "seq_4"]);
    const shallow = makeNestedSpec(2);
    const shallowAnalysis = buildGraph(shallow, "default").analysis;
    if (!shallowAnalysis) throw new Error("no analysis");
    expect(simpleDefaultFolds(shallow, shallowAnalysis).size).toBe(0);
  });

  it("draws a folded sub-method as one step saying how many it holds", () => {
    const spec = reviewSpec("DEEP_NESTING", "static");
    const sequences = spec.nodes.filter((n) => n.pipe_type === "PipeSequence");
    const inner = sequences.find((n) =>
      spec.edges.some((e) => e.kind === "contains" && e.target === n.id),
    );
    if (!inner) throw new Error("no inner sequence");
    const { nodes } = projectStyle(spec, "simple", [inner.id]);
    const folded = ofKind(nodes, "step").find((s) => s.node.id === inner.id);
    expect(folded?.simple.category).toBe(STEP_CATEGORY.STEPS);
    expect(folded?.simple.innerStepCount).toBeGreaterThanOrEqual(1);
  });

  it("hides what a fold of the drawn run alone holds in every item", () => {
    // Folding the first document's page loop alone leaves the second's open.
    const pages = projectStyle(makeNestedBatchSpec(), "simple", ["pages_1"]);
    const pageSteps = ofKind(pages.nodes, "step");
    expect(pageSteps.map((s) => s.node.id).sort()).toEqual(["pages_1", "split_1", "summarize_1"]);
    expect(pageSteps.find((s) => s.node.id === "pages_1")?.simple.forEach).toBe("For each page");
    const pageIds = new Set(pages.nodes.map((n) => n.id));
    for (const edge of pages.edges) {
      expect(pageIds.has(edge.source) && pageIds.has(edge.target)).toBe(true);
    }
    expect(pages.standIns?.get("read_2_1")).toBe("pages_1");

    // Folding the first document alone draws the loop over documents as one step.
    const docs = projectStyle(makeNestedBatchSpec(), "simple", ["doc_1"]);
    const docSteps = ofKind(docs.nodes, "step");
    expect(docSteps.map((s) => s.node.id)).toEqual(["doc_1"]);
    expect(docSteps[0].simple.forEach).toBe("For each document");
    expect(ofKind(docs.nodes, "frame")).toHaveLength(0);
    expect(docs.standIns?.get("split_2")).toBe("doc_1");
  });
});

describe("the simple style's sizes", () => {
  it("grows a step with its title's lines and its markers", () => {
    const one = simpleStepSize("Short");
    const three = simpleStepSize("A title long enough to need three lines in the box");
    expect(one.width).toBe(SIMPLE_STEP_WIDTH);
    expect(three.height).toBeGreaterThan(one.height);
    expect(simpleStepSize("Short", { forEach: true }).height).toBeGreaterThan(one.height);
    expect(simpleStepSize("Short", { innerSteps: true }).height).toBeGreaterThan(one.height);
  });

  it("widens a step only when the wider box saves its title", () => {
    const saved = simpleStepSize("Combine all page summaries into one document summary");
    expect(saved.width).toBe(SIMPLE_STEP_WIDE_WIDTH);
    const hopeless = simpleStepSize(
      "Parse the RFP document into a structured list of individual requirements, each classified by category and priority",
    );
    expect(hopeless.width).toBe(SIMPLE_STEP_WIDTH);
  });

  it("widens a decision for a longer question", () => {
    expect(simpleDecisionSize("Route by language").width).toBe(SIMPLE_DECISION_WIDTHS[0]);
    expect(
      simpleDecisionSize("Reply immediately when urgent, otherwise propose alternatives").width,
    ).toBeGreaterThan(SIMPLE_DECISION_WIDTHS[0]);
  });

  it("makes room for a terminal's subtitle", () => {
    expect(simpleTerminalSize("CV", true).height).toBeGreaterThanOrEqual(
      simpleTerminalSize("CV", false).height,
    );
  });
});

describe("applySimpleFrames", () => {
  it("turns each frame placeholder into a sized group, holding its steps, parents first", async () => {
    const spec = makeNestedBatchSpec();
    const laid = await layoutStyle(spec, "simple");
    const analysis = laid.analysis;
    if (!analysis) throw new Error("no analysis");
    const folded: string[] = [];
    const { nodes } = applySimpleFrames({
      nodes: laid.nodes,
      edges: laid.edges,
      graphspec: spec,
      analysis,
      controllerPositions: laid.controllerPositions,
      onToggleFold: (id) => folded.push(id),
    });
    const frames = nodes.filter((n) => n.type === NODE_TYPE_SIMPLE_FRAME);
    expect(frames.map((f) => f.id)).toEqual([...analysis.controllerNodeIds]);
    const frame = frames[0];
    expect(frame.data.simple).toMatchObject({ kind: "frame", title: "For each document" });
    expect(parseFloat(String(frame.style?.width))).toBeGreaterThan(0);
    expect(parseFloat(String(frame.style?.height))).toBeGreaterThan(0);
    expect(nodes.filter((n) => n.parentId === frame.id).length).toBeGreaterThan(0);
    const index = new Map(nodes.map((n, i) => [n.id, i]));
    for (const node of nodes) {
      if (node.parentId) expect(index.get(node.parentId)).toBeLessThan(index.get(node.id)!);
    }
    // The frame's fold button folds its batch.
    const payload = frame.data.simple as { onFold?: () => void };
    payload.onFold?.();
    expect(folded).toEqual([frame.id]);
  });

  it("returns the nodes as they are when nothing is framed", async () => {
    const spec = makeMinimalSpec(3);
    const laid = await layoutStyle(spec, "simple");
    const analysis = laid.analysis;
    if (!analysis) throw new Error("no analysis");
    const { nodes } = applySimpleFrames({
      nodes: laid.nodes,
      edges: laid.edges,
      graphspec: spec,
      analysis,
    });
    expect(nodes).toEqual(laid.nodes);
  });
});
