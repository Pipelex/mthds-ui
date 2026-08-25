import { describe, expect, it } from "vitest";

import { parseConceptRef } from "../conceptRefs";

describe("parseConceptRef", () => {
  it("parses a bare concept code", () => {
    expect(parseConceptRef("Report")).toEqual({
      domain: null,
      code: "Report",
      multiplicity: null,
      presence: "plain",
    });
  });

  it("parses a domain-qualified ref", () => {
    expect(parseConceptRef("recruitment.CandidateProfile")).toEqual({
      domain: "recruitment",
      code: "CandidateProfile",
      multiplicity: null,
      presence: "plain",
    });
  });

  it("parses the indeterminate-many suffix", () => {
    expect(parseConceptRef("Page[]")).toEqual({
      domain: null,
      code: "Page",
      multiplicity: true,
      presence: "plain",
    });
  });

  it("parses a fixed-count suffix", () => {
    expect(parseConceptRef("Page[3]")).toEqual({
      domain: null,
      code: "Page",
      multiplicity: 3,
      presence: "plain",
    });
  });

  it("parses a qualified ref with multiplicity", () => {
    expect(parseConceptRef("recruitment.CandidateProfile[]")).toEqual({
      domain: "recruitment",
      code: "CandidateProfile",
      multiplicity: true,
      presence: "plain",
    });
  });

  it("treats everything before the last dot as the domain", () => {
    expect(parseConceptRef("pkg.sub_domain.Thing[2]")).toEqual({
      domain: "pkg.sub_domain",
      code: "Thing",
      multiplicity: 2,
      presence: "plain",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(parseConceptRef("  Text ")).toEqual({
      domain: null,
      code: "Text",
      multiplicity: null,
      presence: "plain",
    });
  });

  it("parses the optional presence marker", () => {
    expect(parseConceptRef("Text?")).toEqual({
      domain: null,
      code: "Text",
      multiplicity: null,
      presence: "optional",
    });
  });

  it("parses the force presence marker", () => {
    expect(parseConceptRef("Text!")).toEqual({
      domain: null,
      code: "Text",
      multiplicity: null,
      presence: "force",
    });
  });

  it("parses multiplicity and presence together, in that order", () => {
    expect(parseConceptRef("recruitment.CandidateProfile[]?")).toEqual({
      domain: "recruitment",
      code: "CandidateProfile",
      multiplicity: true,
      presence: "optional",
    });
    expect(parseConceptRef("Page[3]!")).toEqual({
      domain: null,
      code: "Page",
      multiplicity: 3,
      presence: "force",
    });
  });

  it("returns null for non-strings", () => {
    expect(parseConceptRef(undefined)).toBeNull();
    expect(parseConceptRef(42)).toBeNull();
    expect(parseConceptRef({ concept: "Text" })).toBeNull();
  });

  it("returns null for empty or malformed refs", () => {
    expect(parseConceptRef("")).toBeNull();
    expect(parseConceptRef("Page[abc]")).toBeNull();
    expect(parseConceptRef(".Leading")).toBeNull();
    expect(parseConceptRef("has space")).toBeNull();
    // Presence comes after multiplicity, never before it, and never twice.
    expect(parseConceptRef("Page?[]")).toBeNull();
    expect(parseConceptRef("Text??")).toBeNull();
    expect(parseConceptRef("Text?!")).toBeNull();
  });
});
