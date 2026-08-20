// Integration sweep: every checked-in fixture bundle must parse without error
// diagnostics. Warnings are tolerated (fixtures may legitimately lean on
// lenient fallbacks); `error` severity means the parser failed to interpret
// something a real, runnable bundle contains — that is a parser gap.
//
// The sweep covers this repo's own fixtures and the vendored MTHDS Test Corpus
// alike — see `fixtureBundles.ts` for why those are two piles.

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { fixtureBundleCases } from "./fixtureBundles";

import { parseMthdsBundle } from "../parseMthdsBundle";

const bundleCases = fixtureBundleCases();

describe("parseMthdsBundle on fixture bundles", () => {
  it("finds the fixture bundles", () => {
    expect(bundleCases.length).toBeGreaterThan(0);
  });

  it.each(bundleCases)("parses %s without error diagnostics", (_name, bundlePath) => {
    const toml = readFileSync(bundlePath, "utf8");
    const { bundle, diagnostics } = parseMthdsBundle(toml);
    const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
    expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);
    expect(bundle.domain).not.toBeNull();
    expect(Object.keys(bundle.pipes).length).toBeGreaterThan(0);
  });
});
