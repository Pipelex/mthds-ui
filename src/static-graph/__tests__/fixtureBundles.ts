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
// Never edit anything under `data/mthds-corpus/`: it is generated, and the entries are
// authored in pipelex where the corpus gates run. Fix an entry there and re-sync.

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(__dirname, "../../../data");
const PIPELINES_DIR = path.join(DATA_DIR, "pipelines");
const CORPUS_ENTRIES_DIR = path.join(DATA_DIR, "mthds-corpus", "entries");

/** A bundle to sweep, and the name a failing test should report it under. */
export interface FixtureBundle {
  name: string;
  bundlePath: string;
}

/** This repo's own numbered fixtures, the ones that carry generated graph specs. */
function localFixtures(): FixtureBundle[] {
  return readdirSync(PIPELINES_DIR)
    .filter((name) => name.startsWith("pipeline_"))
    .map((name) => ({ name, bundlePath: path.join(PIPELINES_DIR, name, "bundle.mthds") }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The vendored MTHDS Test Corpus, one bundle per entry directory.
 *
 * Only the entry point is swept. A multi-file entry keeps its library files beside
 * `bundle.mthds`, and those are fragments — forward-declared signatures and the pipes
 * that fill them — which mean nothing read on their own. The corpus contract names
 * `bundle.mthds` as the entry point for exactly this reason.
 */
function corpusFixtures(): FixtureBundle[] {
  if (!existsSync(CORPUS_ENTRIES_DIR)) return [];
  return readdirSync(CORPUS_ENTRIES_DIR, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => ({
      name: `corpus/${item.name}`,
      bundlePath: path.join(CORPUS_ENTRIES_DIR, item.name, "bundle.mthds"),
    }))
    .filter((fixture) => existsSync(fixture.bundlePath))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Every bundle the integration sweeps run over, local fixtures first. */
export function fixtureBundles(): FixtureBundle[] {
  return [...localFixtures(), ...corpusFixtures()];
}

/** `it.each` rows: `[name, bundlePath]`. */
export function fixtureBundleCases(): [string, string][] {
  return fixtureBundles().map(({ name, bundlePath }) => [name, bundlePath]);
}
