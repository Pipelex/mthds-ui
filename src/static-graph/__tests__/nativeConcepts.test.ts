// The native concept catalog is a hand-kept mirror of the MTHDS pinned set
// (`mthds/docs/spec/native-concepts.md`, mirrored by pipelex's `NativeConceptCode`).
// A code missing from it does not throw — it degrades into a stub with an empty
// description, the authoring domain, and a synthetic structure class name. These
// tests pin the catalog and the three resolution paths that depend on it.

import { describe, expect, it } from "vitest";

import { buildStaticGraphSpecFromToml } from "../buildStaticGraphSpec";
import {
  NATIVE_CONCEPT_CODES,
  parseConceptRef,
  resolveConceptInfo,
  resolveStuffSpec,
} from "../conceptRefs";
import { parseMthdsBundle } from "../parseMthdsBundle";

/** The codes the MTHDS 1.0.0 standard pins, in the spec's canonical order. */
const SPEC_NATIVE_CODES = [
  "Dynamic",
  "Text",
  "Image",
  "Document",
  "Html",
  "TextAndImages",
  "Number",
  "YesNo",
  "Date",
  "Time",
  "Page",
  "JSON",
  "SearchResult",
  "Anything",
  "Composite",
];

function resolve(ref: string, currentDomain = "screening") {
  const parts = parseConceptRef(ref);
  expect(parts).not.toBeNull();
  return resolveConceptInfo(parts!, currentDomain, {});
}

describe("native concept catalog", () => {
  it("holds exactly the codes the spec pins, in canonical order", () => {
    expect([...NATIVE_CONCEPT_CODES]).toEqual(SPEC_NATIVE_CODES);
  });
});

describe("resolveConceptInfo — bare native refs", () => {
  it.each(["YesNo", "Date", "Time"])("resolves %s into the native domain", (code) => {
    const info = resolve(code);
    expect(info).toMatchObject({
      code,
      domain_code: "native",
      structure_class_name: `${code}Content`,
    });
    expect(info.description).not.toBe("");
  });
});

describe("resolveConceptInfo — qualified native refs", () => {
  it("resolves native.Date to the native, not a stub", () => {
    const info = resolve("native.Date");
    expect(info).toMatchObject({
      code: "Date",
      domain_code: "native",
      structure_class_name: "DateContent",
    });
    expect(info.description).toContain("calendar date");
  });
});

describe("a locally declared concept shadowing a native", () => {
  // Only reachable on a bundle pipelex rejects outright (the spec reserves the
  // native codes), so this pins current behavior rather than blessing it — see
  // `wip/native-concept-shadowing.md`. Adding YesNo/Date/Time widened the set of
  // names an author can collide with, which is why it is worth a test.
  const localDate = {
    Date: {
      code: "Date",
      domain_code: "scheduling",
      description: "A slot date",
      structure_class_name: "scheduling__Date",
      refines: null,
    },
  };

  it("resolves a bare ref to the local declaration, not the native", () => {
    const parts = parseConceptRef("Date");
    expect(resolveConceptInfo(parts!, "scheduling", localDate)).toBe(localDate.Date);
  });

  it("still resolves an explicitly native-qualified ref to the native", () => {
    const parts = parseConceptRef("native.Date");
    expect(resolveConceptInfo(parts!, "scheduling", localDate)).toMatchObject({
      domain_code: "native",
      structure_class_name: "DateContent",
    });
  });
});

describe("resolveStuffSpec — multiplicity on the new natives", () => {
  it("parses an indeterminate-many YesNo", () => {
    const spec = resolveStuffSpec("YesNo[]", "screening", {});
    expect(spec?.multiplicity).toBe(true);
    expect(spec?.concept).toMatchObject({ code: "YesNo", domain_code: "native" });
  });

  it("parses a fixed-count Date", () => {
    const spec = resolveStuffSpec("Date[2]", "screening", {});
    expect(spec?.multiplicity).toBe(2);
    expect(spec?.concept).toMatchObject({ code: "Date", domain_code: "native" });
  });
});

describe("refines qualification", () => {
  it('qualifies refines = "YesNo" into the native domain', () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "screening"

[concept.Verdict]
description = "A hiring verdict"
refines     = "YesNo"
`);
    expect(diagnostics).toEqual([]);
    expect(bundle.concepts.Verdict.refines).toBe("native.YesNo");
  });
});

describe("end-to-end through the static builder", () => {
  it("lands a native YesNo output stuff", () => {
    const { spec, diagnostics } = buildStaticGraphSpecFromToml(`
domain = "screening"
main_pipe = "is_qualified"

[pipe.is_qualified]
type = "PipeLLM"
description = "Decide whether the candidate qualifies"
inputs = { cv = "Document" }
output = "YesNo"
prompt = "Does @cv qualify?"
`);
    expect(diagnostics).toEqual([]);
    expect(spec.nodes[0].io.outputs).toEqual([
      { name: "yes_no", digest: "screening.is_qualified:yes_no", concept: "YesNo" },
    ]);
    expect(spec.concept_registry?.["native.YesNo"]).toMatchObject({
      domain_code: "native",
      structure_class_name: "YesNoContent",
    });
  });
});
