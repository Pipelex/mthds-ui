/**
 * Tests for the single boundary validator. Each block mirrors a phase of the
 * "Tighten mthds-ui GraphSpec interpretation" plan.
 */
import { describe, it, expect } from "vitest";
import {
  validateGraphSpec,
  asPipeCallNode,
  GraphSpecValidationError,
} from "@graph/validateGraphSpec";
import type { GraphSpec, GraphSpecNode } from "@graph/types";

/** A minimal, fully valid raw spec — every guaranteed field present. */
function makeValidSpec(): Record<string, unknown> {
  return {
    graph_id: "g1",
    created_at: "2026-01-01T00:00:00Z",
    pipeline_ref: { domain: "demo", main_pipe: "run" },
    meta: { format: "mthds" },
    pipe_registry: {},
    concept_registry: {},
    nodes: [
      {
        id: "g1:node_0",
        kind: "operator",
        pipe_code: "summarize",
        pipe_type: "PipeLLM",
        description: "Summarize the text",
        domain_code: "demo",
        status: "succeeded",
        io: {
          inputs: [{ name: "text", concept: "Text", digest: "abc" }],
          outputs: [{ name: "summary", concept: "Summary", digest: "def" }],
        },
      },
    ],
    edges: [{ id: "e0", source: "g1:node_0", target: "stuff_def", kind: "data" }],
  };
}

/** Assert that validation throws a GraphSpecValidationError at the given path. */
function expectInvalid(spec: unknown, path: string): void {
  let caught: unknown;
  try {
    validateGraphSpec(spec);
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(GraphSpecValidationError);
  const err = caught as GraphSpecValidationError;
  expect(err.name).toBe("GraphSpecValidationError");
  expect(err.path).toBe(path);
  // The offending path is surfaced in the human-readable message.
  expect(err.message).toContain(path === "" ? "<root>" : path);
}

// ─── Phase 0 — scaffold ──────────────────────────────────────────────────

describe("validateGraphSpec — happy path", () => {
  it("accepts a minimal valid spec and returns it typed", () => {
    const spec = makeValidSpec();
    expect(() => validateGraphSpec(spec)).not.toThrow();
    expect(validateGraphSpec(spec).nodes).toHaveLength(1);
  });

  it("error type has a stable, greppable name", () => {
    const err = new GraphSpecValidationError("nodes[3].io.inputs[0].name", "boom");
    expect(err.name).toBe("GraphSpecValidationError");
    expect(err instanceof Error).toBe(true);
    expect(err.path).toBe("nodes[3].io.inputs[0].name");
    expect(err.message).toContain("nodes[3].io.inputs[0].name");
  });
});

// ─── GraphSpec type — PipeSignature registry blueprint ───────────────────
// A PipeSignature is outside the executable taxonomy, so pipelex serializes its
// `pipe_registry` entry with `pipe_category: null` (present, not omitted) — the
// runtime PipeSignature has `pipe_category: None = None` with no `exclude`, and
// the registry dump uses `model_dump(mode="json")` (no `exclude_none`). The
// exported `GraphSpec` type must accept that shape. The `: GraphSpec` annotation
// below is the real guard: tsc checks the entry against `PipeBlueprintUnion`, so
// this fails to compile if `PipeSignatureBlueprint` reverts to requiring a
// non-null `pipe_category`.

describe("GraphSpec — PipeSignature registry blueprint", () => {
  it("represents a signature blueprint serialized with pipe_category: null", () => {
    const spec: GraphSpec = {
      meta: { format: "mthds" },
      nodes: [],
      edges: [],
      pipe_registry: {
        "demo.build_scorecard": {
          type: "PipeSignature",
          pipe_category: null,
          code: "build_scorecard",
          domain_code: "demo",
          description: "Build a scorecard (signature — not yet implemented).",
          inputs: {},
          output: {
            concept: {
              code: "Scorecard",
              domain_code: "demo",
              description: "A scorecard",
              structure_class_name: "Scorecard",
              refines: null,
            },
            multiplicity: null,
          },
          signature_for: null,
        },
      },
    };
    expect(() => validateGraphSpec(spec)).not.toThrow();
  });
});

// ─── GraphSpec type — PipeParallel registry blueprint ────────────────────
// pipelex 0.41 deleted `combined_output` from PipeParallel (a parallel always
// combines now), so a 0.41 `pipe_registry` entry carries exactly the keys
// below and no `combined_output`. The `: GraphSpec` annotation is the real
// guard — tsc checks the entry against `PipeBlueprintUnion`, so this fails to
// compile if `PipeParallelBlueprint` reverts to requiring `combined_output`.
// Deliberately un-cast: a `satisfies`/`as` would defeat the whole point.

describe("GraphSpec — PipeParallel registry blueprint", () => {
  it("represents a 0.41 parallel blueprint serialized without combined_output", () => {
    const spec: GraphSpec = {
      meta: { format: "mthds" },
      nodes: [],
      edges: [],
      pipe_registry: {
        "demo.fan_out": {
          type: "PipeParallel",
          pipe_category: "PipeController",
          code: "fan_out",
          domain_code: "demo",
          description: "Run two analyses in parallel.",
          inputs: {},
          output: {
            concept: {
              code: "Composite",
              domain_code: "native",
              description: "A named composition of contents",
              structure_class_name: "CompositeContent",
              refines: null,
            },
            multiplicity: null,
          },
          parallel_sub_pipes: [
            {
              pipe_code: "analyze_a",
              output_name: "a",
              output_multiplicity: null,
              batch_params: null,
            },
          ],
          add_each_output: true,
        },
      },
    };
    expect(() => validateGraphSpec(spec)).not.toThrow();
  });
});

// ─── GraphSpec type — PipeStructure registry blueprint ───────────────────
// PipeStructure is a real operator, so pipelex serializes its `pipe_registry`
// entry from the runtime pipe: the base fields plus `llm_choice`,
// `text_input_name`, and `output_multiplicity`. The `: GraphSpec` annotation is
// the real guard — tsc checks the entry against `PipeBlueprintUnion`, so this
// fails to compile if `PipeStructureBlueprint` drifts from the runtime shape.

describe("GraphSpec — PipeStructure registry blueprint", () => {
  it("represents a structure blueprint serialized from the runtime pipe", () => {
    const spec: GraphSpec = {
      meta: { format: "mthds" },
      nodes: [],
      edges: [],
      pipe_registry: {
        "demo.structure_candidate": {
          type: "PipeStructure",
          pipe_category: "PipeOperator",
          code: "structure_candidate",
          domain_code: "demo",
          description: "Turn the CV text into a structured candidate profile.",
          inputs: {
            cv_text: {
              concept: {
                code: "Text",
                domain_code: "native",
                description: "A text",
                structure_class_name: "TextContent",
                refines: null,
              },
              multiplicity: null,
            },
          },
          output: {
            concept: {
              code: "CandidateProfile",
              domain_code: "demo",
              description: "A structured candidate profile",
              structure_class_name: "demo__CandidateProfile",
              refines: null,
            },
            multiplicity: null,
          },
          llm_choice: null,
          text_input_name: "cv_text",
          output_multiplicity: null,
        },
      },
    };
    expect(() => validateGraphSpec(spec)).not.toThrow();
  });
});

// ─── Phase 1 — top-level shape ───────────────────────────────────────────

describe("validateGraphSpec — top-level shape", () => {
  it("throws when raw is not an object", () => {
    expectInvalid(null, "");
    expectInvalid(42, "");
    expectInvalid([], "");
    expectInvalid("nope", "");
  });

  it("throws when nodes is missing or not an array", () => {
    const spec = makeValidSpec();
    delete spec.nodes;
    expectInvalid(spec, "nodes");
    expectInvalid({ ...makeValidSpec(), nodes: {} }, "nodes");
  });

  it("throws when edges is missing or not an array", () => {
    const spec = makeValidSpec();
    delete spec.edges;
    expectInvalid(spec, "edges");
    expectInvalid({ ...makeValidSpec(), edges: "x" }, "edges");
  });

  it("throws when meta is missing", () => {
    const spec = makeValidSpec();
    delete spec.meta;
    expectInvalid(spec, "meta");
  });

  it("throws when meta.format is not 'mthds'", () => {
    expectInvalid({ ...makeValidSpec(), meta: {} }, "meta.format");
    expectInvalid({ ...makeValidSpec(), meta: { format: "other" } }, "meta.format");
  });

  it("accepts explicit static, dry, and live modes", () => {
    for (const mode of ["static", "dry", "live"] as const) {
      expect(() =>
        validateGraphSpec({ ...makeValidSpec(), meta: { format: "mthds", mode } }),
      ).not.toThrow();
    }
  });

  it("keeps legacy specs without meta.mode valid", () => {
    expect(() => validateGraphSpec(makeValidSpec())).not.toThrow();
  });

  it("throws when meta.mode is not a known mode", () => {
    expectInvalid({ ...makeValidSpec(), meta: { format: "mthds", mode: "preview" } }, "meta.mode");
  });

  it("accepts missing pipe_registry / concept_registry", () => {
    const spec = makeValidSpec();
    delete spec.pipe_registry;
    delete spec.concept_registry;
    expect(() => validateGraphSpec(spec)).not.toThrow();
  });

  it("throws when pipe_registry is present but not an object", () => {
    expectInvalid({ ...makeValidSpec(), pipe_registry: [] }, "pipe_registry");
    expectInvalid({ ...makeValidSpec(), concept_registry: null }, "concept_registry");
  });
});

// ─── Phase 2 — node-level required fields ────────────────────────────────

describe("validateGraphSpec — node fields", () => {
  it("throws when node id is not a non-empty string", () => {
    const spec = makeValidSpec();
    (spec.nodes as Record<string, unknown>[])[0].id = "";
    expectInvalid(spec, "nodes[0].id");
  });

  it("throws when node kind is unknown", () => {
    const spec = makeValidSpec();
    (spec.nodes as Record<string, unknown>[])[0].kind = "wat";
    expectInvalid(spec, "nodes[0].kind");
  });

  it("accepts a controller-kind node and runs the pipe-call field checks on it", () => {
    const spec = makeValidSpec();
    const node = (spec.nodes as Record<string, unknown>[])[0];
    node.kind = "controller";
    node.pipe_type = "PipeSequence";
    expect(() => validateGraphSpec(spec)).not.toThrow();
    // The pipe-call branch still runs for controllers — a missing pipe_code throws.
    delete node.pipe_code;
    expectInvalid(spec, "nodes[0].pipe_code");
  });

  it("rejects non-pipe-call NodeKind values (never serialized by a real run)", () => {
    for (const kind of ["pipe_call", "input", "output", "artifact", "error"]) {
      const spec = makeValidSpec();
      (spec.nodes as Record<string, unknown>[])[0].kind = kind;
      expectInvalid(spec, "nodes[0].kind");
    }
  });

  it("throws when a nodes[] element is not an object", () => {
    expectInvalid({ ...makeValidSpec(), nodes: ["not an object"] }, "nodes[0]");
  });

  it("throws when an io item is not an object", () => {
    const spec = makeValidSpec();
    const io = (spec.nodes as Record<string, unknown>[])[0].io as Record<string, unknown>;
    io.inputs = ["just a string"];
    expectInvalid(spec, "nodes[0].io.inputs[0]");
  });

  it("throws when node status is missing or unknown", () => {
    const missing = makeValidSpec();
    delete (missing.nodes as Record<string, unknown>[])[0].status;
    expectInvalid(missing, "nodes[0].status");
    const bad = makeValidSpec();
    (bad.nodes as Record<string, unknown>[])[0].status = "done";
    expectInvalid(bad, "nodes[0].status");
  });

  it("accepts the 'canceled' status (emitted for nodes still running at teardown)", () => {
    const spec = makeValidSpec();
    (spec.nodes as Record<string, unknown>[])[0].status = "canceled";
    expect(() => validateGraphSpec(spec)).not.toThrow();
  });

  it("throws when a pipe-call node has no pipe_code", () => {
    const spec = makeValidSpec();
    delete (spec.nodes as Record<string, unknown>[])[0].pipe_code;
    expectInvalid(spec, "nodes[0].pipe_code");
  });

  it("throws when a pipe-call node has no pipe_type", () => {
    const spec = makeValidSpec();
    (spec.nodes as Record<string, unknown>[])[0].pipe_type = "";
    expectInvalid(spec, "nodes[0].pipe_type");
  });

  it("throws when io is present but not an object", () => {
    const spec = makeValidSpec();
    (spec.nodes as Record<string, unknown>[])[0].io = [];
    expectInvalid(spec, "nodes[0].io");
  });

  it("throws when io.inputs is present but not an array", () => {
    const spec = makeValidSpec();
    (spec.nodes as Record<string, unknown>[])[0].io = { inputs: {}, outputs: [] };
    expectInvalid(spec, "nodes[0].io.inputs");
  });

  it("default-constructs io when the key is absent", () => {
    const spec = makeValidSpec();
    delete (spec.nodes as Record<string, unknown>[])[0].io;
    const validated = validateGraphSpec(spec);
    expect(validated.nodes[0].io).toEqual({ inputs: [], outputs: [] });
  });
});

// ─── Phase 11 — description / domain_code required for pipe-call nodes ────

describe("validateGraphSpec — description / domain_code", () => {
  it("throws when a pipe-call node has no description", () => {
    const spec = makeValidSpec();
    delete (spec.nodes as Record<string, unknown>[])[0].description;
    expectInvalid(spec, "nodes[0].description");
  });

  it("throws when a pipe-call node has no domain_code", () => {
    const spec = makeValidSpec();
    (spec.nodes as Record<string, unknown>[])[0].domain_code = "";
    expectInvalid(spec, "nodes[0].domain_code");
  });
});

// ─── Phase 3 — IO items ──────────────────────────────────────────────────

describe("validateGraphSpec — IO items", () => {
  it("throws when an input name is not a non-empty string", () => {
    const spec = makeValidSpec();
    const io = (spec.nodes as Record<string, unknown>[])[0].io as Record<string, unknown>;
    (io.inputs as Record<string, unknown>[])[0].name = "";
    expectInvalid(spec, "nodes[0].io.inputs[0].name");
  });

  it("throws when an output name is missing", () => {
    const spec = makeValidSpec();
    const io = (spec.nodes as Record<string, unknown>[])[0].io as Record<string, unknown>;
    delete (io.outputs as Record<string, unknown>[])[0].name;
    expectInvalid(spec, "nodes[0].io.outputs[0].name");
  });

  it("keeps concept and digest optional", () => {
    const spec = makeValidSpec();
    const io = (spec.nodes as Record<string, unknown>[])[0].io as Record<string, unknown>;
    io.inputs = [{ name: "text" }];
    expect(() => validateGraphSpec(spec)).not.toThrow();
  });
});

// ─── Phase 4 — edges ─────────────────────────────────────────────────────

describe("validateGraphSpec — edges", () => {
  it("throws when an edge id is not a non-empty string", () => {
    const spec = makeValidSpec();
    (spec.edges as Record<string, unknown>[])[0].id = "";
    expectInvalid(spec, "edges[0].id");
  });

  it("throws when an edge source or target is missing", () => {
    const noSource = makeValidSpec();
    delete (noSource.edges as Record<string, unknown>[])[0].source;
    expectInvalid(noSource, "edges[0].source");
    const noTarget = makeValidSpec();
    delete (noTarget.edges as Record<string, unknown>[])[0].target;
    expectInvalid(noTarget, "edges[0].target");
  });

  it("throws when an edge kind is unknown", () => {
    const spec = makeValidSpec();
    (spec.edges as Record<string, unknown>[])[0].kind = "teleport";
    expectInvalid(spec, "edges[0].kind");
  });
});

// ─── Phase 8 — unknown PipeType ──────────────────────────────────────────

describe("validateGraphSpec — unknown PipeType", () => {
  it("throws and names the unrecognized pipe class", () => {
    const spec = makeValidSpec();
    (spec.nodes as Record<string, unknown>[])[0].pipe_type = "PipeQuantum";
    let caught: unknown;
    try {
      validateGraphSpec(spec);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(GraphSpecValidationError);
    expect((caught as GraphSpecValidationError).path).toBe("nodes[0].pipe_type");
    expect((caught as Error).message).toContain("PipeQuantum");
  });

  it("accepts every known pipe type", () => {
    for (const pt of [
      "PipeLLM",
      "PipeExtract",
      "PipeCompose",
      "PipeImgGen",
      "PipeSearch",
      "PipeFunc",
      "PipeStructure",
      "PipeSignature",
      "PipeSequence",
      "PipeParallel",
      "PipeCondition",
      "PipeBatch",
    ]) {
      const spec = makeValidSpec();
      (spec.nodes as Record<string, unknown>[])[0].pipe_type = pt;
      expect(() => validateGraphSpec(spec)).not.toThrow();
    }
  });

  it("accepts a PipeSignature node (unimplemented stub emitted under --allow-signatures)", () => {
    const spec = makeValidSpec();
    (spec.nodes as Record<string, unknown>[])[0].pipe_type = "PipeSignature";
    expect(() => validateGraphSpec(spec)).not.toThrow();
  });

  it("accepts a PipeStructure node (real operator — structuring Text into a concept)", () => {
    const spec = makeValidSpec();
    (spec.nodes as Record<string, unknown>[])[0].pipe_type = "PipeStructure";
    expect(() => validateGraphSpec(spec)).not.toThrow();
  });
});

// ─── asPipeCallNode — checked narrowing at internal trust boundaries ──────

describe("asPipeCallNode", () => {
  const operatorNode: GraphSpecNode = {
    id: "op1",
    kind: "operator",
    pipe_code: "summarize",
    pipe_type: "PipeLLM",
    status: "succeeded",
    io: { inputs: [], outputs: [] },
  };

  it("returns a controller/operator node narrowed to PipeCallNode", () => {
    expect(asPipeCallNode(operatorNode)).toBe(operatorNode);
    expect(asPipeCallNode({ ...operatorNode, kind: "controller" }).pipe_code).toBe("summarize");
  });

  it("throws GraphSpecValidationError on a non-pipe-call kind", () => {
    const node = { ...operatorNode, kind: "artifact" } as unknown as GraphSpecNode;
    let caught: unknown;
    try {
      asPipeCallNode(node, "nodes[op1]");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(GraphSpecValidationError);
    expect((caught as GraphSpecValidationError).path).toBe("nodes[op1].kind");
  });

  it("throws GraphSpecValidationError when pipe_code is missing", () => {
    const node = { ...operatorNode, pipe_code: undefined } as unknown as GraphSpecNode;
    let caught: unknown;
    try {
      asPipeCallNode(node, "nodes[op1]");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(GraphSpecValidationError);
    expect((caught as GraphSpecValidationError).path).toBe("nodes[op1].pipe_code");
  });
});

describe("usage validation — the boundary gate for money", () => {
  const wellFormedUsage = {
    inference_calls: 2,
    rated_inference_calls: 1,
    nb_tokens_by_category: { input: 100, output: 50 },
    total_tokens: 150,
    cost: 0.0043,
    subtree_inference_calls: 2,
    subtree_rated_inference_calls: 1,
    subtree_nb_tokens_by_category: { input: 100, output: 50 },
    subtree_total_tokens: 150,
    subtree_cost: 0.0043,
  };

  it("accepts a spec with no usage at all", () => {
    const spec = validateGraphSpec(makeValidSpec());
    expect(spec.usage).toBeUndefined();
    expect(spec.nodes[0].usage).toBeUndefined();
  });

  it("accepts a well-formed node and graph usage", () => {
    const raw = makeValidSpec();
    (raw.nodes as Record<string, unknown>[])[0].usage = wellFormedUsage;
    raw.usage = { total: wellFormedUsage, unattributed: { ...wellFormedUsage, cost: null } };

    const spec = validateGraphSpec(raw);
    expect(spec.nodes[0].usage?.cost).toBe(0.0043);
    expect(spec.usage?.unattributed.cost).toBeNull();
  });

  it("accepts a null cost — unrated is a legitimate state", () => {
    const raw = makeValidSpec();
    (raw.nodes as Record<string, unknown>[])[0].usage = {
      ...wellFormedUsage,
      rated_inference_calls: 0,
      cost: null,
      subtree_cost: null,
    };
    expect(validateGraphSpec(raw).nodes[0].usage?.cost).toBeNull();
  });

  it("rejects a cost of the wrong type", () => {
    const raw = makeValidSpec();
    (raw.nodes as Record<string, unknown>[])[0].usage = { ...wellFormedUsage, cost: "0.0043" };
    let caught: unknown;
    try {
      validateGraphSpec(raw);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(GraphSpecValidationError);
    expect((caught as GraphSpecValidationError).path).toBe("nodes[0].usage.cost");
  });

  it("rejects an absent count rather than treating it as zero", () => {
    const raw = makeValidSpec();
    const usage: Record<string, unknown> = { ...wellFormedUsage };
    delete usage.total_tokens;
    (raw.nodes as Record<string, unknown>[])[0].usage = usage;
    let caught: unknown;
    try {
      validateGraphSpec(raw);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(GraphSpecValidationError);
    expect((caught as GraphSpecValidationError).path).toBe("nodes[0].usage.total_tokens");
  });

  it("rejects a graph usage missing one of its two halves", () => {
    const raw = makeValidSpec();
    raw.usage = { total: wellFormedUsage };
    let caught: unknown;
    try {
      validateGraphSpec(raw);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(GraphSpecValidationError);
    expect((caught as GraphSpecValidationError).path).toBe("usage.unattributed");
  });
});

describe("by_model — the record of what actually ran", () => {
  const usageWithoutModels = {
    inference_calls: 1,
    rated_inference_calls: 1,
    nb_tokens_by_category: {},
    total_tokens: 0,
    cost: 0.0043,
    subtree_inference_calls: 1,
    subtree_rated_inference_calls: 1,
    subtree_nb_tokens_by_category: {},
    subtree_total_tokens: 0,
    subtree_cost: 0.0043,
  };

  it("normalizes an absent by_model to [] so pre-attribution specs still load", () => {
    const raw = makeValidSpec();
    (raw.nodes as Record<string, unknown>[])[0].usage = { ...usageWithoutModels };

    const spec = validateGraphSpec(raw);

    expect(spec.nodes[0].usage?.by_model).toEqual([]);
    expect(spec.nodes[0].usage?.subtree_by_model).toEqual([]);
  });

  it("accepts a well-formed model breakdown", () => {
    const raw = makeValidSpec();
    const byModel = [
      {
        inference_model_name: "claude-4.6-sonnet",
        inference_model_id: "claude-sonnet-4-6",
        model_type: "llm",
        inference_calls: 2,
        rated_inference_calls: 2,
        cost: 0.0043,
      },
    ];
    (raw.nodes as Record<string, unknown>[])[0].usage = {
      ...usageWithoutModels,
      by_model: byModel,
      subtree_by_model: byModel,
    };

    const spec = validateGraphSpec(raw);

    expect(spec.nodes[0].usage?.by_model[0].inference_model_name).toBe("claude-4.6-sonnet");
    expect(spec.nodes[0].usage?.by_model[0].inference_calls).toBe(2);
  });

  it("rejects an entry with no model name rather than rendering a blank attribution", () => {
    const raw = makeValidSpec();
    (raw.nodes as Record<string, unknown>[])[0].usage = {
      ...usageWithoutModels,
      by_model: [
        {
          inference_model_name: "",
          inference_model_id: "x",
          inference_calls: 1,
          rated_inference_calls: 1,
          cost: 0,
        },
      ],
    };
    let caught: unknown;
    try {
      validateGraphSpec(raw);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(GraphSpecValidationError);
    expect((caught as GraphSpecValidationError).path).toBe(
      "nodes[0].usage.by_model[0].inference_model_name",
    );
  });

  it("rejects a by_model that is not an array", () => {
    const raw = makeValidSpec();
    (raw.nodes as Record<string, unknown>[])[0].usage = {
      ...usageWithoutModels,
      by_model: { "claude-4.6-sonnet": 2 },
    };
    let caught: unknown;
    try {
      validateGraphSpec(raw);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(GraphSpecValidationError);
    expect((caught as GraphSpecValidationError).path).toBe("nodes[0].usage.by_model");
  });
});

describe("fields added after specs were already produced", () => {
  const legacyUsage = {
    inference_calls: 1,
    rated_inference_calls: 1,
    nb_tokens_by_category: {},
    total_tokens: 0,
    cost: 0.0043,
    subtree_inference_calls: 1,
    subtree_rated_inference_calls: 1,
    subtree_nb_tokens_by_category: {},
    subtree_total_tokens: 0,
    subtree_cost: 0.0043,
    by_model: [
      {
        inference_model_name: "claude-4.6-sonnet",
        inference_model_id: "claude-sonnet-4-6",
        inference_calls: 1,
        rated_inference_calls: 1,
        cost: 0.0043,
      },
    ],
  };

  it("normalizes absent cost components to null instead of rejecting the spec", () => {
    const raw = makeValidSpec();
    (raw.nodes as Record<string, unknown>[])[0].usage = { ...legacyUsage };

    const usage = validateGraphSpec(raw).nodes[0].usage;

    expect(usage?.cost).toBe(0.0043);
    expect(usage?.cost_input).toBeNull();
    expect(usage?.cost_output).toBeNull();
    expect(usage?.subtree_cost_input).toBeNull();
  });

  it('normalizes an absent model_type to a value that is not "llm"', () => {
    const raw = makeValidSpec();
    (raw.nodes as Record<string, unknown>[])[0].usage = { ...legacyUsage };

    const usage = validateGraphSpec(raw).nodes[0].usage;

    // Not "llm", so token counts stay hidden rather than shown on unverified grounds.
    expect(usage?.by_model[0].model_type).not.toBe("llm");
  });

  it("still rejects a wrong-typed cost component", () => {
    const raw = makeValidSpec();
    (raw.nodes as Record<string, unknown>[])[0].usage = { ...legacyUsage, cost_input: "0.001" };
    let caught: unknown;
    try {
      validateGraphSpec(raw);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(GraphSpecValidationError);
    expect((caught as GraphSpecValidationError).path).toBe("nodes[0].usage.cost_input");
  });
});

describe("usage: null — what pydantic actually emits", () => {
  // `usage=None` in pipelex serializes as an explicit `"usage": null`, NOT as an
  // omitted key. Every fixture in this repo has usage populated, so a validator
  // that only tolerated `undefined` passed the whole suite and still rejected
  // every real run that collected no usage.
  it("accepts a graph-level usage of null and normalizes it away", () => {
    const raw = makeValidSpec();
    raw.usage = null;

    const spec = validateGraphSpec(raw);

    expect(spec.usage).toBeUndefined();
  });

  it("accepts a node-level usage of null and normalizes it away", () => {
    const raw = makeValidSpec();
    (raw.nodes as Record<string, unknown>[])[0].usage = null;

    const spec = validateGraphSpec(raw);

    expect(spec.nodes[0].usage).toBeUndefined();
  });

  it("accepts a whole spec where both are null, as a no-usage run emits it", () => {
    const raw = makeValidSpec();
    raw.usage = null;
    (raw.nodes as Record<string, unknown>[])[0].usage = null;

    expect(() => validateGraphSpec(raw)).not.toThrow();
  });
});
