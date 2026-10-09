import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PipeCardBase } from "../PipeCardBase";
import type { PipeCardData } from "../pipeCardTypes";

function renderCard(data: PipeCardData): string {
  return renderToStaticMarkup(React.createElement(PipeCardBase, { data }));
}

const BASE_CARD: PipeCardData = {
  pipeCode: "route_candidate",
  pipeType: "PipeLLM",
  description: "Route the candidate",
  status: "scheduled",
  inputs: [{ name: "candidate", concept: "CandidateProfile" }],
  outputs: [{ name: "decision", concept: "Decision" }],
};

describe("PipeCardBase static chrome", () => {
  it("hides runtime status chrome for static cards and shows authored annotations", () => {
    const html = renderCard({
      ...BASE_CARD,
      graphMode: "static",
      tags: { outcome: "accepted", batch_multiplicity: "xmany" },
    });

    expect(html).toContain("pipe-card--static");
    expect(html).not.toContain("pipe-card-status-dot");
    expect(html).not.toContain("Scheduled");
    expect(html).toContain("outcome: accepted");
    expect(html).toContain("xmany");
  });

  it("keeps runtime status chrome for dry/live cards", () => {
    const html = renderCard({ ...BASE_CARD, status: "running" });

    expect(html).toContain("pipe-card-status-dot");
    expect(html).toContain("pipe-card-status-dot--pulse");
    expect(html).toContain("Running");
  });
});

describe("PipeCardBase document format chip", () => {
  const DOC_GEN_CARD: PipeCardData = {
    ...BASE_CARD,
    pipeCode: "print_notice",
    pipeType: "PipeDocGen",
    outputs: [{ name: "notice_pdf", concept: "Document" }],
  };

  it("shows a document step's format in capitals beside its badge, named in its tooltip", () => {
    const html = renderCard({ ...DOC_GEN_CARD, docGenFormat: "xlsx" });

    expect(html).toContain(
      '<span class="pipe-card-format" title="Document format: xlsx">XLSX</span>',
    );
    // In the header, right after the type badge and before the pipe code.
    expect(html.indexOf("DocGen")).toBeLessThan(html.indexOf("XLSX"));
    expect(html.indexOf("XLSX")).toBeLessThan(html.indexOf("print_notice"));
  });

  it("shows the format in every mode, unlike the static-only annotations", () => {
    for (const graphMode of ["static", "dry", "live"] as const) {
      expect(renderCard({ ...DOC_GEN_CARD, graphMode, docGenFormat: "pdf" })).toContain(">PDF<");
    }
  });

  it("shows no chip without a format", () => {
    expect(renderCard(DOC_GEN_CARD)).not.toContain("pipe-card-format");
  });
});
