// A run-produced graph reads each stuff's multiplicity from the declarations in
// its spec (`withDeclaredMultiplicity`), while the static builder states it from
// the bundle. Two routes to one fact: for every fixture pipeline, the stuffs each
// marks plural, and with what count, must be the same.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { withDeclaredMultiplicity } from "@graph/declaredMultiplicity";
import type { GraphSpec } from "@graph/types";
import { validateGraphSpec } from "@graph/validateGraphSpec";
import { describe, expect, it } from "vitest";

import { buildStaticGraphSpecFromToml } from "../buildStaticGraphSpec";

const PIPELINES_DIR = path.resolve(__dirname, "../../../data/pipelines");

const pipelines = readdirSync(PIPELINES_DIR)
  .filter(
    (name) =>
      name.startsWith("pipeline_") &&
      existsSync(path.join(PIPELINES_DIR, name, "bundle.mthds")) &&
      existsSync(path.join(PIPELINES_DIR, name, "dry_run_graph_spec.json")),
  )
  .sort();

/** Every plural io item as `name:multiplicity`, sorted. */
function pluralStuffs(spec: GraphSpec): string[] {
  const found = new Set<string>();
  for (const node of spec.nodes) {
    for (const item of [...node.io.inputs, ...node.io.outputs]) {
      if (item.multiplicity != null && item.multiplicity !== false) {
        found.add(`${item.name}:${String(item.multiplicity)}`);
      }
    }
  }
  return [...found].sort();
}

describe("multiplicity parity: run-derived vs static", () => {
  it("finds the fixture pipelines", () => {
    expect(pipelines.length).toBeGreaterThan(0);
  });

  it.each(pipelines)("marks the same plural stuffs in %s", (pipeline) => {
    const dir = path.join(PIPELINES_DIR, pipeline);
    const drySpec = validateGraphSpec(
      JSON.parse(readFileSync(path.join(dir, "dry_run_graph_spec.json"), "utf8")),
    );
    const { spec: staticSpec } = buildStaticGraphSpecFromToml(
      readFileSync(path.join(dir, "bundle.mthds"), "utf8"),
    );
    expect(pluralStuffs(withDeclaredMultiplicity(drySpec))).toEqual(pluralStuffs(staticSpec));
  });
});
