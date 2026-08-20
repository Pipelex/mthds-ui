// Integration sweep: the static builder must turn every checked-in fixture
// bundle into a GraphSpec that passes the GraphViewer boundary validator,
// without error diagnostics. Warnings are tolerated (fixtures may lean on
// lenient fallbacks); `error` severity means the builder failed on a real,
// runnable bundle — that is a builder gap.
//
// A fixture's files go in together, because a multi-file method package is only
// a method once merged: its root file holds the entry signature and the file
// beside it holds the pipe that fills it in. Building from the entry point alone
// would render a one-node stub and call it a pass.
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
  it.each(bundleCases)("builds a valid static GraphSpec from %s", (_name, bundlePaths) => {
    const tomls = bundlePaths.map((bundlePath) => readFileSync(bundlePath, "utf8"));
    const { spec, diagnostics } = buildStaticGraphSpecFromToml(tomls);

    const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
    expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);

    // Merging a package must not report a clash. Every fixture is a canonical
    // method with one declaration per code, so a `duplicate-*` warning means
    // either the corpus grew a genuine collision or the merge stopped reading a
    // signature and its concrete definition as one pipe — the failure that turns
    // a multi-file package into a one-node stub while every other assertion here
    // still passes.
    const clashes = diagnostics.filter(
      (diagnostic) =>
        diagnostic.code === "duplicate-pipe" || diagnostic.code === "duplicate-concept",
    );
    expect(clashes, JSON.stringify(clashes, null, 2)).toEqual([]);

    expect(() => validateGraphSpec(spec)).not.toThrow();
    expect(spec.nodes.length).toBeGreaterThan(0);

    // Deterministic identity: building twice yields the identical spec.
    const again = buildStaticGraphSpecFromToml(tomls).spec;
    expect(again).toEqual(spec);
  });
});
