import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ConceptInfo } from "@graph/types";
import { ConceptDetailPanel } from "../ConceptDetailPanel";

const CANDIDATE_CONCEPT: ConceptInfo = {
  code: "Candidate",
  domain_code: "demo",
  description: "Candidate profile",
  structure_class_name: "Candidate",
  refines: null,
  json_schema: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", description: "Candidate name" },
      generated_summary: { type: "string", description: "Synthetic summary" },
    },
  },
};

const GENERATED_IO_DATA = {
  digest: "candidate",
  name: "candidate",
  concept: "Candidate",
  contentType: "application/json",
  data: {
    name: "Polyfactory Jane",
    generated_summary: "Generated dry-run payload that should not display",
  },
};

describe("ConceptDetailPanel dry mode", () => {
  it("shows structure instead of generated dry-run data", () => {
    const html = renderToStaticMarkup(
      React.createElement(ConceptDetailPanel, {
        concept: CANDIDATE_CONCEPT,
        ioData: GENERATED_IO_DATA,
        isDryRun: true,
      }),
    );

    expect(html).toContain("Structure");
    expect(html).toContain("name");
    expect(html).not.toContain("generated_summary");
    expect(html).not.toContain("Polyfactory Jane");
    expect(html).not.toContain("Generated dry-run payload");
  });

  it("shows data by default for non-dry concept instances", () => {
    const html = renderToStaticMarkup(
      React.createElement(ConceptDetailPanel, {
        concept: CANDIDATE_CONCEPT,
        ioData: GENERATED_IO_DATA,
      }),
    );

    expect(html).toContain("Data");
    expect(html).toContain("Polyfactory Jane");
    expect(html).toContain("Generated dry-run payload");
  });
});
