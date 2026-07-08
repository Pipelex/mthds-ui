import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { GraphSpec, GraphSpecNode } from "@graph/types";
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

function renderPanel(mode?: "dry" | "static"): string {
  const node = makeNode();
  const spec: GraphSpec = {
    meta: mode === undefined ? { format: "mthds" } : { format: "mthds", mode },
    nodes: [node],
    edges: [],
  };
  return renderToStaticMarkup(React.createElement(PipeDetailPanel, { node, spec }));
}

describe("PipeDetailPanel static chrome", () => {
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

  it("keeps runtime rows for non-static specs", () => {
    const html = renderPanel("dry");

    expect(html).toContain("detail-status");
    expect(html).toContain("scheduled");
    expect(html).toContain("1.23s");
    expect(html).toContain("Execution");
    expect(html).toContain("runtime_value");
    expect(html).toContain("Metrics");
    expect(html).toContain("tokens");
  });
});
