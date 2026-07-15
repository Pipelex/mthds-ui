// Integration sweep: every checked-in fixture bundle must parse without error
// diagnostics. Warnings are tolerated (fixtures may legitimately lean on
// lenient fallbacks); `error` severity means the parser failed to interpret
// something a real, runnable bundle contains — that is a parser gap.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseMthdsBundle } from "../parseMthdsBundle";

const PIPELINES_DIR = path.resolve(__dirname, "../../../data/pipelines");

const bundlePaths = readdirSync(PIPELINES_DIR)
  .filter((name) => name.startsWith("pipeline_"))
  .map((name) => path.join(PIPELINES_DIR, name, "bundle.mthds"))
  .sort();

describe("parseMthdsBundle on fixture bundles", () => {
  it("finds the fixture bundles", () => {
    expect(bundlePaths.length).toBeGreaterThan(0);
  });

  it.each(bundlePaths.map((bundlePath) => [path.basename(path.dirname(bundlePath)), bundlePath]))(
    "parses %s without error diagnostics",
    (_name, bundlePath) => {
      const toml = readFileSync(bundlePath, "utf8");
      const { bundle, diagnostics } = parseMthdsBundle(toml);
      const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
      expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);
      expect(bundle.domain).not.toBeNull();
      expect(Object.keys(bundle.pipes).length).toBeGreaterThan(0);
    },
  );
});
