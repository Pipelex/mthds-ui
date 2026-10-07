/**
 * The review set for the graph styles: the fixtures chosen to break a style
 * rather than flatter it — the basics, then decisions, loops, width and deep
 * nesting, and the realistic business methods a non-technical reader would
 * actually meet. Shared by `GraphStyles.stories.tsx` (to flip through them
 * live), `GraphStyles.style-review.tsx` (to capture them for the review loop)
 * and `GraphStyles.screenshot.tsx` (the committed references). Nothing here is
 * hand-written: every spec comes from the static, dry and live catalogs.
 */
import type { GraphSpec, GraphSpecMode, PipeStatus } from "@graph/types";
import { GRAPH_SPEC_MODE } from "@graph/types";
import { buildStaticGraphSpecFromToml } from "@static-graph/buildStaticGraphSpec";

import * as STATIC from "./staticGraphSpec";
import * as DRY from "./mockGraphSpec";
import * as LIVE from "./liveGraphSpec";
import catalogReviewBundle from "../../../../../data/mthds-corpus/entries/feature_binding_step_catalog_review/bundle.mthds?raw";

/** One fixture of the review set, in each mode it has. */
export interface ReviewFixture {
  label: string;
  /** Why it is in the set. */
  group: "basics" | "fork" | "decisions" | "loops" | "realistic" | "nesting" | "catalog";
  static: GraphSpec;
  dry?: GraphSpec;
  live?: GraphSpec;
}

export const REVIEW_FIXTURES = {
  SINGLE_PIPE: {
    label: "01 Single pipe",
    group: "basics",
    static: STATIC.STATIC_SINGLE_PIPE,
    dry: DRY.DRY_SINGLE_PIPE,
    live: LIVE.LIVE_SINGLE_PIPE,
  },
  SIMPLE_SEQUENCE: {
    label: "03 Simple sequence",
    group: "basics",
    static: STATIC.STATIC_SIMPLE_SEQUENCE,
    dry: DRY.DRY_SIMPLE_SEQUENCE,
    live: LIVE.LIVE_SIMPLE_SEQUENCE,
  },
  LONG_SEQUENCE: {
    label: "04 Long sequence",
    group: "basics",
    static: STATIC.STATIC_LONG_SEQUENCE,
    dry: DRY.DRY_LONG_SEQUENCE,
    live: LIVE.LIVE_LONG_SEQUENCE,
  },
  SIMPLE_PARALLEL: {
    label: "05 Simple parallel",
    group: "fork",
    static: STATIC.STATIC_SIMPLE_PARALLEL,
    dry: DRY.DRY_SIMPLE_PARALLEL,
    live: LIVE.LIVE_SIMPLE_PARALLEL,
  },
  WIDE_PARALLEL: {
    label: "20 Wide parallel",
    group: "fork",
    static: STATIC.STATIC_WIDE_PARALLEL,
    dry: DRY.DRY_WIDE_PARALLEL,
    live: LIVE.LIVE_WIDE_PARALLEL,
  },
  SIMPLE_CONDITION: {
    label: "07 Simple condition",
    group: "decisions",
    static: STATIC.STATIC_SIMPLE_CONDITION,
    dry: DRY.DRY_SIMPLE_CONDITION,
    live: LIVE.LIVE_SIMPLE_CONDITION,
  },
  EMAIL_TRIAGE: {
    label: "17 Email triage",
    group: "decisions",
    static: STATIC.STATIC_EMAIL_TRIAGE,
    dry: DRY.DRY_EMAIL_TRIAGE,
    live: LIVE.LIVE_EMAIL_TRIAGE,
  },
  AVAILABILITY_ROUTING: {
    label: "33 Availability routing",
    group: "decisions",
    static: STATIC.STATIC_AVAILABILITY_ROUTING,
    dry: DRY.DRY_AVAILABILITY_ROUTING,
    live: LIVE.LIVE_AVAILABILITY_ROUTING,
  },
  SIMPLE_BATCH: {
    label: "08 Simple batch",
    group: "loops",
    static: STATIC.STATIC_SIMPLE_BATCH,
    dry: DRY.DRY_SIMPLE_BATCH,
    live: LIVE.LIVE_SIMPLE_BATCH,
  },
  BATCH_WITH_INNER_SEQ: {
    label: "12 Batch with inner sequence",
    group: "loops",
    static: STATIC.STATIC_BATCH_WITH_INNER_SEQ,
    dry: DRY.DRY_BATCH_WITH_INNER_SEQ,
    live: LIVE.LIVE_BATCH_WITH_INNER_SEQ,
  },
  CV_BATCH_SCREENING: {
    label: "28 CV batch screening",
    group: "loops",
    static: STATIC.STATIC_CV_BATCH_SCREENING,
    dry: DRY.DRY_CV_BATCH_SCREENING,
    live: LIVE.LIVE_CV_BATCH_SCREENING,
  },
  CV_SCREENING: {
    label: "09 CV screening",
    group: "realistic",
    static: STATIC.STATIC_CV_SCREENING,
    dry: DRY.DRY_CV_SCREENING,
    live: LIVE.LIVE_CV_SCREENING,
  },
  RFP_QUALIFIER: {
    label: "31 RFP qualifier",
    group: "realistic",
    static: STATIC.STATIC_RFP_QUALIFIER,
    dry: DRY.DRY_RFP_QUALIFIER,
    live: LIVE.LIVE_RFP_QUALIFIER,
  },
  MEETING_TRIAGE: {
    label: "32 Meeting triage",
    group: "realistic",
    static: STATIC.STATIC_MEETING_TRIAGE,
    dry: DRY.DRY_MEETING_TRIAGE,
    live: LIVE.LIVE_MEETING_TRIAGE,
  },
  NESTED_SEQ_COND_SEQ: {
    label: "11 Nested sequence, condition, sequence",
    group: "nesting",
    static: STATIC.STATIC_NESTED_SEQ_COND_SEQ,
    dry: DRY.DRY_NESTED_SEQ_COND_SEQ,
    live: LIVE.LIVE_NESTED_SEQ_COND_SEQ,
  },
  DEEP_NESTING: {
    label: "24 Deep nesting",
    group: "nesting",
    static: STATIC.STATIC_DEEP_NESTING,
    dry: DRY.DRY_DEEP_NESTING,
    live: LIVE.LIVE_DEEP_NESTING,
  },
  ALL_CONTROLLER_TYPES: {
    label: "25 All controller types",
    group: "nesting",
    static: STATIC.STATIC_ALL_CONTROLLER_TYPES,
    dry: DRY.DRY_ALL_CONTROLLER_TYPES,
    live: LIVE.LIVE_ALL_CONTROLLER_TYPES,
  },
  ALL_PIPE_TYPES: {
    label: "14 All pipe types",
    group: "catalog",
    static: STATIC.STATIC_ALL_PIPE_TYPES,
    dry: DRY.DRY_ALL_PIPE_TYPES,
    live: LIVE.LIVE_ALL_PIPE_TYPES,
  },
  ALL_NATIVE_CONCEPTS: {
    label: "34 All native concepts",
    group: "catalog",
    static: STATIC.STATIC_ALL_NATIVE_CONCEPTS,
    dry: DRY.DRY_ALL_NATIVE_CONCEPTS,
    live: LIVE.LIVE_ALL_NATIVE_CONCEPTS,
  },
  // A corpus entry, static only: binding steps beside a batch, a judge and an optional.
  CATALOG_REVIEW: {
    label: "Catalog review (binding steps)",
    group: "catalog",
    static: buildStaticGraphSpecFromToml(catalogReviewBundle).spec,
  },
} satisfies Record<string, ReviewFixture>;

export type ReviewFixtureId = keyof typeof REVIEW_FIXTURES;

export const REVIEW_FIXTURE_IDS = Object.keys(REVIEW_FIXTURES) as ReviewFixtureId[];

/** The fixtures also captured top to bottom, dark and live, so the combinations are covered. */
export const REVIEW_SUBSET: readonly ReviewFixtureId[] = [
  "CV_SCREENING",
  "EMAIL_TRIAGE",
  "DEEP_NESTING",
  "WIDE_PARALLEL",
];

/** The fixtures the cold-read test reads, the ones a non-technical reader would meet. */
export const REALISTIC_FIXTURES: readonly ReviewFixtureId[] = [
  "CV_SCREENING",
  "RFP_QUALIFIER",
  "MEETING_TRIAGE",
  "EMAIL_TRIAGE",
];

/** A fixture's spec in a mode, falling back to static for a fixture that only has one. */
export function reviewSpec(id: ReviewFixtureId, mode: GraphSpecMode): GraphSpec {
  const fixture: ReviewFixture = REVIEW_FIXTURES[id];
  if (mode === GRAPH_SPEC_MODE.DRY) return fixture.dry ?? fixture.static;
  if (mode === GRAPH_SPEC_MODE.LIVE) return fixture.live ?? fixture.static;
  return fixture.static;
}

/**
 * A run caught midway, for the live captures: every step done but the last
 * two, the one before last running and the last one failed. Keyed by pipe code,
 * as a host's live status map is.
 */
export function reviewStatusMap(spec: GraphSpec): Record<string, PipeStatus> {
  const codes: string[] = [];
  for (const node of spec.nodes) {
    if (node.kind !== "operator" || !node.pipe_code || codes.includes(node.pipe_code)) continue;
    codes.push(node.pipe_code);
  }
  const statuses: Record<string, PipeStatus> = {};
  codes.forEach((code, index) => {
    const fromEnd = codes.length - index;
    statuses[code] =
      fromEnd === 1 && codes.length >= 3 ? "failed" : fromEnd <= 2 ? "running" : "succeeded";
  });
  return statuses;
}
