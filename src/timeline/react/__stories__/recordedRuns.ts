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
 * work was tried three times, which fails the run. `HUNDREDS_OF_ITEMS_RUN` is
 * the same method over hundreds of filings, a few of which fail, one early, one
 * in the middle and one near the end, and `OUTAGE_RUN` the same again with most
 * items failing once a provider goes down; both are taken as single snapshots
 * with `snapshotAt`, since a replay of either would build a snapshot per change
 * over every one of their invocations. `VET_COMPANY_RUN` vets a
 * company: a sequence whose first step is a binding, a parallel of eight
 * sources, a batch over a dotted `batch_over`, and a chain of sequences four
 * levels deep.
 *
 * The methods they ran are written beside them, in `methods/`, and
 * `methodRegistries.ts` builds their pipe registries with the static builder.
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
  title: "A step's result does not have the structure the method declares",
  detail:
    "Pipe 'condense_filing' produced an output that does not fit the concept 'FilingSummary', at the fields text.",
  code: "pipe.output_invalid",
  domain: "method",
  retry: "no",
  next_step: {
    kind: "contact_owner",
    detail:
      "Ask the method's owner to make the step 'condense_filing' produce a result with the structure the method declares.",
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
/** When the wide run's batch fans out, and when its first item starts. */
const BATCH_FAN_OUT_AT = 7_010;
const FIRST_ITEM_AT = 7_050;

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

/** How a batch's items run: how many, how many at a time, and which are skipped or fail at which step. */
interface WideItemsPlan {
  count: number;
  concurrency: number;
  skipped: ReadonlySet<number>;
  /** The items that fail, each with the step of `summarize_filing` it fails at. */
  failedAt: ReadonlyMap<number, 1 | 2>;
}

/** How long an item takes: a skip is near-instant, a failure at its first step quick. */
function itemDuration(plan: WideItemsPlan, item: number): number {
  if (plan.skipped.has(item)) return 40;
  if (plan.failedAt.get(item) === 1) return 600 + ((item * 1_327) % 900);
  return 5_200 + ((item * 2_731) % 3_400);
}

/** When each item runs: `concurrency` at a time, each next one starting when a slot frees. */
function wideItemTimes(plan: WideItemsPlan): WideItemTimes[] {
  const times: WideItemTimes[] = [];
  for (let item = 1; item <= plan.count; item += 1) {
    const start =
      item <= plan.concurrency
        ? FIRST_ITEM_AT + (item - 1) * 35
        : times[item - 1 - plan.concurrency].end + 25;
    times.push({ start, end: start + itemDuration(plan, item) });
  }
  return times;
}

const WIDE_PLAN: WideItemsPlan = {
  count: WIDE_ITEM_COUNT,
  concurrency: WIDE_CONCURRENCY,
  skipped: new Set([WIDE_SKIPPED_ITEM]),
  failedAt: new Map([[WIDE_FAILED_ITEM, 2]]),
};
const WIDE_TIMES = wideItemTimes(WIDE_PLAN);
const WIDE_BATCH_END = Math.max(...WIDE_TIMES.map((times) => times.end)) + 20;
const WIDE_FAILED_STEP = `${BATCH}/item_${WIDE_FAILED_ITEM}/step_2`;
const WIDE_FAILED_STEP_START = (() => {
  const { start, end } = WIDE_TIMES[WIDE_FAILED_ITEM - 1];
  return start + Math.round((end - start) * 0.45) + 20;
})();

/** Every item of a batch run to `plan`, at `times`, with the steps each reached. */
function wideItemInvocations(plan: WideItemsPlan, times: WideItemTimes[]): RecordedInvocation[] {
  const invocations: RecordedInvocation[] = [];
  times.forEach(({ start, end }, index) => {
    const item = index + 1;
    const path = `${BATCH}/item_${item}`;
    if (plan.skipped.has(item)) {
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
    const failedAt = plan.failedAt.get(item);
    const itemInvocation: RecordedInvocation = {
      path,
      pipe: SUMMARIZE_FILING,
      stepCount: 2,
      startedAt: clockAfterTen(start),
      endedAt: clockAfterTen(end),
      outcome: failedAt ? "failed" : "succeeded",
    };
    if (failedAt === 1) {
      invocations.push(itemInvocation, {
        path: `${path}/step_1`,
        pipe: READ_FILING,
        startedAt: clockAfterTen(start + 18),
        endedAt: clockAfterTen(end - 15),
        outcome: "failed",
      });
      return;
    }
    const readEnd = start + Math.round((end - start) * 0.45);
    invocations.push(
      itemInvocation,
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
        outcome: failedAt ? "failed" : "succeeded",
      },
    );
  });
  return invocations;
}

/**
 * `filings.review_filings` up to and through its batch over `plan.count`
 * filings, which fails when any item does, and the run with it: the steps
 * before the batch, the batch, and every item.
 */
function batchRunInvocations(
  plan: WideItemsPlan,
  times: WideItemTimes[],
  batchEnd: number,
): RecordedInvocation[] {
  const failed = plan.failedAt.size > 0;
  return [
    {
      path: ROOT,
      pipe: REVIEW_FILINGS,
      stepCount: 4,
      startedAt: clockAfterTen(100),
      endedAt: clockAfterTen(batchEnd + 15),
      outcome: failed ? "failed" : "succeeded",
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
      endedAt: clockAfterTen(batchEnd),
      outcome: failed ? "failed" : "succeeded",
      fanOut: { at: clockAfterTen(BATCH_FAN_OUT_AT), itemCount: plan.count },
    },
    ...wideItemInvocations(plan, times),
  ];
}

const failedStepEnd = WIDE_TIMES[WIDE_FAILED_ITEM - 1].end - 15;

/** `filings.review_filings` over twenty-four filings, its condition matching no key. */
export const WIDE_BATCH_RUN: RecordedRun = {
  pipelineRunId: "run_W1deB4",
  mode: "live",
  day: "2026-10-12",
  invocations: batchRunInvocations(WIDE_PLAN, WIDE_TIMES, WIDE_BATCH_END),
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

// ─── Hundreds of items ────────────────────────────────────────────────────────

/** The items of the hundreds-of-filings run that fail: one early, one in the middle, one near the end. */
export const HUNDREDS_OF_ITEMS_FAILED = [7, 187, 362] as const;

const HUNDREDS_PLAN: WideItemsPlan = {
  count: 400,
  concurrency: 12,
  skipped: new Set([64, 255]),
  failedAt: new Map(HUNDREDS_OF_ITEMS_FAILED.map((item) => [item, 2])),
};
const HUNDREDS_TIMES = wideItemTimes(HUNDREDS_PLAN);
const HUNDREDS_BATCH_END = Math.max(...HUNDREDS_TIMES.map((times) => times.end)) + 20;

/** `filings.review_filings` over hundreds of filings, a few of which fail. */
export const HUNDREDS_OF_ITEMS_RUN: RecordedRun = {
  pipelineRunId: "run_H4ndr3",
  mode: "live",
  day: "2026-10-12",
  invocations: batchRunInvocations(HUNDREDS_PLAN, HUNDREDS_TIMES, HUNDREDS_BATCH_END),
};

/** The run part-way through its batch: the early and the middle failures have happened, the late one has not. */
export const HUNDREDS_OF_ITEMS_MID_RUN_SNAPSHOT: ProgressSnapshot = snapshotAt(
  HUNDREDS_OF_ITEMS_RUN,
  clockAfterTen(HUNDREDS_TIMES[HUNDREDS_OF_ITEMS_FAILED[1] - 1].end + 2_000),
);

/** The run once it has failed, every item ended. */
export const HUNDREDS_OF_ITEMS_END_SNAPSHOT: ProgressSnapshot = snapshotAt(
  HUNDREDS_OF_ITEMS_RUN,
  clockAfterTen(HUNDREDS_BATCH_END + 1_000),
);

/** The first item of the outage run to fail: from it on, every item fails at its first step. */
export const OUTAGE_FIRST_FAILED_ITEM = 31;

const OUTAGE_PLAN: WideItemsPlan = {
  count: 400,
  concurrency: 12,
  skipped: new Set(),
  failedAt: new Map(
    Array.from({ length: 400 - OUTAGE_FIRST_FAILED_ITEM + 1 }, (_, index) => [
      OUTAGE_FIRST_FAILED_ITEM + index,
      1,
    ]),
  ),
};
const OUTAGE_TIMES = wideItemTimes(OUTAGE_PLAN);
const OUTAGE_BATCH_END = Math.max(...OUTAGE_TIMES.map((times) => times.end)) + 20;

/** The hundreds-of-filings run during an outage: past its first items, every item fails reading its filing. */
export const OUTAGE_RUN: RecordedRun = {
  pipelineRunId: "run_0utag3",
  mode: "live",
  day: "2026-10-12",
  invocations: batchRunInvocations(OUTAGE_PLAN, OUTAGE_TIMES, OUTAGE_BATCH_END),
};

/** The outage run once it has failed. */
export const OUTAGE_END_SNAPSHOT: ProgressSnapshot = snapshotAt(
  OUTAGE_RUN,
  clockAfterTen(OUTAGE_BATCH_END + 1_000),
);

// ─── A dry run ────────────────────────────────────────────────────────────────

/**
 * `filings.review_filings` dry-run over two mock filings: it finishes almost at
 * once, and its condition resolves nothing and runs every outcome group, so
 * both `outcome_detailed` and `outcome_quick` run under it.
 */
export const DRY_RUN: RecordedRun = {
  pipelineRunId: "run_Dry7Qd",
  mode: "dry",
  day: "2026-10-12",
  invocations: [
    {
      path: ROOT,
      pipe: REVIEW_FILINGS,
      stepCount: 4,
      startedAt: "11:00:00.010",
      endedAt: "11:00:00.640",
    },
    {
      path: `${ROOT}/step_1`,
      pipe: EXTRACT_FILINGS,
      startedAt: "11:00:00.020",
      endedAt: "11:00:00.080",
    },
    {
      path: `${ROOT}/step_2`,
      pipe: CHOOSE_DEPTH,
      startedAt: "11:00:00.090",
      endedAt: "11:00:00.300",
    },
    {
      path: `${ROOT}/step_2/outcome_detailed`,
      pipe: DEEP_CHECKS,
      branchCount: 2,
      startedAt: "11:00:00.100",
      endedAt: "11:00:00.290",
    },
    {
      path: `${ROOT}/step_2/outcome_detailed/branch_1`,
      pipe: CHECK_FIGURES,
      startedAt: "11:00:00.110",
      endedAt: "11:00:00.240",
    },
    {
      path: `${ROOT}/step_2/outcome_detailed/branch_2`,
      pipe: CHECK_WORDING,
      startedAt: "11:00:00.112",
      endedAt: "11:00:00.280",
    },
    {
      path: `${ROOT}/step_2/outcome_quick`,
      pipe: QUICK_CHECK,
      startedAt: "11:00:00.104",
      endedAt: "11:00:00.210",
    },
    {
      path: BATCH,
      pipe: SUMMARIZE_FILING_BATCH,
      startedAt: "11:00:00.310",
      endedAt: "11:00:00.580",
      fanOut: { at: "11:00:00.315", itemCount: 2 },
    },
    ...[1, 2].flatMap((item): RecordedInvocation[] => {
      const offset = (item - 1) * 20;
      const clock = (ms: number) => `11:00:00.${String(ms + offset).padStart(3, "0")}`;
      return [
        {
          path: `${BATCH}/item_${item}`,
          pipe: SUMMARIZE_FILING,
          stepCount: 2,
          startedAt: clock(320),
          endedAt: clock(540),
        },
        {
          path: `${BATCH}/item_${item}/step_1`,
          pipe: READ_FILING,
          startedAt: clock(330),
          endedAt: clock(420),
        },
        {
          path: `${BATCH}/item_${item}/step_2`,
          pipe: CONDENSE_FILING,
          startedAt: clock(430),
          endedAt: clock(530),
        },
      ];
    }),
    {
      path: `${ROOT}/step_4`,
      pipe: ASSEMBLE_REPORT,
      startedAt: "11:00:00.590",
      endedAt: "11:00:00.630",
    },
  ],
};

/** The dry run's successive snapshots. */
export const DRY_RUN_SNAPSHOTS: ProgressSnapshot[] = recordedSnapshots(DRY_RUN, ["10:59:59.900"]);

// ─── A wide parallel, a binding step and deep nesting ────────────────────────

const diligencePipe = (code: string, type: string): RecordedPipe => ({
  code,
  ref: `diligence.${code}`,
  type,
});

const VET_COMPANY = diligencePipe("vet_company", "PipeSequence");
const GATHER_SOURCES = diligencePipe("gather_sources", "PipeParallel");
/** The eight sources `gather_sources` reads at the same time, in branch order. */
const SOURCE_PIPES = [
  "search_register",
  "search_court_records",
  "search_sanctions",
  "search_news",
  "review_accounts",
  "check_directors",
  "trace_ownership",
  "check_licences",
].map((code) => diligencePipe(code, "PipeLLM"));
const COMPILE_DOSSIER = diligencePipe("compile_dossier", "PipeLLM");
const VERIFY_CLAIM_BATCH = diligencePipe("verify_claim_batch", "PipeBatch");
const VERIFY_CLAIM = diligencePipe("verify_claim", "PipeLLM");
const WEIGH_RISKS = diligencePipe("weigh_risks", "PipeSequence");
const ASSESS_EXPOSURE = diligencePipe("assess_exposure", "PipeSequence");
const MODEL_SCENARIOS = diligencePipe("model_scenarios", "PipeSequence");
const DRAFT_SCENARIOS = diligencePipe("draft_scenarios", "PipeLLM");
const STRESS_TEST = diligencePipe("stress_test", "PipeSequence");
const RUN_STRESS_CASE = diligencePipe("run_stress_case", "PipeLLM");
const RANK_SCENARIOS = diligencePipe("rank_scenarios", "PipeLLM");
const SUMMARIZE_EXPOSURE = diligencePipe("summarize_exposure", "PipeLLM");
const RATE_RISK = diligencePipe("rate_risk", "PipeLLM");
const WRITE_MEMO = diligencePipe("write_memo", "PipeCompose");

const VET_ROOT = "diligence.vet_company";
// Step 1 is the binding of the company's name, which runs no pipe, so no
// invocation has its path. The dotted `batch_over` of step 4 is bound by a
// binding the runtime writes, which takes no number.
const VET_SOURCES = `${VET_ROOT}/step_2`;
const VET_CLAIMS = `${VET_ROOT}/step_4`;
const VET_RISKS = `${VET_ROOT}/step_5`;
const VET_EXPOSURE = `${VET_RISKS}/step_1`;
const VET_SCENARIOS = `${VET_EXPOSURE}/step_1`;
const VET_STRESS = `${VET_SCENARIOS}/step_2`;

/** A clock time `offsetMs` after 14:00 on the recording's day. */
function clockAfterTwo(offsetMs: number): string {
  return `14${clockAfterTen(offsetMs).slice(2)}`;
}

const SOURCE_DURATIONS = [3_200, 5_400, 2_600, 9_800, 4_100, 6_900, 12_500, 3_900];
const SOURCES_START = 150;
const SOURCE_TIMES = SOURCE_DURATIONS.map((duration, index) => {
  const start = SOURCES_START + 20 + index * 12;
  return { start, end: start + duration };
});
const SOURCES_END = Math.max(...SOURCE_TIMES.map((times) => times.end)) + 20;
/** `search_news`, whose call failed once and was tried again. */
const RETRIED_SOURCE = 4;
const RETRIED_SOURCE_FAILED_AT = SOURCE_TIMES[RETRIED_SOURCE - 1].start + 4_300;

const DOSSIER_START = SOURCES_END + 30;
const DOSSIER_END = DOSSIER_START + 7_400;

const CLAIM_COUNT = 12;
const CLAIM_CONCURRENCY = 4;
const CLAIMS_START = DOSSIER_END + 30;
const CLAIM_TIMES = (() => {
  const times: { start: number; end: number }[] = [];
  for (let item = 1; item <= CLAIM_COUNT; item += 1) {
    const start =
      item <= CLAIM_CONCURRENCY
        ? CLAIMS_START + 40 + (item - 1) * 30
        : times[item - 1 - CLAIM_CONCURRENCY].end + 25;
    times.push({ start, end: start + 3_000 + ((item * 1_373) % 2_500) });
  }
  return times;
})();
const CLAIMS_END = Math.max(...CLAIM_TIMES.map((times) => times.end)) + 20;

/** The chain of steps four levels down, each starting as the one before it ends. */
const DEEP_STEPS: { path: string; pipe: RecordedPipe; duration: number }[] = [
  { path: `${VET_SCENARIOS}/step_1`, pipe: DRAFT_SCENARIOS, duration: 6_200 },
  { path: `${VET_STRESS}/step_1`, pipe: RUN_STRESS_CASE, duration: 8_800 },
  { path: `${VET_STRESS}/step_2`, pipe: RANK_SCENARIOS, duration: 4_300 },
  { path: `${VET_EXPOSURE}/step_2`, pipe: SUMMARIZE_EXPOSURE, duration: 3_600 },
  { path: `${VET_RISKS}/step_2`, pipe: RATE_RISK, duration: 2_900 },
];
const RISKS_START = CLAIMS_END + 30;
const DEEP_TIMES = (() => {
  let cursor = RISKS_START + 60;
  return DEEP_STEPS.map((step) => {
    const start = cursor;
    cursor = start + step.duration + 40;
    return { ...step, start, end: start + step.duration };
  });
})();
const deepEnd = (path: string) => DEEP_TIMES.find((step) => step.path === path)?.end ?? 0;
const RISKS_END = DEEP_TIMES[DEEP_TIMES.length - 1].end + 20;
const MEMO_START = RISKS_END + 30;
const MEMO_END = MEMO_START + 1_800;

/** `diligence.vet_company` over a company whose sources make twelve claims. */
export const VET_COMPANY_RUN: RecordedRun = {
  pipelineRunId: "run_V3tC0m",
  mode: "live",
  day: "2026-10-12",
  invocations: [
    {
      path: VET_ROOT,
      pipe: VET_COMPANY,
      stepCount: 6,
      startedAt: clockAfterTwo(100),
      endedAt: clockAfterTwo(MEMO_END + 20),
    },
    {
      path: VET_SOURCES,
      pipe: GATHER_SOURCES,
      branchCount: SOURCE_PIPES.length,
      startedAt: clockAfterTwo(SOURCES_START),
      endedAt: clockAfterTwo(SOURCES_END),
    },
    ...SOURCE_PIPES.map((pipe, index) => ({
      path: `${VET_SOURCES}/branch_${index + 1}`,
      pipe,
      startedAt: clockAfterTwo(SOURCE_TIMES[index].start),
      endedAt: clockAfterTwo(SOURCE_TIMES[index].end),
    })),
    {
      path: `${VET_ROOT}/step_3`,
      pipe: COMPILE_DOSSIER,
      startedAt: clockAfterTwo(DOSSIER_START),
      endedAt: clockAfterTwo(DOSSIER_END),
    },
    {
      path: VET_CLAIMS,
      pipe: VERIFY_CLAIM_BATCH,
      startedAt: clockAfterTwo(CLAIMS_START),
      endedAt: clockAfterTwo(CLAIMS_END),
      fanOut: { at: clockAfterTwo(CLAIMS_START + 10), itemCount: CLAIM_COUNT },
    },
    ...CLAIM_TIMES.map(({ start, end }, index) => ({
      path: `${VET_CLAIMS}/item_${index + 1}`,
      pipe: VERIFY_CLAIM,
      startedAt: clockAfterTwo(start),
      endedAt: clockAfterTwo(end),
    })),
    {
      path: VET_RISKS,
      pipe: WEIGH_RISKS,
      stepCount: 2,
      startedAt: clockAfterTwo(RISKS_START),
      endedAt: clockAfterTwo(RISKS_END),
    },
    {
      path: VET_EXPOSURE,
      pipe: ASSESS_EXPOSURE,
      stepCount: 2,
      startedAt: clockAfterTwo(RISKS_START + 20),
      endedAt: clockAfterTwo(deepEnd(`${VET_EXPOSURE}/step_2`) + 10),
    },
    {
      path: VET_SCENARIOS,
      pipe: MODEL_SCENARIOS,
      stepCount: 2,
      startedAt: clockAfterTwo(RISKS_START + 40),
      endedAt: clockAfterTwo(deepEnd(`${VET_STRESS}/step_2`) + 15),
    },
    ...DEEP_TIMES.flatMap(({ path, pipe, start, end }) => {
      const step: RecordedInvocation = {
        path,
        pipe,
        startedAt: clockAfterTwo(start),
        endedAt: clockAfterTwo(end),
      };
      if (path !== `${VET_STRESS}/step_1`) return [step];
      // The stress test is a sequence of its own, four levels down.
      const stressTest: RecordedInvocation = {
        path: VET_STRESS,
        pipe: STRESS_TEST,
        stepCount: 2,
        startedAt: clockAfterTwo(start - 20),
        endedAt: clockAfterTwo(deepEnd(`${VET_STRESS}/step_2`) + 10),
      };
      return [stressTest, step];
    }),
    {
      path: `${VET_ROOT}/step_6`,
      pipe: WRITE_MEMO,
      startedAt: clockAfterTwo(MEMO_START),
      endedAt: clockAfterTwo(MEMO_END),
    },
  ],
  health: [
    {
      path: `${VET_SOURCES}/branch_${RETRIED_SOURCE}`,
      from: clockAfterTwo(RETRIED_SOURCE_FAILED_AT),
      until: clockAfterTwo(SOURCE_TIMES[RETRIED_SOURCE - 1].end),
      attempts: 2,
      lastFailure: { problem: ENGINE_RETRY_PROBLEM, at: clockAfterTwo(RETRIED_SOURCE_FAILED_AT) },
    },
    {
      path: `${VET_SOURCES}/branch_${RETRIED_SOURCE}`,
      from: clockAfterTwo(SOURCE_TIMES[RETRIED_SOURCE - 1].end),
      attempts: 2,
    },
  ],
};

/** The vetting run's successive snapshots, from before it starts to its end. */
export const VET_COMPANY_SNAPSHOTS: ProgressSnapshot[] = recordedSnapshots(VET_COMPANY_RUN, [
  clockAfterTwo(0),
]);
