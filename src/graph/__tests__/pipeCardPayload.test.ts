import { describe, it, expect } from "vitest";
import type { GraphSpec, GraphSpecNode, DataflowAnalysis } from "@graph/types";
import { buildPipeCardPayload } from "@graph/pipeCardPayload";
import { buildDataflowAnalysis } from "@graph/graphAnalysis";

function emptyAnalysis(controllerIds: string[] = []): DataflowAnalysis {
  return {
    stuffRegistry: {},
    stuffProducers: {},
    stuffConsumers: {},
    controllerNodeIds: new Set(controllerIds),
    childNodeIds: new Set(),
    containmentTree: {},
  };
}

describe("buildPipeCardPayload", () => {
  it("builds operator payloads from a GraphSpecNode with full io", () => {
    const node: GraphSpecNode = {
      id: "op1",
      pipe_code: "extract_data",
      pipe_type: "PipeExtract",
      status: "succeeded",
      io: {
        inputs: [{ name: "src", concept: "Document" }],
        outputs: [{ name: "result", concept: "Text" }],
      },
    };
    const spec: GraphSpec = { nodes: [node], edges: [] };
    const analysis = emptyAnalysis();

    const payload = buildPipeCardPayload(node, spec, analysis);

    expect(payload).toEqual({
      pipeCode: "extract_data",
      pipeType: "PipeExtract",
      description: expect.any(String),
      status: "succeeded",
      inputs: [{ name: "src", concept: "Document" }],
      outputs: [{ name: "result", concept: "Text" }],
    });
  });

  it("builds controller payloads with PipeSequence pipeType", () => {
    const node: GraphSpecNode = {
      id: "ctrl_seq",
      pipe_code: "my_seq",
      pipe_type: "PipeSequence",
    };
    const spec: GraphSpec = { nodes: [node], edges: [] };
    const analysis = emptyAnalysis(["ctrl_seq"]);

    const payload = buildPipeCardPayload(node, spec, analysis);
    expect(payload.pipeType).toBe("PipeSequence");
  });

  it("builds controller payloads with PipeParallel pipeType", () => {
    const node: GraphSpecNode = {
      id: "ctrl_par",
      pipe_code: "my_par",
      pipe_type: "PipeParallel",
    };
    const spec: GraphSpec = { nodes: [node], edges: [] };
    const analysis = emptyAnalysis(["ctrl_par"]);

    const payload = buildPipeCardPayload(node, spec, analysis);
    expect(payload.pipeType).toBe("PipeParallel");
  });

  it("builds controller payloads with PipeCondition pipeType", () => {
    const node: GraphSpecNode = {
      id: "ctrl_cond",
      pipe_code: "my_cond",
      pipe_type: "PipeCondition",
    };
    const spec: GraphSpec = { nodes: [node], edges: [] };
    const analysis = emptyAnalysis(["ctrl_cond"]);

    const payload = buildPipeCardPayload(node, spec, analysis);
    expect(payload.pipeType).toBe("PipeCondition");
  });

  it("builds controller payloads with PipeBatch pipeType", () => {
    const node: GraphSpecNode = {
      id: "ctrl_batch",
      pipe_code: "my_batch",
      pipe_type: "PipeBatch",
    };
    const spec: GraphSpec = { nodes: [node], edges: [] };
    const analysis = emptyAnalysis(["ctrl_batch"]);

    const payload = buildPipeCardPayload(node, spec, analysis);
    expect(payload.pipeType).toBe("PipeBatch");
  });

  it("description falls back to pipe_registry description when node has none", () => {
    const node: GraphSpecNode = {
      id: "op1",
      pipe_code: "my_pipe",
      pipe_type: "PipeLLM",
    };
    const spec: GraphSpec = {
      nodes: [node],
      edges: [],
      pipe_registry: {
        my_pipe: {
          type: "PipeLLM",
          pipe_category: "PipeOperator",
          code: "my_pipe",
          domain_code: "test",
          description: "From registry",
          inputs: {},
          output: {
            concept: {
              code: "x",
              domain_code: "y",
              description: "",
              structure_class_name: "z",
              refines: null,
            },
            multiplicity: null,
          },
          llm_prompt_spec: {
            templating_style: null,
            system_prompt_blueprint: null,
            prompt_blueprint: null,
            user_image_references: null,
            user_document_references: null,
            system_image_references: null,
            system_document_references: null,
          },
          llm_choices: null,
          structuring_method: null,
          output_multiplicity: null,
        },
      },
    };
    const analysis = emptyAnalysis();

    const payload = buildPipeCardPayload(node, spec, analysis);
    expect(payload.description).toBe("From registry");
  });

  it("description is undefined for controllers when both node and registry have none", () => {
    const node: GraphSpecNode = {
      id: "ctrl_seq",
      pipe_code: "my_seq",
      pipe_type: "PipeSequence",
    };
    const spec: GraphSpec = { nodes: [node], edges: [] };
    const analysis = emptyAnalysis(["ctrl_seq"]);

    const payload = buildPipeCardPayload(node, spec, analysis);
    expect(payload.description).toBeUndefined();
  });

  it("description uses operator default fallback when both node and registry have none", () => {
    const node: GraphSpecNode = {
      id: "op1",
      pipe_code: "extract_data",
      pipe_type: "PipeExtract",
    };
    const spec: GraphSpec = { nodes: [node], edges: [] };
    const analysis = emptyAnalysis();

    const payload = buildPipeCardPayload(node, spec, analysis);
    expect(payload.description).toContain("Extract content from");
    expect(payload.description).toContain("extract data");
  });

  it("uses node.description when present, in preference to registry", () => {
    const node: GraphSpecNode = {
      id: "op1",
      pipe_code: "my_pipe",
      pipe_type: "PipeLLM",
      description: "Node-level description",
    };
    const spec: GraphSpec = {
      nodes: [node],
      edges: [],
      pipe_registry: {
        my_pipe: {
          type: "PipeLLM",
          pipe_category: "PipeOperator",
          code: "my_pipe",
          domain_code: "test",
          description: "Registry description",
          inputs: {},
          output: {
            concept: {
              code: "x",
              domain_code: "y",
              description: "",
              structure_class_name: "z",
              refines: null,
            },
            multiplicity: null,
          },
          llm_prompt_spec: {
            templating_style: null,
            system_prompt_blueprint: null,
            prompt_blueprint: null,
            user_image_references: null,
            user_document_references: null,
            system_image_references: null,
            system_document_references: null,
          },
          llm_choices: null,
          structuring_method: null,
          output_multiplicity: null,
        },
      },
    };
    const analysis = emptyAnalysis();

    const payload = buildPipeCardPayload(node, spec, analysis);
    expect(payload.description).toBe("Node-level description");
  });

  it("status defaults to 'scheduled' when absent", () => {
    const node: GraphSpecNode = {
      id: "op1",
      pipe_code: "p",
      pipe_type: "PipeFunc",
    };
    const spec: GraphSpec = { nodes: [node], edges: [] };
    const analysis = emptyAnalysis();

    const payload = buildPipeCardPayload(node, spec, analysis);
    expect(payload.status).toBe("scheduled");
  });

  it("inputs/outputs with missing name or concept get empty strings", () => {
    const node: GraphSpecNode = {
      id: "op1",
      pipe_code: "p",
      pipe_type: "PipeFunc",
      io: {
        inputs: [{ digest: "d1" }, { name: "named", digest: "d2" }],
        outputs: [{ concept: "OnlyConcept", digest: "d3" }, {}],
      },
    };
    const spec: GraphSpec = { nodes: [node], edges: [] };
    const analysis = emptyAnalysis();

    const payload = buildPipeCardPayload(node, spec, analysis);
    expect(payload.inputs).toEqual([
      { name: "", concept: "" },
      { name: "named", concept: "" },
    ]);
    expect(payload.outputs).toEqual([
      { name: "", concept: "OnlyConcept" },
      { name: "", concept: "" },
    ]);
  });

  it("throws when pipe_type is missing", () => {
    const node: GraphSpecNode = {
      id: "op_bad",
      pipe_code: "broken",
    };
    const spec: GraphSpec = { nodes: [node], edges: [] };
    const analysis = emptyAnalysis();

    expect(() => buildPipeCardPayload(node, spec, analysis)).toThrow(/op_bad/);
    expect(() => buildPipeCardPayload(node, spec, analysis)).toThrow(/missing pipe_type/);
  });

  it("pipeCode falls back to node.id when pipe_code is absent", () => {
    const node: GraphSpecNode = {
      id: "raw_id",
      pipe_type: "PipeFunc",
    };
    const spec: GraphSpec = { nodes: [node], edges: [] };
    const analysis = emptyAnalysis();

    const payload = buildPipeCardPayload(node, spec, analysis);
    expect(payload.pipeCode).toBe("raw_id");
  });

  it("uses controllerNodeIds from analysis (single source of truth) not pipe_type string-matching", () => {
    // Pretend PipeFunc is treated as a controller via analysis — payload should
    // skip the operator default description.
    const node: GraphSpecNode = {
      id: "func_as_ctrl",
      pipe_code: "weird",
      pipe_type: "PipeFunc",
    };
    const spec: GraphSpec = { nodes: [node], edges: [] };
    const analysis = emptyAnalysis(["func_as_ctrl"]);

    const payload = buildPipeCardPayload(node, spec, analysis);
    expect(payload.description).toBeUndefined();
  });

  it("integrates with real buildDataflowAnalysis output", () => {
    const spec: GraphSpec = {
      nodes: [
        { id: "ctrl", pipe_code: "my_ctrl", pipe_type: "PipeSequence" },
        {
          id: "op1",
          pipe_code: "child",
          pipe_type: "PipeLLM",
          io: { outputs: [{ digest: "d1", name: "out", concept: "Text" }] },
        },
      ],
      edges: [{ source: "ctrl", target: "op1", kind: "contains" }],
    };
    const analysis = buildDataflowAnalysis(spec)!;
    expect(analysis.controllerNodeIds.has("ctrl")).toBe(true);

    const ctrlPayload = buildPipeCardPayload(spec.nodes[0], spec, analysis);
    const opPayload = buildPipeCardPayload(spec.nodes[1], spec, analysis);

    expect(ctrlPayload.pipeType).toBe("PipeSequence");
    expect(ctrlPayload.description).toBeUndefined(); // controller, no fallback
    expect(opPayload.pipeType).toBe("PipeLLM");
    expect(opPayload.description).toContain("Analyze and generate");
  });
});
