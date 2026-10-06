import { describe, it, expect } from "vitest";
import type { GraphStyleId } from "@graph/types";
import {
  REVIEW_FIXTURE_IDS,
  reviewSpec,
  type ReviewFixtureId,
} from "@graph/react/viewer/__stories__/styleReviewFixtures";
import { SIMPLE_STEP_TITLE_FONT_PX } from "../simpleStyle";
import { styleMetrics, type StyleMetrics } from "../styleMetrics";
import { layoutStyle } from "./styleTestUtils";

/**
 * The automated half of the graph styles' review rubric (R1 to R5), over every
 * fixture of the review set, laid out the way the viewer lays it out. The
 * visual half is scored on the captures of `make style-review`.
 */

/** Where the detailed drawing has nothing to drop: the simple one has as many nodes, never more. */
const SAME_NODE_COUNT: readonly ReviewFixtureId[] = [
  // An input, one step and the output: nothing in between to elide.
  "SINGLE_PIPE",
  // The one intermediate value becomes the decision that reads it.
  "SIMPLE_CONDITION",
];

/** Fixtures whose authored descriptions run past three lines: cut with a tooltip, by design. */
const LONG_DESCRIPTIONS: readonly ReviewFixtureId[] = ["CV_BATCH_SCREENING", "RFP_QUALIFIER"];

/** The legibility floor at fit view, in pixels, for a step title (R4). */
const MIN_EFFECTIVE_TITLE_PX = 11;

async function measure(id: ReviewFixtureId, style: GraphStyleId): Promise<StyleMetrics> {
  const { nodes, edges, controllerPositions } = await layoutStyle(reviewSpec(id, "static"), style);
  return styleMetrics(nodes, edges, "LR", Object.values(controllerPositions));
}

describe.each(REVIEW_FIXTURE_IDS)("the review rubric on %s", (id) => {
  let simple: StyleMetrics;
  let detailed: StyleMetrics;

  it("lays out in both styles", async () => {
    [simple, detailed] = await Promise.all([measure(id, "simple"), measure(id, "detailed")]);
    expect(simple.counts.content).toBeGreaterThan(0);
  });

  it("R1: draws no identifier in the simple style", () => {
    expect(simple.identifierTexts).toEqual([]);
  });

  it("R2: draws fewer nodes than the detailed style, with one output", () => {
    expect(simple.counts.outputs).toBe(1);
    if (SAME_NODE_COUNT.includes(id)) {
      expect(simple.counts.content).toBe(detailed.counts.content);
    } else {
      expect(simple.counts.content).toBeLessThan(detailed.counts.content);
    }
  });

  it("R3: titles every step in at most three lines, unless its author wrote more", () => {
    if (LONG_DESCRIPTIONS.includes(id)) {
      expect(simple.overlongTitles.length).toBeGreaterThan(0);
    } else {
      expect(simple.overlongTitles).toEqual([]);
    }
  });

  it("R4: keeps step titles legible at fit view", () => {
    expect(simple.fitZoom * SIMPLE_STEP_TITLE_FONT_PX).toBeGreaterThanOrEqual(
      MIN_EFFECTIVE_TITLE_PX,
    );
  });

  it("R5: overlaps nothing and crosses no more arrows than the detailed style", () => {
    expect(simple.overlaps).toBe(0);
    expect(simple.crossings).toBeLessThanOrEqual(detailed.crossings);
  });
});
