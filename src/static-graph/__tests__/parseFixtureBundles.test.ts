// Integration sweep: every checked-in fixture bundle must parse without error
// diagnostics. Warnings are tolerated (fixtures may legitimately lean on
// lenient fallbacks); `error` severity means the parser failed to interpret
// something a real, runnable bundle contains — that is a parser gap.
//
// Parsing is per file: a multi-file method package is several bundles that only
// become one method at merge, so each of its files must parse on its own — the
// fragments included, which carry a domain and pipes but no `main_pipe`.
//
// The sweep covers this repo's own fixtures and the vendored MTHDS Test Corpus
// alike — see `fixtureBundles.ts` for why those are two piles.

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { fixtureBundleCases } from "./fixtureBundles";

import { parseMthdsBundle } from "../parseMthdsBundle";

const bundleCases = fixtureBundleCases();

describe("parseMthdsBundle on fixture bundles", () => {
  it.each(bundleCases)(
    "parses every file of %s without error diagnostics",
    (_name, bundlePaths) => {
      for (const bundlePath of bundlePaths) {
        const file = path.basename(bundlePath);
        const toml = readFileSync(bundlePath, "utf8");
        const { bundle, diagnostics } = parseMthdsBundle(toml);
        const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
        expect(errors, `${file}: ${JSON.stringify(errors, null, 2)}`).toEqual([]);
        expect(bundle.domain, file).not.toBeNull();
        expect(Object.keys(bundle.pipes).length, file).toBeGreaterThan(0);
      }
    },
  );
});
