import { describe, it, expect } from "vitest";
import type { PipeBlueprintUnion, PipeConditionBlueprint, StuffSpecInfo } from "@graph/types";
import {
  NODE_TYPE_SIMPLE_DECISION,
  NODE_TYPE_SIMPLE_FRAME,
  NODE_TYPE_SIMPLE_STEP,
} from "@graph/types";
import { validateGraphSpec } from "@graph/validateGraphSpec";
import { buildStaticGraphSpecFromToml } from "@static-graph/buildStaticGraphSpec";
import reviewNdaBundle from "@timeline/react/__stories__/methods/review_nda.mthds?raw";
import {
  WORDING_SOURCE,
  conditionBranches,
  isFileValuedOutput,
  isPlumbingStep,
  outcomeArrowLabel,
  outcomeKeysFromTag,
  outcomeTone,
  outcomeWordsOf,
  registryConceptLookup,
  sameOutcomes,
  selectedOutcomeWords,
  sharedOutcomeTone,
  stepWording,
} from "../methodWords";
import { buildSimpleNodeDetail } from "../simpleDetail";
import type { SimpleDecisionDetail } from "../simpleDetail";
import { projectStyle } from "./styleTestUtils";

function output(code: string, domain: string, refines?: string): StuffSpecInfo {
  return {
    concept: {
      code,
      domain_code: domain,
      description: code,
      structure_class_name: code,
      refines: refines ?? null,
    },
  };
}

function func(out: StuffSpecInfo): PipeBlueprintUnion {
  return {
    type: "PipeFunc",
    pipe_category: "PipeOperator",
    code: "f",
    domain_code: "d",
    description: "A function",
    inputs: {},
    output: out,
  };
}

const CONDITION: PipeConditionBlueprint = {
  type: "PipeCondition",
  pipe_category: "PipeController",
  code: "route_by_risk",
  domain_code: "legal",
  description: "Pick how closely to check",
  inputs: {},
  output: output("Text", "native"),
  expression: "risk.text",
  outcome_map: { high: "detailed_check", low: "standard_check" },
  default_outcome: "standard_check",
  outcome_words: {
    high: { label: "Detailed check", description: "A lawyer-grade review", tone: "caution" },
    low: { label: null, description: null, tone: "rainbow" },
  },
  default_outcome_words: { label: "Standard check", description: null, tone: null },
};

describe("stepWording", () => {
  it("prefers the activity, then the description, then the humanized code", () => {
    expect(stepWording({ activity: "Reading the NDA.", description: "Extract" }, "x")).toEqual({
      title: "Reading the NDA",
      source: WORDING_SOURCE.ACTIVITY,
    });
    expect(stepWording({ activity: null, description: "Extract the pages" }, "x")).toEqual({
      title: "Extract the pages",
      source: WORDING_SOURCE.DESCRIPTION,
    });
    expect(stepWording({ activity: "  ", description: "" }, "read_nda")).toEqual({
      title: "Read nda",
      source: WORDING_SOURCE.CODE,
    });
    expect(stepWording(null, "read_nda").source).toBe(WORDING_SOURCE.CODE);
  });
});

describe("outcome words", () => {
  it("reads an outcome's words by its key, and the default outcome's by null", () => {
    expect(outcomeWordsOf(CONDITION, "high")).toEqual({
      label: "Detailed check",
      description: "A lawyer-grade review",
      tone: "caution",
    });
    expect(outcomeWordsOf(CONDITION, null)).toEqual({
      label: "Standard check",
      description: null,
      tone: null,
    });
  });

  it("reads no words for an outcome without a table, an unknown tone, or another pipe", () => {
    expect(outcomeWordsOf(CONDITION, "low")).toBeNull();
    expect(outcomeWordsOf(CONDITION, "missing")).toBeNull();
    expect(outcomeWordsOf({ ...CONDITION, outcome_words: null }, "high")).toBeNull();
    expect(outcomeWordsOf(func(output("Text", "native")), "high")).toBeNull();
    expect(outcomeWordsOf(null, "high")).toBeNull();
  });

  it("labels an arrow by its outcomes' labels, in plain words where there is none", () => {
    expect(outcomeArrowLabel(["high"], CONDITION)).toBe("Detailed check");
    expect(outcomeArrowLabel(["low", null], CONDITION)).toBe("Low or Standard check");
    expect(outcomeArrowLabel(["high"], null)).toBe("High");
    expect(outcomeArrowLabel(["high", null], null)).toBe("High or otherwise");
  });

  it("reads a static graph's outcome tag, its `default` the default outcome", () => {
    expect(outcomeKeysFromTag("no_fit | default")).toEqual(["no_fit", null]);
    expect(outcomeKeysFromTag(" a|b ")).toEqual(["a", "b"]);
    expect(sameOutcomes(["a", null], [null, "a"])).toBe(true);
    expect(sameOutcomes(["a"], ["a", null])).toBe(false);
    expect(sameOutcomes(["a", "a"], ["a", "b"])).toBe(false);
  });

  it("keeps an outcome the method names `default` apart from the default outcome", () => {
    const condition: PipeConditionBlueprint = {
      ...CONDITION,
      outcome_map: { default: "mine", other: "theirs" },
      default_outcome: "theirs",
      outcome_words: { default: { label: "Mine" } },
      default_outcome_words: { label: "Theirs" },
    };
    expect(outcomeArrowLabel(["default"], condition)).toBe("Mine");
    expect(outcomeArrowLabel([null], condition)).toBe("Theirs");
    expect(outcomeArrowLabel(["default"], null)).toBe("Default");
    expect(outcomeArrowLabel([null], null)).toBe("Otherwise");
    expect(conditionBranches(condition)).toEqual([
      { target: "legal.mine", outcomes: ["default"], label: "Mine" },
      { target: "legal.theirs", outcomes: ["other", null], label: "Other or Theirs" },
    ]);
  });

  it("groups a condition's outcomes by the pipe they lead to, and tells same-worded branches apart", () => {
    const condition: PipeConditionBlueprint = {
      ...CONDITION,
      outcome_map: { a: "x", b: "other.y", c: "fail", d: "legal.x" },
      default_outcome: "z",
      outcome_words: { a: { label: "Check" }, b: { label: "Check" } },
      default_outcome_words: null,
    };
    expect(conditionBranches(condition)).toEqual([
      { target: "legal.x", outcomes: ["a", "d"], label: "Check or d" },
      { target: "other.y", outcomes: ["b"], label: "Check" },
      { target: "fail", outcomes: ["c"], label: "C" },
      { target: "legal.z", outcomes: [null], label: "Otherwise" },
    ]);
    const twins = { ...condition, outcome_map: { a: "x", b: "y" } };
    expect(conditionBranches(twins).map((branch) => branch.label)).toEqual([
      "Check (a)",
      "Check (b)",
      "Otherwise",
    ]);
    // A label composed of two outcomes' reads like a third outcome's own, case aside.
    const composed: PipeConditionBlueprint = {
      ...condition,
      outcome_map: { approve: "x", retry: "x", recheck: "y" },
      outcome_words: {
        approve: { label: "Approve" },
        retry: { label: "Retry" },
        recheck: { label: "Approve or retry" },
      },
    };
    expect(conditionBranches(composed).map((branch) => branch.label)).toEqual([
      "Approve or Retry (approve, retry)",
      "Approve or retry (recheck)",
      "Otherwise",
    ]);
  });

  it("tones an outcome by one rule: its tone, neutral for a label alone, else none", () => {
    expect(outcomeTone({ label: "Approve", tone: "positive" })).toBe("positive");
    expect(outcomeTone({ label: "Approve", tone: null })).toBe("neutral");
    expect(outcomeTone({ label: null, tone: "caution" })).toBe("caution");
    expect(outcomeTone({ label: null, tone: null })).toBeNull();
    expect(outcomeTone(null)).toBeNull();
  });

  it("tones a row only when every outcome in it has a tone and they agree", () => {
    const approve = { label: "Approve", tone: "positive" as const };
    expect(sharedOutcomeTone([approve, { label: "Accept", tone: "positive" }])).toBe("positive");
    // An outcome without words beside a worded one says nothing to agree with.
    expect(sharedOutcomeTone([approve, null])).toBeNull();
    expect(sharedOutcomeTone([approve, { label: null, tone: null }])).toBeNull();
    expect(sharedOutcomeTone([approve, { label: "Check", tone: null }])).toBeNull();
    expect(sharedOutcomeTone([{ label: "Check", tone: null }])).toBe("neutral");
    expect(sharedOutcomeTone([])).toBeNull();
  });

  it("reads the words a live run records for the outcome taken", () => {
    expect(
      selectedOutcomeWords({
        selected_outcome: "legal.detailed_check",
        selected_outcome_label: "Detailed check",
        selected_outcome_tone: "caution",
      }),
    ).toEqual({ label: "Detailed check", description: null, tone: "caution" });
    expect(selectedOutcomeWords({ selected_outcome: "legal.detailed_check" })).toBeNull();
    expect(selectedOutcomeWords(undefined)).toBeNull();
  });
});

describe("plumbing", () => {
  it("tells a file-valued output, through a refinement when it can follow one", () => {
    expect(isFileValuedOutput(output("Document", "native"))).toBe(true);
    expect(isFileValuedOutput(output("Report", "legal", "native.Document"))).toBe(true);
    expect(isFileValuedOutput(output("Text", "native"))).toBe(false);
    expect(isFileValuedOutput(output("Review", "legal", "native.Text"))).toBe(false);
    expect(isFileValuedOutput(output("Review", "legal"))).toBe(false);
    expect(isFileValuedOutput(output("Signed", "legal", "legal.Report"))).toBeNull();
    const report = output("Report", "legal", "native.Image").concept;
    expect(isFileValuedOutput(output("Signed", "legal", "legal.Report"), () => report)).toBe(true);
    expect(isFileValuedOutput(undefined)).toBeNull();
  });

  it("follows a bare refinement in the concept's own domain, and never guesses one it cannot find", () => {
    const scan = output("Scan", "legal", "native.Image").concept;
    const notes = output("Notes", "legal", "native.Text").concept;
    const lookup = (ref: string) => ({ "legal.Scan": scan, "legal.Notes": notes })[ref];
    expect(isFileValuedOutput(output("Signed", "legal", "Scan"), lookup)).toBe(true);
    expect(isFileValuedOutput(output("Signed", "legal", "Notes"), lookup)).toBe(false);
    // Unknown: shown rather than hidden on a guess.
    expect(isFileValuedOutput(output("Signed", "legal", "Scan"))).toBeNull();
    expect(isFileValuedOutput(output("Signed", "legal", "Missing"), lookup)).toBeNull();
    // A bare file native the domain does not declare is the native.
    expect(isFileValuedOutput(output("Photo", "legal", "Image"))).toBe(true);
    // A cycle cannot be followed.
    const loop = output("Loop", "legal", "legal.Loop").concept;
    expect(isFileValuedOutput({ concept: loop }, () => loop)).toBeNull();
  });

  it("looks a registry's concepts up by full reference, from its pipes and its concepts", () => {
    const scan = output("Scan", "legal", "native.Image").concept;
    const signed = output("Signed", "legal", "Scan").concept;
    const registry = { "legal.f": func({ concept: signed }), "legal.g": func({ concept: scan }) };
    const lookup = registryConceptLookup(registry);
    expect(lookup("legal.Scan")).toBe(scan);
    expect(isPlumbingStep("PipeFunc", registry["legal.f"], lookup)).toBe(false);
    expect(isPlumbingStep("PipeFunc", registry["legal.f"])).toBe(false);
    const fromConcepts = registryConceptLookup({}, { "legal.Scan": scan });
    expect(fromConcepts("legal.Scan")).toBe(scan);
  });

  it("hides a PipeCompose, a binding step and a PipeFunc that writes no file", () => {
    expect(isPlumbingStep("PipeCompose")).toBe(true);
    expect(isPlumbingStep("BindingStep")).toBe(true);
    expect(isPlumbingStep("PipeFunc", func(output("Text", "native")))).toBe(true);
    expect(isPlumbingStep("PipeFunc", func(output("Document", "native")))).toBe(false);
  });

  it("shows a PipeFunc it cannot judge, and every step that does work", () => {
    expect(isPlumbingStep("PipeFunc")).toBe(false);
    expect(isPlumbingStep("PipeFunc", func(output("Signed", "legal", "legal.Report")))).toBe(false);
    for (const type of ["PipeLLM", "PipeExtract", "PipeDocGen", "PipeSequence", "PipeCondition"]) {
      expect(isPlumbingStep(type)).toBe(false);
    }
    // A pipe type this package does not know, or an inherited property name, is shown.
    expect(isPlumbingStep("PipeTomorrow")).toBe(false);
    expect(isPlumbingStep("toString")).toBe(false);
  });
});

describe("a method written with activities and outcome labels", () => {
  const { spec } = buildStaticGraphSpecFromToml(reviewNdaBundle);

  it("carries each activity onto the registry and the node, and each outcome table's words", () => {
    validateGraphSpec(spec);
    expect(spec.pipe_registry?.["legal.read_nda"]?.activity).toBe("Reading the NDA");
    expect(spec.nodes.find((n) => n.pipe_code === "read_nda")?.activity).toBe("Reading the NDA");
    const condition = spec.pipe_registry?.["legal.route_by_risk"];
    expect(condition?.type === "PipeCondition" && condition.outcome_map).toEqual({
      high: "detailed_check",
    });
    expect(condition?.type === "PipeCondition" && condition.default_outcome).toBe("standard_check");
    expect(outcomeWordsOf(condition, "high")?.label).toBe("Detailed check");
    expect(outcomeWordsOf(condition, null)?.tone).toBe("positive");
  });

  it("draws the simple style in the method's words", () => {
    const projection = projectStyle(spec, "simple");
    const steps = projection.nodes
      .filter((n) => n.type === NODE_TYPE_SIMPLE_STEP)
      .map((n) => n.data.simple?.title);
    expect(steps).toContain("Reading the NDA");
    expect(steps).toContain("Checking each clause against your playbook");
    const decision = projection.nodes.find((n) => n.type === NODE_TYPE_SIMPLE_DECISION);
    expect(decision?.data.simple?.title).toBe("Deciding how closely to check");
    const labels = projection.edges
      .filter((e) => e.source === decision?.id)
      .map((e) => e.label)
      .sort();
    expect(labels).toEqual(["Detailed check", "Standard check"]);

    const detail = buildSimpleNodeDetail(
      {
        graphspec: spec,
        nodes: projection.nodes,
        edges: projection.edges,
        valueFlows: projection.valueFlows ?? new Map(),
        runs: projection.runs ?? new Map(),
        frameContents: projection.analysis?.containmentTree ?? {},
      },
      { kind: "node", id: decision?.id ?? "" },
    ) as SimpleDecisionDetail;
    expect(
      detail.outcomes.map(({ label, description, tone }) => ({ label, description, tone })),
    ).toEqual([
      {
        label: "Detailed check",
        description: "A lawyer-grade review of every clause",
        tone: "caution",
      },
      { label: "Standard check", description: undefined, tone: "positive" },
    ]);
  });
});

/** A condition `route` over three LLM steps, with the outcome tables given. */
function routeMethod(outcomes: string, defaultOutcome = '"z"'): string {
  const step = (code: string) => `
[pipe.${code}]
type = "PipeLLM"
description = "Step ${code}"
inputs = { t = "Text" }
output = "Text"
prompt = "@t"
`;
  return `
domain = "d"
main_pipe = "route"
[pipe.route]
type = "PipeCondition"
description = "Route"
inputs = { t = "Text" }
output = "Text"
expression = "t.text"
default_outcome = ${defaultOutcome}
[pipe.route.outcomes]
${outcomes}
${step("x")}${step("y")}${step("z")}`;
}

function decisionOf(toml: string) {
  const { spec } = buildStaticGraphSpecFromToml(toml);
  const projection = projectStyle(spec, "simple");
  const decision = projection.nodes.find((n) => n.type === NODE_TYPE_SIMPLE_DECISION);
  const detail = buildSimpleNodeDetail(
    {
      graphspec: spec,
      nodes: projection.nodes,
      edges: projection.edges,
      valueFlows: projection.valueFlows ?? new Map(),
      runs: projection.runs ?? new Map(),
      frameContents: projection.analysis?.containmentTree ?? {},
    },
    { kind: "node", id: decision?.id ?? "" },
  ) as SimpleDecisionDetail;
  const arrows = projection.edges.filter((e) => e.source === decision?.id);
  return { projection, arrows, detail };
}

describe("a decision whose outcomes share words", () => {
  it("links each row to its own branch, and tells same-worded arrows apart", () => {
    const { arrows, detail } = decisionOf(
      routeMethod(`a = { pipe = "x", label = "Check" }\nb = { pipe = "y", label = "Check" }`),
    );
    expect(arrows.map((e) => e.label).sort()).toEqual(["Check (a)", "Check (b)", "Otherwise"]);
    expect(detail.outcomes.map((o) => [o.target, o.label, o.leadsToTitle])).toEqual([
      ["d.x", "Check (a)", "Step x"],
      ["d.y", "Check (b)", "Step y"],
      ["d.z", "Otherwise", "Step z"],
    ]);
    // Each row leads to the arrow taken on its own outcomes.
    for (const row of detail.outcomes) {
      const arrow = arrows.find((e) => e.target === row.leadsTo?.nodeId);
      expect(arrow?.outcomes).toEqual(row.outcomes);
    }
    expect(new Set(detail.outcomes.map((o) => o.leadsTo?.nodeId)).size).toBe(3);
  });

  it("does not take a composed label for a branch's own", () => {
    // "A or b" as one branch's label, beside branches labelled "A" and "B".
    const { detail, arrows } = decisionOf(
      routeMethod(
        `a = { pipe = "x", label = "A" }\nb = { pipe = "y", label = "B" }\nc = { pipe = "z", label = "A or b" }`,
        '"x"',
      ),
    );
    for (const row of detail.outcomes) {
      expect(arrows.find((e) => e.target === row.leadsTo?.nodeId)?.outcomes).toEqual(row.outcomes);
    }
  });

  it("reads an outcome the method names `default` as its own, not as the default outcome", () => {
    const { arrows, detail } = decisionOf(
      routeMethod(`default = { pipe = "x", label = "Mine" }`, '{ pipe = "z", label = "Theirs" }'),
    );
    expect(arrows.map((e) => e.label).sort()).toEqual(["Mine", "Theirs"]);
    expect(detail.outcomes.map((o) => [o.outcomes, o.label])).toEqual([
      [["default"], "Mine"],
      [[null], "Theirs"],
    ]);
  });

  it("tones a row only when every outcome in it is toned alike", () => {
    const { detail } = decisionOf(
      routeMethod(
        `a = { pipe = "z", label = "Approve", tone = "positive" }\nb = { pipe = "y", description = "Look again" }`,
      ),
    );
    const byTarget = Object.fromEntries(detail.outcomes.map((o) => [o.target, o]));
    // `approve` shares a branch with the unworded default: no tone.
    expect(byTarget["d.z"].tone).toBeUndefined();
    // A description alone gives no tone either.
    expect(byTarget["d.y"].tone).toBeUndefined();
    expect(byTarget["d.y"].description).toBe("Look again");
  });
});

describe("a batch that words itself", () => {
  const batch = (branchSteps: string) => `
domain = "d"
main_pipe = "each"
[concept.Item]
description = "An item"
refines = "Text"
[pipe.each]
type = "PipeBatch"
description = "Each"
activity = "Checking every item"
inputs = { items = "Item[]" }
output = "Text[]"
branch_pipe_code = "${branchSteps ? "seq" : "one"}"
input_list_name = "items"
input_item_name = "item"
[pipe.one]
type = "PipeLLM"
description = "Check one item"
inputs = { item = "Item" }
output = "Text"
prompt = "@item"
${branchSteps}`;

  it("titles the one step of its branch by the batch's activity", () => {
    const { spec } = buildStaticGraphSpecFromToml(batch(""));
    const steps = projectStyle(spec, "simple").nodes.filter(
      (n) => n.type === NODE_TYPE_SIMPLE_STEP,
    );
    expect(
      steps.map((n) => {
        const simple = n.data.simple;
        return simple?.kind === "step" ? [simple.title, simple.forEach] : null;
      }),
    ).toEqual([["Checking every item", "For each item"]]);
  });

  it("titles the frame of a several-step branch by the batch's activity", () => {
    const { spec } = buildStaticGraphSpecFromToml(
      batch(`
[pipe.seq]
type = "PipeSequence"
description = "Both"
inputs = { item = "Item" }
output = "Text"
steps = [{ pipe = "one", result = "first" }, { pipe = "two", result = "second" }]
[pipe.two]
type = "PipeLLM"
description = "Check it again"
inputs = { first = "Text" }
output = "Text"
prompt = "@first"
`),
    );
    const frames = projectStyle(spec, "simple").nodes.filter(
      (n) => n.type === NODE_TYPE_SIMPLE_FRAME,
    );
    expect(frames.map((n) => n.data.simple?.title)).toEqual(["Checking every item"]);
  });
});
