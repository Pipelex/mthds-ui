import { describe, expect, it } from "vitest";

import { buildGraph } from "@graph/graphBuilders";
import type {
  GraphSpec,
  GraphSpecNode,
  PipeParallelBlueprint,
  PipeSequenceBlueprint,
} from "@graph/types";
import { BINDING_STEP_TYPE, NODE_TYPE_PIPE_CARD } from "@graph/types";
import { validateGraphSpec } from "@graph/validateGraphSpec";

import { buildStaticGraphSpecFromToml } from "../buildStaticGraphSpec";
import { parseMthdsBundle } from "../parseMthdsBundle";

const CATALOG_CONCEPTS = `
[concept.CatalogPage]
description = "A page of a catalog"
[concept.CatalogPage.structure]
title = { type = "text", description = "The title of the page", required = true }

[concept.Catalog]
description = "A catalog"
[concept.Catalog.structure]
season = { type = "text", description = "The season", required = true }
pages = { type = "list", item_type = "concept", item_concept_ref = "CatalogPage", description = "The pages", required = true }
`;

const WRITE_LINE = `
[pipe.write_line]
type = "PipeCompose"
description = "Writes one line"
inputs = { page = "CatalogPage" }
output = "Text"
template = "Page: {{ page.title }}"
`;

/** A sequence over `catalog`, with `steps` as written, plus the pipes the steps call. */
function sequenceOf(steps: string, extra = ""): string {
  return `
domain = "nursery"
main_pipe = "run_all"
${CATALOG_CONCEPTS}
[pipe.run_all]
type = "PipeSequence"
description = "Runs the steps"
inputs = { catalog = "Catalog" }
output = "Text[]"
steps = [
${steps}
]
${WRITE_LINE}
[pipe.say_season]
type = "PipeCompose"
description = "Says the season"
inputs = { season = "Text" }
output = "Text"
template = "Season: $season"
${extra}
`;
}

function stepsOf(toml: string) {
  const { bundle, diagnostics } = parseMthdsBundle(toml);
  return {
    steps: (bundle.pipes.run_all as PipeSequenceBlueprint).sequential_sub_pipes,
    diagnostics,
  };
}

function build(toml: string) {
  const { spec, diagnostics } = buildStaticGraphSpecFromToml(toml);
  validateGraphSpec(spec);
  return { spec, diagnostics };
}

function nodeById(spec: GraphSpec, id: string): GraphSpecNode {
  const node = spec.nodes.find((candidate) => candidate.id === id);
  if (node === undefined) {
    throw new Error(`node "${id}" not found; have: ${spec.nodes.map((n) => n.id).join(", ")}`);
  }
  return node;
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

describe("parsing a binding step", () => {
  it("holds a from step as the runtime holds it", () => {
    const { steps, diagnostics } = stepsOf(
      sequenceOf(`  { from = "catalog.season", result = "season" },
  { pipe = "say_season", result = "said" },`),
    );
    expect(diagnostics).toEqual([]);
    expect(steps).toEqual([
      { from_path: "catalog.season", output_name: "season", is_dotted_batch_over: false },
      expect.objectContaining({ pipe_code: "say_season", output_name: "said" }),
    ]);
  });

  it.each([
    ['{ from = "catalog.season", pipe = "say_season", result = "season" }', "both"],
    ['{ from = "catalog.season" }', 'no "result"'],
    ['{ from = "catalog..season", result = "season" }', "not a path"],
    ['{ from = "_private", result = "season" }', "not a path"],
    ['{ from = 42, result = "season" }', "not a path"],
    ['{ from = "catalog.season", result = "Season" }', "not a plain name"],
    ['{ from = "catalog.season", result = "the.season" }', "not a plain name"],
    ['{ from = "catalog.season", result = "9season" }', "not a plain name"],
    ['{ from = "catalog.pages", result = "_bound_catalog_pages" }', 'prefix "_bound_"'],
  ])("skips %s and says why", (step, why) => {
    const { steps, diagnostics } = stepsOf(sequenceOf(`  ${step},`));
    expect(steps).toEqual([]);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      code: "invalid-binding-step",
      path: "pipe.run_all.steps[0]",
    });
    expect(diagnostics[0].message).toContain(why);
  });

  it("reports a pipe step's key carried by a binding step and still holds the binding", () => {
    const { steps, diagnostics } = stepsOf(
      sequenceOf(`  { from = "catalog.pages", result = "pages", batch_as = "page" },`),
    );
    expect(steps).toEqual([
      { from_path: "catalog.pages", output_name: "pages", is_dotted_batch_over: false },
    ]);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toBe("invalid-binding-step");
    expect(diagnostics[0].message).toContain('"batch_as"');
  });
});

describe("parsing a dotted batch_over", () => {
  it("holds it as a binding under a private name, then the batch over that name", () => {
    const { steps, diagnostics } = stepsOf(
      sequenceOf(
        `  { pipe = "write_line", batch_over = "catalog.pages", batch_as = "page", result = "lines" },`,
      ),
    );
    expect(diagnostics).toEqual([]);
    expect(steps).toEqual([
      {
        from_path: "catalog.pages",
        output_name: "_bound_catalog_pages",
        is_dotted_batch_over: true,
      },
      expect.objectContaining({
        pipe_code: "write_line",
        output_name: "lines",
        batch_params: {
          input_list_stuff_name: "_bound_catalog_pages",
          input_item_stuff_name: "page",
        },
      }),
    ]);
  });

  it("numbers the private name when the sequence already holds that spelling", () => {
    const { steps } = stepsOf(
      sequenceOf(`  { pipe = "write_line", batch_over = "catalog.pages", batch_as = "page", result = "lines" },
  { pipe = "write_line", batch_over = "catalog.pages", batch_as = "page", result = "lines_again" },`),
    );
    expect(steps.map((step) => step.output_name)).toEqual([
      "_bound_catalog_pages",
      "lines",
      "_bound_catalog_pages_2",
      "lines_again",
    ]);
  });

  it("keeps clear of a name the sequence already holds", () => {
    // Only reachable on a bundle the runtime refuses, since no plain name takes
    // the prefix, but the numbering still never reuses a name in scope.
    const { steps } = stepsOf(
      sequenceOf(
        `  { pipe = "write_line", batch_over = "catalog.pages", batch_as = "page", result = "lines" },`,
      ).replace(
        'inputs = { catalog = "Catalog" }',
        'inputs = { catalog = "Catalog", _bound_catalog_pages = "Text" }',
      ),
    );
    expect(steps[0]).toMatchObject({
      output_name: "_bound_catalog_pages_2",
      is_dotted_batch_over: true,
    });
  });

  it("batches over a malformed dotted path as a name, and says so", () => {
    const { steps, diagnostics } = stepsOf(
      sequenceOf(
        `  { pipe = "write_line", batch_over = "catalog..pages", batch_as = "page", result = "lines" },`,
      ),
    );
    expect(steps).toEqual([
      expect.objectContaining({
        batch_params: { input_list_stuff_name: "catalog..pages", input_item_stuff_name: "page" },
      }),
    ]);
    expect(diagnostics.map((d) => d.code)).toEqual(["invalid-binding-step"]);
  });
});

describe("parsing a parallel's branches", () => {
  const parallelOf = (branch: string) => `
domain = "nursery"
${CATALOG_CONCEPTS}
[pipe.fan_out]
type = "PipeParallel"
description = "Fans out"
inputs = { catalog = "Catalog" }
output = "Text"
branches = [
  ${branch},
  { pipe = "say_season", result = "said" },
]
add_each_output = true
`;

  it("refuses a binding step as a branch", () => {
    const { bundle, diagnostics } = parseMthdsBundle(
      parallelOf('{ from = "catalog.season", result = "season" }'),
    );
    const parallel = bundle.pipes.fan_out as PipeParallelBlueprint;
    expect(parallel.parallel_sub_pipes.map((branch) => branch.pipe_code)).toEqual(["say_season"]);
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: "invalid-binding-step", path: "pipe.fan_out.branches[0]" }),
    ]);
  });

  it("refuses a branch batching over a dotted path", () => {
    const { bundle, diagnostics } = parseMthdsBundle(
      parallelOf(
        '{ pipe = "write_line", batch_over = "catalog.pages", batch_as = "page", result = "lines" }',
      ),
    );
    const parallel = bundle.pipes.fan_out as PipeParallelBlueprint;
    expect(parallel.parallel_sub_pipes.map((branch) => branch.pipe_code)).toEqual(["say_season"]);
    expect(diagnostics[0].message).toContain("catalog.pages");
  });
});

// ─── Building ────────────────────────────────────────────────────────────────

describe("building a binding step", () => {
  const BOUND = sequenceOf(`  { from = "catalog.season", result = "season" },
  { pipe = "say_season", result = "said" },`);

  it("draws a binding node shaped as a run draws it", () => {
    const { spec, diagnostics } = build(BOUND);
    expect(diagnostics).toEqual([]);
    const binding = nodeById(spec, "nursery.run_all/step_1");
    expect(binding).toMatchObject({
      kind: "binding",
      pipe_code: "catalog.season",
      pipe_type: BINDING_STEP_TYPE,
      description: "Binds 'catalog.season' to 'season'",
      domain_code: "nursery",
      status: "scheduled",
      execution_data: { from: "catalog.season", result: "season" },
      io: {
        inputs: [{ name: "catalog", digest: "input:catalog", concept: "Catalog" }],
        outputs: [{ name: "season", digest: "nursery.run_all/step_1:season", concept: "Text" }],
      },
    });
    expect(spec.edges).toContainEqual(
      expect.objectContaining({ kind: "contains", source: "nursery.run_all", target: binding.id }),
    );
  });

  it("feeds what it binds to the step that reads it", () => {
    const { spec } = build(BOUND);
    const reader = nodeById(spec, "nursery.run_all/step_2");
    expect(reader.io.inputs).toEqual([
      { name: "season", digest: "nursery.run_all/step_1:season", concept: "Text" },
    ]);
  });

  it("is the sequence's output when it is the last step", () => {
    const { spec } = build(sequenceOf(`  { from = "catalog.pages", result = "pages" },`));
    const sequence = nodeById(spec, "nursery.run_all");
    expect(sequence.io.outputs).toEqual([
      {
        name: "pages",
        digest: "nursery.run_all/step_1:pages",
        concept: "CatalogPage",
        multiplicity: true,
      },
    ]);
  });

  it("binds native.Anything and reports a path it cannot walk", () => {
    const { spec, diagnostics } = build(
      sequenceOf(`  { from = "catalog.missing", result = "x" },`),
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({
        severity: "warning",
        code: "binding-path-unresolved",
        path: "nursery.run_all/step_1",
        domain_code: "nursery",
      }),
    ]);
    expect(diagnostics[0].message).toContain("no field 'missing'");
    expect(nodeById(spec, "nursery.run_all/step_1").io.outputs[0].concept).toBe("Anything");
  });

  it("reads a root nothing holds as a dangling input", () => {
    const { spec, diagnostics } = build(sequenceOf(`  { from = "stranger", result = "x" },`));
    expect(diagnostics).toEqual([]);
    expect(nodeById(spec, "nursery.run_all/step_1").io.inputs).toEqual([
      { name: "stranger", digest: "input:stranger", concept: "Anything" },
    ]);
  });

  it("is drawn as a card by the graph builder", () => {
    const { spec } = build(BOUND);
    const { graphData } = buildGraph(spec, "bezier");
    const card = graphData.nodes.find((node) => node.id === "nursery.run_all/step_1");
    expect(card?.type).toBe(NODE_TYPE_PIPE_CARD);
    expect(card?.data.pipeType).toBe(BINDING_STEP_TYPE);
  });

  it("picks the entry pipe past a binding step, which references no pipe", () => {
    const toml = sequenceOf(`  { from = "catalog.season", result = "season" },
  { pipe = "say_season", result = "said" },`).replace('main_pipe = "run_all"', "");
    const { spec } = buildStaticGraphSpecFromToml(toml);
    expect(spec.pipeline_ref).toEqual({ domain: "nursery", main_pipe: "run_all" });
  });
});

describe("building a dotted batch_over", () => {
  const DOTTED = sequenceOf(
    `  { pipe = "write_line", batch_over = "catalog.pages", batch_as = "page", result = "lines" },`,
  );

  it("draws a binding followed by the batch over the bound list", () => {
    const { spec, diagnostics } = build(DOTTED);
    expect(diagnostics).toEqual([]);
    const binding = nodeById(spec, "nursery.run_all/step_1");
    expect(binding).toMatchObject({
      kind: "binding",
      pipe_code: "catalog.pages",
      io: {
        outputs: [
          {
            name: "_bound_catalog_pages",
            concept: "CatalogPage",
            multiplicity: true,
          },
        ],
      },
    });
    const batch = nodeById(spec, "nursery.run_all/step_2");
    expect(batch).toMatchObject({
      kind: "controller",
      pipe_type: "PipeBatch",
      pipe_code: "write_line_batch",
    });
    expect(batch.io.inputs).toEqual([binding.io.outputs[0]]);
    expect(spec.edges).toContainEqual(
      expect.objectContaining({
        kind: "batch_item",
        source: batch.id,
        source_stuff_digest: binding.io.outputs[0].digest,
      }),
    );
  });

  it("types the batch's item by the bound list's concept", () => {
    const { spec } = build(DOTTED);
    const branch = nodeById(spec, "nursery.run_all/step_2/batch_branch");
    expect(branch.io.inputs[0]).toMatchObject({ name: "page", concept: "CatalogPage" });
  });
});
