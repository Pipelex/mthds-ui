// Corpus oracle for the native concept catalog.
//
// `nativeConcepts.test.ts` pins the catalog against a second list written *here*,
// so it makes editing the catalog a deliberate two-place change but cannot see an
// upstream addition — both lists live in this repo. This sweep compares against
// something this repo did not author: `data/pipelines/*/dry_run_graph_spec.json`
// is pipelex output, and every `concept_registry` entry with
// `domain_code === "native"` carries pipelex's own code, description, and
// structure class name.
//
// ─── If this test fails after `make fixtures` ────────────────────────────────
//
// That is the signal working, not a broken test. Regenerating the fixtures
// against a newer pipelex has surfaced a divergence between the runtime and our
// hand-kept catalog in `src/static-graph/conceptRefs.ts`:
//
//   - "not in the catalog"  -> pipelex added a native code. Add it to
//     NATIVE_CONCEPT_DESCRIPTIONS (canonical order) and to SPEC_NATIVE_CODES in
//     nativeConcepts.test.ts. This is the upstream addition that
//     `docs/static-graph.md` used to say no in-repo test could catch.
//   - description / structure_class_name mismatch -> pipelex reworded or renamed.
//     Copy the new value verbatim; the standard's pinned set is the authority.
//
// Fix the catalog, not this test. See `docs/static-graph.md` -> "Native Concepts".

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { ConceptInfo, GraphSpec } from "@graph/types";
import { describe, expect, it } from "vitest";

import { isNativeConceptCode, nativeConceptInfo, NATIVE_DOMAIN } from "../conceptRefs";

const PIPELINES_DIR = path.resolve(__dirname, "../../../data/pipelines");

/**
 * The native codes the committed corpus actually reaches. Written out rather
 * than counted so that deleting a fixture fails here instead of silently
 * shrinking the oracle's coverage to nothing.
 *
 * Every catalog code except `Dynamic`, which has no authorable output position.
 */
const CORPUS_NATIVE_CODES = [
  "Anything",
  "Composite",
  "Date",
  "Document",
  "Html",
  "Image",
  "JSON",
  "Number",
  "Page",
  "SearchResult",
  "Text",
  "TextAndImages",
  "Time",
  "YesNo",
];

/**
 * Every native concept_registry entry in the corpus, keyed by code — *all*
 * occurrences, not just the first.
 *
 * Keeping only the first would leave most of the corpus outside the oracle:
 * `Text` alone appears in most fixtures. That matters here specifically because
 * the corpus is regenerated per-pipeline (`make fixtures ONLY=...`), so the
 * committed specs are a mix of pipelex versions — a rewording between versions
 * shows up in the pipelines regenerated since, and not in the rest.
 */
function collectNativeEntries(): Map<string, { pipeline: string; info: ConceptInfo }[]> {
  const byCode = new Map<string, { pipeline: string; info: ConceptInfo }[]>();
  const pipelines = readdirSync(PIPELINES_DIR)
    .filter(
      (name) =>
        name.startsWith("pipeline_") &&
        existsSync(path.join(PIPELINES_DIR, name, "dry_run_graph_spec.json")),
    )
    .sort();

  for (const pipeline of pipelines) {
    const spec = JSON.parse(
      readFileSync(path.join(PIPELINES_DIR, pipeline, "dry_run_graph_spec.json"), "utf8"),
    ) as GraphSpec;
    for (const info of Object.values(spec.concept_registry ?? {})) {
      if (info.domain_code !== NATIVE_DOMAIN) continue;
      const occurrences = byCode.get(info.code);
      if (occurrences) occurrences.push({ pipeline, info });
      else byCode.set(info.code, [{ pipeline, info }]);
    }
  }
  return byCode;
}

const nativeEntries = collectNativeEntries();

describe("native concept catalog vs the pipelex fixture corpus", () => {
  it("reaches exactly the native codes it is expected to", () => {
    expect([...nativeEntries.keys()].sort()).toEqual([...CORPUS_NATIVE_CODES].sort());
  });

  it.each(CORPUS_NATIVE_CODES)("%s is a code the catalog knows", (code) => {
    // The upstream-addition detector: pipelex emitted this code, so our catalog
    // must know it. See the failure guide at the top of this file.
    expect(isNativeConceptCode(code)).toBe(true);
  });

  it.each(CORPUS_NATIVE_CODES)(
    "%s matches the catalog in every fixture that carries it",
    (code) => {
      const occurrences = nativeEntries.get(code) ?? [];
      expect(occurrences.length).toBeGreaterThan(0);
      expect(isNativeConceptCode(code)).toBe(true);
      if (!isNativeConceptCode(code)) return;
      const expected = nativeConceptInfo(code);

      // Compared per pipeline so a failure names the fixture to regenerate or revert.
      expect(
        occurrences.map(({ pipeline, info }) => ({
          pipeline,
          description: info.description,
          structure_class_name: info.structure_class_name,
        })),
      ).toEqual(
        occurrences.map(({ pipeline }) => ({
          pipeline,
          description: expected.description,
          structure_class_name: expected.structure_class_name,
        })),
      );
    },
  );
});
