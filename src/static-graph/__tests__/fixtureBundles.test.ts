// The discovery helper's own guardrails. Everything here is about one failure mode:
// an entry that drops out of a sweep without anyone noticing, which looks exactly
// like a passing run. See `fixtureBundles.ts` for why the piles are kept apart.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { parse as parseToml } from "smol-toml";
import { describe, expect, it } from "vitest";

import { fixtureBundleCases, isSweepable } from "./fixtureBundles";

const CORPUS_ENTRIES_DIR = path.resolve(__dirname, "../../../data/mthds-corpus/entries");

describe("isSweepable", () => {
  it("sweeps a valid entry", () => {
    expect(isSweepable("valid", "some_entry")).toBe(true);
  });

  // An invalid entry is authored to trigger exactly one declared error, so diagnostics
  // are what it is for. Sweeping it under a zero-diagnostic rule would report the
  // corpus doing its job as a builder gap.
  it("does not sweep an invalid entry", () => {
    expect(isSweepable("invalid", "some_entry")).toBe(false);
  });

  it.each([[undefined], [null], ["unknown"], [""], [42]])(
    "throws rather than guessing at validity %p",
    (validity) => {
      expect(() => isSweepable(validity, "some_entry")).toThrow(/some_entry/);
    },
  );
});

describe("corpus discovery", () => {
  // Belt and braces on the filter: whatever the next sync brings in, every entry that
  // reaches the sweeps must say so in its own manifest.
  it("hands the sweeps only entries their manifest marks valid", () => {
    const swept = fixtureBundleCases()
      .map(([name]) => name)
      .filter((name) => name.startsWith("corpus/"))
      .map((name) => name.slice("corpus/".length));
    expect(swept.length).toBeGreaterThan(0);
    for (const entry of swept) {
      const manifest = parseToml(
        readFileSync(path.join(CORPUS_ENTRIES_DIR, entry, "entry.toml"), "utf8"),
      ) as Record<string, unknown>;
      expect(manifest.validity, entry).toBe("valid");
    }
  });

  // The filter must not be the reason an entry vanishes: every directory the corpus
  // ships is either swept or explicitly marked invalid, never merely unreadable.
  it("accounts for every entry directory the corpus ships", () => {
    const dirs = readdirSync(CORPUS_ENTRIES_DIR, { withFileTypes: true })
      .filter((item) => item.isDirectory())
      .map((item) => item.name);
    expect(dirs.length).toBeGreaterThan(0);
    for (const entry of dirs) {
      const manifest = parseToml(
        readFileSync(path.join(CORPUS_ENTRIES_DIR, entry, "entry.toml"), "utf8"),
      ) as Record<string, unknown>;
      expect(() => isSweepable(manifest.validity, entry)).not.toThrow();
    }
  });
});
