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
    // `summary` is optional on purpose: the dry panel must still describe it.
    properties: {
      name: { type: "string", description: "Candidate name" },
      summary: { type: "string", description: "Short pitch" },
    },
  },
};

// Field names and payload values are deliberately disjoint, so an assertion on
// a schema field name can never be satisfied by the data, or the reverse.
const GENERATED_IO_DATA = {
  digest: "candidate",
  name: "candidate",
  concept: "Candidate",
  contentType: "application/json",
  data: {
    name: "Polyfactory Jane",
    summary: "Generated dry-run payload that should not display",
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
    expect(html).not.toContain("Polyfactory Jane");
    expect(html).not.toContain("Generated dry-run payload");
  });

  it("describes optional schema fields too", () => {
    const html = renderToStaticMarkup(
      React.createElement(ConceptDetailPanel, {
        concept: CANDIDATE_CONCEPT,
        ioData: GENERATED_IO_DATA,
        isDryRun: true,
      }),
    );

    expect(html).toContain("summary");
    expect(html).toContain("Short pitch");
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
