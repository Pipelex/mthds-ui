// Parity sweep: build every fixture bundle statically and compare against the
// checked-in pipelex dry-run GraphSpec (data/pipelines/pipeline_NN/
// dry_run_graph_spec.json — same generator output as the story fixtures).
// See parityHarness.ts for the normalization rules and comparison semantics.
//
// Accepted divergences are listed per pipeline in ACCEPTED_DIVERGENCES with a
// reason, and documented in wip/static-graph-design.md. Anything else fails.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { buildDataflowAnalysis } from "@graph/graphAnalysis";
import type { GraphSpec } from "@graph/types";
import { describe, expect, it } from "vitest";

import { buildStaticGraphSpecFromToml } from "../buildStaticGraphSpec";
import { compareParity } from "./parityHarness";

const PIPELINES_DIR = path.resolve(__dirname, "../../../data/pipelines");

const pipelines = readdirSync(PIPELINES_DIR)
  .filter(
    (name) =>
      name.startsWith("pipeline_") &&
      existsSync(path.join(PIPELINES_DIR, name, "bundle.mthds")) &&
      existsSync(path.join(PIPELINES_DIR, name, "dry_run_graph_spec.json")),
  )
  .sort();

/** Divergences accepted as legitimate, keyed by pipeline. Matched exactly. */
const ACCEPTED_DIVERGENCES: Record<string, string[]> = {};

describe("static builder parity vs dry-run fixtures", () => {
  it("finds the fixture pipelines", () => {
    expect(pipelines.length).toBeGreaterThan(0);
  });

  it.each(pipelines)("matches the dry-run GraphSpec for %s", (pipeline) => {
    const toml = readFileSync(path.join(PIPELINES_DIR, pipeline, "bundle.mthds"), "utf8");
    const drySpec = JSON.parse(
      readFileSync(path.join(PIPELINES_DIR, pipeline, "dry_run_graph_spec.json"), "utf8"),
    ) as GraphSpec;

    const { spec: staticSpec } = buildStaticGraphSpecFromToml(toml);
    const accepted = new Set(ACCEPTED_DIVERGENCES[pipeline] ?? []);
    const divergences = compareParity(staticSpec, drySpec).filter(
      (divergence) => !accepted.has(divergence),
    );
    expect(divergences).toEqual([]);
  });
});

// ─── Harness self-checks: the comparison must actually detect divergence ─────

describe("parity harness sensitivity", () => {
  const load = (pipeline: string): { staticSpec: GraphSpec; drySpec: GraphSpec } => {
    const toml = readFileSync(path.join(PIPELINES_DIR, pipeline, "bundle.mthds"), "utf8");
    const drySpec = JSON.parse(
      readFileSync(path.join(PIPELINES_DIR, pipeline, "dry_run_graph_spec.json"), "utf8"),
    ) as GraphSpec;
    return { staticSpec: buildStaticGraphSpecFromToml(toml).spec, drySpec };
  };

  it("reports a dropped node", () => {
    const { staticSpec, drySpec } = load("pipeline_03");
    const mutilated: GraphSpec = {
      ...staticSpec,
      nodes: staticSpec.nodes.slice(0, -1),
      edges: staticSpec.edges.filter(
        (edge) => edge.target !== staticSpec.nodes[staticSpec.nodes.length - 1].id,
      ),
    };
    const divergences = compareParity(mutilated, drySpec);
    expect(divergences.some((line) => line.includes("only in dry"))).toBe(true);
  });

  it("reports a rewired consumer", () => {
    const { staticSpec, drySpec } = load("pipeline_03");
    const operators = staticSpec.nodes.filter((node) => node.kind === "operator");
    const victim = operators[operators.length - 1];
    const mutilated: GraphSpec = {
      ...staticSpec,
      nodes: staticSpec.nodes.map((node) =>
        node === victim ? { ...node, io: { ...node.io, inputs: [] } } : node,
      ),
    };
    const divergences = compareParity(mutilated, drySpec);
    expect(divergences.some((line) => line.startsWith("stuff"))).toBe(true);
  });

  it("collapses dry-run batch fan-out to a single representative branch", () => {
    const { staticSpec, drySpec } = load("pipeline_08");
    // The raw dry spec has several same-code branches under the batch
    // controller; parity holds only because the harness collapses them.
    expect(compareParity(staticSpec, drySpec)).toEqual([]);
    const batchChildren = drySpec.edges.filter(
      (edge) =>
        edge.kind === "contains" &&
        drySpec.nodes.find((node) => node.id === edge.source)?.pipe_type === "PipeBatch",
    );
    expect(batchChildren.length).toBeGreaterThan(1);
  });
});

// ─── combined_output: the known parity question, verified explicitly ─────────
//
// The dry-run tracer registers the *parallel controller* as the combined
// stuff's producer, but the renderer's analysis only takes producers from
// non-controller nodes — so on BOTH paths the combined stuff is
// producer-less (renderer role "input", a cosmetic quirk) and its dataflow
// arrives via `parallel_combine` stuff-to-stuff edges instead.
//
// No fixture bundle can exercise this against a checked-in dry spec:
// pipelex deleted `combined_output` upstream (PipeParallel now always
// combines) *after* the fixture corpus was generated, so the current CLI
// rejects the field on authored bundles while the MTHDS spec still
// documents it. The static side is pinned here instead; see
// wip/static-graph-design.md for the follow-up.

const COMBINED_OUTPUT_BUNDLE = `
domain = "combined_insights"
main_pipe = "combined_analysis"

[concept.Insight]
description = "One analytical insight"
refines = "Text"

[pipe.combined_analysis]
type = "PipeSequence"
description = "Gather insights in parallel then digest them"
inputs = { text = "Text" }
output = "Text"
steps = [
  { pipe = "gather_insights", result = "insights" },
  { pipe = "digest_insights", result = "digest" },
]

[pipe.gather_insights]
type = "PipeParallel"
description = "Two analyses, combined"
inputs = { text = "Text" }
output = "Insight[]"
combined_output = "insights"
branches = [
  { pipe = "analyze_tone", result = "tone_insight" },
  { pipe = "analyze_topics", result = "topic_insight" },
]

[pipe.analyze_tone]
type = "PipeLLM"
description = "Tone"
inputs = { text = "Text" }
output = "Insight"
prompt = "p"

[pipe.analyze_topics]
type = "PipeLLM"
description = "Topics"
inputs = { text = "Text" }
output = "Insight"
prompt = "p"

[pipe.digest_insights]
type = "PipeLLM"
description = "Digest the insights"
inputs = { insights = "Insight[]" }
output = "Text"
prompt = "p"
`;

describe("combined_output producer semantics", () => {
  it("keeps the combined stuff producer-less and wires it via parallel_combine edges", () => {
    const { spec, diagnostics } = buildStaticGraphSpecFromToml(COMBINED_OUTPUT_BUNDLE);
    expect(diagnostics).toEqual([]);

    const parallelId = "combined_insights.combined_analysis/step_1";
    const comboDigest = `${parallelId}:insights`;
    const analysis = buildDataflowAnalysis(spec);
    expect(analysis).not.toBeNull();

    // The parallel controller lists the combined stuff as its output, but the
    // renderer's analysis never takes producers from controllers.
    expect(analysis?.stuffRegistry[comboDigest]).toBeDefined();
    expect(analysis?.stuffProducers[comboDigest]).toBeUndefined();
    // Downstream consumption still wires up through the digest.
    expect(analysis?.stuffConsumers[comboDigest]).toEqual([
      "combined_insights.combined_analysis/step_2",
    ]);
    // Dataflow INTO the combined stuff arrives as parallel_combine
    // stuff-to-stuff edges from each branch output.
    const combineEdges = spec.edges.filter((edge) => edge.kind === "parallel_combine");
    expect(
      combineEdges.map((edge) => [edge.source_stuff_digest, edge.target_stuff_digest]),
    ).toEqual([
      [`${parallelId}/branch_1:tone_insight`, comboDigest],
      [`${parallelId}/branch_2:topic_insight`, comboDigest],
    ]);
  });
});
