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
