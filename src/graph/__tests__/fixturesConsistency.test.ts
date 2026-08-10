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
import { LIVE_RUN_CATALOG } from "@graph/react/viewer/__stories__/liveGraphSpec";
import { STATIC_RUN_CATALOG } from "@graph/react/viewer/__stories__/staticGraphSpec";

const SPECS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../react/viewer/__stories__/pipelines/specs",
);
const DRY_DIR = path.join(SPECS_DIR, "_generated", "dry");
const LIVE_DIR = path.join(SPECS_DIR, "_generated", "live");
const LIVE_BARREL = path.join(SPECS_DIR, "_generated.live.ts");
const SMOKE_STORIES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../react/viewer/__stories__/PipelineSmoke.stories.tsx",
);

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

  // PipelineSmoke.stories.tsx is hand-written — Storybook indexes static exports,
  // so the stories cannot be generated from the catalog in a loop. That made it
  // drift silently: pipelines 26, 28, 30 and 31 were each added to the catalog
  // without a smoke story, across four separate changes, and nothing noticed.
  it("has a smoke story for every DRY catalog entry", () => {
    const source = readFileSync(SMOKE_STORIES, "utf-8");
    const covered = new Set(
      [...source.matchAll(/DRY_RUN_CATALOG\.(DRY_[A-Z0-9_]+)\.spec/g)].map((m) => m[1]),
    );
    expect([...Object.keys(DRY_RUN_CATALOG)].filter((key) => !covered.has(key))).toEqual([]);
  });

  it("stamps explicit graph modes on generated dry and live catalog specs", () => {
    for (const entry of Object.values(DRY_RUN_CATALOG)) {
      expect(entry.spec.meta?.mode).toBe("dry");
    }
    for (const entry of Object.values(LIVE_RUN_CATALOG)) {
      expect(entry.spec.meta?.mode).toBe("live");
    }
  });
});

/**
 * Mirrors the pairs `StaticVsLive.stories.tsx` compares — one entry per
 * `compare(...)` export, no more. It exists to guard those stories, so it is not
 * "every static spec that has a live twin"; adding a pair with no story would
 * change what the list means rather than widen coverage. Keep the two in sync.
 */
const STATIC_LIVE_COUNTERPARTS: Record<string, string> = {
  STATIC_SIMPLE_SEQUENCE: "LIVE_SIMPLE_SEQUENCE",
  STATIC_SIMPLE_CONDITION: "LIVE_SIMPLE_CONDITION",
  STATIC_SIMPLE_BATCH: "LIVE_SIMPLE_BATCH",
  STATIC_CV_SCREENING: "LIVE_CV_SCREENING",
  STATIC_DEEP_NESTING: "LIVE_DEEP_NESTING",
  STATIC_WIDE_PARALLEL: "LIVE_WIDE_PARALLEL",
  STATIC_MEETING_TRIAGE: "LIVE_MEETING_TRIAGE",
};

describe("static fixture catalog consistency", () => {
  it.each(Object.keys(STATIC_LIVE_COUNTERPARTS))("%s validates as static", (key) => {
    const entry = STATIC_RUN_CATALOG[key];
    expect(entry).toBeDefined();
    expect(() => validateGraphSpec(entry.spec)).not.toThrow();
    expect(entry.spec.meta?.mode).toBe("static");
  });

  it("covers the intended live catalog counterparts", () => {
    for (const [staticKey, liveKey] of Object.entries(STATIC_LIVE_COUNTERPARTS)) {
      expect(STATIC_RUN_CATALOG[staticKey]).toBeDefined();
      expect(LIVE_RUN_CATALOG[liveKey]).toBeDefined();
    }
  });
});
