import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ConceptInfo, GraphSpec, GraphSpecNode, PipeBlueprintUnion } from "@graph/types";
import { PipeDetailPanel } from "../PipeDetailPanel";

function makeNode(): GraphSpecNode {
  return {
    id: "op1",
    kind: "operator",
    pipe_code: "score_candidate",
    pipe_type: "PipeFunc",
    description: "Score the candidate",
    domain_code: "demo",
    status: "scheduled",
    timing: {
      started_at: "2026-07-08T10:00:00.000Z",
      ended_at: "2026-07-08T10:00:01.230Z",
      duration: 1.23,
    },
    io: {
      inputs: [{ name: "candidate", concept: "CandidateProfile", digest: "candidate" }],
      outputs: [{ name: "score", concept: "Score", digest: "score" }],
    },
    execution_data: { runtime_value: "shown only for runtime specs" },
    metrics: { tokens: 123 },
    tags: { outcome: "accepted" },
  };
}

function renderPanel(mode?: "dry" | "live" | "static"): string {
  const node = makeNode();
  const spec: GraphSpec = {
    meta: mode === undefined ? { format: "mthds" } : { format: "mthds", mode },
    nodes: [node],
    edges: [],
  };
  return renderToStaticMarkup(React.createElement(PipeDetailPanel, { node, spec }));
}

const DOCUMENT_CONCEPT: ConceptInfo = {
  code: "Document",
  domain_code: "demo",
  description: "A document",
  structure_class_name: "Document",
  refines: null,
};

const TEXT_CONCEPT: ConceptInfo = {
  code: "Text",
  domain_code: "demo",
  description: "Extracted text",
  structure_class_name: "Text",
  refines: null,
};

const EXTRACT_BLUEPRINT: Extract<PipeBlueprintUnion, { type: "PipeExtract" }> = {
  type: "PipeExtract",
  pipe_category: "PipeOperator",
  code: "extract_document",
  domain_code: "demo",
  description: "Extract a document",
  inputs: {
    document: { concept: DOCUMENT_CONCEPT, multiplicity: null },
  },
  output: { concept: TEXT_CONCEPT, multiplicity: null },
  extract_choice: "authored-extract-choice",
  should_caption_images: false,
  max_page_images: null,
  should_include_page_views: false,
  page_views_dpi: null,
  render_js: null,
  include_raw_html: null,
  image_stuff_name: null,
  document_stuff_name: "document",
};

function renderExtractPanel(mode: "dry" | "live"): string {
  const node: GraphSpecNode = {
    id: "extract",
    kind: "operator",
    pipe_code: "extract_document",
    pipe_type: "PipeExtract",
    description: "Extract a document",
    domain_code: "demo",
    status: "succeeded",
    io: {
      inputs: [{ name: "document", concept: "Document", digest: "document" }],
      outputs: [{ name: "text", concept: "Text", digest: "text" }],
    },
    // A real deck resolution, not mock content. Named accordingly: `resolved_model`
    // is NOT polyfactory output — across all 32 checked-in dry specs it only ever
    // holds real model names (claude-4.6-sonnet, linkup-standard) or real deck
    // aliases (@default-general). Only stuff CONTENT is fabricated in a dry run.
    execution_data: { resolved_model: "deck-resolved-model", runtime_value: "generated" },
  };
  const spec: GraphSpec = {
    meta: { format: "mthds", mode },
    nodes: [node],
    edges: [],
    pipe_registry: {
      "demo.extract_document": EXTRACT_BLUEPRINT,
    },
  };
  return renderToStaticMarkup(React.createElement(PipeDetailPanel, { node, spec }));
}

describe("PipeDetailPanel mode chrome", () => {
  it("hides runtime status, timing, execution data, and metrics for static specs", () => {
    const html = renderPanel("static");

    expect(html).not.toContain("detail-status");
    expect(html).not.toContain("scheduled");
    expect(html).not.toContain("1.23s");
    expect(html).not.toContain("Execution");
    expect(html).not.toContain("runtime_value");
    expect(html).not.toContain("Metrics");
    expect(html).not.toContain("tokens");
    expect(html).toContain("Tags");
    expect(html).toContain("outcome");
    expect(html).toContain("accepted");
  });

  it("keeps dry-run status chrome but hides generated payload data", () => {
    const html = renderPanel("dry");

    expect(html).toContain("detail-status");
    expect(html).toContain("scheduled");
    expect(html).toContain("1.23s");
    expect(html).not.toContain("Execution");
    expect(html).not.toContain("runtime_value");
    expect(html).not.toContain("Metrics");
    expect(html).not.toContain("tokens");
  });

  it("shows the resolved model in a dry spec, but still hides generated payload data", () => {
    // Model resolution is a deterministic deck lookup, so it holds in a dry run and is
    // shown: the Model row would otherwise read `@default-general` with nothing under
    // it, which is the alias question left unanswered. Everything else in
    // execution_data is a product of the run and stays hidden.
    const html = renderExtractPanel("dry");

    expect(html).toContain("authored-extract-choice");
    expect(html).toContain("deck-resolved-model");
    expect(html).not.toContain("generated");
  });

  it("keeps runtime data for live specs", () => {
    const html = renderPanel("live");

    expect(html).toContain("detail-status");
    expect(html).toContain("scheduled");
    expect(html).toContain("1.23s");
    expect(html).toContain("Execution");
    expect(html).toContain("runtime_value");
    expect(html).toContain("Metrics");
    expect(html).toContain("tokens");
  });

  it("uses runtime execution values for live specs", () => {
    const html = renderExtractPanel("live");

    expect(html).toContain("deck-resolved-model");
  });

  it("keeps runtime data for legacy specs without an explicit mode", () => {
    const html = renderPanel();

    expect(html).toContain("Execution");
    expect(html).toContain("runtime_value");
  });
});

describe("PipeDetailPanel io pills", () => {
  it("marks a plural input's concept and leaves a single one bare", () => {
    const node: GraphSpecNode = {
      ...makeNode(),
      io: {
        inputs: [
          { name: "cvs", concept: "Document", digest: "cvs", multiplicity: true },
          { name: "job_offer", concept: "Document", digest: "offer" },
        ],
        outputs: [{ name: "scores", concept: "Score", digest: "scores", multiplicity: 4 }],
      },
    };
    const spec: GraphSpec = { meta: { format: "mthds", mode: "static" }, nodes: [node], edges: [] };
    const html = renderToStaticMarkup(React.createElement(PipeDetailPanel, { node, spec }));

    expect(html).toContain('<span class="detail-io-concept">Document[]</span>');
    expect(html).toContain('<span class="detail-io-concept">Document</span>');
    expect(html).toContain('<span class="detail-io-concept">Score[4]</span>');
  });
});

describe("PipeDetailPanel on a binding node with empty IO", () => {
  // pipelex closes a binding whose root was absent with no input and no output:
  // failed when the absence was not recorded, skipped when it was. Its panel
  // still says what it binds, and what became of it.
  function renderBinding(status: "failed" | "skipped"): string {
    const node: GraphSpecNode = {
      id: "bind",
      kind: "binding",
      status,
      pipe_code: "catalog.editor_note",
      pipe_type: "BindingStep",
      description: "Binds 'catalog.editor_note' to 'editor_note'",
      domain_code: "demo",
      io: { inputs: [], outputs: [] },
      execution_data: { from: "catalog.editor_note", result: "editor_note" },
      ...(status === "failed"
        ? {
            error: {
              error_type: "PipeRunInputsError",
              message: "The binding step reads 'catalog', which is not in working memory.",
            },
          }
        : {}),
    };
    const spec: GraphSpec = { meta: { format: "mthds", mode: "live" }, nodes: [node], edges: [] };
    return renderToStaticMarkup(React.createElement(PipeDetailPanel, { node, spec }));
  }

  it("shows a failed binding's status, its error, and what it binds", () => {
    const html = renderBinding("failed");

    expect(html).toContain('<span class="detail-status-label"');
    expect(html).toContain(">failed</span>");
    expect(html).toContain("PipeRunInputsError");
    expect(html).toContain("which is not in working memory");
    expect(html).toContain("catalog.editor_note");
    expect(html).toContain("editor_note");
  });

  it("shows a skipped binding's status and what it binds", () => {
    const html = renderBinding("skipped");

    expect(html).toContain(">skipped</span>");
    expect(html).not.toContain("detail-error");
    expect(html).toContain("catalog.editor_note");
  });
});

function kvRow(label: string, value: string): string {
  return `<span class="detail-kv-key">${label}</span><span class="detail-kv-value">${value}</span>`;
}

describe("PipeDetailPanel blueprint lookup", () => {
  it("shows a node in a second domain its own domain's blueprint, not the main domain's", () => {
    // The panel's former lookup tried the pipeline's domain first, so a node whose
    // code also exists in the main domain was shown the main domain's pipe.
    const node: GraphSpecNode = {
      id: "extract",
      kind: "operator",
      pipe_code: "extract_document",
      pipe_type: "PipeExtract",
      domain_code: "other",
      status: "succeeded",
      io: { inputs: [], outputs: [] },
    };
    const spec: GraphSpec = {
      meta: { format: "mthds", mode: "static" },
      pipeline_ref: { domain: "demo", main_pipe: "run" },
      nodes: [node],
      edges: [],
      pipe_registry: {
        "demo.extract_document": { ...EXTRACT_BLUEPRINT, extract_choice: "main-domain-choice" },
        "other.extract_document": {
          ...EXTRACT_BLUEPRINT,
          domain_code: "other",
          extract_choice: "other-domain-choice",
        },
      },
    };
    const html = renderToStaticMarkup(React.createElement(PipeDetailPanel, { node, spec }));

    expect(html).toContain("other-domain-choice");
    expect(html).not.toContain("main-domain-choice");
  });
});

describe("PipeDetailPanel on a PipeDocGen step", () => {
  const INLINE_PDF = "data:application/pdf;base64,JVBERi0xLjQKJcfsj6IK";

  const DOC_GEN_BLUEPRINT: Extract<PipeBlueprintUnion, { type: "PipeDocGen" }> = {
    type: "PipeDocGen",
    pipe_category: "PipeOperator",
    code: "print_notice",
    domain_code: "demo",
    description: "Print the notice",
    inputs: { notice: { concept: TEXT_CONCEPT, multiplicity: null } },
    output: { concept: DOCUMENT_CONCEPT, multiplicity: null },
    doc_gen_format: "pdf",
    doc_gen_choice: null,
    template: null,
    template_file: null,
    filename: "notice-{{ notice.shop }}",
  };

  function renderDocGen(
    mode: "static" | "dry" | "live",
    blueprint: Extract<PipeBlueprintUnion, { type: "PipeDocGen" }> | null = DOC_GEN_BLUEPRINT,
  ): string {
    const node: GraphSpecNode = {
      id: "print",
      kind: "operator",
      pipe_code: "print_notice",
      pipe_type: "PipeDocGen",
      description: "Print the notice",
      domain_code: "demo",
      status: mode === "static" ? "scheduled" : "succeeded",
      io: {
        inputs: [{ name: "notice", concept: "Text", digest: "notice" }],
        outputs: [{ name: "notice_pdf", concept: "Document", digest: "notice_pdf" }],
      },
      ...(mode === "static"
        ? {}
        : {
            execution_data: {
              format: "pdf",
              source: "layout",
              resolved_model: "reportlab-pdf",
              filename: "notice-corner-shop.pdf",
              url: INLINE_PDF,
            },
          }),
    };
    const spec: GraphSpec = {
      meta: { format: "mthds", mode },
      nodes: [node],
      edges: [],
      ...(blueprint ? { pipe_registry: { "demo.print_notice": blueprint } } : {}),
    };
    return renderToStaticMarkup(React.createElement(PipeDetailPanel, { node, spec }));
  }

  it("shows a static step's format, the deck's default engine, its auto-layout and its file name", () => {
    const html = renderDocGen("static");

    expect(html).toContain(kvRow("Format", "PDF"));
    expect(html).toContain(kvRow("Engine", "deck default"));
    expect(html).toContain(kvRow("Source", "auto-layout"));
    expect(html).toContain(kvRow("File Name", "notice-{{ notice.shop }}"));
    expect(html).not.toContain("Stored As");
    expect(html).not.toContain("Blueprint not available");
  });

  it("shows the engine a step names, labelled from an inline setting as other choices are", () => {
    const html = renderDocGen("static", {
      ...DOC_GEN_BLUEPRINT,
      doc_gen_choice: { model: "weasyprint-pdf", description: null },
    });

    expect(html).toContain("weasyprint-pdf");
    expect(html).not.toContain("deck default");
  });

  it("names a template file and shows an inline template behind the template toggle", () => {
    const withFile = renderDocGen("static", {
      ...DOC_GEN_BLUEPRINT,
      doc_gen_format: "docx",
      template_file: "templates/notice.docx",
    });
    expect(withFile).toContain(kvRow("Source", "template file"));
    expect(withFile).toContain(kvRow("Template File", "templates/notice.docx"));

    const inline = renderDocGen("static", {
      ...DOC_GEN_BLUEPRINT,
      template: "<h1>{{ notice.title }}</h1>",
    });
    expect(inline).toContain(kvRow("Source", "HTML template"));
    expect(inline).toContain("&lt;h1&gt;{{ notice.title }}&lt;/h1&gt;");
  });

  it("shows a dry step's resolved engine and source, but not the name a mock run rendered", () => {
    const html = renderDocGen("dry");

    expect(html).toContain("reportlab-pdf");
    expect(html).toContain(kvRow("Source", "auto-layout"));
    expect(html).not.toContain("notice-corner-shop.pdf");
    expect(html).not.toContain("Execution");
  });

  it("shows a run's resolved engine and the name the document was stored under", () => {
    const html = renderDocGen("live");

    expect(html).toContain("reportlab-pdf");
    expect(html).toContain(kvRow("File Name", "notice-{{ notice.shop }}"));
    expect(html).toContain(kvRow("Stored As", "notice-corner-shop.pdf"));
    // Merged into the section, so no raw dump repeats it.
    expect(html).not.toContain("Execution");
  });

  it("never shows the stored document's url, with or without a blueprint", () => {
    expect(renderDocGen("live")).not.toContain("data:");

    // Without a blueprint the raw dump keeps the run's other data, but not the url.
    const unresolved = renderDocGen("live", null);
    expect(unresolved).toContain("Blueprint not available");
    expect(unresolved).toContain("Execution");
    expect(unresolved).toContain("reportlab-pdf");
    expect(unresolved).not.toContain("data:");
    expect(unresolved).not.toContain(">url<");
  });
});
