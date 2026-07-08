import { describe, expect, it } from "vitest";

import type {
  PipeBatchBlueprint,
  PipeComposeBlueprint,
  PipeConditionBlueprint,
  PipeExtractBlueprint,
  PipeImgGenBlueprint,
  PipeLLMBlueprint,
  PipeParallelBlueprint,
  PipeSequenceBlueprint,
  PipeSignatureBlueprint,
  PipeStructureBlueprint,
} from "@graph/types";

import { parseMthdsBundle } from "../parseMthdsBundle";

const HAPPY_BUNDLE = `
domain      = "screening"
description = "CV screening method"
main_pipe   = "process_cv"

[concept.Profile]
description = "A candidate profile"

[concept.Profile.structure]
name   = { type = "text", description = "Full name", required = true }
skills = { type = "list", description = "Key skills", item_type = "text" }
level  = { type = "text", description = "Seniority", choices = ["junior", "senior"] }
notes  = "Free-form notes"

[concept.Report]
description = "Screening report"
refines     = "Text"

[pipe.process_cv]
type = "PipeSequence"
description = "Full screening"
inputs = { cv = "Document" }
output = "Report"
steps = [
  { pipe = "extract_cv", result = "pages" },
  { pipe = "analyze", result = "profile", batch_over = "pages", batch_as = "page" },
  { pipe = "report", result = "report", nb_output = 2 },
]

[pipe.extract_cv]
type        = "PipeExtract"
description = "Extract pages"
inputs      = { cv = "Document" }
output      = "Page[]"

[pipe.analyze]
type = "PipeLLM"
description = "Analyze one page"
inputs = { page = "Page" }
output = "Profile"
model = "smart-model"
system_prompt = "You are an analyst."
prompt = "Analyze @page"

[pipe.report]
type        = "PipeCompose"
description = "Compose the report"
inputs      = { profile = "Profile" }
output      = "Report"
template    = "# Report for $profile.name"
`;

describe("parseMthdsBundle — happy path", () => {
  const { bundle, diagnostics } = parseMthdsBundle(HAPPY_BUNDLE);

  it("reads the bundle header", () => {
    expect(bundle.domain).toBe("screening");
    expect(bundle.description).toBe("CV screening method");
    expect(bundle.main_pipe).toBe("process_cv");
    expect(diagnostics).toEqual([]);
  });

  it("parses concepts with structure into ConceptInfo + json_schema", () => {
    const profile = bundle.concepts.Profile;
    expect(profile).toMatchObject({
      code: "Profile",
      domain_code: "screening",
      description: "A candidate profile",
      structure_class_name: "screening__Profile",
      refines: null,
    });
    expect(profile.json_schema).toMatchObject({
      type: "object",
      required: ["name"],
    });
    const properties = profile.json_schema?.properties as Record<string, Record<string, unknown>>;
    expect(properties.name).toMatchObject({ type: "string", description: "Full name" });
    expect(properties.skills).toMatchObject({ type: "array", items: { type: "string" } });
    expect(properties.level).toMatchObject({ enum: ["junior", "senior"] });
    expect(properties.notes).toMatchObject({ type: "string", description: "Free-form notes" });
  });

  it("qualifies refines refs like the runtime registry", () => {
    expect(bundle.concepts.Report.refines).toBe("native.Text");
  });

  it("normalizes a sequence to sequential_sub_pipes", () => {
    const sequence = bundle.pipes.process_cv as PipeSequenceBlueprint;
    expect(sequence.type).toBe("PipeSequence");
    expect(sequence.pipe_category).toBe("PipeController");
    expect(sequence.inputs.cv.concept).toMatchObject({ code: "Document", domain_code: "native" });
    expect(sequence.output.concept).toMatchObject({ code: "Report", domain_code: "screening" });
    expect(sequence.sequential_sub_pipes).toEqual([
      {
        pipe_code: "extract_cv",
        output_name: "pages",
        output_multiplicity: null,
        batch_params: null,
      },
      {
        pipe_code: "analyze",
        output_name: "profile",
        output_multiplicity: true,
        batch_params: { input_list_stuff_name: "pages", input_item_stuff_name: "page" },
      },
      { pipe_code: "report", output_name: "report", output_multiplicity: 2, batch_params: null },
    ]);
  });

  it("resolves output multiplicity from the concept ref suffix", () => {
    const extract = bundle.pipes.extract_cv as PipeExtractBlueprint;
    expect(extract.output.concept.code).toBe("Page");
    expect(extract.output.multiplicity).toBe(true);
    expect(extract.document_stuff_name).toBe("cv");
  });

  it("normalizes PipeLLM prompts and model choices", () => {
    const llm = bundle.pipes.analyze as PipeLLMBlueprint;
    expect(llm.llm_prompt_spec.prompt_blueprint).toMatchObject({
      template: "Analyze @page",
      category: "llm_prompt",
    });
    expect(llm.llm_prompt_spec.system_prompt_blueprint).toMatchObject({
      template: "You are an analyst.",
    });
    expect(llm.llm_choices).toEqual({ for_text: "smart-model", for_object: null });
    expect(llm.output.concept).toBe(bundle.concepts.Profile);
  });

  it("normalizes PipeCompose templates", () => {
    const compose = bundle.pipes.report as PipeComposeBlueprint;
    expect(compose.template).toBe("# Report for $profile.name");
    expect(compose.construct_blueprint).toBeNull();
  });
});

describe("parseMthdsBundle — controllers and operators", () => {
  it("normalizes PipeParallel branches", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.par]
type = "PipeParallel"
description = "Fan out"
inputs = { text = "Text" }
output = "Text"
add_each_output = true
combined_output = "Composite"
branches = [
  { pipe = "a", result = "ra" },
  { pipe = "b", result = "rb" },
]
`);
    const parallel = bundle.pipes.par as PipeParallelBlueprint;
    expect(parallel.parallel_sub_pipes.map((sub) => sub.pipe_code)).toEqual(["a", "b"]);
    expect(parallel.add_each_output).toBe(true);
    expect(parallel.combined_output).toBe("Composite");
  });

  it("normalizes PipeCondition outcomes, keeping special default outcomes", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.route]
type = "PipeCondition"
description = "Route"
inputs = { classified = "Text" }
output = "Text"
expression = "classified.language"
default_outcome = "fail"
add_alias_from_expression_to = "lang"

[pipe.route.outcomes]
english = "passthrough"
french = "translate_french"
`);
    const condition = bundle.pipes.route as PipeConditionBlueprint;
    expect(condition.expression).toBe("classified.language");
    expect(condition.outcome_map).toEqual({ english: "passthrough", french: "translate_french" });
    expect(condition.default_outcome).toBe("fail");
    expect(condition.add_alias_from_expression_to).toBe("lang");
  });

  it("falls back to expression_template when expression is absent", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.route]
type = "PipeCondition"
description = "Route"
output = "Text"
expression_template = "{{ x }}"
default_outcome = "other"
outcomes = { a = "pa" }
`);
    expect((bundle.pipes.route as PipeConditionBlueprint).expression).toBe("{{ x }}");
  });

  it("normalizes PipeBatch to runtime batch_params", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.each_page]
type = "PipeBatch"
description = "Per page"
inputs = { pages = "Page[]" }
output = "Text[]"
branch_pipe_code = "summarize"
input_list_name = "pages"
input_item_name = "page"
`);
    const batch = bundle.pipes.each_page as PipeBatchBlueprint;
    expect(batch.branch_pipe_code).toBe("summarize");
    expect(batch.batch_params).toEqual({
      input_list_stuff_name: "pages",
      input_item_stuff_name: "page",
    });
  });

  it("normalizes PipeImgGen with fixed-count output multiplicity", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.gen]
type = "PipeImgGen"
description = "Generate"
output = "Image[4]"
prompt = "A card"
negative_prompt = "blurry"
aspect_ratio = "16:9"
seed = "auto"
`);
    const imgGen = bundle.pipes.gen as PipeImgGenBlueprint;
    expect(imgGen.output_multiplicity).toBe(4);
    expect(imgGen.img_gen_prompt_blueprint.prompt_blueprint?.template).toBe("A card");
    expect(imgGen.img_gen_prompt_blueprint.negative_prompt_blueprint?.template).toBe("blurry");
    expect(imgGen.aspect_ratio).toBe("16:9");
    expect(imgGen.seed).toBe("auto");
  });

  it("extracts a model string from an inline model setting table", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.llm]
type = "PipeLLM"
description = "LLM"
output = "Text"
prompt = "Go"
model = { model = "big-brain", temperature = 0.2 }
`);
    expect((bundle.pipes.llm as PipeLLMBlueprint).llm_choices?.for_text).toBe("big-brain");
  });

  it("normalizes a PipeCompose construct table", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.build]
type = "PipeCompose"
description = "Build"
output = "Text"

[pipe.build.construct]
title = "Fixed title"
score = { from = "match.score" }
body = { template = "Report: {{ analysis }}" }
`);
    const compose = bundle.pipes.build as PipeComposeBlueprint;
    expect(compose.construct_blueprint?.fields).toEqual({
      title: { method: "fixed", fixed_value: "Fixed title" },
      score: { method: "from_var", from_path: "match.score", list_to_dict_keyed_by: null },
      body: { method: "template", template: "Report: {{ analysis }}" },
    });
  });

  it("normalizes PipeStructure and PipeSignature", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.structure_it]
type = "PipeStructure"
description = "Structure"
inputs = { draft = "Text" }
output = "Text"

[pipe.todo_pipe]
type = "PipeSignature"
description = "To be implemented"
inputs = { text = "Text" }
output = "Text"
signature_for = "PipeLLM"
`);
    const structure = bundle.pipes.structure_it as PipeStructureBlueprint;
    expect(structure.text_input_name).toBe("draft");
    const signature = bundle.pipes.todo_pipe as PipeSignatureBlueprint;
    expect(signature.pipe_category).toBeNull();
    expect(signature.signature_for).toBe("PipeLLM");
  });
});

describe("parseMthdsBundle — lenient degradation", () => {
  it("returns an empty bundle plus an error diagnostic on garbage TOML", () => {
    const { bundle, diagnostics } = parseMthdsBundle("not toml [[[");
    expect(bundle.pipes).toEqual({});
    expect(bundle.concepts).toEqual({});
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ severity: "error", code: "toml-parse-error" });
  });

  it("parses an empty string to an empty bundle with a missing-domain warning", () => {
    const { bundle, diagnostics } = parseMthdsBundle("");
    expect(bundle.domain).toBeNull();
    expect(bundle.pipes).toEqual({});
    expect(diagnostics).toEqual([
      expect.objectContaining({ severity: "warning", code: "missing-domain" }),
    ]);
  });

  it("skips a pipe without a usable type, keeping the rest", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
[pipe.mystery]
description = "No type yet"

[pipe.weird]
type = "PipeTeleport"
description = "Unknown class"
output = "Text"

[pipe.good]
type = "PipeLLM"
description = "Fine"
output = "Text"
prompt = "Go"
`);
    expect(Object.keys(bundle.pipes)).toEqual(["good"]);
    expect(diagnostics.filter((d) => d.code === "unknown-pipe-type")).toHaveLength(2);
  });

  it("assumes native.Anything when a pipe has no output", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
[pipe.wip]
type = "PipeLLM"
description = "Half-written"
prompt = "Go"
`);
    const wip = bundle.pipes.wip as PipeLLMBlueprint;
    expect(wip.output.concept).toMatchObject({ code: "Anything", domain_code: "native" });
    expect(diagnostics).toContainEqual(
      expect.objectContaining({ code: "missing-pipe-output", path: "pipe.wip.output" }),
    );
  });

  it("keeps quoted dotted input names verbatim and skips nested-table inputs", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
[pipe.uses_path]
type = "PipeLLM"
description = "Reads a sub-path"
inputs = { "doc.title" = "Text", broken = 42 }
output = "Text"
prompt = "Go"
`);
    const pipe = bundle.pipes.uses_path as PipeLLMBlueprint;
    expect(Object.keys(pipe.inputs)).toEqual(["doc.title"]);
    expect(pipe.inputs["doc.title"].concept.code).toBe("Text");
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: "invalid-concept-ref",
        path: "pipe.uses_path.inputs.broken",
      }),
    );
  });

  it("warns and drops batching when only one of batch_over/batch_as is set", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
[pipe.seq]
type = "PipeSequence"
description = "Seq"
output = "Text"
steps = [
  { pipe = "child", result = "r", batch_over = "items" },
]
`);
    const sequence = bundle.pipes.seq as PipeSequenceBlueprint;
    expect(sequence.sequential_sub_pipes[0].batch_params).toBeNull();
    expect(sequence.sequential_sub_pipes[0].output_multiplicity).toBeNull();
    expect(diagnostics).toContainEqual(expect.objectContaining({ code: "incomplete-batch-spec" }));
  });

  it("skips sub-pipe entries without a pipe ref", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
[pipe.seq]
type = "PipeSequence"
description = "Seq"
output = "Text"
steps = [
  { result = "r" },
  { pipe = "real", result = "ok" },
]
`);
    const sequence = bundle.pipes.seq as PipeSequenceBlueprint;
    expect(sequence.sequential_sub_pipes.map((sub) => sub.pipe_code)).toEqual(["real"]);
    expect(diagnostics).toContainEqual(expect.objectContaining({ code: "invalid-sub-pipe" }));
  });

  it("treats referenced-but-undeclared concepts as current-domain stubs", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[pipe.llm]
type = "PipeLLM"
description = "LLM"
inputs = { thing = "NotDeclared", other = "elsewhere.Foreign[]" }
output = "Text"
prompt = "Go"
`);
    const llm = bundle.pipes.llm as PipeLLMBlueprint;
    expect(llm.inputs.thing.concept).toMatchObject({ code: "NotDeclared", domain_code: "d" });
    expect(llm.inputs.other.concept).toMatchObject({
      code: "Foreign",
      domain_code: "elsewhere",
    });
    expect(llm.inputs.other.multiplicity).toBe(true);
  });

  it("tolerates malformed concept entries and sections", () => {
    const { bundle, diagnostics } = parseMthdsBundle(`
domain = "d"
concept = 12
pipe = false
`);
    expect(bundle.concepts).toEqual({});
    expect(bundle.pipes).toEqual({});
    expect(diagnostics.filter((d) => d.code === "invalid-bundle-shape")).toHaveLength(2);
  });

  it("accepts the shorthand concept form", () => {
    const { bundle } = parseMthdsBundle(`
domain = "d"
[concept]
Quick = "A quick concept"
`);
    expect(bundle.concepts.Quick).toMatchObject({
      code: "Quick",
      description: "A quick concept",
      structure_class_name: "d__Quick",
    });
  });
});
