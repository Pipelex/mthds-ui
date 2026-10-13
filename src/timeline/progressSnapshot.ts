/**
 * The progress snapshot of the hosted progress contract, as data.
 *
 * A snapshot is the state of a run's progress at one moment: which invocations
 * of which pipes have started, ended or been skipped, how far each batch has
 * got, which outcome each condition took, and where the run is retrying or
 * stuck. It is defined apart from the carriers that deliver it (a progress
 * route a client polls, a frame that tells a browser to read it again, the
 * state of a task on another workflow platform), so these types model the
 * snapshot alone and name no carrier and no workflow engine.
 *
 * Field names, optionality and the closed vocabularies follow the contract
 * word for word. A required field is always present, `null` where its type
 * says so; an optional field is absent when it does not apply, never `null`.
 * A reader ignores a member it does not know, so nothing here rejects an
 * unknown field, and the fields the contract calls open strings
 * (`pipe_type`, `degradation.reason`) are typed `string`.
 */

/** RFC 3339 in UTC, written with `Z` in a snapshot, with fractional seconds when recorded. */
export type ProgressTimestamp = string;

/** Whether the events a snapshot was projected from are a live run's or a dry run's. */
export const PROGRESS_MODE = {
  LIVE: "live",
  DRY: "dry",
} as const;

export type ProgressMode = (typeof PROGRESS_MODE)[keyof typeof PROGRESS_MODE];

/**
 * Where the run stands: accepted and not yet started, going, ended with its
 * result, ended in failure, or stopped before its end.
 */
export const RUN_PROGRESS_STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELED: "canceled",
} as const;

export type RunProgressStatus = (typeof RUN_PROGRESS_STATUS)[keyof typeof RUN_PROGRESS_STATUS];

/**
 * An invocation's status. These are the words a run graph uses for its nodes,
 * the same set as the graph's `PipeStatus`:
 *
 * - `scheduled`: an item of a batch that has fanned out, not yet started;
 * - `running`: started its latest attempt and not ended it;
 * - `succeeded`: ended its latest attempt with its output;
 * - `failed`: ended its latest attempt in failure;
 * - `skipped`: skipped in its latest attempt, a successful end with no output of its own;
 * - `canceled`: had not ended when the run ended.
 */
export const INVOCATION_STATUS = {
  SCHEDULED: "scheduled",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  SKIPPED: "skipped",
  CANCELED: "canceled",
} as const;

export type InvocationStatus = (typeof INVOCATION_STATUS)[keyof typeof INVOCATION_STATUS];

/** The reasons the platform emits today. `ProgressDegradation.reason` stays an open string. */
export const DEGRADATION_REASON = {
  WORKFLOW_TASK_FAILING: "workflow_task_failing",
  STATUS_UNAVAILABLE: "status_unavailable",
} as const;

/**
 * The run status's assessment of a run that is not making progress. A snapshot
 * carries it whole as its own `degradation`, and on the invocation it concerns.
 * Every member is always present, `null` where its type says so.
 */
export interface ProgressDegradation {
  /** Why the run reads degraded. An open string: show `message` for a reason you do not know. */
  reason: string;
  /** The assessment in words, for a person. Shown as it is, never parsed. */
  message: string;
  /** How many times in a row the failing execution has failed to advance. */
  failed_attempts: number | null;
  /** When that series of failures began, or the latest time it can have begun. */
  failing_since: ProgressTimestamp | null;
  /** When the platform ends the run as failed if the series is still going on then. */
  ends_at: ProgressTimestamp | null;
}

/** A batch's counts of its items. An item `scheduled` or `canceled` is counted in none of the three. */
export interface BatchProgress {
  /** The fan-out's item count. */
  total: number;
  /** Items `succeeded` or `skipped`. */
  done: number;
  /** Items `running`. */
  running: number;
  /** Items `failed`. */
  failed: number;
}

/** A condition's resolution. */
export interface ConditionProgress {
  /** The outcome map's key that matched, or `null` when the condition took its default outcome. */
  selected_outcome: string | null;
}

/** The latest failure of an invocation's work, a health annotation. */
export interface InvocationFailure {
  /** The failure under the run's error disclosure: its own message when written for the caller, else a placeholder. */
  message: string;
  /** When it failed, when known. */
  at?: ProgressTimestamp;
}

/** One attempt of one execution: an entry of a chain. */
export interface ExecutionAttempt {
  /** Opaque. Names the execution, the same in each of its attempts. */
  execution: string;
  /** Counts from 1. */
  attempt: number;
}

/** One run of one pipe inside a run, named by its invocation path. */
export interface ProgressInvocation {
  /** Its invocation path, from the run's entry pipe. */
  path: string;
  /** The bare code of the pipe it runs, which a timeline labels its row with. */
  pipe_code: string;
  /** The same pipe's `pipe_ref`. */
  pipe_ref: string;
  /** The pipe's type, such as `PipeSequence` or `PipeLLM`: an open string. */
  pipe_type: string;
  status: InvocationStatus;
  /** The start of its latest attempt; `null` while `scheduled`, and when no start of that attempt was recorded. */
  started_at: ProgressTimestamp | null;
  /** The end of its latest attempt; `null` while `scheduled` or `running`, and when `canceled`. */
  ended_at: ProgressTimestamp | null;
  /** On a `PipeSequence`, the number of steps its author wrote. */
  step_count?: number;
  /** On a `PipeParallel`, the number of its branches. */
  branch_count?: number;
  /** On a `skipped` invocation, why it was skipped. */
  skip_reason?: string;
  /** On a `PipeBatch` that has fanned out. */
  batch?: BatchProgress;
  /** On a `PipeCondition` that has resolved. */
  condition?: ConditionProgress;
  /** Health annotation: how many times its work has been tried, present only when more than once. */
  attempts?: number;
  /** Health annotation: the latest failure of its work. */
  last_failure?: InvocationFailure;
  /** Health annotation: the run is stuck at this invocation. */
  degradation?: ProgressDegradation;
}

/** The state of a run's progress at one moment. */
export interface ProgressSnapshot {
  pipeline_run_id: string;
  /** The mode of the events it was projected from. */
  mode: ProgressMode;
  status: RunProgressStatus;
  /** What a reader compares two snapshots of one run by: the count of distinct events projected. */
  version: number;
  /** When the snapshot was projected. */
  assembled_at: ProgressTimestamp;
  /** One line saying how far the run has got. Shown as it is, never parsed. */
  summary: string;
  /** Present only on a snapshot of part of a run: the path of the invocation it starts at. */
  root_path?: string;
  /** Present only on a snapshot of part of a run: the chain of the attempt it was projected from. */
  chain?: ExecutionAttempt[];
  /** The run status's degradation, present when the run reads degraded. */
  degradation?: ProgressDegradation;
  /** Every invocation the snapshot knows, each before its descendants. */
  invocations: ProgressInvocation[];
}

/** True once the run has ended: `succeeded`, `failed` or `canceled`. */
export function isRunEnded(status: RunProgressStatus): boolean {
  return (
    status === RUN_PROGRESS_STATUS.SUCCEEDED ||
    status === RUN_PROGRESS_STATUS.FAILED ||
    status === RUN_PROGRESS_STATUS.CANCELED
  );
}

const TIMESTAMP_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/i;

/**
 * A timestamp as milliseconds since the epoch, keeping any precision finer than
 * a millisecond as a fraction, or `null` when it is not an RFC 3339 timestamp.
 *
 * `Date.parse` alone would do for most inputs, but the contract lets a source
 * record any number of fractional digits, and two snapshots of the same version
 * are told apart by `assembled_at` alone, so the digits past the third are kept
 * rather than left to how a JavaScript engine happens to round them. An offset
 * such as `+00:00` parses as well, since the status read may write one.
 */
export function timestampMs(timestamp: ProgressTimestamp | null | undefined): number | null {
  if (!timestamp) return null;
  const match = TIMESTAMP_PATTERN.exec(timestamp);
  if (!match) {
    const parsed = Date.parse(timestamp);
    return Number.isNaN(parsed) ? null : parsed;
  }
  const [, base, fraction = "", offset] = match;
  const wholeMs = Date.parse(`${base}${offset.toUpperCase()}`);
  if (Number.isNaN(wholeMs)) return null;
  const fractionMs = fraction ? Number.parseFloat(`0.${fraction}`) * 1000 : 0;
  return wholeMs + fractionMs;
}
