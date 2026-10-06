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

/**
 * The codes pipelex's `NativeConceptCode` defines, in its order: the MTHDS
 * standard's pinned set, with `Markdown`, which pipelex defines ahead of it.
 */
const SPEC_NATIVE_CODES = [
  "Dynamic",
  "Text",
  "Markdown",
  "Image",
  "Document",
  "Html",
  "TextAndImages",
  "Number",
  "YesNo",
  "Choice",
  "Rating",
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
  it.each(["YesNo", "Date", "Time", "Choice", "Rating", "Markdown"])(
    "resolves %s into the native domain",
    (code) => {
      const info = resolve(code);
      expect(info).toMatchObject({
        code,
        domain_code: "native",
        structure_class_name: `${code}Content`,
      });
      expect(info.description).not.toBe("");
    },
  );

  it("records Markdown as refining Text, as the runtime does", () => {
    expect(resolve("Markdown")).toMatchObject({
      description: "A text written in Markdown",
      refines: "native.Text",
    });
    expect(resolve("Choice").refines).toBeNull();
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
  // L-260929-79b6e6. Adding YesNo/Date/Time widened the set of names an author
  // can collide with, which is why it is worth a test.
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

  it.each(["Choice", "Rating", "Markdown"])(
    'qualifies refines = "%s" into the native domain',
    (code) => {
      const { bundle, diagnostics } = parseMthdsBundle(`
domain = "support"

[concept.Graded]
description = "A refined native"
refines     = "${code}"
`);
      expect(diagnostics).toEqual([]);
      expect(bundle.concepts.Graded.refines).toBe(`native.${code}`);
    },
  );
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

describe("Choice, Rating and Markdown through the static builder", () => {
  const { spec, diagnostics } = buildStaticGraphSpecFromToml(`
domain = "support"
main_pipe = "triage"

[concept.Team]
description = "The team a ticket goes to"
refines = "Choice"

[pipe.triage]
type = "PipeSequence"
description = "Reads a verdict, a rating and a team"
inputs = { verdict = "Choice", damage = "Rating", team = "Team" }
output = "Markdown"
steps = [
  { from = "verdict.choice", result = "option" },
  { from = "damage.level", result = "level" },
  { from = "damage.probabilities", result = "distribution" },
  { from = "team.confidence", result = "team_confidence" },
  { pipe = "write_report", result = "report" },
]

[pipe.write_report]
type = "PipeLLM"
description = "Writes the report"
inputs = { option = "Text", level = "Number", distribution = "JSON", team_confidence = "Number" }
output = "Markdown"
prompt = "Report on $option, $level, $distribution and $team_confidence"
`);

  it("reports nothing", () => {
    expect(diagnostics).toEqual([]);
  });

  it("reads bare input and output refs as natives", () => {
    const sequence = spec.nodes.find((node) => node.id === "support.triage");
    expect(sequence?.io.inputs.map((item) => item.concept)).toEqual(["Choice", "Rating", "Team"]);
    expect(spec.concept_registry?.["native.Choice"]).toMatchObject({
      domain_code: "native",
      structure_class_name: "ChoiceContent",
    });
    expect(spec.concept_registry?.["native.Rating"]).toMatchObject({ domain_code: "native" });
    expect(spec.concept_registry?.["native.Markdown"]).toMatchObject({
      domain_code: "native",
      refines: "native.Text",
    });
    expect(spec.concept_registry?.["support.Team"]?.refines).toBe("native.Choice");
  });

  it("binds their fields with their native types, a refinement's included", () => {
    const bound = Object.fromEntries(
      spec.nodes
        .filter((node) => node.kind === "binding")
        .map((node) => [node.io.outputs[0].name, node.io.outputs[0].concept]),
    );
    expect(bound).toEqual({
      option: "Text",
      level: "Number",
      distribution: "JSON",
      team_confidence: "Number",
    });
  });
});
