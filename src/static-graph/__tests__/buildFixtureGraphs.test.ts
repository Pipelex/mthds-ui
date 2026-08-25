// Integration sweep: the static builder must turn every checked-in fixture
// bundle into a GraphSpec that passes the GraphViewer boundary validator,
// reporting nothing at all along the way.
//
// No diagnostic is tolerated here, warnings included. Every fixture in both
// piles is a canonical, runnable method, and the builder only ever emits a
// diagnostic when it could not read something the method wrote: `error` means
// a whole unit was dropped, `warning` means a lenient fallback stood in for
// authored content. On material this clean, both readings are the same news —
// either the builder has a gap or a fixture regressed — and both deserve a red
// test. Tolerating warnings once let optional inputs (`Text?`) vanish from two
// corpus entries with the sweep still green, which is exactly the silent pass
// the piles below are meant to make impossible.
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

    expect(diagnostics, JSON.stringify(diagnostics, null, 2)).toEqual([]);

    expect(() => validateGraphSpec(spec)).not.toThrow();
    expect(spec.nodes.length).toBeGreaterThan(0);

    // Deterministic identity: building twice yields the identical spec.
    const again = buildStaticGraphSpecFromToml(tomls).spec;
    expect(again).toEqual(spec);
  });
});
