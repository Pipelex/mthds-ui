// Where the integration sweeps in this directory get their bundles.
//
// Two piles, deliberately kept apart, because they answer different questions.
//
// `data/pipelines/` is this repo's own: numbered fixtures, each carrying generated
// `dry_run_graph_spec.json` / `live_run_graph_spec.json` records produced by running
// pipelex. Those records are the oracle for the parity and native-concept tests, so
// those fixtures cannot be replaced by anything that does not carry them.
//
// `data/mthds-corpus/` is a vendored, byte-identical copy of the MTHDS Test Corpus —
// the canonical set of `.mthds` methods the whole workspace draws its language-level
// fixtures from, owned by pipelex and synced here by the `mthds-corpus-sync` skill.
// It carries no generated specs, so it feeds only the sweeps that need nothing but the
// method text: parsing, and building a static GraphSpec. That is the valuable half
// anyway — running this repo's builder, a second implementation of MTHDS, over the
// canonical corpus is the cross-language conformance the corpus exists to provide.
//
// A fixture is a *set* of files, not a file. An MTHDS method package may span several
// `.mthds` files — a root file holding the boundary concepts and the entry signature,
// then one file per pipe that fills a forward declaration in — and it only means
// anything merged. So each fixture carries every `.mthds` file in its directory, and
// the sweeps merge them the way a real consumer would.
//
// Both piles are discovered, never listed, so a synced entry is swept with no wiring
// change here. The flip side is that discovery failing quietly would void the whole
// claim, so it does not: each pile throws when it comes back empty, a missing directory
// throws out of `readdirSync`, and an entry holding no `.mthds` file at all throws
// rather than dropping out of the sweep. A vacuous green is the one outcome these
// sweeps must not be able to produce, because it looks exactly like a passing run.
//
// One corpus entry in two is not swept: the corpus carries `validity = "invalid"`
// entries, each surgically authored to trigger exactly one declared error, and this
// repo's declared slice takes the whole corpus rather than a filtered one. A sweep that
// demands zero diagnostics would report those as builder gaps, which is the mirror image
// of the vacuous green — a red that means nothing, and that trains the next reader to
// loosen the gate. So `validity` is read off each entry's manifest and only `valid`
// entries reach the sweeps. A manifest that is missing, unreadable, or carries a
// validity the contract does not define throws, because silently dropping an entry is
// the failure this whole helper exists to prevent.
//
// Never edit anything under `data/mthds-corpus/`: it is generated, and the entries are
// authored in pipelex where the corpus gates run. Fix an entry there and re-sync.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { parse as parseToml } from "smol-toml";

const DATA_DIR = path.resolve(__dirname, "../../../data");
const PIPELINES_DIR = path.join(DATA_DIR, "pipelines");
const CORPUS_ENTRIES_DIR = path.join(DATA_DIR, "mthds-corpus", "entries");

/** A method package to sweep, and the name a failing test should report it under. */
interface FixtureBundle {
  name: string;
  bundlePaths: string[];
}

/**
 * Order by UTF-16 code unit, not by locale. `localeCompare` reads the host's ICU
 * collation, so the same tree can merge in a different order on another machine —
 * and merge order is what decides which bundle's `main_pipe` and `description` the
 * merged set adopts, and which declaration a genuine clash keeps.
 */
function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function requireNonEmpty(fixtures: FixtureBundle[], directory: string): FixtureBundle[] {
  if (fixtures.length === 0) {
    throw new Error(
      `no fixture bundles found under ${directory} — the sweeps that read it would pass vacuously`,
    );
  }
  return fixtures;
}

/**
 * Every `.mthds` file in one fixture directory, entry point first.
 *
 * A package is "either exactly one `.mthds` file, or several with a `bundle.mthds`
 * acting as the entry point" — so `bundle.mthds` is not a filename every package has,
 * it is the tie-breaker for the multi-file case. Order only decides which bundle's
 * `main_pipe` and `description` the merge adopts, so the entry point leads and the
 * rest follow in name order, making the merge deterministic.
 *
 * A directory holding no `.mthds` file throws rather than dropping out of the sweep.
 */
function bundlePathsIn(entryDir: string): string[] {
  const names = readdirSync(entryDir)
    .filter((name) => name.endsWith(".mthds"))
    .sort(byCodeUnit);
  if (names.length === 0) {
    throw new Error(
      `fixture ${path.basename(entryDir)} holds no .mthds file — ` +
        `expected one, or several with a bundle.mthds entry point`,
    );
  }
  const ordered = names.includes("bundle.mthds")
    ? ["bundle.mthds", ...names.filter((name) => name !== "bundle.mthds")]
    : names;
  return ordered.map((name) => path.join(entryDir, name));
}

/** This repo's own numbered fixtures, the ones that carry generated graph specs. */
function localFixtures(): FixtureBundle[] {
  const fixtures = readdirSync(PIPELINES_DIR, { withFileTypes: true })
    .filter((item) => item.isDirectory() && item.name.startsWith("pipeline_"))
    .map((item) => ({
      name: item.name,
      bundlePaths: bundlePathsIn(path.join(PIPELINES_DIR, item.name)),
    }))
    .sort((a, b) => byCodeUnit(a.name, b.name));
  return requireNonEmpty(fixtures, PIPELINES_DIR);
}

/** The `validity` values the corpus contract defines. */
const VALIDITIES = ["valid", "invalid"] as const;

/**
 * Whether an entry belongs in a sweep that demands zero diagnostics.
 *
 * `valid` yes, `invalid` no — an invalid entry is authored to trigger exactly one
 * declared error, so diagnostics are what it is *for*. Anything else throws: a
 * manifest this helper cannot read is an entry it would otherwise drop silently,
 * and a silent drop is indistinguishable from a passing sweep.
 */
export function isSweepable(validity: unknown, entryName: string): boolean {
  if (
    typeof validity !== "string" ||
    !VALIDITIES.includes(validity as (typeof VALIDITIES)[number])
  ) {
    throw new Error(
      `corpus entry ${entryName}: validity is ${JSON.stringify(validity)} — ` +
        `the contract's values are ${VALIDITIES.join(", ")}. Refusing to guess, because ` +
        `an entry this helper cannot classify would drop out of the sweep unnoticed.`,
    );
  }
  return validity === "valid";
}

/** Read one entry's `validity` off its `entry.toml` manifest. Throws if unreadable. */
function validityOf(entryDir: string): unknown {
  const manifest = path.join(entryDir, "entry.toml");
  let raw: string;
  try {
    raw = readFileSync(manifest, "utf8");
  } catch (cause) {
    throw new Error(
      `corpus entry ${path.basename(entryDir)}: cannot read ${manifest} — every entry carries one`,
      { cause },
    );
  }
  return (parseToml(raw) as Record<string, unknown>).validity;
}

/**
 * The vendored MTHDS Test Corpus, one method package per entry directory, restricted
 * to the entries the contract marks `valid`.
 */
function corpusFixtures(): FixtureBundle[] {
  const fixtures = readdirSync(CORPUS_ENTRIES_DIR, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .filter((item) => isSweepable(validityOf(path.join(CORPUS_ENTRIES_DIR, item.name)), item.name))
    .map((item) => ({
      name: `corpus/${item.name}`,
      bundlePaths: bundlePathsIn(path.join(CORPUS_ENTRIES_DIR, item.name)),
    }))
    .sort((a, b) => byCodeUnit(a.name, b.name));
  return requireNonEmpty(fixtures, CORPUS_ENTRIES_DIR);
}

/** `it.each` rows: `[name, bundlePaths]`, local fixtures first. */
export function fixtureBundleCases(): [string, string[]][] {
  return [...localFixtures(), ...corpusFixtures()].map(({ name, bundlePaths }) => [
    name,
    bundlePaths,
  ]);
}
