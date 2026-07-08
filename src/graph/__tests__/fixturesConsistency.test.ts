/**
 * Generated-fixtures consistency.
 *
 * The pipeline stories import their LIVE specs directly from the per-pipeline
 * split modules (`_generated/live/pipeline_NN.ts`), NOT from the barrel. So a
 * DRY-only `make fixtures` run must leave a matching LIVE split for every DRY
 * split (a real spec or a DRY-backed placeholder) — otherwise those story
 * imports fail to resolve and Storybook/tests break. This guards that invariant
 * for the committed fixtures; the generator itself can't run here (needs pipelex
 * credentials), so we assert the artifacts it must keep in sync.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateGraphSpec } from "@graph/validateGraphSpec";
import { DRY_RUN_CATALOG } from "@graph/react/viewer/__stories__/mockGraphSpec";
import { STATIC_RUN_CATALOG } from "@graph/react/viewer/__stories__/staticGraphSpec";

const SPECS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../react/viewer/__stories__/pipelines/specs",
);
const DRY_DIR = path.join(SPECS_DIR, "_generated", "dry");
const LIVE_DIR = path.join(SPECS_DIR, "_generated", "live");
const LIVE_BARREL = path.join(SPECS_DIR, "_generated.live.ts");

const drySplits = readdirSync(DRY_DIR)
  .filter((f) => f.endsWith(".ts"))
  .sort();

describe("generated fixtures consistency", () => {
  it("has DRY split fixtures", () => {
    expect(drySplits.length).toBeGreaterThan(0);
  });

  it.each(drySplits)("DRY split %s has a matching LIVE split", (file) => {
    expect(existsSync(path.join(LIVE_DIR, file))).toBe(true);
  });

  it("LIVE barrel re-exports every LIVE split", () => {
    const barrel = readFileSync(LIVE_BARREL, "utf-8");
    for (const file of readdirSync(LIVE_DIR).filter((f) => f.endsWith(".ts"))) {
      const moduleRef = `./_generated/live/${file.replace(/\.ts$/, "")}`;
      expect(barrel).toContain(moduleRef);
    }
  });
});

const STATIC_DRY_COUNTERPARTS: Record<string, string> = {
  STATIC_SIMPLE_SEQUENCE: "DRY_SIMPLE_SEQUENCE",
  STATIC_SIMPLE_CONDITION: "DRY_SIMPLE_CONDITION",
  STATIC_SIMPLE_BATCH: "DRY_SIMPLE_BATCH",
  STATIC_CV_SCREENING: "DRY_CV_SCREENING",
  STATIC_DEEP_NESTING: "DRY_DEEP_NESTING",
  STATIC_WIDE_PARALLEL: "DRY_WIDE_PARALLEL",
};

describe("static fixture catalog consistency", () => {
  it.each(Object.keys(STATIC_DRY_COUNTERPARTS))("%s validates as static", (key) => {
    const entry = STATIC_RUN_CATALOG[key];
    expect(entry).toBeDefined();
    expect(() => validateGraphSpec(entry.spec)).not.toThrow();
    expect(entry.spec.meta?.mode).toBe("static");
  });

  it("covers the intended dry catalog counterparts", () => {
    for (const [staticKey, dryKey] of Object.entries(STATIC_DRY_COUNTERPARTS)) {
      expect(STATIC_RUN_CATALOG[staticKey]).toBeDefined();
      expect(DRY_RUN_CATALOG[dryKey]).toBeDefined();
    }
  });
});
