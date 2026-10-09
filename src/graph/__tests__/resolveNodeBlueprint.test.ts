import { describe, it, expect } from "vitest";
import { resolveNodeBlueprint } from "../graphAnalysis";
import type { ConceptInfo, GraphSpec, GraphSpecNode, PipeBlueprintUnion } from "../types";

const TEXT: ConceptInfo = {
  code: "Text",
  domain_code: "native",
  description: "Text",
  structure_class_name: "TextContent",
  refines: null,
};

function funcBlueprint(domainCode: string, code: string): PipeBlueprintUnion {
  return {
    type: "PipeFunc",
    pipe_category: "PipeOperator",
    code,
    domain_code: domainCode,
    description: `${code} in ${domainCode}`,
    inputs: {},
    output: { concept: TEXT, multiplicity: null },
  };
}

function operatorNode(pipeCode: string, domainCode?: string): GraphSpecNode {
  const node: GraphSpecNode = {
    id: `${domainCode ?? "?"}.${pipeCode}`,
    kind: "operator",
    pipe_code: pipeCode,
    pipe_type: "PipeFunc",
    status: "succeeded",
    io: { inputs: [], outputs: [] },
  };
  if (domainCode !== undefined) node.domain_code = domainCode;
  return node;
}

function specWith(registry: PipeBlueprintUnion[] | undefined, mainDomain = "main"): GraphSpec {
  const spec: GraphSpec = {
    pipeline_ref: { domain: mainDomain, main_pipe: "run" },
    nodes: [],
    edges: [],
  };
  if (registry) {
    spec.pipe_registry = Object.fromEntries(
      registry.map((blueprint) => [`${blueprint.domain_code}.${blueprint.code}`, blueprint]),
    );
  }
  return spec;
}

describe("resolveNodeBlueprint", () => {
  it("resolves a node by its own qualified ref", () => {
    const spec = specWith([funcBlueprint("main", "summarize")]);
    expect(resolveNodeBlueprint(spec, operatorNode("summarize", "main"))?.description).toBe(
      "summarize in main",
    );
  });

  it("resolves a node in a second domain to its own domain's pipe, not the main domain's", () => {
    // The panel's former lookup tried the pipeline's domain first and showed the
    // main domain's `summarize` for a node that runs the other domain's.
    const spec = specWith([
      funcBlueprint("main", "summarize"),
      funcBlueprint("other", "summarize"),
    ]);
    expect(resolveNodeBlueprint(spec, operatorNode("summarize", "other"))?.description).toBe(
      "summarize in other",
    );
  });

  it("resolves nothing for a node whose own domain's pipe is absent, rather than another's", () => {
    const spec = specWith([funcBlueprint("main", "summarize")]);
    expect(resolveNodeBlueprint(spec, operatorNode("summarize", "other"))).toBeUndefined();
  });

  it("resolves a multi-segment domain by its full ref", () => {
    const spec = specWith([funcBlueprint("legal.contracts", "score")]);
    expect(resolveNodeBlueprint(spec, operatorNode("score", "legal.contracts"))?.code).toBe(
      "score",
    );
  });

  it("resolves a node without a domain in the pipeline's domain first", () => {
    const spec = specWith([
      funcBlueprint("other", "summarize"),
      funcBlueprint("main", "summarize"),
    ]);
    expect(resolveNodeBlueprint(spec, operatorNode("summarize"))?.description).toBe(
      "summarize in main",
    );
  });

  it("resolves a node without a domain by the one registry key ending in its code", () => {
    const spec = specWith([funcBlueprint("other", "summarize"), funcBlueprint("main", "run")]);
    expect(resolveNodeBlueprint(spec, operatorNode("summarize"))?.description).toBe(
      "summarize in other",
    );
  });

  it("resolves nothing when two foreign domains share the code of a node without a domain", () => {
    const spec = specWith([
      funcBlueprint("left", "summarize"),
      funcBlueprint("right", "summarize"),
    ]);
    expect(resolveNodeBlueprint(spec, operatorNode("summarize"))).toBeUndefined();
  });

  it("does not take a key whose last segment merely ends with the code", () => {
    const spec = specWith([funcBlueprint("other", "presummarize")]);
    expect(resolveNodeBlueprint(spec, operatorNode("summarize"))).toBeUndefined();
  });

  it("resolves nothing without a registry", () => {
    expect(resolveNodeBlueprint(specWith(undefined), operatorNode("summarize", "main"))).toBe(
      undefined,
    );
  });

  it("resolves nothing for a binding node, even when its path is spelled like a pipe's code", () => {
    const spec = specWith([funcBlueprint("main", "summarize")]);
    const binding: GraphSpecNode = {
      ...operatorNode("summarize", "main"),
      kind: "binding",
      pipe_type: "BindingStep",
    };
    expect(resolveNodeBlueprint(spec, binding)).toBeUndefined();
  });
});
