"use client";

import * as React from "react";
import type { Problem } from "mthds/errors";
import {
  PROGRESS_MODE,
  RUN_PROGRESS_STATUS,
  timestampMs,
  type ProgressDegradation,
  type ProgressSnapshot,
} from "@timeline/progressSnapshot";
import {
  SIMPLE_LINE_KIND,
  SIMPLE_LINE_STATE,
  SIMPLE_RUN_NOTE_REASON,
  buildSimpleProgress,
  simpleProgressChanges,
  type SimpleLineState,
  type SimpleProgress,
  type SimpleProgressLine,
  type SimpleRunNote,
} from "@timeline/styles/simpleProgress";
import type { TimelinePipeRegistry } from "@timeline/styles/registryJoin";
import { invocationTimes, type SnapshotTimes } from "@timeline/timelineTime";
import {
  DEFAULT_SIMPLE_PROGRESS_STRINGS,
  type SimpleProgressStrings,
} from "./simpleProgressStrings";

/**
 * What `RunTimeline` hands the simple style: the snapshot it holds and its
 * stream, the reading clock and the reader's expansion, which every style
 * shares, and its own props.
 */
export interface SimpleProgressViewProps {
  held: ProgressSnapshot;
  stream: string;
  /** Every timestamp of the snapshot, parsed once. */
  times: SnapshotTimes;
  /** The reading clock, and whether it ticks on its own. */
  nowMs: number | null;
  ticking: boolean;
  /** The lines the reader opened or closed, by key. */
  expanded: Readonly<Record<string, boolean>>;
  onToggle: (key: string, expanded: boolean) => void;
  pipeRegistry?: TimelinePipeRegistry;
  entryPipeRef?: string;
  wideParallelThreshold?: number;
  /** The container's classes and palette, which `RunTimeline` resolves for every style. */
  containerClassName: string;
  containerStyle: React.CSSProperties;
  /** What `RunTimeline` puts at the end of the header: the style menu, when shown. */
  headerEnd?: React.ReactNode;
  strings?: SimpleProgressStrings;
}

/** A state's mark: drawn, never a glyph, so it reads the same in every font. */
function StateMark({ state }: { state: SimpleLineState }) {
  let shape: React.ReactNode = null;
  switch (state) {
    case SIMPLE_LINE_STATE.DONE:
      shape = <path d="M3.5 6.2 5.3 8l3.4-3.8" fill="none" strokeWidth="1.6" />;
      break;
    case SIMPLE_LINE_STATE.FAILED:
      shape = <path d="M4 4l4 4M8 4l-4 4" fill="none" strokeWidth="1.6" />;
      break;
    case SIMPLE_LINE_STATE.SKIPPED:
      shape = <path d="M3.8 6h4.4" fill="none" strokeWidth="1.4" />;
      break;
    case SIMPLE_LINE_STATE.STOPPED:
      shape = <rect x="4" y="4" width="4" height="4" rx="0.5" />;
      break;
    case SIMPLE_LINE_STATE.NOT_RUN:
      shape = <path d="M3.8 6h4.4" fill="none" strokeWidth="1.2" />;
      break;
    default:
      shape = null;
  }
  return (
    <svg
      className={`mthds-simple-progress-mark mthds-simple-progress-mark--${state}`}
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="mthds-simple-progress-mark-ring" cx="6" cy="6" r="5.2" />
      {state === SIMPLE_LINE_STATE.RUNNING && (
        <path className="mthds-simple-progress-mark-arc" d="M6 0.8a5.2 5.2 0 0 1 5.2 5.2" />
      )}
      {shape}
    </svg>
  );
}

/** The platform's own words, behind a disclosure. */
function Details({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="mthds-simple-progress-details">
      <summary>{label}</summary>
      <div className="mthds-simple-progress-details-body">{children}</div>
    </details>
  );
}

function ProblemDetails({
  problem,
  strings,
}: {
  problem: Problem;
  strings: SimpleProgressStrings;
}) {
  const nextStep = problem.next_step?.detail;
  return (
    <Details label={strings.details}>
      <p>{problem.detail}</p>
      {nextStep && <p>{nextStep}</p>}
    </Details>
  );
}

function untilOf(degradation: ProgressDegradation, strings: SimpleProgressStrings): string | null {
  const ms = timestampMs(degradation.ends_at);
  return ms === null ? null : strings.clockTime(ms);
}

interface NoteProps {
  tone: "warning" | "error" | "muted";
  children: React.ReactNode;
}

function Note({ tone, children }: NoteProps) {
  return (
    <div className={`mthds-simple-progress-note mthds-simple-progress-note--${tone}`}>
      {children}
    </div>
  );
}

/**
 * A line's health, worded: trying again, stuck, or the problem it failed with.
 * A line that counts items, a for-each line or a branch step, says how many of
 * its items are in trouble, `item` being what one is called.
 */
function HealthNotes({
  line,
  item,
  strings,
}: {
  line: SimpleProgressLine;
  item: string | null;
  strings: SimpleProgressStrings;
}) {
  const health = line.health;
  if (!health) return null;
  const notes: React.ReactNode[] = [];
  if (health.problem) {
    notes.push(
      <Note key="problem" tone="error">
        <p>{health.problem.title}</p>
        <ProblemDetails problem={health.problem} strings={strings} />
      </Note>,
    );
  }
  if (health.retryingItems > 0) {
    notes.push(
      <Note key="retrying" tone="warning">
        <p>{strings.tryingAgainItems(health.retryingItems, item)}</p>
      </Note>,
    );
  } else if (health.retryAttempt !== null) {
    notes.push(
      <Note key="retrying" tone="warning">
        <p>{strings.tryingAgain(health.retryAttempt)}</p>
      </Note>,
    );
  }
  if (health.degradation) {
    const until = untilOf(health.degradation, strings);
    notes.push(
      <Note key="stuck" tone="warning">
        <p>
          {health.stuckItems > 0
            ? strings.havingTroubleItems(health.stuckItems, item, until)
            : strings.havingTrouble(until)}
        </p>
        <Details label={strings.details}>
          <p>{health.degradation.message}</p>
        </Details>
      </Note>,
    );
  }
  return notes.length > 0 ? <div className="mthds-simple-progress-notes">{notes}</div> : null;
}

/** A batch's determinate bar and its counts in words. */
function BatchCounts({
  line,
  strings,
}: {
  line: SimpleProgressLine;
  strings: SimpleProgressStrings;
}) {
  const counts = line.counts;
  if (!counts || counts.total <= 0) return null;
  const share = (count: number) => `${(Math.min(count, counts.total) / counts.total) * 100}%`;
  // The contract counts a skipped item as done; the reader counts it apart, so
  // that what is done, failed, skipped and going on adds up to the total.
  const skipped = Math.min(line.skippedItems, counts.done);
  const finished = counts.done - skipped;
  const text = strings.batchCounts(finished, counts.total, counts.running, counts.failed, skipped);
  const segments = [
    ["done", finished],
    ["skipped", skipped],
    ["failed", counts.failed],
    ["running", counts.running],
  ] as const;
  return (
    <div className="mthds-simple-progress-batch">
      <div
        className="mthds-simple-progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={counts.total}
        aria-valuenow={finished}
        aria-valuetext={text}
      >
        {segments.map(([name, count]) =>
          count > 0 ? (
            <span
              key={name}
              className={`mthds-simple-progress-bar-${name}`}
              style={{ width: share(count) }}
            />
          ) : null,
        )}
      </div>
      <span className="mthds-simple-progress-counts" aria-hidden="true">
        {text}
      </span>
    </div>
  );
}

const TALLY_ORDER = [
  SIMPLE_LINE_STATE.DONE,
  SIMPLE_LINE_STATE.RUNNING,
  SIMPLE_LINE_STATE.FAILED,
  SIMPLE_LINE_STATE.SKIPPED,
  SIMPLE_LINE_STATE.STOPPED,
] as const;

/** A branch step's items at each state: a mark and a count each. */
function Tally({ line, strings }: { line: SimpleProgressLine; strings: SimpleProgressStrings }) {
  const tally = line.tally;
  if (!tally) return null;
  return (
    <span className="mthds-simple-progress-tally">
      {TALLY_ORDER.filter((state) => tally[state] > 0).map((state) => (
        <span key={state} className="mthds-simple-progress-tally-entry" aria-hidden="true">
          <StateMark state={state} />
          {tally[state]}
        </span>
      ))}
      <span className="mthds-run-timeline-sr">{`, ${strings.tally(tally)}`}</span>
    </span>
  );
}

/** A line's duration once ended, its elapsed time while it runs, or its state where it has neither. */
function timeText(
  line: SimpleProgressLine,
  nowMs: number | null,
  strings: SimpleProgressStrings,
): string | null {
  if (
    line.state === SIMPLE_LINE_STATE.SKIPPED ||
    line.state === SIMPLE_LINE_STATE.STOPPED ||
    line.state === SIMPLE_LINE_STATE.NOT_RUN
  ) {
    return strings.state[line.state];
  }
  const invocation = line.invocation;
  if (!invocation || line.kind === SIMPLE_LINE_KIND.NOW) return null;
  const times = invocationTimes(invocation);
  if (times.startedMs === null) return null;
  if (times.endedMs !== null) return strings.duration(times.endedMs - times.startedMs);
  if (line.state === SIMPLE_LINE_STATE.RUNNING && nowMs !== null) {
    return strings.duration(nowMs - times.startedMs);
  }
  return null;
}

interface LineViewProps {
  line: SimpleProgressLine;
  /** What one of the items is called, on a line that counts them: its own on a for-each line, its batch's on a branch step. */
  item: string | null;
  /**
   * The reading clock, handed only to a line that runs or holds a drawn line
   * that runs, so the others stay as they are while it ticks.
   */
  nowMs: number | null;
  onToggle: (key: string, expanded: boolean) => void;
  strings: SimpleProgressStrings;
}

/** Whether a line runs, or holds a drawn line that runs: what decides that it is handed the clock. */
function followsClock(line: SimpleProgressLine): boolean {
  return line.state === SIMPLE_LINE_STATE.RUNNING || line.children.some(followsClock);
}

/** What one of a child's items is called: its own on a for-each line, else its parent's on a for-each line's branch step. */
function itemOfChild(parent: SimpleProgressLine, child: SimpleProgressLine): string | null {
  if (child.kind === SIMPLE_LINE_KIND.FOR_EACH) return child.forEachItem;
  return parent.kind === SIMPLE_LINE_KIND.FOR_EACH ? parent.forEachItem : null;
}

const LineView = React.memo(function LineView({
  line,
  item,
  nowMs,
  onToggle,
  strings,
}: LineViewProps) {
  const time = timeText(line, line.state === SIMPLE_LINE_STATE.RUNNING ? nowMs : null, strings);
  const classes = [
    "mthds-simple-progress-line",
    `mthds-simple-progress-line--${line.state}`,
    `mthds-simple-progress-line--${line.kind}`,
  ].join(" ");
  const title =
    line.kind === SIMPLE_LINE_KIND.FINISHED
      ? strings.finishedBranches(line.foldedCount ?? 0)
      : line.title;
  return (
    <li className={classes} data-key={line.key} data-state={line.state}>
      <div className="mthds-simple-progress-row">
        <StateMark state={line.state} />
        <span className="mthds-simple-progress-title">
          {line.kind === SIMPLE_LINE_KIND.NOW && (
            <span className="mthds-simple-progress-now">{strings.now} </span>
          )}
          <span className="mthds-simple-progress-name">{title}</span>
          {line.kind === SIMPLE_LINE_KIND.FOR_EACH && (
            <span className="mthds-simple-progress-tag">{` · ${strings.forEach(line.forEachItem)}`}</span>
          )}
          {line.kind === SIMPLE_LINE_KIND.TOGETHER && (
            <span className="mthds-simple-progress-tag">{` · ${strings.together}`}</span>
          )}
          {line.outcome && (
            <span className="mthds-simple-progress-outcome">
              {line.outcome.resolved
                ? strings.outcomeTaken(line.outcome.key)
                : strings.branchFor(line.outcome.key)}
            </span>
          )}
          <span className="mthds-run-timeline-sr">{`, ${strings.state[line.state]}`}</span>
        </span>
        <Tally line={line} strings={strings} />
        {time !== null && <span className="mthds-simple-progress-time">{time}</span>}
        {line.expandable ? (
          <button
            type="button"
            className="mthds-run-timeline-toggle mthds-simple-progress-toggle"
            aria-expanded={line.expanded}
            aria-label={line.expanded ? strings.collapse(title) : strings.expand(title)}
            onClick={() => onToggle(line.key, !line.expanded)}
          >
            <svg
              className="mthds-simple-progress-chevron"
              viewBox="0 0 12 12"
              width="12"
              height="12"
              aria-hidden="true"
            >
              <path d="M4.5 2.5 8 6l-3.5 3.5" />
            </svg>
          </button>
        ) : (
          <span className="mthds-simple-progress-toggle-spacer" aria-hidden="true" />
        )}
      </div>
      <BatchCounts line={line} strings={strings} />
      <HealthNotes line={line} item={item} strings={strings} />
      {line.expanded && line.children.length > 0 && (
        <ol className="mthds-simple-progress-lines mthds-simple-progress-lines--nested">
          {line.children.map((child) => (
            <LineView
              key={child.key}
              line={child}
              item={itemOfChild(line, child)}
              nowMs={followsClock(child) ? nowMs : null}
              onToggle={onToggle}
              strings={strings}
            />
          ))}
        </ol>
      )}
    </li>
  );
});

/** The run's elapsed time: from its first start to the reading clock while it goes on, to its last recorded moment once ended. */
function runElapsedMs(
  progress: SimpleProgress,
  times: SnapshotTimes,
  nowMs: number | null,
): number | null {
  const recorded = times.recorded;
  if (!recorded) return null;
  if (progress.status === RUN_PROGRESS_STATUS.RUNNING && nowMs !== null) {
    return Math.max(0, Math.max(nowMs, recorded.endMs) - recorded.startMs);
  }
  return recorded.endMs - recorded.startMs;
}

function findLine(lines: SimpleProgressLine[], key: string): SimpleProgressLine | null {
  for (const line of lines) {
    if (line.key === key) return line;
  }
  return null;
}

function headlineOf(
  progress: SimpleProgress,
  elapsedMs: number | null,
  strings: SimpleProgressStrings,
): string {
  const elapsed = elapsedMs === null ? null : strings.elapsed(elapsedMs);
  const nothing = progress.lines.length === 0;
  switch (progress.status) {
    case RUN_PROGRESS_STATUS.PENDING:
      return strings.waiting;
    case RUN_PROGRESS_STATUS.SUCCEEDED:
      return strings.done(elapsed);
    case RUN_PROGRESS_STATUS.FAILED: {
      if (nothing && elapsedMs === null) return strings.nothingRecorded;
      const key = progress.failure?.lineKey ?? null;
      const where = key === null ? null : (findLine(progress.lines, key)?.title ?? null);
      return strings.failed(where, elapsed);
    }
    case RUN_PROGRESS_STATUS.CANCELED:
      if (nothing && elapsedMs === null) return strings.nothingRecorded;
      return strings.canceled(elapsed);
    case RUN_PROGRESS_STATUS.RUNNING:
      return strings.working(elapsed);
    default: {
      // A run status a later contract adds: drawn as it is.
      const status: string = progress.status;
      return elapsed === null ? status : `${status} · ${elapsed}`;
    }
  }
}

function RunNoteView({ note, strings }: { note: SimpleRunNote; strings: SimpleProgressStrings }) {
  const degradation = note.degradation;
  if (note.reason === SIMPLE_RUN_NOTE_REASON.UNREACHABLE) {
    return (
      <Note tone="warning">
        <p role="status">{strings.unreachable}</p>
      </Note>
    );
  }
  if (note.reason === SIMPLE_RUN_NOTE_REASON.STUCK) {
    return (
      <Note tone="warning">
        <p role="status">{strings.runStuck(untilOf(degradation, strings))}</p>
        <Details label={strings.details}>
          <p>{degradation.message}</p>
        </Details>
      </Note>
    );
  }
  return (
    <Note tone="warning">
      <p role="status">{degradation.message}</p>
    </Note>
  );
}

/** What the live region last said, and the reading it said it of. */
interface Announcement {
  stream: string;
  progress: SimpleProgress;
  message: string;
}

/**
 * What the live region says: the top-level lines that ended or started since
 * the previous reading, then the run's end in the headline's words, rather
 * than every snapshot. A reading that changed none of those keeps the last
 * message, so nothing is said again; another stream starts silent.
 */
function useAnnouncement(
  progress: SimpleProgress,
  stream: string,
  headline: string,
  strings: SimpleProgressStrings,
): string {
  const [state, setState] = React.useState<Announcement>({ stream, progress, message: "" });
  if (state.progress === progress) return state.message;
  let message = "";
  if (state.stream === stream) {
    const change = simpleProgressChanges(state.progress, progress);
    const parts = [
      ...change.done.map(strings.announceDone),
      ...change.failed.map(strings.announceFailed),
      ...(change.runEnded
        ? [strings.announceEnd(headline)]
        : change.started.map(strings.announceNow)),
    ];
    message = parts.length > 0 ? parts.join(" ") : state.message;
  }
  setState({ stream, progress, message });
  return message;
}

/**
 * The simple timeline style: the run as a checklist of its steps in the
 * method's own words, a batch as one line with a bar and its counts, only the
 * work going on unfolded, and the time a quiet duration on each line.
 */
export function SimpleProgressView({
  held,
  stream,
  times,
  nowMs,
  ticking,
  expanded,
  onToggle: toggle,
  pipeRegistry,
  entryPipeRef,
  wideParallelThreshold,
  containerClassName,
  containerStyle,
  headerEnd,
  strings = DEFAULT_SIMPLE_PROGRESS_STRINGS,
}: SimpleProgressViewProps) {
  const progress = React.useMemo(
    () =>
      buildSimpleProgress(held, {
        pipeRegistry,
        entryPipeRef,
        expanded,
        wideParallelThreshold,
      }),
    [held, pipeRegistry, entryPipeRef, expanded, wideParallelThreshold],
  );
  const headline = headlineOf(progress, runElapsedMs(progress, times, nowMs), strings);
  const failure = progress.failure;
  const announcement = useAnnouncement(progress, stream, headline, strings);

  const classes = [
    containerClassName,
    "mthds-simple-progress",
    ticking && "mthds-run-timeline--self-clocked",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={classes}
      style={containerStyle}
      aria-label="Run progress"
      data-run-status={held.status}
      data-version={held.version}
    >
      <header className="mthds-run-timeline-header">
        <p
          className={`mthds-simple-progress-headline mthds-simple-progress-headline--${held.status}`}
          data-testid="run-timeline-status"
        >
          {headline}
        </p>
        {held.mode === PROGRESS_MODE.DRY && (
          <span className="mthds-run-timeline-mode">{strings.dryRun}</span>
        )}
        {headerEnd}
      </header>
      <p className="mthds-run-timeline-sr" aria-live="polite">
        {announcement}
      </p>
      {progress.retryAttempt !== null && (
        <Note tone="warning">
          <p>{strings.runTryingAgain(progress.retryAttempt)}</p>
        </Note>
      )}
      {progress.runNote && <RunNoteView note={progress.runNote} strings={strings} />}
      {failure?.problem && !failure.shownOnLine && (
        <Note tone="error">
          <p>{failure.problem.title}</p>
          <ProblemDetails problem={failure.problem} strings={strings} />
        </Note>
      )}
      {progress.lines.length > 0 && (
        <ol className="mthds-simple-progress-lines" aria-label={strings.checklistLabel}>
          {progress.lines.map((line) => (
            <LineView
              key={line.key}
              line={line}
              item={line.forEachItem}
              nowMs={followsClock(line) ? nowMs : null}
              onToggle={toggle}
              strings={strings}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
