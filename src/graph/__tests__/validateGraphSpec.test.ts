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
import type { GraphSpecNode } from "@graph/types";

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
