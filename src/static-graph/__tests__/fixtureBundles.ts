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
// Both piles are discovered, never listed, so a synced entry is swept with no wiring
// change here. The flip side is that discovery failing quietly would void the whole
// claim, so it does not: each pile throws when it comes back empty, and a missing
// directory throws out of `readdirSync`. A vacuous green is the one outcome these
// sweeps must not be able to produce, because it looks exactly like a passing run.
//
// Never edit anything under `data/mthds-corpus/`: it is generated, and the entries are
// authored in pipelex where the corpus gates run. Fix an entry there and re-sync.

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(__dirname, "../../../data");
const PIPELINES_DIR = path.join(DATA_DIR, "pipelines");
const CORPUS_ENTRIES_DIR = path.join(DATA_DIR, "mthds-corpus", "entries");

/** A bundle to sweep, and the name a failing test should report it under. */
interface FixtureBundle {
  name: string;
  bundlePath: string;
}

function requireNonEmpty(fixtures: FixtureBundle[], directory: string): FixtureBundle[] {
  if (fixtures.length === 0) {
    throw new Error(
      `no fixture bundles found under ${directory} — the sweeps that read it would pass vacuously`,
    );
  }
  return fixtures;
}

/** This repo's own numbered fixtures, the ones that carry generated graph specs. */
function localFixtures(): FixtureBundle[] {
  const fixtures = readdirSync(PIPELINES_DIR)
    .filter((name) => name.startsWith("pipeline_"))
    .map((name) => ({ name, bundlePath: path.join(PIPELINES_DIR, name, "bundle.mthds") }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return requireNonEmpty(fixtures, PIPELINES_DIR);
}

/**
 * The entry point of one corpus entry directory, resolved the way the contract defines it.
 *
 * An entry holds "either exactly one `.mthds` file, or several with a `bundle.mthds`
 * acting as the entry point" — so `bundle.mthds` is not a filename every entry has, it is
 * the tie-breaker for the multi-file case. Only the entry point is swept: a multi-file
 * entry's other files are fragments, forward-declared signatures and the pipes that fill
 * them, which mean nothing read on their own.
 *
 * An entry that resolves to neither shape throws rather than dropping out of the sweep.
 */
function resolveEntryPoint(entryDir: string): string {
  const bundlePath = path.join(entryDir, "bundle.mthds");
  if (existsSync(bundlePath)) return bundlePath;
  const candidates = readdirSync(entryDir).filter((name) => name.endsWith(".mthds"));
  if (candidates.length === 1) return path.join(entryDir, candidates[0]);
  throw new Error(
    `corpus entry ${path.basename(entryDir)} does not resolve to a bundle: ` +
      `expected one .mthds file or a bundle.mthds entry point, found ${candidates.length} .mthds files`,
  );
}

/** The vendored MTHDS Test Corpus, one entry point per entry directory. */
function corpusFixtures(): FixtureBundle[] {
  const fixtures = readdirSync(CORPUS_ENTRIES_DIR, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => ({
      name: `corpus/${item.name}`,
      bundlePath: resolveEntryPoint(path.join(CORPUS_ENTRIES_DIR, item.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return requireNonEmpty(fixtures, CORPUS_ENTRIES_DIR);
}

/** `it.each` rows: `[name, bundlePath]`, local fixtures first. */
export function fixtureBundleCases(): [string, string][] {
  return [...localFixtures(), ...corpusFixtures()].map(({ name, bundlePath }) => [
    name,
    bundlePath,
  ]);
}
