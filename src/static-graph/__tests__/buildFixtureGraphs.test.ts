// Integration sweep: the static builder must turn every checked-in fixture
// bundle into a GraphSpec that passes the GraphViewer boundary validator,
// without error diagnostics. Warnings are tolerated (fixtures may lean on
// lenient fallbacks); `error` severity means the builder failed on a real,
// runnable bundle — that is a builder gap.
//
// The sweep covers this repo's own fixtures and the vendored MTHDS Test Corpus
// alike — see `fixtureBundles.ts` for why those are two piles.

import { readFileSync } from "node:fs";

import { validateGraphSpec } from "@graph/validateGraphSpec";
import { describe, expect, it } from "vitest";

import { fixtureBundleCases } from "./fixtureBundles";

import { buildStaticGraphSpecFromToml } from "../buildStaticGraphSpec";

const bundleCases = fixtureBundleCases();

describe("buildStaticGraphSpecFromToml on fixture bundles", () => {
  it.each(bundleCases)("builds a valid static GraphSpec from %s", (_name, bundlePath) => {
    const toml = readFileSync(bundlePath, "utf8");
    const { spec, diagnostics } = buildStaticGraphSpecFromToml(toml);

    const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
    expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);

    expect(() => validateGraphSpec(spec)).not.toThrow();
    expect(spec.nodes.length).toBeGreaterThan(0);

    // Deterministic identity: building twice yields the identical spec.
    const again = buildStaticGraphSpecFromToml(toml).spec;
    expect(again).toEqual(spec);
  });
});
