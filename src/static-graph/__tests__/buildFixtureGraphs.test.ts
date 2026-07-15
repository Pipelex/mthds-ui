// Integration sweep: the static builder must turn every checked-in fixture
// bundle into a GraphSpec that passes the GraphViewer boundary validator,
// without error diagnostics. Warnings are tolerated (fixtures may lean on
// lenient fallbacks); `error` severity means the builder failed on a real,
// runnable bundle — that is a builder gap.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { validateGraphSpec } from "@graph/validateGraphSpec";
import { describe, expect, it } from "vitest";

import { buildStaticGraphSpecFromToml } from "../buildStaticGraphSpec";

const PIPELINES_DIR = path.resolve(__dirname, "../../../data/pipelines");

const bundlePaths = readdirSync(PIPELINES_DIR)
  .filter((name) => name.startsWith("pipeline_"))
  .map((name) => path.join(PIPELINES_DIR, name, "bundle.mthds"))
  .sort();

describe("buildStaticGraphSpecFromToml on fixture bundles", () => {
  it("finds the fixture bundles", () => {
    expect(bundlePaths.length).toBeGreaterThan(0);
  });

  it.each(bundlePaths.map((bundlePath) => [path.basename(path.dirname(bundlePath)), bundlePath]))(
    "builds a valid static GraphSpec from %s",
    (_name, bundlePath) => {
      const toml = readFileSync(bundlePath, "utf8");
      const { spec, diagnostics } = buildStaticGraphSpecFromToml(toml);

      const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
      expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);

      expect(() => validateGraphSpec(spec)).not.toThrow();
      expect(spec.nodes.length).toBeGreaterThan(0);

      // Deterministic identity: building twice yields the identical spec.
      const again = buildStaticGraphSpecFromToml(toml).spec;
      expect(again).toEqual(spec);
    },
  );
});
