/**
 * A stand-in for a carrier of the progress snapshot, for stories and tests.
 *
 * A recording is written by hand: each invocation of a run with its pipe and
 * the moments it started and ended, each batch's fan-out, each condition's
 * resolution, and what the workflow engine reported of the run's health over
 * time. `snapshotAt` projects it at one moment into the snapshot the contract
 * defines, the way a carrier projects events: an invocation exists once it
 * started (or once its batch fanned out, as a scheduled item), `version` counts
 * the events recorded so far, and `summary` is worded by the contract's rule.
 * `recordedSnapshots` takes it at every moment something changed, which is the
 * sequence of snapshots a client reading after each change would have seen.
 *
 * It is not the platform's projection: it reads no events and keeps no attempt
 * chains, so it records no superseded attempt; the engine's retries of a leaf's
 * work, which are health annotations, are what it records of retries. That is
 * all a timeline's fixture needs, and `recordedRuns.test.ts` holds it to the
 * contract's own worked example.
 */
import {
  DEGRADATION_REASON,
  INVOCATION_STATUS,
  RUN_PROGRESS_STATUS,
  timestampMs,
  type InvocationFailure,
  type InvocationStatus,
  type ProgressDegradation,
  type ProgressInvocation,
  type ProgressMode,
  type ProgressSnapshot,
  type RunProgressStatus,
} from "@timeline/progressSnapshot";
import {
  PATH_SEGMENT_KIND,
  invocationPathDepth,
  lastPathSegment,
  parentInvocationPath,
  parsePathSegment,
  splitInvocationPath,
} from "@timeline/invocationPath";

/** A clock time of the recording's day, `HH:MM:SS.mmm`, in UTC. */
export type RecordedClock = string;

export interface RecordedPipe {
  code: string;
  ref: string;
  type: string;
}

export interface RecordedInvocation {
  path: string;
  pipe: RecordedPipe;
  /** When its latest attempt started; absent for a batch item that never started. */
  startedAt?: RecordedClock;
  /** When its latest attempt ended. */
  endedAt?: RecordedClock;
  /** How it ended. Defaults to `succeeded`. */
  outcome?:
    | typeof INVOCATION_STATUS.SUCCEEDED
    | typeof INVOCATION_STATUS.FAILED
    | typeof INVOCATION_STATUS.SKIPPED;
  skipReason?: string;
  stepCount?: number;
  branchCount?: number;
  /** On a batch: when it fanned out, and over how many items. */
  fanOut?: { at: RecordedClock; itemCount: number };
  /** On a condition: when it chose, and the key it matched (`null` for its default outcome). */
  resolution?: { at: RecordedClock; selectedOutcome: string | null };
}

/** What the engine reported of one invocation's health from one moment until another. */
export interface RecordedHealth {
  path: string;
  from: RecordedClock;
  /** Exclusive. Absent: until the end of the recording. */
  until?: RecordedClock;
  attempts?: number;
  lastFailure?: { message: string; at?: RecordedClock };
  degradation?: RecordedDegradation;
}

/** The run status's degradation, reported from one moment until another. */
export interface RecordedRunDegradation {
  from: RecordedClock;
  until?: RecordedClock;
  degradation: RecordedDegradation;
}

export interface RecordedDegradation {
  reason: string;
  message: string;
  failedAttempts: number | null;
  failingSince: RecordedClock | null;
  endsAt: RecordedClock | null;
}

export interface RecordedRun {
  pipelineRunId: string;
  mode: ProgressMode;
  /** The recording's day, `YYYY-MM-DD`, in UTC. */
  day: string;
  /** Every invocation in snapshot order, each before its descendants, every batch item included. */
  invocations: RecordedInvocation[];
  health?: RecordedHealth[];
  runDegradations?: RecordedRunDegradation[];
  /** A run stopped from outside: from this moment it reads as ended with this status. */
  stopped?: {
    at: RecordedClock;
    status: typeof RUN_PROGRESS_STATUS.CANCELED | typeof RUN_PROGRESS_STATUS.FAILED;
  };
}

function stamp(run: RecordedRun, clock: RecordedClock): string {
  return `${run.day}T${clock}Z`;
}

function at(run: RecordedRun, clock: RecordedClock): number {
  const ms = timestampMs(stamp(run, clock));
  if (ms === null) throw new Error(`not a clock time: ${clock}`);
  return ms;
}

function isActive(run: RecordedRun, t: number, from: RecordedClock, until?: RecordedClock) {
  return at(run, from) <= t && (until === undefined || t < at(run, until));
}

function degradationOf(run: RecordedRun, recorded: RecordedDegradation): ProgressDegradation {
  return {
    reason: recorded.reason,
    message: recorded.message,
    failed_attempts: recorded.failedAttempts,
    failing_since: recorded.failingSince === null ? null : stamp(run, recorded.failingSince),
    ends_at: recorded.endsAt === null ? null : stamp(run, recorded.endsAt),
  };
}

// ─── The summary, worded by the contract's rule ──────────────────────────────

function labelOf(invocation: ProgressInvocation, byPath: Map<string, ProgressInvocation>) {
  const { root, segments } = splitInvocationPath(invocation.path);
  if (segments.length === 0) return invocation.pipe_code;
  const of = (count: number | undefined) => (count === undefined ? "" : ` of ${count}`);
  const phrases = segments.map((raw, index) => {
    const parent = byPath.get([root, ...segments.slice(0, index)].join("/"));
    const segment = parsePathSegment(raw);
    switch (segment.kind) {
      case PATH_SEGMENT_KIND.STEP:
        return `step ${segment.ordinal}${of(parent?.step_count)}`;
      case PATH_SEGMENT_KIND.BRANCH:
        return `branch ${segment.ordinal}${of(parent?.branch_count)}`;
      case PATH_SEGMENT_KIND.ITEM:
        return `item ${segment.ordinal}${of(parent?.batch?.total)}`;
      case PATH_SEGMENT_KIND.OUTCOME:
        return `outcome ${segment.key}`;
      case PATH_SEGMENT_KIND.DEFAULT:
        return "default outcome";
      default:
        return raw;
    }
  });
  return `${invocation.pipe_code} (${phrases.join(", ")})`;
}

/** Of several invocations, the first in snapshot order at the least, or the greatest, depth. */
function firstAtDepth(invocations: ProgressInvocation[], which: "least" | "greatest") {
  let found: ProgressInvocation | undefined;
  for (const invocation of invocations) {
    const depth = invocationPathDepth(invocation.path);
    const foundDepth = found ? invocationPathDepth(found.path) : 0;
    if (!found || (which === "least" ? depth < foundDepth : depth > foundDepth)) found = invocation;
  }
  return found;
}

function runningSentence(snapshot: ProgressSnapshot, byPath: Map<string, ProgressInvocation>) {
  const running = snapshot.invocations.filter((i) => i.status === INVOCATION_STATUS.RUNNING);
  if (running.length === 0) return snapshot.invocations.length === 0 ? "Starting" : "Finishing";
  let reached = firstAtDepth(running, "least") as ProgressInvocation;
  let children = running.filter((i) => parentInvocationPath(i.path) === reached.path);
  while (children.length === 1) {
    reached = children[0];
    children = running.filter((i) => parentInvocationPath(i.path) === reached.path);
  }
  const label = labelOf(reached, byPath);
  if (children.length === 0) return `Running ${label}`;
  if (reached.batch) {
    const { done, total, running: itemsRunning, failed } = reached.batch;
    const tail = failed > 0 ? `, ${failed} failed` : "";
    return `Running ${label}: ${done} of ${total} items done, ${itemsRunning} running${tail}`;
  }
  return `Running ${label}: ${children.length} branches running`;
}

function healthClause(snapshot: ProgressSnapshot, byPath: Map<string, ProgressInvocation>) {
  const after = (failedAttempts: number | null) =>
    failedAttempts === null ? "" : ` after ${failedAttempts} failed attempts`;
  const stuck = snapshot.invocations.find((i) => i.degradation);
  if (stuck?.degradation) {
    return `not progressing at ${labelOf(stuck, byPath)}${after(stuck.degradation.failed_attempts)}`;
  }
  if (snapshot.degradation?.reason === DEGRADATION_REASON.WORKFLOW_TASK_FAILING) {
    return `not progressing${after(snapshot.degradation.failed_attempts)}`;
  }
  const retrying = snapshot.invocations.find(
    (i) => i.status === INVOCATION_STATUS.RUNNING && i.attempts !== undefined,
  );
  if (retrying) return `retrying ${labelOf(retrying, byPath)}, attempt ${retrying.attempts}`;
  return null;
}

/** The snapshot's `summary`, worded from the snapshot alone by the contract's rule. */
export function summarize(snapshot: ProgressSnapshot): string {
  const byPath = new Map(snapshot.invocations.map((i) => [i.path, i]));
  switch (snapshot.status) {
    case RUN_PROGRESS_STATUS.PENDING:
      return "Waiting to start";
    case RUN_PROGRESS_STATUS.SUCCEEDED:
      return "Completed";
    case RUN_PROGRESS_STATUS.CANCELED:
      return "Canceled";
    case RUN_PROGRESS_STATUS.FAILED: {
      const failed = snapshot.invocations.filter((i) => i.status === INVOCATION_STATUS.FAILED);
      const deepest = firstAtDepth(failed, "greatest");
      return deepest ? `Failed at ${labelOf(deepest, byPath)}` : "Failed";
    }
    default: {
      const sentence = runningSentence(snapshot, byPath);
      const clause = healthClause(snapshot, byPath);
      return clause ? `${sentence}; ${clause}` : sentence;
    }
  }
}

// ─── The projection at one moment ────────────────────────────────────────────

/** The recording at one moment, as the snapshot a carrier would have served then. */
export function snapshotAt(run: RecordedRun, clock: RecordedClock): ProgressSnapshot {
  const t = at(run, clock);
  const byPath = new Map(run.invocations.map((recorded) => [recorded.path, recorded]));
  const stoppedAt = run.stopped ? at(run, run.stopped.at) : Number.POSITIVE_INFINITY;
  const happened = (moment: RecordedClock | undefined) =>
    moment !== undefined && at(run, moment) <= t && at(run, moment) <= stoppedAt;

  const invocations: ProgressInvocation[] = [];
  let version = 0;
  for (const recorded of run.invocations) {
    if (recorded.fanOut && happened(recorded.fanOut.at)) version += 1;
    if (recorded.resolution && happened(recorded.resolution.at)) version += 1;

    let status: InvocationStatus;
    if (happened(recorded.startedAt)) {
      version += 1;
      if (happened(recorded.endedAt)) {
        version += 1;
        status = recorded.outcome ?? INVOCATION_STATUS.SUCCEEDED;
      } else {
        status = INVOCATION_STATUS.RUNNING;
      }
    } else {
      const parent = parentInvocationPath(recorded.path);
      const fanOut = parent === null ? undefined : byPath.get(parent)?.fanOut;
      const isItem = lastPathSegment(recorded.path)?.kind === PATH_SEGMENT_KIND.ITEM;
      if (!isItem || !happened(fanOut?.at)) continue;
      status = INVOCATION_STATUS.SCHEDULED;
    }

    const invocation: ProgressInvocation = {
      path: recorded.path,
      pipe_code: recorded.pipe.code,
      pipe_ref: recorded.pipe.ref,
      pipe_type: recorded.pipe.type,
      status,
      started_at:
        status === INVOCATION_STATUS.SCHEDULED ? null : stamp(run, recorded.startedAt as string),
      ended_at: happened(recorded.endedAt) ? stamp(run, recorded.endedAt as string) : null,
    };
    if (recorded.stepCount !== undefined) invocation.step_count = recorded.stepCount;
    if (recorded.branchCount !== undefined) invocation.branch_count = recorded.branchCount;
    if (status === INVOCATION_STATUS.SKIPPED && recorded.skipReason) {
      invocation.skip_reason = recorded.skipReason;
    }
    if (recorded.resolution && happened(recorded.resolution.at)) {
      invocation.condition = { selected_outcome: recorded.resolution.selectedOutcome };
    }
    invocations.push(invocation);
  }

  const included = new Map(invocations.map((i) => [i.path, i]));
  for (const recorded of run.invocations) {
    const batch = included.get(recorded.path);
    if (!batch || !recorded.fanOut || !happened(recorded.fanOut.at)) continue;
    const items = invocations.filter(
      (i) =>
        parentInvocationPath(i.path) === recorded.path &&
        lastPathSegment(i.path)?.kind === PATH_SEGMENT_KIND.ITEM,
    );
    const count = (...statuses: InvocationStatus[]) =>
      items.filter((i) => statuses.includes(i.status)).length;
    batch.batch = {
      total: recorded.fanOut.itemCount,
      done: count(INVOCATION_STATUS.SUCCEEDED, INVOCATION_STATUS.SKIPPED),
      running: count(INVOCATION_STATUS.RUNNING),
      failed: count(INVOCATION_STATUS.FAILED),
    };
  }

  for (const health of run.health ?? []) {
    const invocation = included.get(health.path);
    if (!invocation || !isActive(run, t, health.from, health.until)) continue;
    if (health.attempts !== undefined) invocation.attempts = health.attempts;
    if (health.lastFailure) {
      const failure: InvocationFailure = { message: health.lastFailure.message };
      if (health.lastFailure.at) failure.at = stamp(run, health.lastFailure.at);
      invocation.last_failure = failure;
    }
    if (health.degradation) invocation.degradation = degradationOf(run, health.degradation);
  }

  const root = invocations[0];
  let status: RunProgressStatus;
  if (run.stopped && t >= stoppedAt) status = run.stopped.status;
  else if (!root) status = RUN_PROGRESS_STATUS.PENDING;
  else if (root.status === INVOCATION_STATUS.FAILED) status = RUN_PROGRESS_STATUS.FAILED;
  else if (root.status === INVOCATION_STATUS.RUNNING) status = RUN_PROGRESS_STATUS.RUNNING;
  else status = RUN_PROGRESS_STATUS.SUCCEEDED;

  if (status !== RUN_PROGRESS_STATUS.PENDING && status !== RUN_PROGRESS_STATUS.RUNNING) {
    for (const invocation of invocations) {
      if (
        invocation.status === INVOCATION_STATUS.RUNNING ||
        invocation.status === INVOCATION_STATUS.SCHEDULED
      ) {
        invocation.status = INVOCATION_STATUS.CANCELED;
        invocation.ended_at = null;
      }
    }
    // Recount the batches: a canceled item is counted in none of the three.
    for (const invocation of invocations) {
      if (!invocation.batch) continue;
      const items = invocations.filter((i) => parentInvocationPath(i.path) === invocation.path);
      invocation.batch.running = items.filter((i) => i.status === INVOCATION_STATUS.RUNNING).length;
    }
  }

  const snapshot: ProgressSnapshot = {
    pipeline_run_id: run.pipelineRunId,
    mode: run.mode,
    status,
    version,
    assembled_at: stamp(run, clock),
    summary: "",
    invocations,
  };
  const runDegradation = (run.runDegradations ?? []).find((d) => isActive(run, t, d.from, d.until));
  if (
    runDegradation &&
    (status === RUN_PROGRESS_STATUS.RUNNING || status === RUN_PROGRESS_STATUS.PENDING)
  ) {
    snapshot.degradation = degradationOf(run, runDegradation.degradation);
  }
  snapshot.summary = summarize(snapshot);
  return snapshot;
}

/** Every moment the recording changes: each event, each change of health, and the given extra moments. */
export function recordedMoments(run: RecordedRun, extra: RecordedClock[] = []): RecordedClock[] {
  const moments = new Set<RecordedClock>(extra);
  for (const recorded of run.invocations) {
    if (recorded.startedAt) moments.add(recorded.startedAt);
    if (recorded.endedAt) moments.add(recorded.endedAt);
    if (recorded.fanOut) moments.add(recorded.fanOut.at);
    if (recorded.resolution) moments.add(recorded.resolution.at);
  }
  for (const health of run.health ?? []) {
    moments.add(health.from);
    if (health.until) moments.add(health.until);
  }
  for (const degradation of run.runDegradations ?? []) {
    moments.add(degradation.from);
    if (degradation.until) moments.add(degradation.until);
  }
  if (run.stopped) moments.add(run.stopped.at);
  const stoppedAt = run.stopped ? at(run, run.stopped.at) : Number.POSITIVE_INFINITY;
  return [...moments]
    .filter((moment) => at(run, moment) <= stoppedAt)
    .sort((a, b) => at(run, a) - at(run, b));
}

/** The recording's successive snapshots: one at each moment it changes, in order. */
export function recordedSnapshots(
  run: RecordedRun,
  extra: RecordedClock[] = [],
): ProgressSnapshot[] {
  return recordedMoments(run, extra).map((moment) => snapshotAt(run, moment));
}
