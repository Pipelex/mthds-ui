import { describe, it, expect } from "vitest";
import type { PipeBlueprintUnion, PipeConditionBlueprint, StuffSpecInfo } from "@graph/types";
import { NODE_TYPE_SIMPLE_DECISION, NODE_TYPE_SIMPLE_STEP } from "@graph/types";
import { validateGraphSpec } from "@graph/validateGraphSpec";
import { buildStaticGraphSpecFromToml } from "@static-graph/buildStaticGraphSpec";
import reviewNdaBundle from "@timeline/react/__stories__/methods/review_nda.mthds?raw";
import {
  WORDING_SOURCE,
  isFileValuedOutput,
  isPlumbingStep,
  outcomeArrowLabel,
  outcomeWordsOf,
  selectedOutcomeWords,
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
    expect(outcomeArrowLabel("high", CONDITION)).toBe("Detailed check");
    expect(outcomeArrowLabel("low | default", CONDITION)).toBe("Low or Standard check");
    expect(outcomeArrowLabel("high", null)).toBe("High");
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
