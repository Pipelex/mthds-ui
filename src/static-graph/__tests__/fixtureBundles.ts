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
// Never edit anything under `data/mthds-corpus/`: it is generated, and the entries are
// authored in pipelex where the corpus gates run. Fix an entry there and re-sync.

import { readdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(__dirname, "../../../data");
const PIPELINES_DIR = path.join(DATA_DIR, "pipelines");
const CORPUS_ENTRIES_DIR = path.join(DATA_DIR, "mthds-corpus", "entries");

/** A method package to sweep, and the name a failing test should report it under. */
interface FixtureBundle {
  name: string;
  bundlePaths: string[];
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
    .sort((a, b) => a.localeCompare(b));
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
    .sort((a, b) => a.name.localeCompare(b.name));
  return requireNonEmpty(fixtures, PIPELINES_DIR);
}

/** The vendored MTHDS Test Corpus, one method package per entry directory. */
function corpusFixtures(): FixtureBundle[] {
  const fixtures = readdirSync(CORPUS_ENTRIES_DIR, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => ({
      name: `corpus/${item.name}`,
      bundlePaths: bundlePathsIn(path.join(CORPUS_ENTRIES_DIR, item.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return requireNonEmpty(fixtures, CORPUS_ENTRIES_DIR);
}

/** `it.each` rows: `[name, bundlePaths]`, local fixtures first. */
export function fixtureBundleCases(): [string, string[]][] {
  return [...localFixtures(), ...corpusFixtures()].map(({ name, bundlePaths }) => [
    name,
    bundlePaths,
  ]);
}
