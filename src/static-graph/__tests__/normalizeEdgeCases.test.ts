// Edge-case coverage for the lenient fallbacks in pipe normalization and
// concept resolution — malformed sections, partial tables, odd model shapes.

import { describe, expect, it } from "vitest";

import type {
  PipeBatchBlueprint,
  PipeComposeBlueprint,
  PipeExtractBlueprint,
  PipeFuncBlueprint,
  PipeLLMBlueprint,
  PipeSearchBlueprint,
  PipeSequenceBlueprint,
  PipeSignatureBlueprint,
  PipeStructureBlueprint,
} from "@graph/types";

import { parseConceptRef, resolveConceptInfo, resolveStuffSpec } from "../conceptRefs";
import { parseMthdsBundle } from "../parseMthdsBundle";

describe("concept resolution", () => {
  it("resolves native-qualified refs", () => {
    const spec = resolveStuffSpec("native.Text", "d", {});
    expect(spec?.concept).toMatchObject({ code: "Text", domain_code: "native" });
  });

  it("stubs a native-qualified ref to an unknown native code", () => {
    const parts = parseConceptRef("native.Bogus");
    expect(parts).not.toBeNull();
    const info = resolveConceptInfo(parts!, "d", {});
    expect(info).toMatchObject({ code: "Bogus", domain_code: "native", description: "" });
  });

  it("resolves an explicitly current-domain-qualified ref against local declarations", () => {
    const local = {
      Thing: {
        code: "Thing",
        domain_code: "d",
        description: "Local thing",
        structure_class_name: "d__Thing",
        refines: null,
      },
    };
    const parts = parseConceptRef("d.Thing");
    const info = resolveConceptInfo(parts!, "d", local);
    expect(info).toBe(local.Thing);
  });

  it("returns null for an unparseable stuff spec", () => {
    expect(resolveStuffSpec("not a ref!", "d", {})).toBeNull();
  });
});

describe("normalizePipe edge cases (through parseMthdsBundle)", () => {
  it("ignores a non-table inputs value with a warning", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
[pipe.p]
type = "PipeLLM"
description = "P"
inputs = "nope"
output = "Text"
prompt = "Go"
`);
    expect((bundle.pipes.p as PipeLLMBlueprint).inputs).toEqual({});
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: "invalid-pipe-entry", path: "pipe.p.inputs" }),
    );
  });

  it("reads the expanded input slot form to the same spec as the string form", () => {
    // The standard states the two forms equivalent: `x = "S"` and
    // `x = { concept = "S" }` are the same slot.
    const bundleToml = (notes: string) => `
domain = "d"
[pipe.p]
type = "PipeLLM"
description = "P"
inputs = { title = "Text", notes = ${notes} }
output = "Text"
prompt = "Go"
`;
    const expanded = parseMthdsBundle(
      bundleToml('{ concept = "Text?", hints = { intent = "prose" } }'),
    );
    const stringForm = parseMthdsBundle(bundleToml('"Text?"'));

    expect(expanded.diagnostics).toEqual([]);
    expect((expanded.bundle.pipes.p as PipeLLMBlueprint).inputs).toEqual(
      (stringForm.bundle.pipes.p as PipeLLMBlueprint).inputs,
    );
    expect((expanded.bundle.pipes.p as PipeLLMBlueprint).inputs.notes).toMatchObject({
      concept: { code: "Text", domain_code: "native" },
      multiplicity: null,
      presence: "optional",
    });
  });

  it("keeps the slot but names a key the input slot form does not define", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
[pipe.p]
type = "PipeLLM"
description = "P"
inputs = { notes = { concept = "Text", widget = "textarea" } }
output = "Text"
prompt = "Go"
`);
    expect((bundle.pipes.p as PipeLLMBlueprint).inputs.notes).toMatchObject({
      concept: { code: "Text", domain_code: "native" },
    });
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: "unknown-input-slot-key", path: "pipe.p.inputs.notes" }),
    );
  });

  it("drops a slot table that carries no usable concept", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
[pipe.p]
type = "PipeLLM"
description = "P"
inputs = { notes = { hints = { intent = "prose" } } }
output = "Text"
prompt = "Go"
`);
    expect((bundle.pipes.p as PipeLLMBlueprint).inputs).toEqual({});
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: "invalid-concept-ref", path: "pipe.p.inputs.notes" }),
    );
  });

  it("refuses the expanded form on output, which is always a string", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
[pipe.p]
type = "PipeLLM"
description = "P"
output = { concept = "Text" }
prompt = "Go"
`);
    expect((bundle.pipes.p as PipeLLMBlueprint).output.concept).toMatchObject({
      code: "Anything",
      domain_code: "native",
    });
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: "missing-pipe-output", path: "pipe.p.output" }),
    );
  });

  it("treats a non-array steps value as empty with a warning", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
[pipe.seq]
type = "PipeSequence"
description = "Seq"
output = "Text"
steps = "oops"
`);
    expect((bundle.pipes.seq as PipeSequenceBlueprint).sequential_sub_pipes).toEqual([]);
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: "invalid-pipe-entry", path: "pipe.seq.steps" }),
    );
  });

  it("tolerates a sequence without steps", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
[pipe.seq]
type = "PipeSequence"
description = "Seq"
output = "Text"
`);
    expect((bundle.pipes.seq as PipeSequenceBlueprint).sequential_sub_pipes).toEqual([]);
    expect(diagnostics.filter((d) => d.path === "pipe.seq.steps")).toEqual([]);
  });

  it("skips non-string outcome targets with a warning", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
[pipe.route]
type = "PipeCondition"
description = "Route"
output = "Text"
expression = "x"
default_outcome = "other"
[pipe.route.outcomes]
good = "handle_good"
bad = 42
`);
    const route = bundle.pipes.route;
    expect(route.type === "PipeCondition" && route.outcome_map).toEqual({ good: "handle_good" });
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ path: "pipe.route.outcomes.bad" }),
    );
  });

  it("defaults PipeBatch fields when absent", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
[pipe.batch]
type = "PipeBatch"
description = "Batch"
output = "Text[]"
`);
    const batch = bundle.pipes.batch as PipeBatchBlueprint;
    expect(batch.branch_pipe_code).toBe("");
    expect(batch.batch_params).toEqual({
      input_list_stuff_name: "",
      input_item_stuff_name: "",
    });
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ path: "pipe.batch.branch_pipe_code" }),
    );
  });

  it("normalizes PipeSearch options and filters non-string domain entries", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.search]
type = "PipeSearch"
description = "Search"
output = "SearchResult"
prompt = "find things"
model = { name = "searcher-1", kind = "search" }
include_images = true
max_results = 5
from_date = "2026-01-01"
to_date = "2026-02-01"
include_domains = ["a.com", 42]
exclude_domains = "not-an-array"
`);
    const search = bundle.pipes.search as PipeSearchBlueprint;
    expect(search.search_choice).toBe("searcher-1");
    expect(search.include_images_override).toBe(true);
    expect(search.max_results_override).toBe(5);
    expect(search.from_date).toBe("2026-01-01");
    expect(search.include_domains).toEqual(["a.com"]);
    expect(search.exclude_domains).toBeNull();
  });

  it("normalizes PipeExtract options, falling back to the first input name", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.extract]
type = "PipeExtract"
description = "Extract"
inputs = { web_page = "Text" }
output = "Page[]"
page_image_captions = true
page_views = true
page_views_dpi = 150
max_page_images = 10
render_js = false
include_raw_html = true
`);
    const extract = bundle.pipes.extract as PipeExtractBlueprint;
    expect(extract.document_stuff_name).toBe("web_page");
    expect(extract.should_caption_images).toBe(true);
    expect(extract.should_include_page_views).toBe(true);
    expect(extract.page_views_dpi).toBe(150);
    expect(extract.max_page_images).toBe(10);
    expect(extract.render_js).toBe(false);
    expect(extract.include_raw_html).toBe(true);
  });

  it("leaves both extract stuff names null when there are no inputs", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.extract]
type = "PipeExtract"
description = "Extract"
output = "Page[]"
`);
    const extract = bundle.pipes.extract as PipeExtractBlueprint;
    expect(extract.document_stuff_name).toBeNull();
    expect(extract.image_stuff_name).toBeNull();
  });

  it("classifies a native Image input as the image variable", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.extract]
type = "PipeExtract"
description = "Extract from a picture"
inputs = { picture = "Image" }
output = "Page[]"
`);
    const extract = bundle.pipes.extract as PipeExtractBlueprint;
    expect(extract.image_stuff_name).toBe("picture");
    expect(extract.document_stuff_name).toBeNull();
  });

  it("classifies an Image-refining concept input as the image variable", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[concept.Scan]
description = "A scanned image"
refines = "Image"

[pipe.extract]
type = "PipeExtract"
description = "Extract from a scan"
inputs = { scan = "Scan" }
output = "Page[]"
`);
    const extract = bundle.pipes.extract as PipeExtractBlueprint;
    expect(extract.image_stuff_name).toBe("scan");
    expect(extract.document_stuff_name).toBeNull();
  });

  it("normalizes a PipeCompose template given as a table", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.compose]
type = "PipeCompose"
description = "Compose"
output = "Text"
template = { template = "Hello", templating_style = "jinja2" }
`);
    const compose = bundle.pipes.compose as PipeComposeBlueprint;
    expect(compose.template).toBe("Hello");
    expect(compose.templating_style).toBe("jinja2");
  });

  it("keeps extra_context from a template table", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.compose]
type = "PipeCompose"
description = "Compose"
output = "Text"
template = { template = "Hello", extra_context = { audience = "engineers" } }
`);
    expect((bundle.pipes.compose as PipeComposeBlueprint).extra_context).toEqual({
      audience: "engineers",
    });
  });

  it("normalizes nested construct fields and drops uninterpretable ones", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.compose]
type = "PipeCompose"
description = "Compose"
output = "Text"
[pipe.compose.construct]
count = 3
flag = true
tags = ["a", "b"]
[pipe.compose.construct.meta]
author = { from = "profile.name" }
`);
    const compose = bundle.pipes.compose as PipeComposeBlueprint;
    expect(compose.construct_blueprint?.fields).toMatchObject({
      count: { method: "fixed", fixed_value: 3 },
      flag: { method: "fixed", fixed_value: true },
      tags: { method: "fixed", fixed_value: ["a", "b"] },
      meta: {
        method: "nested",
        nested: { fields: { author: { method: "from_var", from_path: "profile.name" } } },
      },
    });
  });

  it("returns a null construct when nothing in it is interpretable", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.compose]
type = "PipeCompose"
description = "Compose"
output = "Text"
[pipe.compose.construct]
[pipe.compose.construct.broken]
`);
    expect((bundle.pipes.compose as PipeComposeBlueprint).construct_blueprint).toBeNull();
  });

  it("handles PipeStructure with no inputs and a string model", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.structure_it]
type = "PipeStructure"
description = "Structure"
output = "Text"
model = "structurer"
`);
    const structure = bundle.pipes.structure_it as PipeStructureBlueprint;
    expect(structure.text_input_name).toBe("text");
    expect(structure.llm_choice).toBe("structurer");
  });

  it("keeps an inline model table on PipeStructure", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.structure_it]
type = "PipeStructure"
description = "Structure"
output = "Text"
model = { model = "structurer", temperature = 0.1 }
`);
    expect((bundle.pipes.structure_it as PipeStructureBlueprint).llm_choice).toMatchObject({
      model: "structurer",
    });
  });

  it("nulls an unknown signature_for hint", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.sig]
description = "Sig"
output = "Text"
signature_for = "PipeTeleport"
`);
    expect((bundle.pipes.sig as PipeSignatureBlueprint).signature_for).toBeNull();
  });

  it("normalizes PipeFunc to its base shape", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.fn]
type = "PipeFunc"
description = "Fn"
output = "Text"
function_name = "my_func"
`);
    const fn = bundle.pipes.fn as PipeFuncBlueprint;
    expect(fn.type).toBe("PipeFunc");
    expect(fn.pipe_category).toBe("PipeOperator");
  });

  it("ignores a model table without any usable string", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.llm]
type = "PipeLLM"
description = "LLM"
output = "Text"
prompt = "Go"
model = { temperature = 0.5 }
`);
    expect((bundle.pipes.llm as PipeLLMBlueprint).llm_choices?.for_text).toBeNull();
  });

  it("keeps structuring_method and model_to_structure", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.llm]
type = "PipeLLM"
description = "LLM"
output = "Text"
prompt = "Go"
model_to_structure = "structurer"
structuring_method = "preliminary_text"
`);
    const llm = bundle.pipes.llm as PipeLLMBlueprint;
    expect(llm.llm_choices?.for_object).toBe("structurer");
    expect(llm.structuring_method).toBe("preliminary_text");
  });
});

describe("concept parsing edge cases", () => {
  it("keeps a string structure as the structure class name", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[concept.Custom]
description = "Custom-backed concept"
structure = "MyCustomContent"
`);
    expect(bundle.concepts.Custom.structure_class_name).toBe("MyCustomContent");
    expect(bundle.concepts.Custom.json_schema).toBeUndefined();
  });

  it("skips a concept entry that is neither string nor table", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
[concept]
Good = "Fine"
Bad = 42
`);
    expect(Object.keys(bundle.concepts)).toEqual(["Good"]);
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: "invalid-concept-entry", path: "concept.Bad" }),
    );
  });

  it("maps the temporal/dict field types and default values into the json schema", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[concept.Event]
description = "An event"
[concept.Event.structure]
on = { type = "date", description = "The day it happens" }
when = { type = "datetime", description = "When it happens" }
at = { type = "time", description = "The time of day" }
extra = { type = "dict", description = "Extra data" }
kind = { type = "text", description = "Kind", default_value = "meeting" }
raw = { type = "unknown_type", description = "Odd" }
`);
    const properties = bundle.concepts.Event.json_schema?.properties as Record<
      string,
      Record<string, unknown>
    >;
    // `datetime` and `time` arrived with pipelex 0.41.0; `date` narrowed to a
    // plain calendar date once `datetime` existed as its own type.
    expect(properties.on).toMatchObject({ type: "string", format: "date" });
    expect(properties.when).toMatchObject({ type: "string", format: "date-time" });
    expect(properties.at).toMatchObject({ type: "string", format: "time" });
    expect(properties.extra).toMatchObject({ type: "object" });
    expect(properties.kind).toMatchObject({ default: "meeting" });
    expect(properties.raw).toMatchObject({ type: "string" });
  });

  it("qualifies an explicitly-qualified refines ref verbatim", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[concept.Special]
description = "Special"
refines = "other.Base"
`);
    expect(bundle.concepts.Special.refines).toBe("other.Base");
  });

  it("replaces dots in hierarchical domain codes for the structure class name", () => {
    const { bundle } = parseMthdsBundle(`
domain = "legal.contracts.shareholder"
[concept.Result]
description = "A result"
`);
    expect(bundle.concepts.Result.structure_class_name).toBe("legal·contracts·shareholder__Result");
  });

  it("qualifies refines to the current domain when the code is declared locally", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[concept.Text]
description = "Shadows the native Text"
[concept.Fancy]
description = "Fancy"
refines = "Text"
`);
    expect(bundle.concepts.Fancy.refines).toBe("d.Text");
  });
});

describe("pipe section edge cases", () => {
  it("skips a pipe entry that is not a table", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
[pipe]
broken = "not a pipe"

[pipe.good]
type = "PipeLLM"
description = "Fine"
output = "Text"
prompt = "Go"
`);
    expect(Object.keys(bundle.pipes)).toEqual(["good"]);
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: "invalid-pipe-entry", path: "pipe.broken" }),
    );
  });
});
