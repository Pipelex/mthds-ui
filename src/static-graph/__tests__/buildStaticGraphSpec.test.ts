import { validateGraphSpec } from "@graph/validateGraphSpec";
import { describe, expect, it } from "vitest";

import type { StaticGraphOptions } from "../buildStaticGraphSpec";
import { buildStaticGraphSpec, buildStaticGraphSpecFromToml } from "../buildStaticGraphSpec";
import { mergeBundles } from "../mergeBundles";
import type { GraphSpec, GraphSpecNode } from "@graph/types";

/** Build from TOML and assert the result passes the GraphViewer boundary validator. */
function build(toml: string | string[], options?: StaticGraphOptions) {
  const { spec, diagnostics } = buildStaticGraphSpecFromToml(toml, options);
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

function containsEdges(spec: GraphSpec) {
  return spec.edges.filter((edge) => edge.kind === "contains");
}

// ─── Minimal bundle ──────────────────────────────────────────────────────────

const MINIMAL = `
domain = "text_processing"
main_pipe = "summarize"

[concept.Summary]
description = "A text summary"
refines = "Text"

[pipe.summarize]
type = "PipeLLM"
description = "Summarize input text"
inputs = { text = "Text" }
output = "Summary"
prompt = "Summarize: @text"
`;

describe("buildStaticGraphSpec — minimal bundle", () => {
  it("emits one operator node with deterministic ids and digests", () => {
    const { spec, diagnostics } = build(MINIMAL);
    expect(diagnostics).toEqual([]);
    expect(spec.nodes).toHaveLength(1);
    expect(spec.edges).toEqual([]);

    const node = spec.nodes[0];
    expect(node.id).toBe("text_processing.summarize");
    expect(node.kind).toBe("operator");
    expect(node.pipe_type).toBe("PipeLLM");
    expect(node.status).toBe("scheduled");
    expect(node.io.inputs).toEqual([{ name: "text", digest: "input:text", concept: "Text" }]);
    // No invoking step: the output name falls back to snake_case of the concept code.
    expect(node.io.outputs).toEqual([
      { name: "summary", digest: "text_processing.summarize:summary", concept: "Summary" },
    ]);
  });

  it("sets static meta, pipeline_ref, and populated registries", () => {
    const { spec } = build(MINIMAL);
    expect(spec.meta).toEqual({ format: "mthds", mode: "static" });
    expect(spec.pipeline_ref).toEqual({ domain: "text_processing", main_pipe: "summarize" });
    expect(spec.pipe_registry).toHaveProperty("text_processing.summarize");
    expect(spec.concept_registry).toHaveProperty("text_processing.Summary");
    expect(spec.concept_registry).toHaveProperty("native.Text");
  });

  it("emits a static GraphSpec that validates directly", () => {
    const { spec } = buildStaticGraphSpecFromToml(MINIMAL);
    expect(() => validateGraphSpec(spec)).not.toThrow();
    expect(spec.meta).toEqual({ format: "mthds", mode: "static" });
  });

  it("is deterministic across builds", () => {
    const first = build(MINIMAL).spec;
    const second = build(MINIMAL).spec;
    expect(second).toEqual(first);
  });
});

// ─── Sequence ────────────────────────────────────────────────────────────────

const SEQUENCE = `
domain = "seq"
main_pipe = "run_all"

[pipe.run_all]
type = "PipeSequence"
description = "Two-step chain"
inputs = { text = "Text" }
output = "Text"
steps = [
  { pipe = "first", result = "draft" },
  { pipe = "second", result = "final" },
]

[pipe.first]
type = "PipeLLM"
description = "First step"
inputs = { text = "Text" }
output = "Text"
prompt = "p"

[pipe.second]
type = "PipeLLM"
description = "Second step"
inputs = { draft = "Text" }
output = "Text"
prompt = "p"
`;

describe("buildStaticGraphSpec — PipeSequence", () => {
  it("chains step outputs into later step inputs by scope name", () => {
    const { spec, diagnostics } = build(SEQUENCE);
    expect(diagnostics).toEqual([]);

    const first = nodeById(spec, "seq.run_all/step_1");
    const second = nodeById(spec, "seq.run_all/step_2");
    expect(first.io.outputs[0].name).toBe("draft");
    expect(second.io.inputs[0].digest).toBe(first.io.outputs[0].digest);
  });

  it("emits contains edges from the sequence to each step", () => {
    const { spec } = build(SEQUENCE);
    expect(containsEdges(spec).map((edge) => [edge.source, edge.target])).toEqual([
      ["seq.run_all", "seq.run_all/step_1"],
      ["seq.run_all", "seq.run_all/step_2"],
    ]);
  });

  it("carries the last step's digest on the controller output (transparency)", () => {
    const { spec } = build(SEQUENCE);
    const root = nodeById(spec, "seq.run_all");
    const second = nodeById(spec, "seq.run_all/step_2");
    expect(root.kind).toBe("controller");
    expect(root.io.outputs).toEqual(second.io.outputs);
  });

  it("shares the root external input digest with the first consumer", () => {
    const { spec } = build(SEQUENCE);
    const root = nodeById(spec, "seq.run_all");
    const first = nodeById(spec, "seq.run_all/step_1");
    expect(root.io.inputs[0].digest).toBe("input:text");
    expect(first.io.inputs[0].digest).toBe("input:text");
  });
});

// ─── Dotted-prefix input binding ─────────────────────────────────────────────

const DOTTED = `
domain = "dotted"
main_pipe = "run_all"

[concept.Profile]
description = "A profile"

[pipe.run_all]
type = "PipeSequence"
description = "Chain with dotted consumption"
inputs = { profile = "Profile" }
output = "Text"
steps = [{ pipe = "use_name", result = "greeting" }]

[pipe.use_name]
type = "PipeLLM"
description = "Consume a sub-path of profile"
inputs = { "profile.name" = "Text" }
output = "Text"
prompt = "p"
`;

describe("buildStaticGraphSpec — dotted input names", () => {
  it("satisfies a dotted input from a binding for its prefix", () => {
    const { spec, diagnostics } = build(DOTTED);
    expect(diagnostics).toEqual([]);
    const consumer = nodeById(spec, "dotted.run_all/step_1");
    // Bound to the "profile" scope entry, not a fresh dangling input.
    expect(consumer.io.inputs[0].digest).toBe("input:profile");
    expect(consumer.io.inputs[0].name).toBe("profile");
  });
});

// ─── Parallel ────────────────────────────────────────────────────────────────

const PARALLEL_EACH = `
domain = "par"
main_pipe = "run_all"

[pipe.run_all]
type = "PipeSequence"
description = "Parallel then merge"
inputs = { text = "Text" }
output = "Text"
steps = [
  { pipe = "fan_out" },
  { pipe = "merge", result = "merged" },
]

[pipe.fan_out]
type = "PipeParallel"
description = "Two analyses"
inputs = { text = "Text" }
output = "Text"
add_each_output = true
branches = [
  { pipe = "analyze_a", result = "a" },
  { pipe = "analyze_b", result = "b" },
]

[pipe.analyze_a]
type = "PipeLLM"
description = "A"
inputs = { text = "Text" }
output = "Text"
prompt = "p"

[pipe.analyze_b]
type = "PipeLLM"
description = "B"
inputs = { text = "Text" }
output = "Text"
prompt = "p"

[pipe.merge]
type = "PipeCompose"
description = "Merge branch outputs"
inputs = { a = "Text", b = "Text" }
output = "Text"
template = "@a @b"
`;

describe("buildStaticGraphSpec — PipeParallel", () => {
  it("walks every branch and exposes branch outputs on the controller", () => {
    const { spec, diagnostics } = build(PARALLEL_EACH);
    expect(diagnostics).toEqual([]);

    const parallel = nodeById(spec, "par.run_all/step_1");
    const branchA = nodeById(spec, "par.run_all/step_1/branch_1");
    const branchB = nodeById(spec, "par.run_all/step_1/branch_2");
    expect(parallel.kind).toBe("controller");
    expect(parallel.io.outputs.map((item) => item.digest)).toEqual([
      branchA.io.outputs[0].digest,
      branchB.io.outputs[0].digest,
    ]);
  });

  it("binds add_each_output results into the enclosing sequence scope", () => {
    const { spec } = build(PARALLEL_EACH);
    const branchA = nodeById(spec, "par.run_all/step_1/branch_1");
    const branchB = nodeById(spec, "par.run_all/step_1/branch_2");
    const merge = nodeById(spec, "par.run_all/step_2");
    expect(merge.io.inputs.map((item) => item.digest)).toEqual([
      branchA.io.outputs[0].digest,
      branchB.io.outputs[0].digest,
    ]);
  });
});

const PARALLEL_COMBINED = `
domain = "par2"
main_pipe = "fan_out"

[concept.Combined]
description = "Combined result"

[pipe.fan_out]
type = "PipeParallel"
description = "Two analyses, combined"
inputs = { text = "Text" }
output = "Combined"
combined_output = "combo"
branches = [
  { pipe = "analyze_a", result = "a" },
  { pipe = "analyze_b", result = "b" },
]

[pipe.analyze_a]
type = "PipeLLM"
description = "A"
inputs = { text = "Text" }
output = "Text"
prompt = "p"

[pipe.analyze_b]
type = "PipeLLM"
description = "B"
inputs = { text = "Text" }
output = "Text"
prompt = "p"
`;

describe("buildStaticGraphSpec — PipeParallel combined_output", () => {
  it("mints the combined stuff and wires parallel_combine edges from each branch", () => {
    const { spec, diagnostics } = build(PARALLEL_COMBINED);
    expect(diagnostics).toEqual([]);

    const parallel = nodeById(spec, "par2.fan_out");
    expect(parallel.io.outputs).toEqual([
      { name: "combo", digest: "par2.fan_out:combo", concept: "Combined" },
    ]);

    const combineEdges = spec.edges.filter((edge) => edge.kind === "parallel_combine");
    expect(combineEdges).toHaveLength(2);
    for (const edge of combineEdges) {
      expect(edge.target).toBe("par2.fan_out");
      expect(edge.target_stuff_digest).toBe("par2.fan_out:combo");
    }
    expect(combineEdges.map((edge) => edge.source)).toEqual([
      "par2.fan_out/branch_1",
      "par2.fan_out/branch_2",
    ]);
  });
});

// ─── Condition ───────────────────────────────────────────────────────────────

const CONDITION = `
domain = "cond"
main_pipe = "route"

[pipe.route]
type = "PipeCondition"
description = "Route by language"
inputs = { classified = "Text" }
output = "Text"
expression = "classified.language"
outcomes = { english = "passthrough", weird = "fail" }
default_outcome = "translate"

[pipe.passthrough]
type = "PipeCompose"
description = "Pass through"
inputs = { classified = "Text" }
output = "Text"
template = "@classified"

[pipe.translate]
type = "PipeLLM"
description = "Translate"
inputs = { classified = "Text" }
output = "Text"
prompt = "p"
`;

describe("buildStaticGraphSpec — PipeCondition", () => {
  it("walks every outcome plus the default, skipping fail/continue", () => {
    const { spec, diagnostics } = build(CONDITION);
    expect(diagnostics).toEqual([]);
    expect(spec.nodes.map((node) => node.id)).toEqual([
      "cond.route",
      "cond.route/outcome_english",
      "cond.route/default",
    ]);
  });

  it("labels contains edges and tags children with the outcome value", () => {
    const { spec } = build(CONDITION);
    expect(containsEdges(spec).map((edge) => [edge.target, edge.label])).toEqual([
      ["cond.route/outcome_english", "english"],
      ["cond.route/default", "default"],
    ]);
    expect(nodeById(spec, "cond.route/outcome_english").tags).toEqual({ outcome: "english" });
    expect(nodeById(spec, "cond.route/default").tags).toEqual({ outcome: "default" });
  });

  it("uses the default outcome's output as the controller output", () => {
    const { spec } = build(CONDITION);
    const route = nodeById(spec, "cond.route");
    const fallback = nodeById(spec, "cond.route/default");
    expect(route.io.outputs).toEqual(fallback.io.outputs);
  });
});

// ─── Batch ───────────────────────────────────────────────────────────────────

const BATCH_DECLARED = `
domain = "batch"
main_pipe = "summarize_all"

[concept.PageSummary]
description = "Summary of one page"
refines = "Text"

[pipe.summarize_all]
type = "PipeBatch"
description = "Summarize each page"
inputs = { pages = "Page[]" }
output = "PageSummary[]"
branch_pipe_code = "summarize_page"
input_list_name = "pages"
input_item_name = "page"

[pipe.summarize_page]
type = "PipeLLM"
description = "Summarize one page"
inputs = { page = "Page" }
output = "PageSummary"
prompt = "p"
`;

describe("buildStaticGraphSpec — PipeBatch", () => {
  it("walks one representative branch with the item bound", () => {
    const { spec, diagnostics } = build(BATCH_DECLARED);
    expect(diagnostics).toEqual([]);

    expect(spec.nodes.map((node) => node.id)).toEqual([
      "batch.summarize_all",
      "batch.summarize_all/batch_branch",
    ]);
    const branch = nodeById(spec, "batch.summarize_all/batch_branch");
    expect(branch.io.inputs).toEqual([
      { name: "page", digest: "batch.summarize_all:page", concept: "Page" },
    ]);
  });

  it("emits batch_item and batch_aggregate edges with the wiring digests", () => {
    const { spec } = build(BATCH_DECLARED);
    const batch = nodeById(spec, "batch.summarize_all");
    const branch = nodeById(spec, "batch.summarize_all/batch_branch");

    const item = spec.edges.find((edge) => edge.kind === "batch_item");
    expect(item).toMatchObject({
      source: batch.id,
      target: branch.id,
      source_stuff_digest: "input:pages",
      target_stuff_digest: "batch.summarize_all:page",
    });

    const aggregate = spec.edges.find((edge) => edge.kind === "batch_aggregate");
    expect(aggregate).toMatchObject({
      source: branch.id,
      target: batch.id,
      source_stuff_digest: branch.io.outputs[0].digest,
      target_stuff_digest: batch.io.outputs[0].digest,
    });
    // The aggregate is a fresh list stuff, not the branch's.
    expect(batch.io.outputs[0].digest).not.toBe(branch.io.outputs[0].digest);
  });

  it("tags the batch card with declared list multiplicity", () => {
    const { spec } = build(BATCH_DECLARED);
    expect(nodeById(spec, "batch.summarize_all").tags).toMatchObject({
      batch_multiplicity: "xmany",
    });
    expect(nodeById(spec, "batch.summarize_all/batch_branch").tags).toMatchObject({
      batch_multiplicity: "xmany",
    });
  });

  it("tags exact list multiplicity as xN", () => {
    const toml = `
domain = "batch_exact"
main_pipe = "summarize_all"

[pipe.summarize_all]
type = "PipeBatch"
description = "Summarize each fixed page"
inputs = { pages = "Page[3]" }
output = "Text[]"
branch_pipe_code = "summarize_page"
input_list_name = "pages"
input_item_name = "page"

[pipe.summarize_page]
type = "PipeLLM"
description = "Summarize one page"
inputs = { page = "Page" }
output = "Text"
prompt = "p"
`;
    const { spec } = build(toml);
    expect(nodeById(spec, "batch_exact.summarize_all").tags).toMatchObject({
      batch_multiplicity: "x3",
    });
  });
});

const BATCH_INLINE = `
domain = "inline"
main_pipe = "run_all"

[concept.Record]
description = "A record"

[concept.Enriched]
description = "An enriched record"

[pipe.run_all]
type = "PipeSequence"
description = "Load then enrich each"
inputs = { document = "Document" }
output = "Enriched[]"
steps = [
  { pipe = "load_records", result = "records" },
  { pipe = "enrich_one", batch_over = "records", batch_as = "record", result = "enriched" },
]

[pipe.load_records]
type = "PipeLLM"
description = "Load records"
inputs = { document = "Document" }
output = "Record[]"
prompt = "p"

[pipe.enrich_one]
type = "PipeLLM"
description = "Enrich one record"
inputs = { record = "Record" }
output = "Enriched"
prompt = "p"
`;

describe("buildStaticGraphSpec — inline batch_over step", () => {
  it("materializes a synthetic PipeBatch node mirroring the runtime", () => {
    const { spec, diagnostics } = build(BATCH_INLINE);
    expect(diagnostics).toEqual([]);

    const batch = nodeById(spec, "inline.run_all/step_2");
    expect(batch.pipe_type).toBe("PipeBatch");
    expect(batch.pipe_code).toBe("enrich_one_batch");
    expect(batch.kind).toBe("controller");
    expect(batch.description).toBe("Batch processing for enrich_one");
    expect(spec.pipe_registry).toHaveProperty("inline.enrich_one_batch");

    const loader = nodeById(spec, "inline.run_all/step_1");
    expect(batch.io.inputs[0].digest).toBe(loader.io.outputs[0].digest);

    const branch = nodeById(spec, "inline.run_all/step_2/batch_branch");
    expect(branch.pipe_code).toBe("enrich_one");
    // The minted item carries the list's element concept.
    expect(branch.io.inputs[0]).toMatchObject({ name: "record", concept: "Record" });
    expect(batch.tags).toMatchObject({ batch_multiplicity: "xmany" });
    expect(branch.tags).toMatchObject({ batch_multiplicity: "xmany" });
  });

  it("names the aggregate after the step result and binds it downstream", () => {
    const { spec } = build(BATCH_INLINE);
    const batch = nodeById(spec, "inline.run_all/step_2");
    expect(batch.io.outputs[0].name).toBe("enriched");
    const root = nodeById(spec, "inline.run_all");
    expect(root.io.outputs).toEqual(batch.io.outputs);
  });

  it("gives repeated inline batches over the same pipe distinct registry entries", () => {
    const toml = `
domain = "twice"
main_pipe = "run_all"

[pipe.run_all]
type = "PipeSequence"
description = "Batches the same pipe over two different lists"
inputs = { first_list = "Text[]", second_list = "Text[]" }
output = "Text[]"
steps = [
  { pipe = "work", batch_over = "first_list", batch_as = "item", result = "first_out" },
  { pipe = "work", batch_over = "second_list", batch_as = "element", result = "second_out" },
]

[pipe.work]
type = "PipeLLM"
description = "Work on one item"
inputs = { item = "Text" }
output = "Text"
prompt = "p"
`;
    const { spec, diagnostics } = build(toml);
    expect(diagnostics).toEqual([]);
    const firstBatch = nodeById(spec, "twice.run_all/step_1");
    const secondBatch = nodeById(spec, "twice.run_all/step_2");
    expect(firstBatch.pipe_code).toBe("work_batch");
    expect(secondBatch.pipe_code).toBe("work_batch_2");
    // Each node's registry entry carries its own batch wiring (the detail
    // panel resolves blueprints by `domain.pipe_code`).
    const registry = spec.pipe_registry ?? {};
    expect(registry["twice.work_batch"]).toMatchObject({
      batch_params: { input_list_stuff_name: "first_list", input_item_stuff_name: "item" },
    });
    expect(registry["twice.work_batch_2"]).toMatchObject({
      batch_params: { input_list_stuff_name: "second_list", input_item_stuff_name: "element" },
    });
  });

  it("reuses one registry entry for identical repeated inline batches", () => {
    const toml = `
domain = "same"
main_pipe = "run_all"

[pipe.run_all]
type = "PipeSequence"
description = "Batches the same pipe the same way twice"
inputs = { items = "Text[]" }
output = "Text[]"
steps = [
  { pipe = "work", batch_over = "items", batch_as = "item", result = "first_out" },
  { pipe = "work", batch_over = "items", batch_as = "item", result = "second_out" },
]

[pipe.work]
type = "PipeLLM"
description = "Work on one item"
inputs = { item = "Text" }
output = "Text"
prompt = "p"
`;
    const { spec, diagnostics } = build(toml);
    expect(diagnostics).toEqual([]);
    expect(nodeById(spec, "same.run_all/step_1").pipe_code).toBe("work_batch");
    expect(nodeById(spec, "same.run_all/step_2").pipe_code).toBe("work_batch");
    expect(spec.pipe_registry).not.toHaveProperty("same.work_batch_2");
  });

  it("strips a dependency alias from the synthetic batch code", () => {
    const toml = `
domain = "aliasbatch"
main_pipe = "run_all"

[pipe.run_all]
type = "PipeSequence"
description = "Batches an external dependency pipe"
inputs = { items = "Text[]" }
output = "Text[]"
steps = [{ pipe = "helpers->clean_text", batch_over = "items", batch_as = "item", result = "cleaned" }]
`;
    const { spec, diagnostics } = build(toml);
    expect(diagnostics).toEqual([]);
    const batch = nodeById(spec, "aliasbatch.run_all/step_1");
    expect(batch.pipe_code).toBe("clean_text_batch");
    const branch = nodeById(spec, "aliasbatch.run_all/step_1/batch_branch");
    expect(branch.pipe_type).toBe("PipeSignature");
  });
});

// ─── Nesting ─────────────────────────────────────────────────────────────────

const NESTED = `
domain = "nest"
main_pipe = "outer"

[pipe.outer]
type = "PipeSequence"
description = "Outer"
inputs = { text = "Text" }
output = "Text"
steps = [{ pipe = "middle", result = "out" }]

[pipe.middle]
type = "PipeParallel"
description = "Middle"
inputs = { text = "Text" }
output = "Text"
add_each_output = true
branches = [{ pipe = "inner", result = "x" }]

[pipe.inner]
type = "PipeSequence"
description = "Inner"
inputs = { text = "Text" }
output = "Text"
steps = [{ pipe = "leaf", result = "y" }]

[pipe.leaf]
type = "PipeLLM"
description = "Leaf"
inputs = { text = "Text" }
output = "Text"
prompt = "p"
`;

describe("buildStaticGraphSpec — nesting", () => {
  it("builds invocation-path ids through controller layers", () => {
    const { spec, diagnostics } = build(NESTED);
    expect(diagnostics).toEqual([]);
    expect(spec.nodes.map((node) => node.id)).toEqual([
      "nest.outer",
      "nest.outer/step_1",
      "nest.outer/step_1/branch_1",
      "nest.outer/step_1/branch_1/step_1",
    ]);
    // Transparency propagates the leaf digest all the way up.
    const leaf = nodeById(spec, "nest.outer/step_1/branch_1/step_1");
    for (const id of ["nest.outer", "nest.outer/step_1", "nest.outer/step_1/branch_1"]) {
      expect(nodeById(spec, id).io.outputs[0].digest).toBe(leaf.io.outputs[0].digest);
    }
  });
});

// ─── Repeated invocation ─────────────────────────────────────────────────────

const REPEATED = `
domain = "rep"
main_pipe = "run_all"

[pipe.run_all]
type = "PipeSequence"
description = "Same pipe twice"
inputs = { text = "Text" }
output = "Text"
steps = [
  { pipe = "work", result = "first" },
  { pipe = "work", result = "second" },
]

[pipe.work]
type = "PipeLLM"
description = "Work"
inputs = { text = "Text" }
output = "Text"
prompt = "p"
`;

describe("buildStaticGraphSpec — repeated invocation", () => {
  it("emits two nodes with distinct ids and distinct output digests", () => {
    const { spec, diagnostics } = build(REPEATED);
    expect(diagnostics).toEqual([]);
    const first = nodeById(spec, "rep.run_all/step_1");
    const second = nodeById(spec, "rep.run_all/step_2");
    expect(first.pipe_code).toBe("work");
    expect(second.pipe_code).toBe("work");
    expect(first.io.outputs[0].digest).not.toBe(second.io.outputs[0].digest);
  });
});

// ─── Cycles ──────────────────────────────────────────────────────────────────

const CYCLIC = `
domain = "cyc"
main_pipe = "ping"

[pipe.ping]
type = "PipeSequence"
description = "Ping"
inputs = { text = "Text" }
output = "Text"
steps = [{ pipe = "pong", result = "a" }]

[pipe.pong]
type = "PipeSequence"
description = "Pong"
inputs = { text = "Text" }
output = "Text"
steps = [{ pipe = "ping", result = "b" }]
`;

describe("buildStaticGraphSpec — cycle guard", () => {
  it("stops expansion at the repeated ref and renders it as a leaf", () => {
    const { spec, diagnostics } = build(CYCLIC);
    expect(spec.nodes.map((node) => node.id)).toEqual([
      "cyc.ping",
      "cyc.ping/step_1",
      "cyc.ping/step_1/step_1",
    ]);
    // The repeated "ping" is a controller by type but has no children.
    const leaf = nodeById(spec, "cyc.ping/step_1/step_1");
    expect(leaf.pipe_type).toBe("PipeSequence");
    expect(containsEdges(spec).some((edge) => edge.source === leaf.id)).toBe(false);
    expect(leaf.io.outputs).toHaveLength(1);
    expect(diagnostics.some((diagnostic) => diagnostic.code === "cyclic-pipe-ref")).toBe(true);
  });
});

// ─── Best-effort paths ───────────────────────────────────────────────────────

const BROKEN_REF = `
domain = "wip"
main_pipe = "run_all"

[pipe.run_all]
type = "PipeSequence"
description = "Sequence with a missing step"
inputs = { text = "Text" }
output = "Text"
steps = [
  { pipe = "does_not_exist", result = "a" },
  { pipe = "works", result = "b" },
]

[pipe.works]
type = "PipeLLM"
description = "Works"
inputs = { text = "Text" }
output = "Text"
prompt = "p"
`;

describe("buildStaticGraphSpec — best effort", () => {
  it("skips an unresolvable step and keeps walking", () => {
    const { spec, diagnostics } = build(BROKEN_REF);
    expect(spec.nodes.map((node) => node.id)).toEqual(["wip.run_all", "wip.run_all/step_2"]);
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: "unresolved-pipe-ref", severity: "warning" }),
    ]);
    // The sequence output falls to the surviving step.
    const root = nodeById(spec, "wip.run_all");
    expect(root.io.outputs[0].digest).toBe("wip.run_all/step_2:b");
  });

  it("renders a dependency alias ref as an opaque PipeSignature leaf", () => {
    const toml = `
domain = "dep"
main_pipe = "run_all"

[pipe.run_all]
type = "PipeSequence"
description = "Uses a dependency"
inputs = { text = "Text" }
output = "Text"
steps = [{ pipe = "helpers->clean_text", result = "cleaned" }]
`;
    const { spec, diagnostics } = build(toml);
    expect(diagnostics).toEqual([]);
    const leaf = nodeById(spec, "dep.run_all/step_1");
    expect(leaf.pipe_type).toBe("PipeSignature");
    expect(leaf.kind).toBe("operator");
    expect(leaf.pipe_code).toBe("clean_text");
    expect(leaf.domain_code).toBe("helpers");
    expect(leaf.io.outputs[0]).toMatchObject({ name: "cleaned", concept: "Anything" });
  });

  it("mints a dangling input for a name no prior step produces", () => {
    const toml = `
domain = "dangling"
main_pipe = "run_all"

[pipe.run_all]
type = "PipeSequence"
description = "Step consumes an unproduced name"
output = "Text"
steps = [{ pipe = "needs_stuff", result = "out" }]

[pipe.needs_stuff]
type = "PipeLLM"
description = "Needs stuff"
inputs = { mystery = "Text" }
output = "Text"
prompt = "p"
`;
    const { spec, diagnostics } = build(toml);
    expect(diagnostics).toEqual([]);
    const consumer = nodeById(spec, "dangling.run_all/step_1");
    expect(consumer.io.inputs).toEqual([
      { name: "mystery", digest: "input:mystery", concept: "Text" },
    ]);
  });

  it("shares one stuff across same-named dangling inputs and flags concept conflicts", () => {
    const toml = `
domain = "conflict"
main_pipe = "route"

[pipe.route]
type = "PipeCondition"
description = "Two outcomes, same dangling input name, different concepts"
output = "Text"
expression = "value"
outcomes = { a = "use_text", b = "use_number" }

[pipe.use_text]
type = "PipeLLM"
description = "Reads value as Text"
inputs = { value = "Text" }
output = "Text"
prompt = "p"

[pipe.use_number]
type = "PipeLLM"
description = "Reads value as Number"
inputs = { value = "Number" }
output = "Text"
prompt = "p"
`;
    const { spec, diagnostics } = build(toml);
    const first = nodeById(spec, "conflict.route/outcome_a");
    const second = nodeById(spec, "conflict.route/outcome_b");
    // One missing working-memory entry → one shared stuff, first concept wins.
    expect(second.io.inputs[0].digest).toBe(first.io.inputs[0].digest);
    expect(second.io.inputs[0].concept).toBe("Text");
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: "conflicting-input-concept", severity: "warning" }),
    ]);
  });

  it("produces a valid empty spec from garbage TOML", () => {
    const { spec, diagnostics } = build("not toml at all }{");
    expect(spec.nodes).toEqual([]);
    expect(spec.edges).toEqual([]);
    expect(diagnostics.some((diagnostic) => diagnostic.code === "toml-parse-error")).toBe(true);
    expect(diagnostics.some((diagnostic) => diagnostic.code === "no-entry-pipe")).toBe(true);
  });
});

// ─── Entry pipe selection ────────────────────────────────────────────────────

describe("buildStaticGraphSpec — entry selection", () => {
  it("honors an explicit entryPipe option over main_pipe", () => {
    const { spec, diagnostics } = build(SEQUENCE, { entryPipe: "second" });
    expect(diagnostics).toEqual([]);
    expect(spec.nodes.map((node) => node.id)).toEqual(["seq.second"]);
    expect(spec.pipeline_ref).toEqual({ domain: "seq", main_pipe: "second" });
  });

  it("errors on an unresolvable explicit entryPipe and emits an empty spec", () => {
    const { spec, diagnostics } = build(SEQUENCE, { entryPipe: "nope" });
    expect(spec.nodes).toEqual([]);
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: "unresolved-pipe-ref", severity: "error" }),
    ]);
  });

  it("falls back to the unreferenced-root heuristic without a main_pipe", () => {
    const toml = `
domain = "nomain"

[pipe.helper]
type = "PipeLLM"
description = "Referenced helper"
inputs = { text = "Text" }
output = "Text"
prompt = "p"

[pipe.root_pipe]
type = "PipeSequence"
description = "The actual root"
inputs = { text = "Text" }
output = "Text"
steps = [{ pipe = "helper", result = "a" }]
`;
    const { spec, diagnostics } = build(toml);
    expect(diagnostics.some((diagnostic) => diagnostic.code === "missing-main-pipe")).toBe(true);
    expect(spec.nodes[0].id).toBe("nomain.root_pipe");
  });
});

// ─── Multi-bundle / cross-domain ─────────────────────────────────────────────

describe("buildStaticGraphSpec — multi-bundle sets", () => {
  it("resolves qualified refs across domains in the same set", () => {
    const main = `
domain = "app"
main_pipe = "run_all"

[pipe.run_all]
type = "PipeSequence"
description = "Uses a pipe from another domain"
inputs = { text = "Text" }
output = "Text"
steps = [{ pipe = "lib.clean", result = "cleaned" }]
`;
    const lib = `
domain = "lib"

[pipe.clean]
type = "PipeLLM"
description = "Clean text"
inputs = { text = "Text" }
output = "Text"
prompt = "p"
`;
    const { spec, diagnostics } = build([main, lib]);
    expect(diagnostics).toEqual([]);
    const child = nodeById(spec, "app.run_all/step_1");
    expect(child.pipe_code).toBe("clean");
    expect(child.domain_code).toBe("lib");
  });

  it("accepts a pre-merged set through buildStaticGraphSpec directly", () => {
    const merged = mergeBundles([]);
    const { spec, diagnostics } = buildStaticGraphSpec(merged);
    validateGraphSpec(spec);
    expect(spec.nodes).toEqual([]);
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: "no-entry-pipe", severity: "error" }),
    ]);
  });
});

// ─── Runtime-parity semantics (verified against the dry-run fixtures) ────────

const SHARED_MEMORY = `
domain = "mem"
main_pipe = "outer"

[pipe.outer]
type = "PipeSequence"
description = "Outer sequence"
inputs = { text = "Text" }
output = "Text"
steps = [
  { pipe = "prepare", result = "prepared" },
  { pipe = "consume", result = "final" },
]

[pipe.prepare]
type = "PipeSequence"
description = "Inner producer"
inputs = { text = "Text" }
output = "Text"
steps = [
  { pipe = "make_side", result = "side_note" },
  { pipe = "make_main", result = "main_out" },
]

[pipe.make_side]
type = "PipeLLM"
description = "Side note"
inputs = { text = "Text" }
output = "Text"
prompt = "p"

[pipe.make_main]
type = "PipeLLM"
description = "Main"
inputs = { text = "Text" }
output = "Text"
prompt = "p"

[pipe.consume]
type = "PipeLLM"
description = "Consume the side note"
inputs = { side_note = "Text" }
output = "Text"
prompt = "p"
`;

describe("buildStaticGraphSpec — shared working memory", () => {
  it("makes a nested sub-sequence's inner result visible to later ancestor steps", () => {
    const { spec, diagnostics } = build(SHARED_MEMORY);
    expect(diagnostics).toEqual([]);
    const makeSide = nodeById(spec, "mem.outer/step_1/step_1");
    const consume = nodeById(spec, "mem.outer/step_2");
    // Working memory is one flat namespace: `side_note` is the inner step's
    // stuff, not a freshly minted dangling input.
    expect(consume.io.inputs).toEqual([
      { name: "side_note", digest: makeSide.io.outputs[0].digest, concept: "Text" },
    ]);
    expect(makeSide.io.outputs[0].digest).toBe("mem.outer/step_1/step_1:side_note");
  });
});

const CONDITION_MERGED = `
domain = "condm"
main_pipe = "screen"

[pipe.screen]
type = "PipeSequence"
description = "Screen and route"
inputs = { evaluation = "Text" }
output = "Text"
steps = [
  { pipe = "route", result = "verdict" },
]

[pipe.route]
type = "PipeCondition"
description = "Route by match"
inputs = { evaluation = "Text" }
output = "Text"
expression = "evaluation.match"
outcomes = { yes = "accept", no = "reject" }
default_outcome = "reject"

[pipe.accept]
type = "PipeLLM"
description = "Accept"
inputs = { evaluation = "Text" }
output = "Text"
prompt = "p"

[pipe.reject]
type = "PipeCompose"
description = "Reject"
inputs = { evaluation = "Text" }
output = "Text"
template = "@evaluation"
`;

describe("buildStaticGraphSpec — condition outcome merging and slot naming", () => {
  it("emits one child per distinct target pipe, merging outcomes and the default", () => {
    const { spec, diagnostics } = build(CONDITION_MERGED);
    expect(diagnostics).toEqual([]);
    expect(spec.nodes.map((node) => node.id)).toEqual([
      "condm.screen",
      "condm.screen/step_1",
      "condm.screen/step_1/outcome_yes",
      "condm.screen/step_1/outcome_no",
    ]);
    const reject = nodeById(spec, "condm.screen/step_1/outcome_no");
    expect(reject.tags).toEqual({ outcome: "no | default" });
    const rejectEdge = containsEdges(spec).find(
      (edge) => edge.target === "condm.screen/step_1/outcome_no",
    );
    expect(rejectEdge?.label).toBe("no | default");
  });

  it("names every branch's output after the condition's slot name", () => {
    const { spec } = build(CONDITION_MERGED);
    const accept = nodeById(spec, "condm.screen/step_1/outcome_yes");
    const reject = nodeById(spec, "condm.screen/step_1/outcome_no");
    expect(accept.io.outputs).toEqual([
      { name: "verdict", digest: "condm.screen/step_1/outcome_yes:verdict", concept: "Text" },
    ]);
    expect(reject.io.outputs).toEqual([
      { name: "verdict", digest: "condm.screen/step_1/outcome_no:verdict", concept: "Text" },
    ]);
    // The controller's representative output is the default route's stuff,
    // exposed under the slot name.
    const route = nodeById(spec, "condm.screen/step_1");
    expect(route.io.outputs).toEqual(reject.io.outputs);
  });
});

const PARALLEL_SLOT_NAMES = `
domain = "slots"
main_pipe = "run"

[pipe.run]
type = "PipeSequence"
description = "Run the fan-out"
inputs = { text = "Text" }
output = "Text"
steps = [
  { pipe = "fan_out", result = "clean_text" },
]

[pipe.fan_out]
type = "PipeParallel"
description = "Two branches"
inputs = { text = "Text" }
output = "Text"
add_each_output = true
branches = [
  { pipe = "text_branch", result = "clean_text" },
]

[pipe.text_branch]
type = "PipeSequence"
description = "Text branch"
inputs = { text = "Text" }
output = "Text"
steps = [
  { pipe = "enrich", result = "enriched" },
]

[pipe.enrich]
type = "PipeLLM"
description = "Enrich"
inputs = { text = "Text" }
output = "Text"
prompt = "p"
`;

describe("buildStaticGraphSpec — controller io slot naming", () => {
  it("exposes a transparent output under the invoking slot name, keeping the local name on the leaf", () => {
    const { spec, diagnostics } = build(PARALLEL_SLOT_NAMES);
    expect(diagnostics).toEqual([]);
    const enrich = nodeById(spec, "slots.run/step_1/branch_1/step_1");
    const branch = nodeById(spec, "slots.run/step_1/branch_1");
    const parallel = nodeById(spec, "slots.run/step_1");
    const digest = enrich.io.outputs[0].digest;
    // Leaf keeps its own step's result name; the branch sequence and the
    // parallel both expose the same digest under the branch slot name.
    expect(enrich.io.outputs[0].name).toBe("enriched");
    expect(branch.io.outputs).toEqual([{ name: "clean_text", digest, concept: "Text" }]);
    expect(parallel.io.outputs).toEqual([{ name: "clean_text", digest, concept: "Text" }]);
  });
});

const CONDITION_DEFAULT_VALUE = `
domain = "condd"
main_pipe = "route"

[pipe.route]
type = "PipeCondition"
description = "Route with an authored outcome literally named default"
inputs = { evaluation = "Text" }
output = "Text"
expression = "evaluation.match"
outcomes = { default = "accept" }
default_outcome = "reject"

[pipe.accept]
type = "PipeLLM"
description = "Accept"
inputs = { evaluation = "Text" }
output = "Text"
prompt = "p"

[pipe.reject]
type = "PipeCompose"
description = "Reject"
inputs = { evaluation = "Text" }
output = "Text"
template = "@evaluation"
`;

describe("buildStaticGraphSpec — authored outcome value named 'default'", () => {
  it("does not collide with the synthetic default route's node id", () => {
    const { spec, diagnostics } = build(CONDITION_DEFAULT_VALUE);
    expect(diagnostics).toEqual([]);
    // The authored "default" outcome and the default_outcome route target
    // different pipes: two children with distinct ids, and the synthetic
    // default route (not the authored value) drives the representative output.
    expect(spec.nodes.map((node) => node.id)).toEqual([
      "condd.route",
      "condd.route/outcome_default",
      "condd.route/default",
    ]);
    const ids = spec.nodes.map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    const route = nodeById(spec, "condd.route");
    const reject = nodeById(spec, "condd.route/default");
    expect(route.io.outputs).toEqual(reject.io.outputs);
  });
});
