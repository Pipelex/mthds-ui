import { describe, expect, it } from "vitest";

import { parseConceptRef, parseInputSlot } from "../conceptRefs";

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
    // The expanded slot table is a slot form, not a ref form — `parseInputSlot`
    // unwraps it, and `output` (which parses refs directly) never accepts one.
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

describe("parseInputSlot", () => {
  it("reads the string form exactly as parseConceptRef does", () => {
    expect(parseInputSlot("recruitment.CandidateProfile[]?")).toEqual({
      ref: parseConceptRef("recruitment.CandidateProfile[]?"),
      missingConcept: false,
      unknownKeys: [],
    });
  });

  it("reads the expanded form to the same ref parts as the string form", () => {
    expect(parseInputSlot({ concept: "Text" })).toEqual({
      ref: parseConceptRef("Text"),
      missingConcept: false,
      unknownKeys: [],
    });
  });

  it("keeps multiplicity and presence working inside the expanded form", () => {
    expect(parseInputSlot({ concept: "Text?" }).ref).toEqual({
      domain: null,
      code: "Text",
      multiplicity: null,
      presence: "optional",
    });
    expect(parseInputSlot({ concept: "legal.Clause[3]" }).ref).toEqual({
      domain: "legal",
      code: "Clause",
      multiplicity: 3,
      presence: "plain",
    });
  });

  it("accepts hints and reports nothing — they are presentational, and dropped", () => {
    expect(parseInputSlot({ concept: "Text", hints: { intent: "prose" } })).toEqual({
      ref: parseConceptRef("Text"),
      missingConcept: false,
      unknownKeys: [],
    });
  });

  it("names keys the slot form does not define, and still reads the concept", () => {
    const slot = parseInputSlot({ concept: "Text", description: "why", widget: "textarea" });
    expect(slot.ref).toEqual(parseConceptRef("Text"));
    expect(slot.unknownKeys).toEqual(["description", "widget"]);
  });

  it("returns a null ref for a slot table with no usable concept", () => {
    expect(parseInputSlot({ hints: { intent: "prose" } }).ref).toBeNull();
    expect(parseInputSlot({ concept: 42 }).ref).toBeNull();
    expect(parseInputSlot({ concept: "has space" }).ref).toBeNull();
  });

  it("tells an absent `concept` key apart from one that will not parse", () => {
    // Both drop the slot, but they are different author mistakes, and the
    // caller words its diagnostic from this flag.
    expect(parseInputSlot({ hints: { intent: "prose" } }).missingConcept).toBe(true);
    expect(parseInputSlot({}).missingConcept).toBe(true);
    expect(parseInputSlot({ concept: "has space" }).missingConcept).toBe(false);
    expect(parseInputSlot({ concept: 42 }).missingConcept).toBe(false);
    // The string form declares no slot table at all, so nothing is missing
    // from one — an unparseable string is a ref problem, whatever its value.
    expect(parseInputSlot("has space").missingConcept).toBe(false);
    expect(parseInputSlot(undefined).missingConcept).toBe(false);
  });

  it("returns a null ref for values that are neither a ref string nor a table", () => {
    expect(parseInputSlot(undefined)).toEqual({
      ref: null,
      missingConcept: false,
      unknownKeys: [],
    });
    expect(parseInputSlot(["Text"])).toEqual({
      ref: null,
      missingConcept: false,
      unknownKeys: [],
    });
  });
});
