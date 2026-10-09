import { describe, it, expect } from "vitest";
import type { ConceptInfo, PipeBlueprintUnion, PipeCallNode } from "@graph/types";
import { buildPipeCardPayload } from "@graph/pipeCardPayload";

describe("buildPipeCardPayload", () => {
  it("builds an operator payload from a pipe-call node with full io", () => {
    const node: PipeCallNode = {
      kind: "operator",
      id: "op1",
      pipe_code: "extract_data",
      pipe_type: "PipeExtract",
      description: "Extract data from the document",
      domain_code: "demo",
      status: "succeeded",
      io: {
        inputs: [{ name: "src", concept: "Document" }],
        outputs: [{ name: "result", concept: "Text" }],
      },
    };

    expect(buildPipeCardPayload(node)).toEqual({
      pipeCode: "extract_data",
      pipeType: "PipeExtract",
      description: "Extract data from the document",
      status: "succeeded",
      inputs: [{ name: "src", concept: "Document" }],
      outputs: [{ name: "result", concept: "Text" }],
    });
  });

  it("marks a plural io item's concept on its pill, and leaves a single one bare", () => {
    const node: PipeCallNode = {
      kind: "operator",
      id: "op1",
      pipe_code: "extract_pages",
      pipe_type: "PipeExtract",
      description: "Extract the pages of each CV",
      domain_code: "demo",
      status: "scheduled",
      io: {
        inputs: [
          { name: "cvs", concept: "Document", multiplicity: true },
          { name: "job_offer", concept: "Document" },
        ],
        outputs: [{ name: "pages", concept: "Page", multiplicity: 5 }],
      },
    };

    const payload = buildPipeCardPayload(node);
    expect(payload.inputs).toEqual([
      { name: "cvs", concept: "Document[]" },
      { name: "job_offer", concept: "Document" },
    ]);
    expect(payload.outputs).toEqual([{ name: "pages", concept: "Page[5]" }]);
  });

  it("carries the controller pipeType through unchanged", () => {
    for (const pipeType of [
      "PipeSequence",
      "PipeParallel",
      "PipeCondition",
      "PipeBatch",
    ] as const) {
      const node: PipeCallNode = {
        kind: "controller",
        id: `ctrl_${pipeType}`,
        pipe_code: `my_${pipeType}`,
        pipe_type: pipeType,
        description: `${pipeType} controller`,
        domain_code: "demo",
        status: "succeeded",
        io: { inputs: [], outputs: [] },
      };
      expect(buildPipeCardPayload(node).pipeType).toBe(pipeType);
    }
  });

  it("uses node.description verbatim — the single source of truth", () => {
    const node: PipeCallNode = {
      kind: "operator",
      id: "op1",
      pipe_code: "my_pipe",
      pipe_type: "PipeLLM",
      description: "Node-level description",
      domain_code: "demo",
      status: "succeeded",
      io: { inputs: [], outputs: [] },
    };
    expect(buildPipeCardPayload(node).description).toBe("Node-level description");
  });

  it("defaults a missing io concept to an empty string, keeps the name", () => {
    const node: PipeCallNode = {
      kind: "operator",
      id: "op1",
      pipe_code: "p",
      pipe_type: "PipeFunc",
      description: "Process the data",
      domain_code: "demo",
      status: "succeeded",
      io: {
        inputs: [{ name: "raw", digest: "d1" }],
        outputs: [{ name: "done", concept: "Result", digest: "d2" }],
      },
    };
    const payload = buildPipeCardPayload(node);
    expect(payload.inputs).toEqual([{ name: "raw", concept: "" }]);
    expect(payload.outputs).toEqual([{ name: "done", concept: "Result" }]);
  });

  it("carries the node status through unchanged", () => {
    const node: PipeCallNode = {
      kind: "operator",
      id: "op1",
      pipe_code: "p",
      pipe_type: "PipeFunc",
      description: "Process the data",
      domain_code: "demo",
      status: "canceled",
      io: { inputs: [], outputs: [] },
    };
    expect(buildPipeCardPayload(node).status).toBe("canceled");
  });

  it("carries graph mode and authored tags when provided", () => {
    const node: PipeCallNode = {
      kind: "operator",
      id: "op1",
      pipe_code: "route_yes",
      pipe_type: "PipeLLM",
      description: "Route outcome",
      domain_code: "demo",
      status: "scheduled",
      io: { inputs: [], outputs: [] },
      tags: { outcome: "yes" },
    };

    expect(buildPipeCardPayload(node, "static")).toMatchObject({
      graphMode: "static",
      tags: { outcome: "yes" },
    });
  });

  describe("a PipeDocGen step's format", () => {
    const DOCUMENT: ConceptInfo = {
      code: "Document",
      domain_code: "native",
      description: "A document",
      structure_class_name: "DocumentContent",
      refines: null,
    };

    const DOC_GEN_NODE: PipeCallNode = {
      kind: "operator",
      id: "print",
      pipe_code: "print_notice",
      pipe_type: "PipeDocGen",
      description: "Print the notice",
      domain_code: "shop_notices",
      status: "succeeded",
      io: { inputs: [], outputs: [{ name: "notice_pdf", concept: "Document" }] },
    };

    function docGenBlueprint(docGenFormat: string): PipeBlueprintUnion {
      return {
        type: "PipeDocGen",
        pipe_category: "PipeOperator",
        code: "print_notice",
        domain_code: "shop_notices",
        description: "Print the notice",
        inputs: {},
        output: { concept: DOCUMENT, multiplicity: null },
        doc_gen_format: docGenFormat,
      };
    }

    it("carries the format the blueprint declares", () => {
      expect(
        buildPipeCardPayload(DOC_GEN_NODE, "static", docGenBlueprint("pdf")).docGenFormat,
      ).toBe("pdf");
    });

    it("carries no format when the blueprint's is empty, as the static builder writes it", () => {
      expect(buildPipeCardPayload(DOC_GEN_NODE, "static", docGenBlueprint("")).docGenFormat).toBe(
        undefined,
      );
      expect(
        "docGenFormat" in buildPipeCardPayload(DOC_GEN_NODE, "static", docGenBlueprint(" ")),
      ).toBe(false);
    });

    it("carries no format from another pipe type's blueprint", () => {
      const funcBlueprint: PipeBlueprintUnion = {
        type: "PipeFunc",
        pipe_category: "PipeOperator",
        code: "print_notice",
        domain_code: "shop_notices",
        description: "Print the notice",
        inputs: {},
        output: { concept: DOCUMENT, multiplicity: null },
      };
      expect("docGenFormat" in buildPipeCardPayload(DOC_GEN_NODE, "live", funcBlueprint)).toBe(
        false,
      );
    });

    it("carries no format without a blueprint, so the card draws the node alone", () => {
      expect("docGenFormat" in buildPipeCardPayload(DOC_GEN_NODE, "live")).toBe(false);
    });
  });
});
