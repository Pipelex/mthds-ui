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

/**
 * The axis every bar is drawn on: from the earliest start the snapshot holds to
 * the latest moment it knows of. While the run goes on, that is the reading
 * clock, so the axis, and every running bar with it, keeps growing. Once the run
 * has ended, it is the latest time recorded in its invocations: the snapshot's
 * `assembled_at` is then only when it was read, which may be long after.
 * `null` when no invocation has started.
 */
export function timelineWindow(
  snapshot: ProgressSnapshot,
  nowMs?: number | null,
): TimelineWindow | null {
  let startMs = Number.POSITIVE_INFINITY;
  let endMs = Number.NEGATIVE_INFINITY;
  for (const invocation of snapshot.invocations) {
    const started = timestampMs(invocation.started_at);
    if (started === null) continue;
    startMs = Math.min(startMs, started);
    endMs = Math.max(endMs, started);
    const ended = timestampMs(invocation.ended_at);
    if (ended !== null) endMs = Math.max(endMs, ended);
    const failed = timestampMs(invocation.last_failure?.at);
    if (failed !== null) endMs = Math.max(endMs, failed);
  }
  if (startMs === Number.POSITIVE_INFINITY) return null;
  if (!isRunEnded(snapshot.status)) {
    const clock = nowMs ?? timestampMs(snapshot.assembled_at);
    if (clock !== null) endMs = Math.max(endMs, clock);
  }
  return { startMs, endMs: endMs > startMs ? endMs : startMs + 1 };
}

/**
 * An invocation's bar: from the start of its latest attempt to its end, or to
 * the reading clock while it runs. A canceled invocation recorded no end, so its
 * bar runs to the end of the axis, which is as late as the run is known to have
 * gone. `null` for an invocation that has not started, such as a scheduled item.
 */
export function invocationBar(
  invocation: ProgressInvocation,
  window: TimelineWindow,
  nowMs?: number | null,
): TimelineBar | null {
  const startMs = timestampMs(invocation.started_at);
  if (startMs === null) return null;
  const endedMs = timestampMs(invocation.ended_at);
  let endMs: number;
  let growing = false;
  let openEnded = false;
  switch (invocation.status) {
    case INVOCATION_STATUS.RUNNING:
      endMs = endedMs ?? nowMs ?? window.endMs;
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

const TICK_STEPS_MS = [
  100, 200, 500, 1_000, 2_000, 5_000, 10_000, 15_000, 30_000, 60_000, 120_000, 300_000, 600_000,
  900_000, 1_800_000, 3_600_000, 7_200_000, 14_400_000, 21_600_000, 43_200_000, 86_400_000,
];

/**
 * The axis's ticks, at the smallest round step that keeps them to `maxTicks`
 * intervals or fewer, labelled with their offset from the first start.
 */
export function timelineTicks(window: TimelineWindow, maxTicks = 6): TimelineTick[] {
  const span = window.endMs - window.startMs;
  const step =
    TICK_STEPS_MS.find((candidate) => span / candidate <= maxTicks) ??
    TICK_STEPS_MS[TICK_STEPS_MS.length - 1];
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
