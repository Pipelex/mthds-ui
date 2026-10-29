"use client";

import * as React from "react";
import { getPaletteForTheme } from "@graph/graphConfig";
import { GRAPH_THEME_MODE, type GraphTheme, type GraphThemeMode } from "@graph/types";
import { useSystemTheme } from "@graph/react/viewer/useSystemTheme";
import {
  INVOCATION_STATUS,
  PROGRESS_MODE,
  isRunEnded,
  type ProgressInvocation,
  type ProgressSnapshot,
  type ProgressTimestamp,
  type RunProgressStatus,
} from "@timeline/progressSnapshot";
import { progressStreamKey } from "@timeline/snapshotFreshness";
import {
  TIMELINE_STYLE,
  resolveTimelineStyle,
  resolveTimelineStyleMenu,
  type TimelineStyleId,
} from "@timeline/styles/timelineStyles";
import type { TimelinePipeRegistry } from "@timeline/styles/registryJoin";
import {
  KEPT_VISIBLE_REASON,
  TIMELINE_ENTRY_KIND,
  buildTimelineRows,
  type KeptVisibleReason,
  type TimelineBatch,
  type TimelineItemPager,
  type TimelineRow,
} from "@timeline/timelineRows";
import {
  barFollowsClock,
  formatClockTime,
  formatDuration,
  invocationBar,
  invocationTimes,
  snapshotTimes,
  timelineTicks,
  timelineWindowAt,
  type InvocationTimes,
  type SnapshotTimes,
  type TimelineBar,
  type TimelineWindow,
} from "@timeline/timelineTime";
import { useHeldSnapshot, useReadingClock } from "@timeline/react/readingClock";
import { useStreamRecord } from "@timeline/react/streamExpansion";
import { SimpleProgressView } from "@timeline/react/styles/simple/SimpleProgressView";
import { TimelineStyleMenu } from "@timeline/react/TimelineStyleMenu";

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
   * Sparse overrides of the palette, merged per key over the resolved theme's,
   * as `GraphViewer`'s `config.paletteColors`: `{ "--color-success": "#16a34a" }`.
   * The palette is set inline on the timeline's container, so this is how a host
   * changes a colour: a `--color-*` or `--surface-*` declared on the container's
   * class in a stylesheet loses to the inline value.
   */
  paletteColors?: Record<string, string>;
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
  /**
   * The style the timeline draws in: `detailed`, the default, every invocation
   * as a bar on a shared time axis; or `simple`, the run as a checklist of its
   * steps in the method's own words, a batch as one line with its counts.
   * Reactive, like `theme`: passing it drives the active style, and clearing it
   * back to `undefined` hands control to the default. The header's style menu,
   * when shown, changes it too. An id this version does not know is treated as
   * unset. This library persists nothing: the host keeps the choice, reported
   * by `onTimelineStyleChange`.
   */
  timelineStyle?: TimelineStyleId;
  /**
   * Called whenever the style changes — from the menu, or from a prop update —
   * so the host can persist it. Not called on mount.
   */
  onTimelineStyleChange?: (style: TimelineStyleId) => void;
  /**
   * Show a style menu at the end of the header. Opt-in: `true` offers every
   * registered style in registry order, a list offers those styles in that
   * order, and the default offers no menu, for a host that fixes the style for
   * its audience. A menu needs two styles to choose between.
   */
  styleMenu?: boolean | readonly TimelineStyleId[];
  /**
   * The registry of the method's pipes, keyed by `pipe_ref`, as a `GraphSpec`'s
   * `pipe_registry`: the simple style titles its lines from the pipes'
   * descriptions, names a batch's item, and lists the steps the run has not
   * reached. Without it each line is titled by its humanized pipe code. The
   * detailed style does not read it.
   */
  pipeRegistry?: TimelinePipeRegistry;
  /**
   * The `pipe_ref` of the pipe the run starts from. A snapshot taken before
   * anything started names no pipe, so with it and `pipeRegistry` the simple
   * style lists the run's steps from the start.
   */
  entryPipeRef?: string;
  /** A batch holding more items than this starts collapsed. Defaults to `DEFAULT_WIDE_BATCH_THRESHOLD`. */
  wideBatchThreshold?: number;
  /**
   * How many items one page of a batch holds in the detailed style: an expanded
   * batch with more items draws them a page at a time, and a collapsed one keeps
   * at most this many of its items in trouble in view. Defaults to
   * `DEFAULT_BATCH_PAGE_SIZE`.
   */
  batchPageSize?: number;
  /**
   * In the simple style, a parallel with more branches than this folds its
   * finished branches into one line. Defaults to `DEFAULT_WIDE_PARALLEL_THRESHOLD`.
   */
  wideParallelThreshold?: number;
  /** Appended to the container's class list. */
  className?: string;
}

/**
 * How often the reading clock ticks under each style: as often as what it draws
 * moves. The detailed style's bars grow continuously; nothing the simple style
 * draws does, so once a second is enough for its durations.
 */
const CLOCK_TICK_MS: Record<TimelineStyleId, number> = {
  [TIMELINE_STYLE.DETAILED]: 250,
  [TIMELINE_STYLE.SIMPLE]: 1_000,
};
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

const RUN_STATUS_WORD: Record<RunProgressStatus, string> = {
  pending: "Pending",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  canceled: "Canceled",
};

/**
 * A status word, or the raw value for a word this version does not know: a
 * reader keeps drawing what a later contract adds rather than failing on it.
 * An invocation's status needs no table: its words are drawn as they are.
 */
function wordFor<K extends string>(table: Record<K, string>, value: string): string {
  return Object.prototype.hasOwnProperty.call(table, value) ? table[value as K] : value;
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

function isRetried(invocation: ProgressInvocation): boolean {
  return invocation.attempts !== undefined && invocation.attempts > 1;
}

/** The row's tooltip: everything the snapshot says of the invocation, in words. */
function rowTitle(row: TimelineRow, times: InvocationTimes, bar: TimelineBar | null): string {
  const invocation = row.invocation;
  const lines = [`${invocation.pipe_ref} · ${invocation.pipe_type}`];
  let state: string = invocation.status;
  if (times.startedMs !== null) state += `, started ${formatClockTime(times.startedMs)}`;
  if (times.endedMs !== null) state += `, ended ${formatClockTime(times.endedMs)}`;
  if (bar) state += ` (${formatDuration(bar.endMs - bar.startMs)})`;
  lines.push(state.charAt(0).toUpperCase() + state.slice(1));
  if (row.outcome) {
    // Only a condition that resolved took an outcome. A branch read off its path,
    // as every branch of a dry run is, is only the branch for that outcome.
    const outcome =
      row.outcome.key === null ? "the default outcome" : `the outcome ${row.outcome.key}`;
    lines.push(row.outcome.fromResolution ? `Took ${outcome}` : `The branch for ${outcome}`);
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
  if (isRetried(invocation)) lines.push(`Tried ${invocation.attempts} times`);
  if (invocation.last_failure) {
    const at = times.failedMs;
    const { title, detail } = invocation.last_failure.problem;
    lines.push(`Last failure${at === null ? "" : ` at ${formatClockTime(at)}`}: ${title}`);
    lines.push(detail);
  }
  if (invocation.degradation) lines.push(`Not progressing: ${invocation.degradation.message}`);
  return lines.join("\n");
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

/**
 * The axis's span in milliseconds, which the timeline sets on its body: a bar's
 * place is an offset in milliseconds from the axis's start, and CSS turns it
 * into a share of the track against this span. Set by the component, not a
 * layout hook for a host.
 */
const AXIS_SPAN_VAR = "--mthds-run-timeline-axis-span";

/** A number as CSS reads it: rounded to the microsecond, so never in exponent notation. */
function cssNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

/** A stretch of the axis, in milliseconds, as a share of the track's width. */
function axisShare(ms: number): string {
  return `calc(${cssNumber(ms)} * 100% / var(${AXIS_SPAN_VAR}))`;
}

interface FailureTickProps {
  /** When the last failure happened, when that is known. */
  atMs: number | null;
  /** The bar as drawn. */
  startMs: number;
  endMs: number;
}

/** Where the invocation's last failure happened, marked on its bar. */
function FailureTick({ atMs, startMs, endMs }: FailureTickProps) {
  if (atMs === null || atMs < startMs || atMs > endMs) return null;
  const span = endMs - startMs;
  const percent = span > 0 ? ((atMs - startMs) / span) * 100 : 0;
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
  /** The invocation's moments, parsed once per snapshot. */
  times: InvocationTimes;
  /**
   * The axis the row's bar is measured against, `null` while nothing has
   * started. A row whose bar follows the clock (`barFollowsClock`) is handed the
   * live axis and the reading clock. Every other row is handed the snapshot's
   * recorded span, which starts where the live axis starts and holds still while
   * the clock ticks, and no clock, so its props, and with them its render, stay
   * as they are until the next snapshot. Either way the bar's place is an offset
   * from the axis's start, which CSS turns into a share of the track.
   */
  axis: TimelineWindow | null;
  nowMs: number | null;
  onToggleBatch: (path: string, expanded: boolean) => void;
}

const TimelineRowView = React.memo(function TimelineRowView({
  row,
  times,
  axis,
  nowMs,
  onToggleBatch,
}: TimelineRowViewProps) {
  const invocation = row.invocation;
  const status = invocation.status;
  const bar = axis ? invocationBar(invocation, axis, nowMs, times) : null;
  // The bar as drawn, kept inside the axis it is measured against.
  const drawnStartMs = bar && axis ? Math.max(bar.startMs, axis.startMs) : 0;
  const drawnEndMs =
    bar && axis ? Math.max(drawnStartMs, Math.min(bar.endMs, axis.endMs)) : drawnStartMs;
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
    <li
      className={rowClasses}
      data-path={row.path}
      data-status={status}
      title={rowTitle(row, times, bar)}
    >
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
        <span className="mthds-run-timeline-sr">{`, ${status}`}</span>
      </div>
      <div className="mthds-run-timeline-track">
        {bar && axis && (
          <span
            className={barClasses}
            style={{
              left: axisShare(drawnStartMs - axis.startMs),
              width: axisShare(drawnEndMs - drawnStartMs),
            }}
          >
            {batch && <BatchStrip batch={batch} />}
            <FailureTick atMs={times.failedMs} startMs={drawnStartMs} endMs={drawnEndMs} />
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
        {batch && batch.hiddenItemCount > 0 && (
          <span className="mthds-run-timeline-sr">{`, ${batch.hiddenItemCount} items hidden`}</span>
        )}
        <span className="mthds-run-timeline-detail">{rowDetailText(row, bar)}</span>
      </div>
    </li>
  );
});

/** A pager's React key: never a path, which keys the rows. */
const PAGER_KEY_PREFIX = "pager:";

/** How a pager words an item in trouble. */
const TROUBLE_WORD: Record<KeptVisibleReason, string> = {
  [KEPT_VISIBLE_REASON.FAILED]: "failed",
  [KEPT_VISIBLE_REASON.DEGRADED]: "stuck",
};

/** The items in trouble a collapsed batch's cap leaves out, in words: `51 more failed · 1 more stuck`. */
function troubleNotShownText(batch: TimelineBatch): string {
  return [KEPT_VISIBLE_REASON.FAILED, KEPT_VISIBLE_REASON.DEGRADED]
    .filter((reason) => batch.troubleNotShown[reason] > 0)
    .map((reason) => `${batch.troubleNotShown[reason]} more ${TROUBLE_WORD[reason]}`)
    .join(" · ");
}

interface ItemPagerViewProps {
  pager: TimelineItemPager;
  onToggleBatch: (path: string, expanded: boolean) => void;
  onTurnPage: (path: string, page: number) => void;
}

/**
 * A batch's pager, a row of the list at its items' depth. Expanded over several
 * pages, it holds Previous and Next, the range drawn, and the jump to the next
 * item in trouble when one lies off the page. Collapsed, it says how many items
 * in trouble the cap leaves out, with a button opening the batch on the page of
 * the first.
 *
 * Keyed by its batch, so a page turn keeps it and the button pressed keeps
 * focus. Previous and Next are `aria-disabled` at their ends rather than
 * disabled, so a button the reader is on stays focused when it reaches its end;
 * a button that goes away with the turn hands focus to the pager's first.
 */
const ItemPagerView = React.memo(function ItemPagerView({
  pager,
  onToggleBatch,
  onTurnPage,
}: ItemPagerViewProps) {
  const { batch, batchPath, pipeCode, depth } = pager;
  const navRef = React.useRef<HTMLElement | null>(null);
  const refocusRef = React.useRef(false);
  React.useEffect(() => {
    if (!refocusRef.current) return;
    refocusRef.current = false;
    const nav = navRef.current;
    if (nav && !nav.contains(document.activeElement)) nav.querySelector("button")?.focus();
  });
  const turn = (page: number, expand: boolean) => {
    refocusRef.current = true;
    onTurnPage(batchPath, page);
    if (expand) onToggleBatch(batchPath, true);
  };
  const page = batch.page;
  const jump = batch.nextTrouble;

  let content: React.ReactNode;
  if (batch.expanded && page) {
    const atFirst = page.index === 0;
    const atLast = page.index === page.count - 1;
    content = (
      <>
        <button
          key="previous"
          type="button"
          className="mthds-run-timeline-pager-btn"
          aria-disabled={atFirst}
          onClick={() => !atFirst && turn(page.index - 1, false)}
        >
          <span aria-hidden="true">‹ </span>Previous
        </button>
        <span key="range" className="mthds-run-timeline-pager-range" aria-live="polite">
          {`Items ${page.firstItem}–${page.lastItem} of ${page.itemCount}`}
        </span>
        <button
          key="next"
          type="button"
          className="mthds-run-timeline-pager-btn"
          aria-disabled={atLast}
          onClick={() => !atLast && turn(page.index + 1, false)}
        >
          Next<span aria-hidden="true"> ›</span>
        </button>
        {jump && (
          <button
            key="jump"
            type="button"
            className={`mthds-run-timeline-pager-btn mthds-run-timeline-pager-jump mthds-run-timeline-pager-jump--${jump.reason}`}
            onClick={() => turn(jump.page, false)}
          >
            {`Next ${TROUBLE_WORD[jump.reason]} · item ${jump.item}`}
          </button>
        )}
      </>
    );
  } else {
    content = (
      <>
        <span key="more" className="mthds-run-timeline-pager-more">
          {troubleNotShownText(batch)}
        </span>
        {jump && (
          <button
            key="expand"
            type="button"
            className={`mthds-run-timeline-pager-btn mthds-run-timeline-pager-jump mthds-run-timeline-pager-jump--${jump.reason}`}
            onClick={() => turn(jump.page, true)}
          >
            {`Expand at item ${jump.item}`}
          </button>
        )}
      </>
    );
  }

  return (
    <li
      className="mthds-run-timeline-pager"
      data-pager-for={batchPath}
      style={{ paddingLeft: `calc(${depth} * var(--mthds-run-timeline-indent))` }}
    >
      <nav
        ref={navRef}
        className="mthds-run-timeline-pager-nav"
        aria-label={`Items of ${pipeCode}`}
      >
        {content}
      </nav>
    </li>
  );
});

/**
 * A run's progress as a timeline, drawn from its progress snapshot alone: one
 * row per invocation, nested under its controller by its path and labelled with
 * its pipe code, and a bar on a shared time axis from the invocation's start to
 * its end, which grows while it runs.
 *
 * Nothing is drawn in advance: a row appears when the run reaches its
 * invocation, so there is no method graph behind it and no batch width is ever
 * guessed. A batch is one collapsible row carrying its counts and a strip of its
 * items' states; a wide one starts collapsed and keeps its failed items in view,
 * a page of them at most, and an expanded one draws its items a page at a time.
 * A condition's branch carries the outcome it took. A retried invocation shows
 * its attempts and where its last failure happened, and the invocation where
 * the run is stuck says so.
 *
 * Rows are keyed by path, so repainting with a newer snapshot keeps each drawn
 * row in place, what the reader expanded expanded, and each batch on the page
 * the reader turned it to. While the clock ticks,
 * only the axis and the rows whose bars follow the clock are drawn again.
 */
export function RunTimeline({
  snapshot,
  theme = GRAPH_THEME_MODE.SYSTEM,
  systemTheme,
  paletteColors,
  now,
  live = true,
  timelineStyle,
  onTimelineStyleChange,
  styleMenu,
  pipeRegistry,
  entryPipeRef,
  wideBatchThreshold,
  batchPageSize,
  wideParallelThreshold,
  className,
}: RunTimelineProps) {
  const held = useHeldSnapshot(snapshot);
  const streamKey = progressStreamKey(held);

  // A fixed theme is handed to the hook as if injected, so it registers no
  // `prefers-color-scheme` listener whose answer would be thrown away.
  const environmentTheme = useSystemTheme(theme === GRAPH_THEME_MODE.SYSTEM ? systemTheme : theme);
  const resolvedTheme: GraphTheme = theme === GRAPH_THEME_MODE.SYSTEM ? environmentTheme : theme;
  // The theme's palette is the base; the host's `paletteColors` win per key, as on `GraphViewer`.
  const paletteStyle = React.useMemo(
    () => ({ ...getPaletteForTheme(resolvedTheme), ...paletteColors }) as React.CSSProperties,
    [resolvedTheme, paletteColors],
  );
  const containerClassName = [
    "mthds-run-timeline",
    `mthds-run-timeline--${resolvedTheme}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // The style follows the graph viewer's controlled and reactive contract: the
  // prop's resolution is adopted whenever it changes, and the menu changes the
  // style in between. Derived during render, so a new prop never draws a frame
  // in the old style.
  const externalStyle = resolveTimelineStyle(timelineStyle);
  const [styleState, setStyleState] = React.useState({
    external: externalStyle,
    active: externalStyle,
  });
  if (styleState.external !== externalStyle) {
    setStyleState({ external: externalStyle, active: externalStyle });
  }
  const activeStyle = styleState.external === externalStyle ? styleState.active : externalStyle;
  const onTimelineStyleChangeRef = React.useRef(onTimelineStyleChange);
  onTimelineStyleChangeRef.current = onTimelineStyleChange;
  const reportedStyleRef = React.useRef(activeStyle);
  React.useEffect(() => {
    if (reportedStyleRef.current !== activeStyle) {
      reportedStyleRef.current = activeStyle;
      onTimelineStyleChangeRef.current?.(activeStyle);
    }
  }, [activeStyle]);
  const styleMenuOptions = React.useMemo(() => resolveTimelineStyleMenu(styleMenu), [styleMenu]);
  // A choice redraws the view the menu sits in, so the button the reader chose
  // from is gone: focus goes to the new one, once it is drawn.
  const menuSlotRef = React.useRef<HTMLDivElement | null>(null);
  const refocusMenuRef = React.useRef(false);
  const chooseStyle = React.useCallback((style: TimelineStyleId) => {
    refocusMenuRef.current = true;
    setStyleState((state) => ({ ...state, active: style }));
  }, []);
  React.useEffect(() => {
    if (!refocusMenuRef.current) return;
    refocusMenuRef.current = false;
    menuSlotRef.current?.querySelector("button")?.focus();
  }, [styleState]);
  const headerEnd =
    styleMenuOptions.length > 0 ? (
      <TimelineStyleMenu
        value={activeStyle}
        options={styleMenuOptions}
        onChange={chooseStyle}
        slotRef={menuSlotRef}
      />
    ) : null;

  // What every style shares lives above the switch between them, so changing
  // style never moves the clock back or forgets what the reader opened: the
  // snapshot's moments, one reading clock ticking as often as the active
  // style's drawing moves, each style's expansion, and the detailed style's pages.
  const times = React.useMemo(() => snapshotTimes(held), [held]);
  const followsClock = React.useMemo(
    () =>
      held.invocations.some((invocation) =>
        barFollowsClock(invocation, times.invocations.get(invocation.path)),
      ),
    [held, times],
  );
  const clock = useReadingClock(held, streamKey, {
    now,
    live,
    followsClock,
    tickMs: CLOCK_TICK_MS[activeStyle],
  });
  const detailedExpansion = useStreamRecord<boolean>(streamKey);
  const detailedPages = useStreamRecord<number>(streamKey);
  const simpleExpansion = useStreamRecord<boolean>(streamKey);

  // Keyed by style, so a new style fails to compile until it has a view.
  const views: Record<TimelineStyleId, () => React.ReactElement> = {
    [TIMELINE_STYLE.SIMPLE]: () => (
      <SimpleProgressView
        held={held}
        stream={streamKey}
        times={times}
        nowMs={clock.nowMs}
        ticking={clock.ticking}
        expanded={simpleExpansion.values}
        onToggle={simpleExpansion.set}
        pipeRegistry={pipeRegistry}
        entryPipeRef={entryPipeRef}
        wideParallelThreshold={wideParallelThreshold}
        containerClassName={containerClassName}
        containerStyle={paletteStyle}
        headerEnd={headerEnd}
      />
    ),
    [TIMELINE_STYLE.DETAILED]: () => (
      <DetailedTimeline
        held={held}
        times={times}
        nowMs={clock.nowMs}
        ticking={clock.ticking}
        expandedBatches={detailedExpansion.values}
        onToggleBatch={detailedExpansion.set}
        batchPages={detailedPages.values}
        onTurnPage={detailedPages.set}
        wideBatchThreshold={wideBatchThreshold}
        batchPageSize={batchPageSize}
        containerClassName={containerClassName}
        containerStyle={paletteStyle}
        headerEnd={headerEnd}
      />
    ),
  };
  return views[activeStyle]();
}

/** What `RunTimeline` hands the detailed style: the snapshot it holds, the reading clock, the reader's expansion and pages, which outlive a style switch, and its own props. */
interface DetailedTimelineProps {
  held: ProgressSnapshot;
  times: SnapshotTimes;
  /** The reading clock, and whether it ticks on its own. */
  nowMs: number | null;
  ticking: boolean;
  /** The batches the reader opened or closed, by path. */
  expandedBatches: Readonly<Record<string, boolean>>;
  onToggleBatch: (path: string, expanded: boolean) => void;
  /** The page the reader turned each batch to, by path. */
  batchPages: Readonly<Record<string, number>>;
  onTurnPage: (path: string, page: number) => void;
  wideBatchThreshold: number | undefined;
  batchPageSize: number | undefined;
  containerClassName: string;
  containerStyle: React.CSSProperties;
  /** What `RunTimeline` puts at the end of the header: the style menu, when shown. */
  headerEnd: React.ReactNode;
}

/** An entry as the detailed style draws it: a row with its moments parsed once per snapshot, or a pager. */
type DrawnEntry =
  | {
      kind: typeof TIMELINE_ENTRY_KIND.INVOCATION;
      row: TimelineRow;
      times: InvocationTimes;
      followsClock: boolean;
    }
  | TimelineItemPager;

/** The detailed style: every invocation as a row with its bar on the shared axis, and each paged batch's pager. */
function DetailedTimeline({
  held,
  times,
  nowMs,
  ticking,
  expandedBatches,
  onToggleBatch: toggleBatch,
  batchPages,
  onTurnPage: turnPage,
  wideBatchThreshold,
  batchPageSize,
  containerClassName,
  containerStyle,
  headerEnd,
}: DetailedTimelineProps) {
  const entries = React.useMemo(
    () =>
      buildTimelineRows(held, { expandedBatches, wideBatchThreshold, batchPages, batchPageSize }),
    [held, expandedBatches, wideBatchThreshold, batchPages, batchPageSize],
  );
  const drawnEntries = React.useMemo(
    () =>
      entries.map((entry): DrawnEntry => {
        if (entry.kind === TIMELINE_ENTRY_KIND.PAGER) return entry;
        const rowTimes = times.invocations.get(entry.path) ?? invocationTimes(entry.invocation);
        return {
          kind: entry.kind,
          row: entry,
          times: rowTimes,
          followsClock: barFollowsClock(entry.invocation, rowTimes),
        };
      }),
    [entries, times],
  );
  const axis = timelineWindowAt(times, nowMs);
  const [axisTrackRef, tickBudget] = useTickBudget();
  const ticks = axis ? timelineTicks(axis, tickBudget) : [];
  const bodyStyle = axis
    ? ({ [AXIS_SPAN_VAR]: cssNumber(axis.endMs - axis.startMs) } as React.CSSProperties)
    : undefined;

  const containerClasses = [containerClassName, ticking && "mthds-run-timeline--self-clocked"]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={containerClasses}
      style={containerStyle}
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
        {headerEnd}
      </header>
      {held.degradation && (
        <p className="mthds-run-timeline-degradation" role="status">
          {held.degradation.message}
        </p>
      )}
      {entries.length === 0 ? (
        // A run that ended with nothing to draw, failed or canceled before its
        // first invocation started, is waiting for nothing.
        <p className="mthds-run-timeline-empty">
          {isRunEnded(held.status) ? "No progress was recorded." : "Nothing has started yet."}
        </p>
      ) : (
        <div className="mthds-run-timeline-body" style={bodyStyle}>
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
            {drawnEntries.map((drawn) =>
              drawn.kind === TIMELINE_ENTRY_KIND.PAGER ? (
                <ItemPagerView
                  key={`${PAGER_KEY_PREFIX}${drawn.batchPath}`}
                  pager={drawn}
                  onToggleBatch={toggleBatch}
                  onTurnPage={turnPage}
                />
              ) : (
                <TimelineRowView
                  key={drawn.row.path}
                  row={drawn.row}
                  times={drawn.times}
                  axis={drawn.followsClock ? axis : times.recorded}
                  nowMs={drawn.followsClock ? nowMs : null}
                  onToggleBatch={toggleBatch}
                />
              ),
            )}
          </ol>
        </div>
      )}
    </section>
  );
}
