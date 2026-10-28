/**
 * Recorded runs for the run timeline's stories and tests, written by hand.
 *
 * `WORKED_EXAMPLE_SNAPSHOT` is the snapshot the hosted progress contract prints
 * in its worked example, copied verbatim. `REVIEW_FILINGS_RUN` is the same run
 * recorded from its first event to its end, extended past the moment the
 * example was taken: item 3's execution recovers and finishes, item 2's retried
 * step succeeds, and step 4 runs. Taken at the example's moment it reproduces
 * the example exactly, which `recordedRuns.test.ts` checks. `WIDE_BATCH_RUN`
 * reviews twenty-four filings, so its batch is wide; its condition takes its
 * default outcome, one item is skipped, and one item's step fails after its
 * work was tried three times, which fails the run.
 */
import type { Problem } from "mthds/errors";
import type { ProgressSnapshot } from "@timeline/progressSnapshot";
import {
  recordedSnapshots,
  snapshotAt,
  type RecordedDegradation,
  type RecordedHealth,
  type RecordedInvocation,
  type RecordedPipe,
  type RecordedRun,
} from "./runRecorder";

const pipe = (code: string, type: string): RecordedPipe => ({
  code,
  ref: `filings.${code}`,
  type,
});

const REVIEW_FILINGS = pipe("review_filings", "PipeSequence");
const EXTRACT_FILINGS = pipe("extract_filings", "PipeExtract");
const CHOOSE_DEPTH = pipe("choose_depth", "PipeCondition");
const DEEP_CHECKS = pipe("deep_checks", "PipeParallel");
const CHECK_FIGURES = pipe("check_figures", "PipeLLM");
const CHECK_WORDING = pipe("check_wording", "PipeLLM");
const QUICK_CHECK = pipe("quick_check", "PipeLLM");
const SUMMARIZE_FILING_BATCH = pipe("summarize_filing_batch", "PipeBatch");
const SUMMARIZE_FILING = pipe("summarize_filing", "PipeSequence");
const READ_FILING = pipe("read_filing", "PipeLLM");
const CONDENSE_FILING = pipe("condense_filing", "PipeLLM");
const ASSEMBLE_REPORT = pipe("assemble_report", "PipeCompose");

const ROOT = "filings.review_filings";
const BATCH = `${ROOT}/step_3`;

// ─── Problem documents ───────────────────────────────────────────────────────
// Written out rather than built with `mthds/errors`' `buildProblem`, because the
// stories import this module, and a runtime import of `mthds` from a story makes
// Vite discover it mid-run. `recordedRuns.test.ts` holds each one to what the
// builder writes for its code.

/**
 * What a failure only the engine observes reads as: an attempt it is trying
 * again carries the engine's text, which is no problem document, so the carrier
 * serves `runtime.unexpected` for it.
 */
export const ENGINE_RETRY_PROBLEM: Problem = {
  type: "https://mthds.ai/errors/runtime.unexpected",
  title: "An unexpected error occurred",
  detail: "The runtime met an unexpected error.",
  code: "runtime.unexpected",
  domain: "runtime",
  retry: "no",
  next_step: { kind: "report", detail: "Report this to whoever runs the runtime." },
};

/** The problem that ended the wide run's failed step, as the runtime recorded it, in the caller's view. */
export const CONDENSE_FAILED_PROBLEM: Problem = {
  type: "https://mthds.ai/errors/pipe.output_invalid",
  title: "A pipe's output does not fit its concept",
  detail:
    "Pipe 'condense_filing' produced an output that does not fit the concept 'FilingSummary', at the fields text.",
  code: "pipe.output_invalid",
  domain: "method",
  retry: "no",
  next_step: {
    kind: "contact_owner",
    detail:
      "Ask the method's owner to make pipe 'condense_filing' produce an output that fits its concept.",
  },
  params: { pipe: "condense_filing", output_concept: "FilingSummary", fields: ["text"] },
  location: {
    pipe: "condense_filing",
    path: ["review_filings", "summarize_filing_batch", "summarize_filing", "condense_filing"],
  },
};

// ─── The contract's worked example, verbatim ─────────────────────────────────

const WORKED_EXAMPLE_DEGRADATION = {
  reason: "workflow_task_failing",
  message:
    "One of this run's batch branches, …, has failed 4 times in a row, so the run is not making progress. …",
  failed_attempts: 4,
  failing_since: "2026-10-12T09:30:33.480Z",
  ends_at: "2026-10-12T09:45:33.480Z",
};

/** The snapshot taken mid-run in the contract's worked example, as the contract prints it. */
export const WORKED_EXAMPLE_SNAPSHOT: ProgressSnapshot = {
  pipeline_run_id: "run_7Qd2kV",
  mode: "live",
  status: "running",
  version: 26,
  assembled_at: "2026-10-12T09:31:20.512Z",
  summary:
    "Running summarize_filing_batch (step 3 of 4): 1 of 3 items done, 2 running; not progressing at summarize_filing (step 3 of 4, item 3 of 3) after 4 failed attempts",
  degradation: WORKED_EXAMPLE_DEGRADATION,
  invocations: [
    {
      path: "filings.review_filings",
      pipe_code: "review_filings",
      pipe_ref: "filings.review_filings",
      pipe_type: "PipeSequence",
      status: "running",
      started_at: "2026-10-12T09:30:00.104Z",
      ended_at: null,
      step_count: 4,
    },
    {
      path: "filings.review_filings/step_1",
      pipe_code: "extract_filings",
      pipe_ref: "filings.extract_filings",
      pipe_type: "PipeExtract",
      status: "succeeded",
      started_at: "2026-10-12T09:30:00.131Z",
      ended_at: "2026-10-12T09:30:06.870Z",
    },
    {
      path: "filings.review_filings/step_2",
      pipe_code: "choose_depth",
      pipe_ref: "filings.choose_depth",
      pipe_type: "PipeCondition",
      status: "succeeded",
      started_at: "2026-10-12T09:30:06.902Z",
      ended_at: "2026-10-12T09:30:19.415Z",
      condition: { selected_outcome: "detailed" },
    },
    {
      path: "filings.review_filings/step_2/outcome_detailed",
      pipe_code: "deep_checks",
      pipe_ref: "filings.deep_checks",
      pipe_type: "PipeParallel",
      status: "succeeded",
      started_at: "2026-10-12T09:30:07.020Z",
      ended_at: "2026-10-12T09:30:19.401Z",
      branch_count: 2,
    },
    {
      path: "filings.review_filings/step_2/outcome_detailed/branch_1",
      pipe_code: "check_figures",
      pipe_ref: "filings.check_figures",
      pipe_type: "PipeLLM",
      status: "succeeded",
      started_at: "2026-10-12T09:30:07.034Z",
      ended_at: "2026-10-12T09:30:15.660Z",
    },
    {
      path: "filings.review_filings/step_2/outcome_detailed/branch_2",
      pipe_code: "check_wording",
      pipe_ref: "filings.check_wording",
      pipe_type: "PipeLLM",
      status: "succeeded",
      started_at: "2026-10-12T09:30:07.036Z",
      ended_at: "2026-10-12T09:30:19.388Z",
    },
    {
      path: "filings.review_filings/step_3",
      pipe_code: "summarize_filing_batch",
      pipe_ref: "filings.summarize_filing_batch",
      pipe_type: "PipeBatch",
      status: "running",
      started_at: "2026-10-12T09:30:19.440Z",
      ended_at: null,
      batch: { total: 3, done: 1, running: 2, failed: 0 },
    },
    {
      path: "filings.review_filings/step_3/item_1",
      pipe_code: "summarize_filing",
      pipe_ref: "filings.summarize_filing",
      pipe_type: "PipeSequence",
      status: "succeeded",
      started_at: "2026-10-12T09:30:19.611Z",
      ended_at: "2026-10-12T09:30:41.022Z",
      step_count: 2,
    },
    {
      path: "filings.review_filings/step_3/item_1/step_1",
      pipe_code: "read_filing",
      pipe_ref: "filings.read_filing",
      pipe_type: "PipeLLM",
      status: "succeeded",
      started_at: "2026-10-12T09:30:19.630Z",
      ended_at: "2026-10-12T09:30:30.118Z",
    },
    {
      path: "filings.review_filings/step_3/item_1/step_2",
      pipe_code: "condense_filing",
      pipe_ref: "filings.condense_filing",
      pipe_type: "PipeLLM",
      status: "succeeded",
      started_at: "2026-10-12T09:30:30.140Z",
      ended_at: "2026-10-12T09:30:41.010Z",
    },
    {
      path: "filings.review_filings/step_3/item_2",
      pipe_code: "summarize_filing",
      pipe_ref: "filings.summarize_filing",
      pipe_type: "PipeSequence",
      status: "running",
      started_at: "2026-10-12T09:30:19.640Z",
      ended_at: null,
      step_count: 2,
    },
    {
      path: "filings.review_filings/step_3/item_2/step_1",
      pipe_code: "read_filing",
      pipe_ref: "filings.read_filing",
      pipe_type: "PipeLLM",
      status: "succeeded",
      started_at: "2026-10-12T09:30:19.655Z",
      ended_at: "2026-10-12T09:30:31.902Z",
    },
    {
      path: "filings.review_filings/step_3/item_2/step_2",
      pipe_code: "condense_filing",
      pipe_ref: "filings.condense_filing",
      pipe_type: "PipeLLM",
      status: "running",
      started_at: "2026-10-12T09:30:31.930Z",
      ended_at: null,
      attempts: 2,
      last_failure: { problem: ENGINE_RETRY_PROBLEM, at: "2026-10-12T09:30:52.317Z" },
    },
    {
      path: "filings.review_filings/step_3/item_3",
      pipe_code: "summarize_filing",
      pipe_ref: "filings.summarize_filing",
      pipe_type: "PipeSequence",
      status: "running",
      started_at: "2026-10-12T09:30:19.702Z",
      ended_at: null,
      step_count: 2,
      degradation: WORKED_EXAMPLE_DEGRADATION,
    },
    {
      path: "filings.review_filings/step_3/item_3/step_1",
      pipe_code: "read_filing",
      pipe_ref: "filings.read_filing",
      pipe_type: "PipeLLM",
      status: "running",
      started_at: "2026-10-12T09:30:19.720Z",
      ended_at: null,
    },
  ],
};

/** The moment the worked example's snapshot was taken. */
export const WORKED_EXAMPLE_MOMENT = "09:31:20.512";

// ─── The worked example's run, recorded end to end ───────────────────────────

const stuckItem3 = (failedAttempts: number): RecordedDegradation => ({
  reason: "workflow_task_failing",
  message: `One of this run's batch branches, …, has failed ${failedAttempts} times in a row, so the run is not making progress. …`,
  failedAttempts,
  failingSince: "09:30:33.480",
  endsAt: "09:45:33.480",
});

/** Each step of the engine's view of item 3: failing to advance, then recovered at 09:31:22. */
const ITEM_3_STUCK: { from: string; until: string; failedAttempts: number }[] = [
  { from: "09:30:45.000", until: "09:31:00.000", failedAttempts: 2 },
  { from: "09:31:00.000", until: "09:31:15.000", failedAttempts: 3 },
  { from: "09:31:15.000", until: "09:31:22.000", failedAttempts: 4 },
];

const REVIEW_FILINGS_HEALTH: RecordedHealth[] = [
  // The engine tries item 2's second step again after its call fails...
  {
    path: `${BATCH}/item_2/step_2`,
    from: "09:30:52.317",
    until: "09:31:24.930",
    attempts: 2,
    lastFailure: { problem: ENGINE_RETRY_PROBLEM, at: "09:30:52.317" },
  },
  // ...and once it has succeeded, the engine still reports the attempts it made.
  { path: `${BATCH}/item_2/step_2`, from: "09:31:24.930", attempts: 2 },
  ...ITEM_3_STUCK.map(({ from, until, failedAttempts }) => ({
    path: `${BATCH}/item_3`,
    from,
    until,
    degradation: stuckItem3(failedAttempts),
  })),
];

/** `filings.review_filings` over three filings, its condition taking `detailed`. */
export const REVIEW_FILINGS_RUN: RecordedRun = {
  pipelineRunId: "run_7Qd2kV",
  mode: "live",
  day: "2026-10-12",
  invocations: [
    {
      path: ROOT,
      pipe: REVIEW_FILINGS,
      stepCount: 4,
      startedAt: "09:30:00.104",
      endedAt: "09:31:36.120",
    },
    {
      path: `${ROOT}/step_1`,
      pipe: EXTRACT_FILINGS,
      startedAt: "09:30:00.131",
      endedAt: "09:30:06.870",
    },
    {
      path: `${ROOT}/step_2`,
      pipe: CHOOSE_DEPTH,
      startedAt: "09:30:06.902",
      endedAt: "09:30:19.415",
      resolution: { at: "09:30:07.012", selectedOutcome: "detailed" },
    },
    {
      path: `${ROOT}/step_2/outcome_detailed`,
      pipe: DEEP_CHECKS,
      branchCount: 2,
      startedAt: "09:30:07.020",
      endedAt: "09:30:19.401",
    },
    {
      path: `${ROOT}/step_2/outcome_detailed/branch_1`,
      pipe: CHECK_FIGURES,
      startedAt: "09:30:07.034",
      endedAt: "09:30:15.660",
    },
    {
      path: `${ROOT}/step_2/outcome_detailed/branch_2`,
      pipe: CHECK_WORDING,
      startedAt: "09:30:07.036",
      endedAt: "09:30:19.388",
    },
    {
      path: BATCH,
      pipe: SUMMARIZE_FILING_BATCH,
      startedAt: "09:30:19.440",
      endedAt: "09:31:32.410",
      fanOut: { at: "09:30:19.452", itemCount: 3 },
    },
    {
      path: `${BATCH}/item_1`,
      pipe: SUMMARIZE_FILING,
      stepCount: 2,
      startedAt: "09:30:19.611",
      endedAt: "09:30:41.022",
    },
    {
      path: `${BATCH}/item_1/step_1`,
      pipe: READ_FILING,
      startedAt: "09:30:19.630",
      endedAt: "09:30:30.118",
    },
    {
      path: `${BATCH}/item_1/step_2`,
      pipe: CONDENSE_FILING,
      startedAt: "09:30:30.140",
      endedAt: "09:30:41.010",
    },
    {
      path: `${BATCH}/item_2`,
      pipe: SUMMARIZE_FILING,
      stepCount: 2,
      startedAt: "09:30:19.640",
      endedAt: "09:31:24.950",
    },
    {
      path: `${BATCH}/item_2/step_1`,
      pipe: READ_FILING,
      startedAt: "09:30:19.655",
      endedAt: "09:30:31.902",
    },
    {
      path: `${BATCH}/item_2/step_2`,
      pipe: CONDENSE_FILING,
      startedAt: "09:30:31.930",
      endedAt: "09:31:24.930",
    },
    {
      path: `${BATCH}/item_3`,
      pipe: SUMMARIZE_FILING,
      stepCount: 2,
      startedAt: "09:30:19.702",
      endedAt: "09:31:32.380",
    },
    {
      path: `${BATCH}/item_3/step_1`,
      pipe: READ_FILING,
      startedAt: "09:30:19.720",
      endedAt: "09:31:27.140",
    },
    {
      path: `${BATCH}/item_3/step_2`,
      pipe: CONDENSE_FILING,
      startedAt: "09:31:27.160",
      endedAt: "09:31:32.360",
    },
    {
      path: `${ROOT}/step_4`,
      pipe: ASSEMBLE_REPORT,
      startedAt: "09:31:32.430",
      endedAt: "09:31:36.090",
    },
  ],
  health: REVIEW_FILINGS_HEALTH,
  runDegradations: ITEM_3_STUCK.map(({ from, until, failedAttempts }) => ({
    from,
    until,
    degradation: stuckItem3(failedAttempts),
  })),
};

/**
 * The run's successive snapshots: before it starts, at each event, at each
 * change of its health, and at the worked example's moment.
 */
export const REVIEW_FILINGS_SNAPSHOTS: ProgressSnapshot[] = recordedSnapshots(REVIEW_FILINGS_RUN, [
  "09:29:59.900",
  WORKED_EXAMPLE_MOMENT,
]);

/** The same run, canceled while its batch's three items were running. */
export const CANCELED_RUN_SNAPSHOT: ProgressSnapshot = snapshotAt(
  {
    ...REVIEW_FILINGS_RUN,
    pipelineRunId: "run_3bXc9Q",
    stopped: { at: "09:30:40.000", status: "canceled" },
  },
  "09:30:40.000",
);

// ─── A wide batch ─────────────────────────────────────────────────────────────

const WIDE_ITEM_COUNT = 24;
const WIDE_CONCURRENCY = 6;
const WIDE_SKIPPED_ITEM = 5;
const WIDE_FAILED_ITEM = 9;

/** A clock time `offsetMs` after 10:00 on the recording's day. */
function clockAfterTen(offsetMs: number): string {
  const totalMs = Math.round(offsetMs);
  const minutes = Math.floor(totalMs / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1_000);
  const millis = totalMs % 1_000;
  const pad = (value: number, width: number) => String(value).padStart(width, "0");
  return `10:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(millis, 3)}`;
}

interface WideItemTimes {
  start: number;
  end: number;
}

/** When each item runs: six at a time, each next one starting when a slot frees. */
function wideItemTimes(): WideItemTimes[] {
  const times: WideItemTimes[] = [];
  for (let item = 1; item <= WIDE_ITEM_COUNT; item += 1) {
    const start =
      item <= WIDE_CONCURRENCY
        ? 7_050 + (item - 1) * 35
        : times[item - 1 - WIDE_CONCURRENCY].end + 25;
    const duration = item === WIDE_SKIPPED_ITEM ? 40 : 5_200 + ((item * 2_731) % 3_400);
    times.push({ start, end: start + duration });
  }
  return times;
}

const WIDE_TIMES = wideItemTimes();
const WIDE_BATCH_END = Math.max(...WIDE_TIMES.map((times) => times.end)) + 20;
const WIDE_FAILED_STEP = `${BATCH}/item_${WIDE_FAILED_ITEM}/step_2`;
const WIDE_FAILED_STEP_START = (() => {
  const { start, end } = WIDE_TIMES[WIDE_FAILED_ITEM - 1];
  return start + Math.round((end - start) * 0.45) + 20;
})();

function wideItemInvocations(): RecordedInvocation[] {
  const invocations: RecordedInvocation[] = [];
  WIDE_TIMES.forEach(({ start, end }, index) => {
    const item = index + 1;
    const path = `${BATCH}/item_${item}`;
    if (item === WIDE_SKIPPED_ITEM) {
      invocations.push({
        path,
        pipe: SUMMARIZE_FILING,
        stepCount: 2,
        startedAt: clockAfterTen(start),
        endedAt: clockAfterTen(end),
        outcome: "skipped",
        skipReason: "The filing this item runs over is absent.",
      });
      return;
    }
    const failed = item === WIDE_FAILED_ITEM;
    const readEnd = start + Math.round((end - start) * 0.45);
    invocations.push(
      {
        path,
        pipe: SUMMARIZE_FILING,
        stepCount: 2,
        startedAt: clockAfterTen(start),
        endedAt: clockAfterTen(end),
        outcome: failed ? "failed" : "succeeded",
      },
      {
        path: `${path}/step_1`,
        pipe: READ_FILING,
        startedAt: clockAfterTen(start + 18),
        endedAt: clockAfterTen(readEnd),
      },
      {
        path: `${path}/step_2`,
        pipe: CONDENSE_FILING,
        startedAt: clockAfterTen(readEnd + 20),
        endedAt: clockAfterTen(end - 15),
        outcome: failed ? "failed" : "succeeded",
      },
    );
  });
  return invocations;
}

const failedStepEnd = WIDE_TIMES[WIDE_FAILED_ITEM - 1].end - 15;

/** `filings.review_filings` over twenty-four filings, its condition matching no key. */
export const WIDE_BATCH_RUN: RecordedRun = {
  pipelineRunId: "run_W1deB4",
  mode: "live",
  day: "2026-10-12",
  invocations: [
    {
      path: ROOT,
      pipe: REVIEW_FILINGS,
      stepCount: 4,
      startedAt: clockAfterTen(100),
      endedAt: clockAfterTen(WIDE_BATCH_END + 15),
      outcome: "failed",
    },
    {
      path: `${ROOT}/step_1`,
      pipe: EXTRACT_FILINGS,
      startedAt: clockAfterTen(120),
      endedAt: clockAfterTen(4_500),
    },
    {
      path: `${ROOT}/step_2`,
      pipe: CHOOSE_DEPTH,
      startedAt: clockAfterTen(4_520),
      endedAt: clockAfterTen(6_950),
      // No key matched, so the condition took its default outcome, which runs
      // quick_check: the group the key `quick` names, so its path says `quick`.
      resolution: { at: clockAfterTen(4_600), selectedOutcome: null },
    },
    {
      path: `${ROOT}/step_2/outcome_quick`,
      pipe: QUICK_CHECK,
      startedAt: clockAfterTen(4_610),
      endedAt: clockAfterTen(6_930),
    },
    {
      path: BATCH,
      pipe: SUMMARIZE_FILING_BATCH,
      startedAt: clockAfterTen(7_000),
      endedAt: clockAfterTen(WIDE_BATCH_END),
      outcome: "failed",
      fanOut: { at: clockAfterTen(7_010), itemCount: WIDE_ITEM_COUNT },
    },
    ...wideItemInvocations(),
  ],
  health: [
    {
      path: WIDE_FAILED_STEP,
      from: clockAfterTen(WIDE_FAILED_STEP_START + 1_200),
      until: clockAfterTen(WIDE_FAILED_STEP_START + 2_400),
      attempts: 2,
      lastFailure: {
        problem: ENGINE_RETRY_PROBLEM,
        at: clockAfterTen(WIDE_FAILED_STEP_START + 1_200),
      },
    },
    {
      path: WIDE_FAILED_STEP,
      from: clockAfterTen(WIDE_FAILED_STEP_START + 2_400),
      until: clockAfterTen(failedStepEnd),
      attempts: 3,
      lastFailure: {
        problem: ENGINE_RETRY_PROBLEM,
        at: clockAfterTen(WIDE_FAILED_STEP_START + 2_400),
      },
    },
    // The failure that ended it is the runtime's own problem, which the snapshot carries as recorded.
    {
      path: WIDE_FAILED_STEP,
      from: clockAfterTen(failedStepEnd),
      attempts: 3,
      lastFailure: { problem: CONDENSE_FAILED_PROBLEM, at: clockAfterTen(failedStepEnd) },
    },
  ],
};

/** The wide run's successive snapshots, from before it starts to its failure. */
export const WIDE_BATCH_SNAPSHOTS: ProgressSnapshot[] = recordedSnapshots(WIDE_BATCH_RUN, [
  clockAfterTen(0),
]);
