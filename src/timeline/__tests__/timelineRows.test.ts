import { describe, expect, it } from "vitest";
import {
  WIDE_BATCH_SNAPSHOTS,
  WORKED_EXAMPLE_SNAPSHOT,
} from "@timeline/react/__stories__/recordedRuns";
import type { ProgressInvocation, ProgressSnapshot } from "../progressSnapshot";
import { buildTimelineRows, DEFAULT_WIDE_BATCH_THRESHOLD } from "../timelineRows";

const ROOT = "filings.review_filings";
const BATCH = `${ROOT}/step_3`;

function invocation(
  path: string,
  pipeCode: string,
  overrides: Partial<ProgressInvocation> = {},
): ProgressInvocation {
  return {
    path,
    pipe_code: pipeCode,
    pipe_ref: `filings.${pipeCode}`,
    pipe_type: "PipeLLM",
    status: "succeeded",
    started_at: "2026-10-12T09:30:00.000Z",
    ended_at: "2026-10-12T09:30:01.000Z",
    ...overrides,
  };
}

function snapshotOf(
  invocations: ProgressInvocation[],
  overrides: Partial<ProgressSnapshot> = {},
): ProgressSnapshot {
  return {
    pipeline_run_id: "run_test",
    mode: "live",
    status: "running",
    version: invocations.length,
    assembled_at: "2026-10-12T09:31:00.000Z",
    summary: "",
    invocations,
    ...overrides,
  };
}

/** A batch at step 3 of a four-step sequence, fanned out over `count` items. */
function batchSnapshot(
  count: number,
  itemStatus: (item: number) => ProgressInvocation["status"],
): ProgressSnapshot {
  const items = Array.from({ length: count }, (_, index) =>
    invocation(`${BATCH}/item_${index + 1}`, "summarize_filing", {
      pipe_type: "PipeSequence",
      status: itemStatus(index + 1),
    }),
  );
  const tally = (...statuses: ProgressInvocation["status"][]) =>
    items.filter((item) => statuses.includes(item.status)).length;
  return snapshotOf([
    invocation(ROOT, "review_filings", {
      pipe_type: "PipeSequence",
      status: "running",
      step_count: 4,
    }),
    invocation(BATCH, "summarize_filing_batch", {
      pipe_type: "PipeBatch",
      status: "running",
      batch: {
        total: count,
        done: tally("succeeded", "skipped"),
        running: tally("running"),
        failed: tally("failed"),
      },
    }),
    ...items,
  ]);
}

describe("buildTimelineRows — nesting", () => {
  const rows = buildTimelineRows(WORKED_EXAMPLE_SNAPSHOT);

  it("draws one row per invocation, each before its descendants", () => {
    expect(rows.map((row) => row.path)).toEqual(
      WORKED_EXAMPLE_SNAPSHOT.invocations.map((each) => each.path),
    );
  });

  it("nests each row under its controller by path", () => {
    const depthOf = (path: string) => rows.find((row) => row.path === path)?.depth;
    expect(depthOf(ROOT)).toBe(0);
    expect(depthOf(`${ROOT}/step_2`)).toBe(1);
    expect(depthOf(`${ROOT}/step_2/outcome_detailed`)).toBe(2);
    expect(depthOf(`${ROOT}/step_2/outcome_detailed/branch_2`)).toBe(3);
    expect(depthOf(`${BATCH}/item_2/step_2`)).toBe(3);
    expect(rows.find((row) => row.path === `${BATCH}/item_2`)?.parentPath).toBe(BATCH);
    expect(rows[0].parentPath).toBeNull();
  });

  it("words each row's place under its parent as the summary does", () => {
    const placeOf = (path: string) => rows.find((row) => row.path === path)?.placeLabel;
    expect(placeOf(ROOT)).toBeNull();
    expect(placeOf(`${ROOT}/step_1`)).toBe("step 1 of 4");
    expect(placeOf(`${ROOT}/step_2/outcome_detailed/branch_1`)).toBe("branch 1 of 2");
    expect(placeOf(`${BATCH}/item_3`)).toBe("item 3 of 3");
    expect(placeOf(`${BATCH}/item_3/step_1`)).toBe("step 1 of 2");
  });

  it("drops the count a parent does not carry", () => {
    const rowsWithoutCounts = buildTimelineRows(
      snapshotOf([
        invocation(ROOT, "review_filings", { pipe_type: "PipeSequence", status: "running" }),
        invocation(`${ROOT}/step_1`, "extract_filings"),
      ]),
    );
    expect(rowsWithoutCounts[1].placeLabel).toBe("step 1");
  });

  it("orders children by the number in their segment, whatever the snapshot's order", () => {
    const shuffled = buildTimelineRows(
      snapshotOf([
        invocation(ROOT, "review_filings", { pipe_type: "PipeSequence", step_count: 12 }),
        invocation(`${ROOT}/step_10`, "tenth"),
        invocation(`${ROOT}/step_2`, "second"),
        invocation(`${ROOT}/step_2/branch_2`, "second_branch"),
        invocation(`${ROOT}/step_2/branch_1`, "first_branch"),
        invocation(`${ROOT}/step_1`, "first"),
      ]),
    );
    expect(shuffled.map((row) => row.invocation.pipe_code)).toEqual([
      "review_filings",
      "first",
      "second",
      "first_branch",
      "second_branch",
      "tenth",
    ]);
  });

  it("nests an invocation whose parent is missing under its nearest ancestor", () => {
    const orphaned = buildTimelineRows(
      snapshotOf([
        invocation(ROOT, "review_filings", { pipe_type: "PipeSequence", step_count: 4 }),
        invocation(`${BATCH}/item_2/step_1`, "read_filing"),
      ]),
    );
    expect(orphaned[1]).toMatchObject({ parentPath: ROOT, depth: 1 });
    // Its segment is worded against the invocation one level up, which is
    // missing, so it carries no count rather than the root's step count.
    expect(orphaned[1].placeLabel).toBe("step 1");
  });

  it("draws a snapshot of part of a run from the invocation at its root_path", () => {
    const itemPath = `${BATCH}/item_2`;
    const part = buildTimelineRows(
      snapshotOf(
        [
          invocation(itemPath, "summarize_filing", { pipe_type: "PipeSequence", step_count: 2 }),
          invocation(`${itemPath}/step_1`, "read_filing"),
          invocation(`${itemPath}/step_2`, "condense_filing"),
        ],
        { root_path: itemPath, chain: [{ execution: "exec-run", attempt: 1 }] },
      ),
    );
    expect(part.map((row) => [row.depth, row.placeLabel])).toEqual([
      [0, "item 2"],
      [1, "step 1 of 2"],
      [1, "step 2 of 2"],
    ]);
  });

  it("keeps the first entry of a path listed twice", () => {
    const doubled = buildTimelineRows(
      snapshotOf([invocation(ROOT, "first_entry"), invocation(ROOT, "second_entry")]),
    );
    expect(doubled.map((row) => row.invocation.pipe_code)).toEqual(["first_entry"]);
  });

  it("draws nothing for a snapshot with no invocation", () => {
    expect(buildTimelineRows(snapshotOf([], { status: "pending" }))).toEqual([]);
  });

  it("labels a segment it does not know with the segment itself", () => {
    const unknown = buildTimelineRows(
      snapshotOf([invocation(ROOT, "root"), invocation(`${ROOT}/batch_branch`, "template")]),
    );
    expect(unknown[1].placeLabel).toBe("batch_branch");
  });
});

describe("buildTimelineRows — conditions", () => {
  it("names the chosen branch by the outcome the condition took", () => {
    const rows = buildTimelineRows(WORKED_EXAMPLE_SNAPSHOT);
    const branch = rows.find((row) => row.path === `${ROOT}/step_2/outcome_detailed`);
    expect(branch?.outcome).toEqual({ key: "detailed", fromResolution: true });
    expect(branch?.placeLabel).toBe("outcome detailed");
  });

  it("names the default outcome when the condition matched no key", () => {
    // The default runs the same pipe as the key `quick`, so the path names the
    // group `outcome_quick`, but the outcome the condition took is its default.
    const lastWide = WIDE_BATCH_SNAPSHOTS[WIDE_BATCH_SNAPSHOTS.length - 1];
    const branch = buildTimelineRows(lastWide).find(
      (row) => row.path === `${ROOT}/step_2/outcome_quick`,
    );
    expect(branch?.outcome).toEqual({ key: null, fromResolution: true });
    expect(branch?.placeLabel).toBe("default outcome");
  });

  it("names the key matched when it is not the first key of its group", () => {
    const rows = buildTimelineRows(
      snapshotOf([
        invocation(`${ROOT}`, "triage", {
          pipe_type: "PipeCondition",
          condition: { selected_outcome: "medium risk" },
        }),
        invocation(`${ROOT}/outcome_low`, "light_review"),
      ]),
    );
    expect(rows[1].placeLabel).toBe("outcome medium risk");
  });

  it("names each group of a dry run's condition, which resolves none, by its path", () => {
    const rows = buildTimelineRows(
      snapshotOf(
        [
          invocation(ROOT, "choose_depth", { pipe_type: "PipeCondition" }),
          invocation(`${ROOT}/outcome_high%20risk`, "deep_checks"),
          invocation(`${ROOT}/default`, "quick_check"),
        ],
        { mode: "dry" },
      ),
    );
    expect(rows.map((row) => row.placeLabel)).toEqual([
      null,
      "outcome high risk",
      "default outcome",
    ]);
    expect(rows[1].outcome).toEqual({ key: "high risk", fromResolution: false });
    expect(rows[2].outcome).toEqual({ key: null, fromResolution: false });
  });

  it("names nothing for a row that is no condition's branch", () => {
    expect(buildTimelineRows(WORKED_EXAMPLE_SNAPSHOT)[1].outcome).toBeNull();
  });
});

describe("buildTimelineRows — batches", () => {
  it("expands a narrow batch, carrying its counts and its items' strip", () => {
    const rows = buildTimelineRows(WORKED_EXAMPLE_SNAPSHOT);
    const batch = rows.find((row) => row.path === BATCH)?.batch;
    expect(batch).toEqual({
      counts: { total: 3, done: 1, running: 2, failed: 0 },
      total: 3,
      strip: [
        { status: "succeeded", firstItem: 1, count: 1 },
        { status: "running", firstItem: 2, count: 2 },
      ],
      wide: false,
      expanded: true,
      hiddenItemCount: 0,
    });
    expect(rows.filter((row) => row.path.startsWith(`${BATCH}/item_`))).toHaveLength(8);
  });

  it("collapses a wide batch into its one row", () => {
    const wide = batchSnapshot(DEFAULT_WIDE_BATCH_THRESHOLD + 1, () => "running");
    const rows = buildTimelineRows(wide);
    expect(rows.map((row) => row.path)).toEqual([ROOT, BATCH]);
    expect(rows[1].batch).toMatchObject({
      counts: { total: 11, done: 0, running: 11, failed: 0 },
      wide: true,
      expanded: false,
      hiddenItemCount: 11,
      strip: [{ status: "running", firstItem: 1, count: 11 }],
    });
  });

  it("keeps a batch at the threshold narrow", () => {
    const atThreshold = buildTimelineRows(
      batchSnapshot(DEFAULT_WIDE_BATCH_THRESHOLD, () => "running"),
    );
    expect(atThreshold[1].batch?.wide).toBe(false);
    expect(atThreshold).toHaveLength(DEFAULT_WIDE_BATCH_THRESHOLD + 2);
  });

  it("keeps a failed item, and everything under it, in view while collapsed", () => {
    const snapshot = batchSnapshot(40, (item) =>
      item === 17 ? "failed" : item < 17 ? "succeeded" : "running",
    );
    snapshot.invocations.push(
      invocation(`${BATCH}/item_17/step_2`, "condense_filing", { status: "failed" }),
    );
    const rows = buildTimelineRows(snapshot);
    expect(rows.map((row) => row.path)).toEqual([
      ROOT,
      BATCH,
      `${BATCH}/item_17`,
      `${BATCH}/item_17/step_2`,
    ]);
    expect(rows[2].keptVisible).toBe("failed");
    expect(rows[3].keptVisible).toBeNull();
    expect(rows[1].batch).toMatchObject({ hiddenItemCount: 39, expanded: false });
    expect(rows[1].batch?.strip).toEqual([
      { status: "succeeded", firstItem: 1, count: 16 },
      { status: "failed", firstItem: 17, count: 1 },
      { status: "running", firstItem: 18, count: 23 },
    ]);
  });

  it("keeps the item where the run is stuck in view while collapsed", () => {
    const snapshot = batchSnapshot(20, () => "running");
    snapshot.invocations[2 + 6].degradation = {
      reason: "workflow_task_failing",
      message: "Item 7 has failed to advance 3 times in a row.",
      failed_attempts: 3,
      failing_since: null,
      ends_at: null,
    };
    const rows = buildTimelineRows(snapshot);
    expect(rows.map((row) => [row.path, row.keptVisible])).toEqual([
      [ROOT, null],
      [BATCH, null],
      [`${BATCH}/item_7`, "degraded"],
    ]);
  });

  it("follows what the reader expanded and collapsed", () => {
    const wide = batchSnapshot(30, () => "succeeded");
    const expanded = buildTimelineRows(wide, { expandedBatches: { [BATCH]: true } });
    expect(expanded).toHaveLength(32);
    expect(expanded[1].batch).toMatchObject({ wide: true, expanded: true, hiddenItemCount: 0 });

    // Collapsed, the worked example's batch keeps only item 3 in view, the
    // item its run is stuck at, with the step under it.
    const narrow = buildTimelineRows(WORKED_EXAMPLE_SNAPSHOT, {
      expandedBatches: { [BATCH]: false },
    });
    expect(narrow.filter((row) => row.path.startsWith(`${BATCH}/`)).map((row) => row.path)).toEqual(
      [`${BATCH}/item_3`, `${BATCH}/item_3/step_1`],
    );
    expect(narrow.find((row) => row.path === BATCH)?.batch?.hiddenItemCount).toBe(2);
  });

  it("takes the wide threshold from its options", () => {
    const rows = buildTimelineRows(WORKED_EXAMPLE_SNAPSHOT, { wideBatchThreshold: 2 });
    expect(rows.find((row) => row.path === BATCH)?.batch).toMatchObject({
      wide: true,
      expanded: false,
    });
  });

  it("reads the counts off the snapshot, never off the items it holds", () => {
    // The counts are the contract's, and `total − done − running − failed`
    // counts the items neither running nor ended by their own event.
    const scheduled = batchSnapshot(4, (item) => (item === 1 ? "running" : "scheduled"));
    const batch = buildTimelineRows(scheduled)[1].batch;
    expect(batch?.counts).toEqual({ total: 4, done: 0, running: 1, failed: 0 });
    expect(batch?.strip).toEqual([
      { status: "running", firstItem: 1, count: 1 },
      { status: "scheduled", firstItem: 2, count: 3 },
    ]);
  });

  it("treats a parent of item rows as a batch even before it carries counts", () => {
    const rows = buildTimelineRows(
      snapshotOf([
        invocation(BATCH, "summarize_filing_batch", { pipe_type: "PipeBatch", status: "running" }),
        invocation(`${BATCH}/item_1`, "summarize_filing", { status: "running" }),
        invocation(`${BATCH}/item_3`, "summarize_filing", { status: "running" }),
      ]),
    );
    expect(rows[0].batch).toMatchObject({
      counts: null,
      total: 2,
      expanded: true,
      // A gap in the item numbers starts a new cell of the strip.
      strip: [
        { status: "running", firstItem: 1, count: 1 },
        { status: "running", firstItem: 3, count: 1 },
      ],
    });
    expect(rows[1].placeLabel).toBe("item 1");
  });

  it("collapses the wide recorded batch, keeping its failed item in view", () => {
    const last = WIDE_BATCH_SNAPSHOTS[WIDE_BATCH_SNAPSHOTS.length - 1];
    const rows = buildTimelineRows(last);
    const batch = rows.find((row) => row.path === BATCH);
    expect(batch?.batch).toMatchObject({
      counts: { total: 24, done: 23, running: 0, failed: 1 },
      wide: true,
      expanded: false,
      hiddenItemCount: 23,
    });
    expect(rows.filter((row) => row.keptVisible).map((row) => row.path)).toEqual([
      `${BATCH}/item_9`,
    ]);
  });
});
