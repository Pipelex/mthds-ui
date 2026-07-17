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
