import { describe, it, expect } from "vitest";
import type { GraphSpec, GraphSpecMode } from "@graph/types";
import {
  NODE_TYPE_SIMPLE_DECISION,
  NODE_TYPE_SIMPLE_STEP,
  STEP_CATEGORY,
  stuffNodeId,
} from "@graph/types";
import { findStuffByDigest } from "@graph/stuffLookup";
import { makeEmptyBindingSpec, makeMinimalSpec, makeNestedSpec } from "@graph/__tests__/testUtils";
import { LIVE_CV_ANALYZER } from "@graph/react/viewer/__stories__/liveGraphSpec";
import { reviewSpec } from "@graph/react/viewer/__stories__/styleReviewFixtures";
import type { ReviewFixtureId } from "@graph/react/viewer/__stories__/styleReviewFixtures";
import { buildSimpleNodeDetail } from "../simpleDetail";
import { simpleValueTitle } from "../simpleStyle";
import type {
  SimpleArrowDetail,
  SimpleDecisionDetail,
  SimpleDetail,
  SimpleDetailInput,
  SimpleFrameDetail,
  SimpleStepDetail,
  SimpleValueDetail,
} from "../simpleDetail";
import type { StyleProjection } from "../stylePipelines";
import { projectStyle } from "./styleTestUtils";

/** A spec drawn in the simple style, and what the panel reads from it. */
function drawn(spec: GraphSpec): { projection: StyleProjection; input: SimpleDetailInput } {
  const projection = projectStyle(spec, "simple");
  return {
    projection,
    input: {
      graphspec: spec,
      nodes: projection.nodes,
      edges: projection.edges,
      valueFlows: projection.valueFlows ?? new Map(),
      runs: projection.runs ?? new Map(),
      frameContents: projection.analysis?.containmentTree ?? {},
    },
  };
}

function fixture(id: ReviewFixtureId, mode: GraphSpecMode) {
  return drawn(reviewSpec(id, mode));
}

function nodeIdByTitle(projection: StyleProjection, title: string): string {
  const node = projection.nodes.find((n) => n.data.simple?.title === title);
  if (!node) throw new Error(`no node titled "${title}"`);
  return node.id;
}

function detailOf<K extends SimpleDetail["kind"]>(
  input: SimpleDetailInput,
  id: string,
  kind: K,
): Extract<SimpleDetail, { kind: K }> {
  const edge = input.edges.find((e) => e.id === id);
  const detail = buildSimpleNodeDetail(
    input,
    kind === "arrow"
      ? { kind: "arrow", source: edge?.source ?? "", target: edge?.target ?? "" }
      : { kind: "node", id },
  );
  if (detail?.kind !== kind)
    throw new Error(`expected a ${kind}, got ${detail?.kind ?? "nothing"}`);
  return detail as Extract<SimpleDetail, { kind: K }>;
}

const titles = (links: readonly { title: string }[]) => links.map((l) => l.title);

describe("the simple projection: what each arrow carries", () => {
  it("tags every arrow of a sequence with the value it carries", () => {
    const { projection } = fixture("SIMPLE_SEQUENCE", "live");
    expect(projection.edges.length).toBeGreaterThan(0);
    for (const edge of projection.edges) {
      expect(edge.carries?.length).toBe(1);
    }
  });

  it("carries the value through a decision, on both of its arrows", () => {
    const { projection, input } = fixture("SIMPLE_CONDITION", "live");
    const decision = nodeIdByTitle(projection, "Route based on detected language");
    const into = projection.edges.find((e) => e.target === decision);
    const out = projection.edges.find((e) => e.source === decision);
    expect(into?.carries).toEqual(out?.carries);
    const arrow = detailOf(input, out?.id ?? "", "arrow");
    expect(arrow.outcome).toBe("French");
    expect(titles(arrow.values)).toEqual(["Classified"]);
  });

  it("carries only the run drawn's copy of a value a batch hands each item", () => {
    const { projection } = fixture("BATCH_WITH_INNER_SEQ", "live");
    const format = nodeIdByTitle(projection, "Format enriched record entry");
    for (const edge of projection.edges.filter((e) => e.target === format)) {
      expect(edge.carries).toHaveLength(1);
    }
  });

  it("carries one copy of each value whatever order the spec lists a batch's runs in", () => {
    // A concurrent batch numbers its runs by when each started, so a later
    // item's run can come first in the spec.
    const spec = structuredClone(reviewSpec("BATCH_WITH_INNER_SEQ", "live"));
    spec.nodes.reverse();
    const { projection } = drawn(spec);
    for (const edge of projection.edges) {
      const names = (edge.carries ?? []).map((d) => findStuffByDigest(spec, d)?.item.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe("the simple projection: where each value goes", () => {
  it("names the steps of a batch as the readers of the list it repeats over", () => {
    const { projection, input } = fixture("SIMPLE_BATCH", "live");
    const extract = detailOf(
      input,
      nodeIdByTitle(projection, "Extract pages from document"),
      "step",
    );
    expect(titles(extract.produces[0].to)).toEqual(["Summarize a single page"]);
  });

  it("names the final output as the reader of the value it is", () => {
    const { projection } = fixture("SIMPLE_SEQUENCE", "live");
    const output = projection.nodes.find((n) => n.data.stuffRole === "output");
    const digest = output?.data.stuffDigest ?? "";
    expect(projection.valueFlows?.get(digest)?.to).toEqual([stuffNodeId(digest)]);
  });

  it("maps a step drawn once for each item to every run it stands for", () => {
    const { projection } = fixture("BATCH_WITH_INNER_SEQ", "live");
    const search = nodeIdByTitle(projection, "Search for additional details about a record");
    expect(projection.runs?.get(search)).toHaveLength(3);
  });
});

describe("buildSimpleNodeDetail: a step", () => {
  it("says what it uses and produces, where each comes from and goes, and what it is asked", () => {
    const { projection, input } = fixture("SIMPLE_SEQUENCE", "live");
    const step = detailOf(input, nodeIdByTitle(projection, "Analyze extracted content"), "step");
    expect(step.category).toBe(STEP_CATEGORY.AI);
    expect(step.uses.map((v) => v.title)).toEqual(["Pages"]);
    expect(titles(step.uses[0].from)).toEqual(["Extract pages from document"]);
    expect(step.produces.map((v) => v.title)).toEqual(["Analysis"]);
    expect(titles(step.produces[0].to)).toEqual(["Format analysis into final report"]);
    expect(step.instructions?.category).toBe(STEP_CATEGORY.AI);
    expect(step.instructions?.text.length).toBeGreaterThan(0);
  });

  it("leaves the step itself out of its own values' links", () => {
    const { projection, input } = fixture("SIMPLE_SEQUENCE", "live");
    const id = nodeIdByTitle(projection, "Analyze extracted content");
    const step = detailOf(input, id, "step");
    for (const value of [...step.uses, ...step.produces]) {
      expect([...value.from, ...value.to].map((l) => l.nodeId)).not.toContain(id);
    }
  });

  it("names a value by its concept's description and keeps its payload's location", () => {
    const { projection, input } = fixture("SIMPLE_SEQUENCE", "live");
    const step = detailOf(input, nodeIdByTitle(projection, "Analyze extracted content"), "step");
    const analysis = step.produces[0];
    expect(analysis.description).toBe("An analytical assessment of content");
    expect(analysis.location?.producerPipeRef).toBeDefined();
  });

  it("says how long it took in a run, and nothing of a run in a static graph", () => {
    const live = fixture("SIMPLE_SEQUENCE", "live");
    const step = detailOf(
      live.input,
      nodeIdByTitle(live.projection, "Analyze extracted content"),
      "step",
    );
    expect(step.run?.status).toBe("succeeded");
    expect(step.run?.durationSeconds).toBeGreaterThan(0);
    expect(step.run?.tally).toBeUndefined();

    const still = fixture("SIMPLE_SEQUENCE", "static");
    const stillStep = still.projection.nodes.find((n) => n.type === NODE_TYPE_SIMPLE_STEP);
    expect(detailOf(still.input, stillStep?.id ?? "", "step").run).toBeUndefined();
  });

  it("counts the runs of a step a batch ran once per item, rather than timing one", () => {
    const { projection, input } = fixture("BATCH_WITH_INNER_SEQ", "live");
    const step = detailOf(
      input,
      nodeIdByTitle(projection, "Search for additional details about a record"),
      "step",
    );
    expect(step.run?.tally).toEqual({ total: 3, byStatus: { succeeded: 3 } });
    expect(step.run?.durationSeconds).toBeUndefined();
  });

  it("shows the problem of a batch item that failed, though another item is the one drawn", () => {
    const spec = structuredClone(reviewSpec("BATCH_WITH_INNER_SEQ", "live"));
    const title = "Search for additional details about a record";
    const before = drawn(spec).projection;
    const drawnId = nodeIdByTitle(before, title);
    const laterId = before.runs?.get(drawnId)?.find((id) => id !== drawnId);
    const later = spec.nodes.find((n) => n.id === laterId);
    const problem = makeEmptyBindingSpec("failed").nodes.find((n) => n.error)?.error;
    if (!later || !problem) throw new Error("the fixture no longer has a later run to fail");
    later.status = "failed";
    later.error = problem;

    const { projection, input } = drawn(spec);
    expect(nodeIdByTitle(projection, title)).toBe(drawnId);
    const step = detailOf(input, drawnId, "step");
    expect(step.run?.status).toBe("failed");
    expect(step.run?.tally?.byStatus.failed).toBe(1);
    expect(step.problem).toEqual(problem);
  });

  it("drops the count of a batched step's runs once a host's status says otherwise", () => {
    const { projection, input } = fixture("BATCH_WITH_INNER_SEQ", "live");
    const id = nodeIdByTitle(projection, "Search for additional details about a record");
    const nodes = input.nodes.map((n) =>
      n.id === id && n.data.simple?.kind === "step"
        ? { ...n, data: { ...n.data, simple: { ...n.data.simple, status: "running" as const } } }
        : n,
    );
    const step = detailOf({ ...input, nodes }, id, "step");
    expect(step.run).toEqual({ status: "running", runs: 3 });
  });

  it("names the steps a folded sub-method holds", () => {
    const { projection, input } = drawn(makeNestedSpec(5));
    const folded = projection.nodes.find(
      (n) => n.data.simple?.kind === "step" && n.data.simple.innerStepCount !== undefined,
    );
    const step: SimpleStepDetail = detailOf(input, folded?.id ?? "", "step");
    expect(step.inner?.count).toBeGreaterThanOrEqual(1);
    expect(step.inner?.steps.length).toBe(step.inner?.count);
    expect(step.instructions).toBeUndefined();
  });

  it("puts a failed binding's problem first, as the field it was picking", () => {
    const { projection, input } = drawn(makeEmptyBindingSpec("failed"));
    const pick = projection.nodes.find((n) => n.type === NODE_TYPE_SIMPLE_STEP);
    const step = detailOf(input, pick?.id ?? "", "step");
    expect(step.category).toBe(STEP_CATEGORY.PICK);
    expect(step.title).toBe("Editor note");
    expect(step.problem).toBeDefined();
    expect(step.run?.status).toBe("failed");
  });
});

describe("buildSimpleNodeDetail: a decision", () => {
  it("lists each way it can go, leading to the step drawn for it, untaken in a static graph", () => {
    const { projection, input } = fixture("SIMPLE_CONDITION", "static");
    const decision: SimpleDecisionDetail = detailOf(
      input,
      nodeIdByTitle(projection, "Route based on detected language"),
      "decision",
    );
    expect(decision.outcomes.map((o) => o.label)).toEqual(["English", "French", "Otherwise"]);
    expect(decision.outcomes.map((o) => o.leadsTo?.title)).toEqual([
      "Pass English text through unchanged",
      "Translate French text to English",
      "Translate any language to English",
    ]);
    expect(decision.outcomes.every((o) => o.taken === undefined)).toBe(true);
    expect(titles(decision.uses[0].from)).toEqual(["Detect the language of input text"]);
  });

  it("counts the outcome a run took and the ones it did not", () => {
    const { projection, input } = fixture("SIMPLE_CONDITION", "live");
    const decision = detailOf(
      input,
      nodeIdByTitle(projection, "Route based on detected language"),
      "decision",
    );
    expect(decision.runs).toBe(1);
    expect(Object.fromEntries(decision.outcomes.map((o) => [o.label, o.taken]))).toEqual({
      English: 0,
      French: 1,
      Otherwise: 0,
    });
    // A branch the run did not take is not drawn, so it is named from the registry.
    const english = decision.outcomes.find((o) => o.label === "English");
    expect(english?.leadsTo).toBeUndefined();
    expect(english?.leadsToTitle.length).toBeGreaterThan(0);
  });

  it("joins the outcomes that lead to the same step, as the arrow does", () => {
    const { projection, input } = fixture("EMAIL_TRIAGE", "live");
    const decision = detailOf(
      input,
      nodeIdByTitle(projection, "Route email based on classification"),
      "decision",
    );
    expect(decision.outcomes.map((o) => o.label)).toContain("Needs review or otherwise");
  });

  it("says what an outcome leading to no step does, and counts no run for it", () => {
    const { projection, input } = drawn(LIVE_CV_ANALYZER);
    const id = projection.nodes.find((n) => n.type === NODE_TYPE_SIMPLE_DECISION)?.id ?? "";
    const decision = detailOf(input, id, "decision");
    const otherwise = decision.outcomes.find((o) => o.label === "Otherwise");
    expect(otherwise).toEqual({ label: "Otherwise", leadsToTitle: "", ends: "fail" });
    // The others lead to steps, and a run says whether it took each.
    expect(decision.outcomes.filter((o) => !o.ends).every((o) => o.taken !== undefined)).toBe(true);
  });

  it("resolves no outcome in a dry run, which runs every branch", () => {
    const { projection, input } = fixture("SIMPLE_CONDITION", "dry");
    const decision = detailOf(
      input,
      nodeIdByTitle(projection, "Route based on detected language"),
      "decision",
    );
    expect(decision.outcomes.every((o) => o.taken === undefined)).toBe(true);
  });
});

describe("buildSimpleNodeDetail: a frame", () => {
  it("names the list it repeats over, the steps it repeats, and how the items stand", () => {
    const { projection, input } = fixture("BATCH_WITH_INNER_SEQ", "live");
    const frame: SimpleFrameDetail = detailOf(
      input,
      nodeIdByTitle(projection, "For each record"),
      "frame",
    );
    expect(frame.over?.title).toBe("Records");
    expect(titles(frame.over?.from ?? [])).toEqual(["Extract structured records from document"]);
    expect(titles(frame.steps)).toEqual([
      "Search for additional details about a record",
      "Format enriched record entry",
    ]);
    expect(frame.items).toEqual({ total: 3, byStatus: { succeeded: 3 } });
  });
});

describe("buildSimpleNodeDetail: an input or an output", () => {
  it("describes a method input by its concept's fields, and names the steps reading it", () => {
    const { projection, input } = fixture("SIMPLE_SEQUENCE", "live");
    const node = projection.nodes.find((n) => n.data.stuffRole === "input");
    const detail: SimpleValueDetail = detailOf(input, node?.id ?? "", "value");
    expect(detail.role).toBe("input");
    expect(detail.value.from).toEqual([]);
    expect(titles(detail.value.to)).toEqual(["Extract pages from document"]);
    expect(detail.fields.map((f) => f.title)).toContain("URL");
  });

  it("names the step that made the final output", () => {
    const { projection, input } = fixture("SIMPLE_SEQUENCE", "live");
    const node = projection.nodes.find((n) => n.data.stuffRole === "output");
    const detail = detailOf(input, node?.id ?? "", "value");
    expect(detail.role).toBe("output");
    expect(titles(detail.value.from)).toEqual(["Format analysis into final report"]);
    expect(detail.value.to).toEqual([]);
  });
});

describe("buildSimpleNodeDetail: an arrow", () => {
  it("names its two ends and the values it carries", () => {
    const { projection, input } = fixture("SIMPLE_SEQUENCE", "live");
    const from = nodeIdByTitle(projection, "Extract pages from document");
    const edge = projection.edges.find((e) => e.source === from);
    const arrow: SimpleArrowDetail = detailOf(input, edge?.id ?? "", "arrow");
    expect(arrow.from.title).toBe("Extract pages from document");
    expect(arrow.to.title).toBe("Analyze extracted content");
    expect(arrow.outcome).toBeUndefined();
    expect(titles(arrow.values)).toEqual(["Pages"]);
  });
});

describe("buildSimpleNodeDetail: what it does not draw", () => {
  it("answers nothing for a node or an arrow the style did not draw", () => {
    const { input } = fixture("SIMPLE_SEQUENCE", "live");
    expect(buildSimpleNodeDetail(input, { kind: "node", id: "nowhere" })).toBeNull();
    expect(
      buildSimpleNodeDetail(input, { kind: "arrow", source: "nowhere", target: "else" }),
    ).toBeNull();
  });
});

describe("simpleValueTitle", () => {
  const spec = makeMinimalSpec(1);

  it("names a value by its variable, with its concept's plain name beneath when it says more", () => {
    expect(
      simpleValueTitle(spec, { name: "review_notes", concept: "native.Text" }, "input"),
    ).toEqual({ title: "Review notes", subtitle: "Text" });
    expect(
      simpleValueTitle(spec, { name: "bid_summary", concept: "bids.BidSummary" }, "input"),
    ).toEqual({ title: "Bid summary" });
  });

  it("names the final output by its concept when the author defined it", () => {
    expect(
      simpleValueTitle(spec, { name: "result", concept: "bids.BidSummary" }, "output"),
    ).toEqual({ title: "Bid summary" });
  });

  it("names a final output of a built-in concept by its variable, like any value", () => {
    expect(
      simpleValueTitle(spec, { name: "review_notes", concept: "native.Text" }, "output"),
    ).toEqual({ title: "Review notes", subtitle: "Text" });
  });
});
