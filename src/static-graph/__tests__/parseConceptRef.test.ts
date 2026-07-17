import { describe, expect, it } from "vitest";

import { parseConceptRef } from "../conceptRefs";

describe("parseConceptRef", () => {
  it("parses a bare concept code", () => {
    expect(parseConceptRef("Report")).toEqual({
      domain: null,
      code: "Report",
      multiplicity: null,
    });
  });

  it("parses a domain-qualified ref", () => {
    expect(parseConceptRef("recruitment.CandidateProfile")).toEqual({
      domain: "recruitment",
      code: "CandidateProfile",
      multiplicity: null,
    });
  });

  it("parses the indeterminate-many suffix", () => {
    expect(parseConceptRef("Page[]")).toEqual({
      domain: null,
      code: "Page",
      multiplicity: true,
    });
  });

  it("parses a fixed-count suffix", () => {
    expect(parseConceptRef("Page[3]")).toEqual({
      domain: null,
      code: "Page",
      multiplicity: 3,
    });
  });

  it("parses a qualified ref with multiplicity", () => {
    expect(parseConceptRef("recruitment.CandidateProfile[]")).toEqual({
      domain: "recruitment",
      code: "CandidateProfile",
      multiplicity: true,
    });
  });

  it("treats everything before the last dot as the domain", () => {
    expect(parseConceptRef("pkg.sub_domain.Thing[2]")).toEqual({
      domain: "pkg.sub_domain",
      code: "Thing",
      multiplicity: 2,
    });
  });

  it("trims surrounding whitespace", () => {
    expect(parseConceptRef("  Text ")).toEqual({ domain: null, code: "Text", multiplicity: null });
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
  });
});
