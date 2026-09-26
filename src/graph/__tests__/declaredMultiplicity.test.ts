import { describe, it, expect } from "vitest";
import { withDeclaredMultiplicity } from "@graph/declaredMultiplicity";
import type {
  ConceptInfo,
  GraphSpec,
  GraphSpecNode,
  PipeBlueprintUnion,
  PipeControllerType,
  StuffMultiplicity,
  SubPipeSpec,
} from "@graph/types";

const RECORD: ConceptInfo = {
  code: "Record",
  domain_code: "demo",
  description: "A record",
  structure_class_name: "Record",
};

function blueprint(
  code: string,
  inputs: Record<string, StuffMultiplicity>,
  output: StuffMultiplicity,
): PipeBlueprintUnion {
  return {
    type: "PipeLLM",
    pipe_category: "PipeOperator",
    code,
    domain_code: "demo",
    description: code,
    inputs: Object.fromEntries(
      Object.entries(inputs).map(([name, multiplicity]) => [
        name,
        { concept: RECORD, multiplicity },
      ]),
    ),
    output: { concept: RECORD, multiplicity: output },
  } as PipeBlueprintUnion;
}

/** `load` produces `records`; `use` consumes it and `one`, an unrelated single stuff. */
function makeRunSpec(loadOutput: StuffMultiplicity, useInput: StuffMultiplicity): GraphSpec {
  return {
    meta: { format: "mthds", mode: "dry" },
    nodes: [
      {
        id: "n0",
        kind: "operator",
        pipe_code: "load",
        pipe_type: "PipeLLM",
        domain_code: "demo",
        status: "succeeded",
        io: { inputs: [], outputs: [{ name: "records", concept: "Record", digest: "r" }] },
      },
      {
        id: "n1",
        kind: "operator",
        pipe_code: "use",
        pipe_type: "PipeLLM",
        domain_code: "demo",
        status: "succeeded",
        io: {
          inputs: [
            { name: "records", concept: "Record", digest: "r" },
            { name: "one", concept: "Record", digest: "o" },
          ],
          outputs: [],
        },
      },
    ],
    edges: [],
    pipe_registry: {
      "demo.load": blueprint("load", {}, loadOutput),
      "demo.use": blueprint("use", { records: useInput, one: null }, null),
    },
  };
}

function operator(
  id: string,
  pipeCode: string,
  inputs: string[],
  outputs: string[],
): GraphSpecNode {
  const io = (name: string) => ({ name, concept: "Record", digest: name });
  return {
    id,
    kind: "operator",
    pipe_code: pipeCode,
    pipe_type: "PipeLLM",
    domain_code: "demo",
    status: "succeeded",
    io: { inputs: inputs.map(io), outputs: outputs.map(io) },
  };
}

function controller(
  id: string,
  pipeCode: string,
  pipeType: PipeControllerType,
  outputs: string[],
): GraphSpecNode {
  return {
    ...operator(id, pipeCode, [], outputs),
    kind: "controller",
    pipe_type: pipeType,
  };
}

function contains(source: string, target: string) {
  return { id: `${source}>${target}`, source, target, kind: "contains" as const };
}

function controllerBlueprint(
  code: string,
  type: PipeControllerType,
  steps: SubPipeSpec[],
): PipeBlueprintUnion {
  const key = type === "PipeParallel" ? "parallel_sub_pipes" : "sequential_sub_pipes";
  return {
    ...blueprint(code, {}, null),
    type,
    pipe_category: "PipeController",
    ...(type === "PipeCondition" ? {} : { [key]: steps }),
  } as PipeBlueprintUnion;
}

/**
 * `flow` runs `idea`, which declares a single output, twice — as `ideas` and as
 * `spare_ideas`, at the step counts given — then `sum`, which reads `ideas`
 * through a `Record[]` slot. Each stuff's digest is its name.
 */
function makeInvokedSpec(
  ideas: SubPipeSpec["output_multiplicity"],
  spare: SubPipeSpec["output_multiplicity"],
): GraphSpec {
  return {
    meta: { format: "mthds", mode: "dry" },
    nodes: [
      controller("n0", "flow", "PipeSequence", ["summary"]),
      operator("n1", "idea", [], ["ideas"]),
      operator("n2", "idea", [], ["spare_ideas"]),
      operator("n3", "sum", ["ideas"], ["summary"]),
    ],
    edges: [contains("n0", "n1"), contains("n0", "n2"), contains("n0", "n3")],
    pipe_registry: {
      "demo.flow": controllerBlueprint("flow", "PipeSequence", [
        { pipe_code: "demo.idea", output_name: "ideas", output_multiplicity: ideas },
        { pipe_code: "demo.idea", output_name: "spare_ideas", output_multiplicity: spare },
        { pipe_code: "demo.sum", output_name: "summary", output_multiplicity: null },
      ]),
      "demo.idea": blueprint("idea", {}, null),
      "demo.sum": blueprint("sum", { ideas: true }, null),
    },
  };
}

/**
 * `outer`, a sequence, runs `inner` (of the type given) at a count of two as
 * `pair`; `inner` runs `idea` as `draft`, with no count of its own.
 */
function makeNestedInvokedSpec(innerType: PipeControllerType): GraphSpec {
  return {
    meta: { format: "mthds", mode: "dry" },
    nodes: [
      controller("n0", "outer", "PipeSequence", ["pair"]),
      controller("n1", "inner", innerType, ["pair"]),
      operator("n2", "idea", [], ["draft"]),
    ],
    edges: [contains("n0", "n1"), contains("n1", "n2")],
    pipe_registry: {
      "demo.outer": controllerBlueprint("outer", "PipeSequence", [
        { pipe_code: "demo.inner", output_name: "pair", output_multiplicity: 2 },
      ]),
      "demo.inner": controllerBlueprint("inner", innerType, [
        { pipe_code: "demo.idea", output_name: "draft", output_multiplicity: null },
      ]),
      "demo.idea": blueprint("idea", {}, null),
    },
  };
}

function multiplicitiesOf(spec: GraphSpec, digest: string) {
  return spec.nodes
    .flatMap((node) => [...node.io.inputs, ...node.io.outputs])
    .filter((item) => item.digest === digest)
    .map((item) => item.multiplicity);
}

describe("withDeclaredMultiplicity", () => {
  it("marks every io item of a stuff its producer declares plural", () => {
    const spec = withDeclaredMultiplicity(makeRunSpec(true, null));
    expect(multiplicitiesOf(spec, "r")).toEqual([true, true]);
    expect(multiplicitiesOf(spec, "o")).toEqual([undefined]);
  });

  it("marks a stuff its consumer's slot declares plural", () => {
    const spec = withDeclaredMultiplicity(makeRunSpec(null, true));
    expect(multiplicitiesOf(spec, "r")).toEqual([true, true]);
  });

  it("prefers a fixed count over a variable-length reading", () => {
    const spec = withDeclaredMultiplicity(makeRunSpec(true, 3));
    expect(multiplicitiesOf(spec, "r")).toEqual([3, 3]);
  });

  it("reads a count of one as single", () => {
    const given = makeRunSpec(1, null);
    expect(withDeclaredMultiplicity(given)).toBe(given);
  });

  it("marks the lists a batch fans out from and gathers into", () => {
    const given = makeRunSpec(null, null);
    given.edges = [
      {
        id: "e0",
        source: "n0",
        target: "n1",
        kind: "batch_item",
        source_stuff_digest: "r",
        target_stuff_digest: "o",
      },
    ];
    const spec = withDeclaredMultiplicity(given);
    expect(multiplicitiesOf(spec, "r")).toEqual([true, true]);
    // The item a batch hands each branch is single.
    expect(multiplicitiesOf(spec, "o")).toEqual([undefined]);
  });

  it("reads the count a step invokes a pipe at, over the pipe's and its consumer's declaration", () => {
    const spec = withDeclaredMultiplicity(makeInvokedSpec(3, true));
    expect(multiplicitiesOf(spec, "ideas")).toEqual([3, 3]);
    expect(multiplicitiesOf(spec, "spare_ideas")).toEqual([true]);
    expect(multiplicitiesOf(spec, "summary")).toEqual([undefined, undefined]);
  });

  it("reads a step invoked at a count of one as single, whatever its consumer declares", () => {
    const given = makeInvokedSpec(1, null);
    expect(withDeclaredMultiplicity(given)).toBe(given);
  });

  it.each([
    ["PipeSequence", 2],
    ["PipeCondition", 2],
    ["PipeParallel", undefined],
  ] as const)("hands a count down through a %s to a step without one", (innerType, expected) => {
    const spec = withDeclaredMultiplicity(makeNestedInvokedSpec(innerType));
    expect(multiplicitiesOf(spec, "draft")).toEqual([expected]);
  });

  it("returns a new spec and leaves the one given untouched", () => {
    const given = makeRunSpec(true, null);
    const spec = withDeclaredMultiplicity(given);
    expect(spec).not.toBe(given);
    expect(multiplicitiesOf(given, "r")).toEqual([undefined, undefined]);
  });

  it("leaves a static spec to its builder", () => {
    const given = makeRunSpec(true, null);
    given.meta = { format: "mthds", mode: "static" };
    expect(withDeclaredMultiplicity(given)).toBe(given);
  });

  it("trusts a producer that already emits the field, reading its absence as single", () => {
    const given = makeRunSpec(true, null);
    given.nodes[1].io.inputs[1].multiplicity = null;
    const spec = withDeclaredMultiplicity(given);
    expect(spec).toBe(given);
    expect(multiplicitiesOf(spec, "r")).toEqual([undefined, undefined]);
  });

  it("tolerates a registry entry that arrived without its inputs or output", () => {
    const given = makeRunSpec(true, null);
    delete (given.pipe_registry!["demo.use"] as Partial<PipeBlueprintUnion>).inputs;
    delete (given.pipe_registry!["demo.load"] as Partial<PipeBlueprintUnion>).output;
    expect(withDeclaredMultiplicity(given)).toBe(given);
  });
});
