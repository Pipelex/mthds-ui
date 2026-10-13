"use client";

import * as React from "react";
import { getPaletteForTheme } from "@graph/graphConfig";
import { GRAPH_THEME_MODE, type GraphTheme, type GraphThemeMode } from "@graph/types";
import { useSystemTheme } from "@graph/react/viewer/useSystemTheme";
import {
  INVOCATION_STATUS,
  PROGRESS_MODE,
  isRunEnded,
  timestampMs,
  type InvocationStatus,
  type ProgressInvocation,
  type ProgressSnapshot,
  type ProgressTimestamp,
  type RunProgressStatus,
} from "@timeline/progressSnapshot";
import { fresherSnapshot } from "@timeline/snapshotFreshness";
import { buildTimelineRows, type TimelineBatch, type TimelineRow } from "@timeline/timelineRows";
import {
  axisPercent,
  formatClockTime,
  formatDuration,
  invocationBar,
  readingClockMs,
  timelineTicks,
  timelineWindow,
  type TimelineBar,
  type TimelineWindow,
} from "@timeline/timelineTime";

export interface RunTimelineProps {
  /**
   * The run's progress snapshot, as the hosted progress contract defines it:
   * the component's only source of what ran. Hand it every snapshot you read;
   * the timeline keeps the fresher of the one it holds and the one it is given,
   * so an older read arriving late never rolls it back, and a snapshot showing
   * the run still going never replaces one showing it ended.
   */
  snapshot: ProgressSnapshot;
  /**
   * `dark`, `light`, or `system` to follow the environment, as `GraphViewer`'s
   * theme mode. Defaults to `system`.
   */
  theme?: GraphThemeMode;
  /** The environment's theme when the host detects it itself, as on `GraphViewer`. */
  systemTheme?: GraphTheme;
  /**
   * Pins the reading clock: the moment running bars grow to, as a timestamp or
   * epoch milliseconds. A host that keeps its own trusted clock, or a replay,
   * sets it; the timeline then never ticks on its own.
   */
  now?: ProgressTimestamp | number;
  /**
   * While the run goes on and `now` is unset, keep running bars growing between
   * snapshots: the timeline advances its reading clock from the snapshot's
   * `assembled_at` by the time elapsed on this page since the snapshot arrived,
   * so it never trusts the page's clock to agree with the server's. `false`
   * draws each snapshot as of its `assembled_at`. Defaults to `true`.
   */
  live?: boolean;
  /** A batch holding more items than this starts collapsed. Defaults to `DEFAULT_WIDE_BATCH_THRESHOLD`. */
  wideBatchThreshold?: number;
  /** Appended to the container's class list. */
  className?: string;
}

const CLOCK_TICK_MS = 250;
/** Past this point on the axis a tick's label ends at its tick rather than centring on it. */
const TICK_RIGHT_ALIGN_PERCENT = 92;
/** The room one tick's label takes on the axis, which sets how many ticks fit. */
const TICK_SPACING_PX = 64;
const DEFAULT_MAX_TICKS = 6;

/**
 * How many tick intervals the axis has room for, from its measured width. Until
 * it is measured, and where nothing measures it, the default holds.
 */
function useTickBudget(): [React.RefCallback<HTMLElement>, number] {
  const [budget, setBudget] = React.useState(DEFAULT_MAX_TICKS);
  const observer = React.useRef<ResizeObserver | null>(null);
  const ref = React.useCallback((element: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!element || typeof ResizeObserver === "undefined") return;
    observer.current = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) setBudget(Math.max(1, Math.floor(width / TICK_SPACING_PX)));
    });
    observer.current.observe(element);
  }, []);
  return [ref, budget];
}
const EMPTY_EXPANSION: Readonly<Record<string, boolean>> = Object.freeze({});

const RUN_STATUS_WORD: Record<RunProgressStatus, string> = {
  pending: "Pending",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  canceled: "Canceled",
};

const INVOCATION_STATUS_WORD: Record<InvocationStatus, string> = {
  scheduled: "scheduled",
  running: "running",
  succeeded: "succeeded",
  failed: "failed",
  skipped: "skipped",
  canceled: "canceled",
};

/**
 * A status word, or the raw value for a word this version does not know: a
 * reader keeps drawing what a later contract adds rather than failing on it.
 */
function wordFor<K extends string>(table: Record<K, string>, value: string): string {
  return Object.prototype.hasOwnProperty.call(table, value) ? table[value as K] : value;
}

/**
 * The snapshot to draw: of the one held and the one just passed, the fresher by
 * the contract's rule. React's derived-state pattern rather than an effect, so
 * the render that receives a stale snapshot never paints it, not even once.
 */
function useHeldSnapshot(snapshot: ProgressSnapshot): ProgressSnapshot {
  const [state, setState] = React.useState({ given: snapshot, held: snapshot });
  if (state.given !== snapshot) {
    const held = fresherSnapshot(state.held, snapshot);
    setState({ given: snapshot, held });
    return held;
  }
  return state.held;
}

/**
 * The reading clock, in epoch milliseconds. Pinned by `now` when the host sets
 * it; otherwise the snapshot's `assembled_at`, advanced while the run goes on by
 * the time this page has measured since the snapshot arrived.
 */
function useReadingClock(
  held: ProgressSnapshot,
  now: ProgressTimestamp | number | undefined,
  live: boolean,
): { nowMs: number | null; ticking: boolean } {
  const base = readingClockMs(held, now);
  const ticking = live && now === undefined && base !== null && !isRunEnded(held.status);
  const [elapsed, setElapsed] = React.useState<{ base: number | null; ms: number }>({
    base,
    ms: 0,
  });
  React.useEffect(() => {
    if (!ticking) return undefined;
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setElapsed({ base, ms: performance.now() - startedAt });
    }, CLOCK_TICK_MS);
    return () => window.clearInterval(timer);
  }, [ticking, base]);
  if (base === null) return { nowMs: null, ticking };
  return { nowMs: ticking && elapsed.base === base ? base + elapsed.ms : base, ticking };
}

function batchCountsText(batch: TimelineBatch): string | null {
  const counts = batch.counts;
  if (!counts) return null;
  let text = `${counts.done} of ${counts.total} done`;
  if (counts.running > 0) text += ` · ${counts.running} running`;
  if (counts.failed > 0) text += ` · ${counts.failed} failed`;
  return text;
}

function rowDetailText(row: TimelineRow, bar: TimelineBar | null): string {
  const batchText = row.batch ? batchCountsText(row.batch) : null;
  if (batchText) return batchText;
  const status = row.invocation.status;
  if (status === INVOCATION_STATUS.SCHEDULED) return "scheduled";
  if (status === INVOCATION_STATUS.SKIPPED) return "skipped";
  if (status === INVOCATION_STATUS.CANCELED) return "canceled";
  return bar ? formatDuration(bar.endMs - bar.startMs) : "";
}

/** The row's tooltip: everything the snapshot says of the invocation, in words. */
function rowTitle(row: TimelineRow, bar: TimelineBar | null): string {
  const invocation = row.invocation;
  const lines = [`${invocation.pipe_ref} · ${invocation.pipe_type}`];
  const started = timestampMs(invocation.started_at);
  const ended = timestampMs(invocation.ended_at);
  let state = wordFor(INVOCATION_STATUS_WORD, invocation.status);
  if (started !== null) state += `, started ${formatClockTime(started)}`;
  if (ended !== null) state += `, ended ${formatClockTime(ended)}`;
  if (bar) state += ` (${formatDuration(bar.endMs - bar.startMs)})`;
  lines.push(state.charAt(0).toUpperCase() + state.slice(1));
  if (row.outcome) {
    lines.push(
      row.outcome.key === null ? "Took the default outcome" : `Took the outcome ${row.outcome.key}`,
    );
  }
  if (invocation.condition) {
    const selected = invocation.condition.selected_outcome;
    lines.push(selected === null ? "Chose its default outcome" : `Chose the outcome ${selected}`);
  }
  const counts = row.batch?.counts;
  if (counts) {
    lines.push(
      `${counts.total} items: ${counts.done} done, ${counts.running} running, ${counts.failed} failed`,
    );
  }
  if (invocation.skip_reason) lines.push(`Skipped: ${invocation.skip_reason}`);
  if (invocation.attempts !== undefined && invocation.attempts > 1) {
    lines.push(`Tried ${invocation.attempts} times`);
  }
  if (invocation.last_failure) {
    const at = timestampMs(invocation.last_failure.at);
    lines.push(
      `Last failure${at === null ? "" : ` at ${formatClockTime(at)}`}: ${invocation.last_failure.message}`,
    );
  }
  if (invocation.degradation) lines.push(`Not progressing: ${invocation.degradation.message}`);
  return lines.join("\n");
}

function isRetried(invocation: ProgressInvocation): boolean {
  return invocation.attempts !== undefined && invocation.attempts > 1;
}

interface BatchStripProps {
  batch: TimelineBatch;
}

/** The thin strip of a batch's item states, inside its bar, one cell per run of equal states. */
function BatchStrip({ batch }: BatchStripProps) {
  if (batch.strip.length === 0) return null;
  return (
    <span className="mthds-run-timeline-strip" aria-hidden="true">
      {batch.strip.map((cell) => (
        <span
          key={cell.firstItem}
          className={`mthds-run-timeline-strip-cell mthds-run-timeline-strip-cell--${cell.status}`}
          style={{ flexGrow: cell.count }}
        />
      ))}
    </span>
  );
}

interface FailureTickProps {
  invocation: ProgressInvocation;
  bar: TimelineBar;
}

/** Where the invocation's last failure happened, marked on its bar. */
function FailureTick({ invocation, bar }: FailureTickProps) {
  const at = timestampMs(invocation.last_failure?.at);
  if (at === null || at < bar.startMs || at > bar.endMs) return null;
  const span = bar.endMs - bar.startMs;
  const percent = span > 0 ? ((at - bar.startMs) / span) * 100 : 0;
  return (
    <span
      className="mthds-run-timeline-failure-tick"
      style={{ left: `${percent}%` }}
      aria-hidden="true"
    />
  );
}

interface TimelineRowViewProps {
  row: TimelineRow;
  axis: TimelineWindow | null;
  nowMs: number | null;
  onToggleBatch: (path: string, expanded: boolean) => void;
}

function TimelineRowView({ row, axis, nowMs, onToggleBatch }: TimelineRowViewProps) {
  const invocation = row.invocation;
  const status = invocation.status;
  const bar = axis ? invocationBar(invocation, axis, nowMs) : null;
  const retried = isRetried(invocation);
  const retrying = retried && status === INVOCATION_STATUS.RUNNING;
  const batch = row.batch;

  const rowClasses = [
    "mthds-run-timeline-row",
    `mthds-run-timeline-row--${status}`,
    retrying && "mthds-run-timeline-row--retrying",
    retried &&
      (status === INVOCATION_STATUS.SUCCEEDED || status === INVOCATION_STATUS.SKIPPED) &&
      "mthds-run-timeline-row--recovered",
    invocation.degradation && "mthds-run-timeline-row--degraded",
    row.keptVisible && "mthds-run-timeline-row--kept",
  ]
    .filter(Boolean)
    .join(" ");

  const barClasses = [
    "mthds-run-timeline-bar",
    batch && "mthds-run-timeline-bar--batch",
    bar?.growing && "mthds-run-timeline-bar--growing",
    bar?.openEnded && "mthds-run-timeline-bar--open-ended",
  ]
    .filter(Boolean)
    .join(" ");

  let toggleLabel = "";
  if (batch) {
    toggleLabel = batch.expanded
      ? `Collapse the ${batch.total} items of ${invocation.pipe_code}`
      : `Expand the ${batch.total} items of ${invocation.pipe_code}`;
  }

  return (
    <li className={rowClasses} data-path={row.path} data-status={status} title={rowTitle(row, bar)}>
      <div
        className="mthds-run-timeline-name"
        style={{ paddingLeft: `calc(${row.depth} * var(--mthds-run-timeline-indent))` }}
      >
        {batch ? (
          <button
            type="button"
            className="mthds-run-timeline-toggle"
            aria-expanded={batch.expanded}
            aria-label={toggleLabel}
            onClick={() => onToggleBatch(row.path, !batch.expanded)}
          >
            <span aria-hidden="true">{batch.expanded ? "▾" : "▸"}</span>
          </button>
        ) : (
          <span className="mthds-run-timeline-toggle-spacer" aria-hidden="true" />
        )}
        <span className="mthds-run-timeline-dot" aria-hidden="true" />
        <span className="mthds-run-timeline-code">{invocation.pipe_code}</span>
        {row.placeLabel && <span className="mthds-run-timeline-place">{row.placeLabel}</span>}
        <span className="mthds-run-timeline-sr">
          {`, ${wordFor(INVOCATION_STATUS_WORD, status)}`}
        </span>
      </div>
      <div className="mthds-run-timeline-track">
        {bar && axis && (
          <span
            className={barClasses}
            style={{
              left: `${axisPercent(bar.startMs, axis)}%`,
              width: `${axisPercent(bar.endMs, axis) - axisPercent(bar.startMs, axis)}%`,
            }}
          >
            {batch && <BatchStrip batch={batch} />}
            <FailureTick invocation={invocation} bar={bar} />
          </span>
        )}
      </div>
      <div className="mthds-run-timeline-meta">
        {retried && (
          <span className="mthds-run-timeline-badge mthds-run-timeline-badge--retry">
            <span aria-hidden="true">↻ </span>
            {retrying ? `attempt ${invocation.attempts}` : `${invocation.attempts} attempts`}
          </span>
        )}
        {invocation.degradation && (
          <span className="mthds-run-timeline-badge mthds-run-timeline-badge--stuck">stuck</span>
        )}
        {batch && !batch.expanded && batch.hiddenItemCount > 0 && (
          <span className="mthds-run-timeline-sr">{`, ${batch.hiddenItemCount} items hidden`}</span>
        )}
        <span className="mthds-run-timeline-detail">{rowDetailText(row, bar)}</span>
      </div>
    </li>
  );
}

/**
 * A run's progress as a timeline, drawn from its progress snapshot alone: one
 * row per invocation, nested under its controller by its path and labelled with
 * its pipe code, and a bar on a shared time axis from the invocation's start to
 * its end, which grows while it runs.
 *
 * Nothing is drawn in advance: a row appears when the run reaches its
 * invocation, so there is no method graph behind it and no batch width is ever
 * guessed. A batch is one collapsible row carrying its counts and a strip of its
 * items' states; a wide one starts collapsed and keeps its failed items in view.
 * A condition's branch carries the outcome it took. A retried invocation shows
 * its attempts and where its last failure happened, and the invocation where
 * the run is stuck says so.
 *
 * Rows are keyed by path, so repainting with a newer snapshot keeps each drawn
 * row in place and what the reader expanded expanded.
 */
export function RunTimeline({
  snapshot,
  theme = GRAPH_THEME_MODE.SYSTEM,
  systemTheme,
  now,
  live = true,
  wideBatchThreshold,
  className,
}: RunTimelineProps) {
  const held = useHeldSnapshot(snapshot);
  const { nowMs, ticking } = useReadingClock(held, now, live);

  // A fixed theme is handed to the hook as if injected, so it registers no
  // `prefers-color-scheme` listener whose answer would be thrown away.
  const environmentTheme = useSystemTheme(theme === GRAPH_THEME_MODE.SYSTEM ? systemTheme : theme);
  const resolvedTheme: GraphTheme = theme === GRAPH_THEME_MODE.SYSTEM ? environmentTheme : theme;
  const paletteStyle = React.useMemo(
    () => getPaletteForTheme(resolvedTheme) as React.CSSProperties,
    [resolvedTheme],
  );

  // What the reader expanded belongs to one run: another run starts afresh.
  const streamKey = `${held.pipeline_run_id}\u0000${held.mode}\u0000${held.root_path ?? ""}`;
  const [expansion, setExpansion] = React.useState<{
    key: string;
    batches: Readonly<Record<string, boolean>>;
  }>({ key: streamKey, batches: EMPTY_EXPANSION });
  const expandedBatches = expansion.key === streamKey ? expansion.batches : EMPTY_EXPANSION;
  const toggleBatch = React.useCallback(
    (path: string, expanded: boolean) => {
      setExpansion((previous) => ({
        key: streamKey,
        batches: {
          ...(previous.key === streamKey ? previous.batches : EMPTY_EXPANSION),
          [path]: expanded,
        },
      }));
    },
    [streamKey],
  );

  const rows = React.useMemo(
    () => buildTimelineRows(held, { expandedBatches, wideBatchThreshold }),
    [held, expandedBatches, wideBatchThreshold],
  );
  const axis = timelineWindow(held, nowMs);
  const [axisTrackRef, tickBudget] = useTickBudget();
  const ticks = axis ? timelineTicks(axis, tickBudget) : [];

  const containerClasses = [
    "mthds-run-timeline",
    `mthds-run-timeline--${resolvedTheme}`,
    ticking && "mthds-run-timeline--self-clocked",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={containerClasses}
      style={paletteStyle}
      aria-label="Run progress"
      data-run-status={held.status}
      data-version={held.version}
    >
      <header className="mthds-run-timeline-header">
        <span
          className={`mthds-run-timeline-status mthds-run-timeline-status--${held.status}`}
          data-testid="run-timeline-status"
        >
          {wordFor(RUN_STATUS_WORD, held.status)}
        </span>
        {held.mode === PROGRESS_MODE.DRY && (
          <span className="mthds-run-timeline-mode">Dry run</span>
        )}
        <p className="mthds-run-timeline-summary" aria-live="polite">
          {held.summary}
        </p>
      </header>
      {held.degradation && (
        <p className="mthds-run-timeline-degradation" role="status">
          {held.degradation.message}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="mthds-run-timeline-empty">Nothing has started yet.</p>
      ) : (
        <div className="mthds-run-timeline-body">
          {axis && (
            <div className="mthds-run-timeline-axis" aria-hidden="true">
              <span className="mthds-run-timeline-axis-spacer" />
              <span className="mthds-run-timeline-axis-track" ref={axisTrackRef}>
                {ticks.map((tick) => (
                  <span
                    key={tick.offsetMs}
                    className={[
                      "mthds-run-timeline-tick",
                      tick.percent === 0 && "mthds-run-timeline-tick--first",
                      tick.percent > TICK_RIGHT_ALIGN_PERCENT && "mthds-run-timeline-tick--last",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ left: `${tick.percent}%` }}
                  >
                    {tick.label}
                  </span>
                ))}
              </span>
              <span className="mthds-run-timeline-axis-spacer" />
            </div>
          )}
          <ol className="mthds-run-timeline-rows">
            {rows.map((row) => (
              <TimelineRowView
                key={row.path}
                row={row}
                axis={axis}
                nowMs={nowMs}
                onToggleBatch={toggleBatch}
              />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
