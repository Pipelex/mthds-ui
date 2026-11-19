import { describe, it, expect } from "vitest";
import type { ConceptInfo, GraphSpec } from "@graph/types";
import { isStoredValueConcept } from "../nativeConcepts";

function concept(domain: string, code: string, refines: string | null = null): ConceptInfo {
  return {
    code,
    domain_code: domain,
    description: "",
    structure_class_name: `${code}Content`,
    refines,
  };
}

function specWith(...concepts: ConceptInfo[]): GraphSpec {
  const registry: Record<string, ConceptInfo> = {};
  for (const c of concepts) registry[`${c.domain_code}.${c.code}`] = c;
  return { nodes: [], edges: [], concept_registry: registry } as unknown as GraphSpec;
}

describe("isStoredValueConcept", () => {
  it("holds for each native whose value may live in storage", () => {
    for (const code of ["Text", "Markdown", "Html", "JSON"]) {
      const native = concept("native", code);
      expect(isStoredValueConcept(specWith(native), native)).toBe(true);
    }
  });

  it("does not hold for the other natives, whose members describe the value itself", () => {
    for (const code of ["Image", "Document", "Page", "TextAndImages", "SearchResult", "Number"]) {
      const native = concept("native", code);
      expect(isStoredValueConcept(specWith(native), native)).toBe(false);
    }
  });

  it("holds for a method's concept refining Text, through a chain of refinements", () => {
    const text = concept("native", "Text");
    const report = concept("recruitment", "Report", "native.Text");
    const shortReport = concept("recruitment", "ShortReport", "recruitment.Report");
    const spec = specWith(text, report, shortReport);
    expect(isStoredValueConcept(spec, report)).toBe(true);
    expect(isStoredValueConcept(spec, shortReport)).toBe(true);
  });

  it("holds for a refined native the registry does not list, by its ref", () => {
    const summary = concept("notes", "Summary", "native.Markdown");
    expect(isStoredValueConcept(specWith(summary), summary)).toBe(true);
  });

  it("does not hold for a refinement of another native", () => {
    const notice = concept("door_notice", "PrintedNotice", "native.Document");
    expect(isStoredValueConcept(specWith(notice), notice)).toBe(false);
  });

  it("does not hold for a method's own structure, whatever its fields are called", () => {
    const link = concept("bookmarks", "Link");
    expect(isStoredValueConcept(specWith(link), link)).toBe(false);
  });

  it("ends on a refinement cycle rather than looping", () => {
    const a = concept("loop", "A", "loop.B");
    const b = concept("loop", "B", "loop.A");
    expect(isStoredValueConcept(specWith(a, b), a)).toBe(false);
  });
});
