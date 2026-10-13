import {
  INVOCATION_STATUS,
  isRunEnded,
  timestampMs,
  type ProgressInvocation,
  type ProgressSnapshot,
  type ProgressTimestamp,
} from "./progressSnapshot";

/** The stretch of time a timeline's shared axis spans, in epoch milliseconds. */
export interface TimelineWindow {
  startMs: number;
  endMs: number;
}

/** Where one invocation's bar starts and ends on the axis. */
export interface TimelineBar {
  startMs: number;
  endMs: number;
  /** True while the bar grows: the invocation is running, so its end is the reading clock. */
  growing: boolean;
  /** True when its end was never recorded: a canceled invocation, drawn to the end of the axis. */
  openEnded: boolean;
}

/**
 * The reading clock: the moment a running invocation's elapsed time is measured
 * against. A host or a replay may pin it with `now`; otherwise it is the
 * snapshot's `assembled_at`, the moment the snapshot was projected, which is
 * what a reader measures against when it cannot trust its own clock.
 */
export function readingClockMs(
  snapshot: ProgressSnapshot,
  now?: ProgressTimestamp | number | null,
): number | null {
  if (typeof now === "number") return Number.isFinite(now) ? now : null;
  if (typeof now === "string") return timestampMs(now) ?? timestampMs(snapshot.assembled_at);
  return timestampMs(snapshot.assembled_at);
}

/** An invocation's recorded moments in epoch milliseconds, each `null` where none was recorded. */
export interface InvocationTimes {
  /** The start of its latest attempt. */
  startedMs: number | null;
  /** The end of its latest attempt. */
  endedMs: number | null;
  /** When its last failure happened, when that is known. */
  failedMs: number | null;
}

/** An invocation's recorded moments, parsed. */
export function invocationTimes(invocation: ProgressInvocation): InvocationTimes {
  return {
    startedMs: timestampMs(invocation.started_at),
    endedMs: timestampMs(invocation.ended_at),
    failedMs: timestampMs(invocation.last_failure?.at),
  };
}

/**
 * Everything a timeline reads of time in one snapshot, parsed once, so that a
 * timeline redrawing as its clock ticks parses no timestamp again: each
 * invocation's moments, and the span of every moment the snapshot recorded.
 */
export interface SnapshotTimes {
  /** Each invocation's moments, by path. A path listed twice keeps its first entry's, as its row does. */
  invocations: ReadonlyMap<string, InvocationTimes>;
  /**
   * The axis as far as the snapshot's own records go: from the earliest start
   * to the latest moment recorded, whether a start, an end or a failure, and
   * never spanning zero time. `null` when no invocation has started. Every bar
   * that does not follow the clock lies inside it, and it is the whole axis of
   * a run that has ended.
   */
  recorded: TimelineWindow | null;
  /** The snapshot's `assembled_at`. */
  assembledMs: number | null;
  /** True once the run has ended. */
  ended: boolean;
}

/** A snapshot's moments, parsed once: see `SnapshotTimes`. */
export function snapshotTimes(snapshot: ProgressSnapshot): SnapshotTimes {
  const invocations = new Map<string, InvocationTimes>();
  let startMs = Number.POSITIVE_INFINITY;
  let endMs = Number.NEGATIVE_INFINITY;
  for (const invocation of snapshot.invocations) {
    const times = invocationTimes(invocation);
    if (!invocations.has(invocation.path)) invocations.set(invocation.path, times);
    // Only the axis's start needs a recorded start. An invocation whose start
    // was not recorded may still have recorded its end or a failure, and the
    // axis must reach them.
    if (times.startedMs !== null) {
      startMs = Math.min(startMs, times.startedMs);
      endMs = Math.max(endMs, times.startedMs);
    }
    if (times.endedMs !== null) endMs = Math.max(endMs, times.endedMs);
    if (times.failedMs !== null) endMs = Math.max(endMs, times.failedMs);
  }
  const recorded =
    startMs === Number.POSITIVE_INFINITY
      ? null
      : { startMs, endMs: endMs > startMs ? endMs : startMs + 1 };
  return {
    invocations,
    recorded,
    assembledMs: timestampMs(snapshot.assembled_at),
    ended: isRunEnded(snapshot.status),
  };
}

/**
 * The axis at one reading of the clock, from a snapshot's parsed moments: the
 * snapshot's recorded span, stretched to the reading clock while the run goes
 * on (to its `assembled_at` when `nowMs` is not given, or is not a finite
 * number, which would give the axis no end). See `timelineWindow`. Returns the
 * recorded span itself when the clock does not stretch it.
 */
export function timelineWindowAt(
  times: SnapshotTimes,
  nowMs?: number | null,
): TimelineWindow | null {
  const recorded = times.recorded;
  if (!recorded || times.ended) return recorded;
  const clock = typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : times.assembledMs;
  if (clock === null || clock <= recorded.endMs) return recorded;
  return { startMs: recorded.startMs, endMs: clock };
}

/**
 * The axis every bar is drawn on: from the earliest start the snapshot holds to
 * the latest moment it knows of. While the run goes on, that is the reading
 * clock, so the axis, and every running bar with it, keeps growing. Once the run
 * has ended, it is the latest time recorded in its invocations, whether a start,
 * an end or a failure, an end counting even when its start was not recorded:
 * the snapshot's `assembled_at` is then only when it was read, which may be long
 * after. A `nowMs` that is not a finite number counts as not given. `null` when
 * no invocation has started.
 */
export function timelineWindow(
  snapshot: ProgressSnapshot,
  nowMs?: number | null,
): TimelineWindow | null {
  return timelineWindowAt(snapshotTimes(snapshot), nowMs);
}

/**
 * True when an invocation's bar moves while the reading clock ticks: a running
 * invocation's grows to the clock, and a canceled one's runs to the end of the
 * axis, which grows with the clock while the run goes on. Any other bar is
 * settled by its snapshot, so a timeline need not redraw it between snapshots.
 */
export function barFollowsClock(
  invocation: ProgressInvocation,
  times: InvocationTimes = invocationTimes(invocation),
): boolean {
  if (times.startedMs === null || times.endedMs !== null) return false;
  return (
    invocation.status === INVOCATION_STATUS.RUNNING ||
    invocation.status === INVOCATION_STATUS.CANCELED
  );
}

/**
 * An invocation's bar: from the start of its latest attempt to its end, or to
 * the reading clock while it runs. A canceled invocation recorded no end, so its
 * bar runs to the end of the axis, which is as late as the run is known to have
 * gone. `null` for an invocation that has not started, such as a scheduled item.
 * A `nowMs` that is not a finite number counts as not given, as it does for the
 * axis, so a running bar then ends at the end of the axis rather than at `NaN`
 * or `Infinity`. `times` are the invocation's moments when the caller has
 * already parsed them.
 */
export function invocationBar(
  invocation: ProgressInvocation,
  window: TimelineWindow,
  nowMs?: number | null,
  times: InvocationTimes = invocationTimes(invocation),
): TimelineBar | null {
  const startMs = times.startedMs;
  if (startMs === null) return null;
  const endedMs = times.endedMs;
  const clock = typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : null;
  let endMs: number;
  let growing = false;
  let openEnded = false;
  switch (invocation.status) {
    case INVOCATION_STATUS.RUNNING:
      endMs = endedMs ?? clock ?? window.endMs;
      growing = endedMs === null;
      break;
    case INVOCATION_STATUS.CANCELED:
      endMs = endedMs ?? window.endMs;
      openEnded = endedMs === null;
      break;
    default:
      endMs = endedMs ?? startMs;
  }
  return { startMs, endMs: Math.max(startMs, endMs), growing, openEnded };
}

/** A moment's place on the axis, as a percentage of its width, clamped to it. */
export function axisPercent(ms: number, window: TimelineWindow): number {
  const span = window.endMs - window.startMs;
  if (span <= 0) return 0;
  return Math.min(100, Math.max(0, ((ms - window.startMs) / span) * 100));
}

/** A tick of the axis: its offset from the run's first start, and where it sits. */
export interface TimelineTick {
  offsetMs: number;
  percent: number;
  label: string;
}

const DAY_MS = 86_400_000;

const TICK_STEPS_MS = [
  100,
  200,
  500,
  1_000,
  2_000,
  5_000,
  10_000,
  15_000,
  30_000,
  60_000,
  120_000,
  300_000,
  600_000,
  900_000,
  1_800_000,
  3_600_000,
  7_200_000,
  14_400_000,
  21_600_000,
  43_200_000,
  DAY_MS,
];

/**
 * The axis's ticks, at the smallest round step that keeps them to `maxTicks`
 * intervals or fewer, labelled with their offset from the first start. Past the
 * table's largest step, a day, the step is the smallest whole number of days
 * that still keeps to `maxTicks`, so no axis is ever crowded with labels. An
 * axis whose span is not a finite positive number has no ticks: an infinite
 * one would otherwise take an infinite step and never reach its end.
 */
export function timelineTicks(window: TimelineWindow, maxTicks = 6): TimelineTick[] {
  const span = window.endMs - window.startMs;
  if (!Number.isFinite(span) || span <= 0) return [];
  const budget = Math.max(1, maxTicks);
  const step =
    TICK_STEPS_MS.find((candidate) => span / candidate <= budget) ??
    Math.ceil(span / budget / DAY_MS) * DAY_MS;
  const ticks: TimelineTick[] = [];
  for (let offsetMs = 0; offsetMs <= span; offsetMs += step) {
    ticks.push({
      offsetMs,
      percent: axisPercent(window.startMs + offsetMs, window),
      label: formatDuration(offsetMs),
    });
  }
  return ticks;
}

/**
 * A duration in a few characters: `340ms`, `6.7s`, `42s`, `2m 05s`, `1h 12m`.
 * Negative durations, which only clock skew produces, read as zero.
 */
export function formatDuration(ms: number): string {
  const safe = Math.max(0, ms);
  if (safe === 0) return "0s";
  if (Math.round(safe) < 1_000) return `${Math.round(safe)}ms`;
  const tenths = Math.round(safe / 100) / 10;
  if (tenths < 10) return `${tenths}s`;
  // Rounded once, then split, so 59.6 seconds reads `1m` rather than `60s`.
  const totalSeconds = Math.round(safe / 1_000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  if (totalSeconds < 3_600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

/** A moment as its UTC time of day, to the millisecond: `09:30:07.034 UTC`. */
export function formatClockTime(ms: number): string {
  return `${new Date(ms).toISOString().slice(11, 23)} UTC`;
}
