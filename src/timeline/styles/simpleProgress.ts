/**
 * The simple timeline style's projection: a progress snapshot, joined to the
 * method's pipe registry, as a checklist of lines in the method's own words.
 *
 * Pure and language-free. A line carries its kind, its state, its title as the
 * author wrote it, its counts, its outcome and its health as data, never a
 * sentence: the React view words them through its strings table, and a host can
 * read the same lines to word progress elsewhere. It keys nothing on time, so
 * the view keeps every line it drew in place across snapshots and only the
 * durations move with the clock.
 */
import type { Problem } from "mthds/errors";
import type { PipeBlueprintUnion, PipeSequenceBlueprint } from "@graph/types";
import { humanizeInSentence } from "@graph/styles/humanize";
import {
  DEGRADATION_REASON,
  INVOCATION_STATUS,
  RUN_PROGRESS_STATUS,
  isRunEnded,
  type BatchProgress,
  type InvocationStatus,
  type ProgressDegradation,
  type ProgressInvocation,
  type ProgressMode,
  type ProgressSnapshot,
  type RunProgressStatus,
} from "../progressSnapshot";
import { PATH_SEGMENT_KIND, invocationPathDepth } from "../invocationPath";
import {
  buildInvocationTree,
  compareSiblings,
  isItemNode,
  isOutcomeNode,
  type InvocationTreeNode,
} from "../invocationTree";
import {
  joinBatch,
  joinedSequence,
  pipeOf,
  sequenceMatches,
  sequenceOf,
  stepNumberOf,
  stepsAfter,
  titleOf,
  type NumberedStep,
  type TimelinePipeRegistry,
} from "./registryJoin";

/** What a line stands for. */
export const SIMPLE_LINE_KIND = {
  /** An operator: one piece of work. */
  STEP: "step",
  /** A sequence, or a pipe of a type the style does not know that holds work of its own. */
  GROUP: "group",
  /** A parallel: work done at the same time. */
  TOGETHER: "together",
  /** A condition, followed by the outcome it took. */
  DECISION: "decision",
  /** A batch: one line for all its items, titled by its branch, with their counts. */
  FOR_EACH: "forEach",
  /** In an expanded batch, one step of its branch, its states counted across the items. */
  BRANCH_STEP: "branchStep",
  /** In a wide parallel, its finished branches folded into one line. */
  FINISHED: "finished",
  /** Past the indentation cap, the deepest work going on beneath a line. */
  NOW: "now",
} as const;

export type SimpleLineKind = (typeof SIMPLE_LINE_KIND)[keyof typeof SIMPLE_LINE_KIND];

/** Where a line's work stands. */
export const SIMPLE_LINE_STATE = {
  /** Not started: a step the method declares that the run has not reached, or a scheduled item. */
  UPCOMING: "upcoming",
  RUNNING: "running",
  DONE: "done",
  FAILED: "failed",
  /** Skipped: a successful end with no output of its own. */
  SKIPPED: "skipped",
  /** Canceled: it had not ended when the run ended. */
  STOPPED: "stopped",
} as const;

export type SimpleLineState = (typeof SIMPLE_LINE_STATE)[keyof typeof SIMPLE_LINE_STATE];

/** Why the run itself carries a note under the headline. */
export const SIMPLE_RUN_NOTE_REASON = {
  /** The run status could not be read, so the progress may be out of date. */
  UNREACHABLE: "unreachable",
  /** The run is not making progress, at no invocation a line stands for. */
  STUCK: "stuck",
  /** A reason the style does not know: the degradation's own message tells it. */
  OTHER: "other",
} as const;

export type SimpleRunNoteReason =
  (typeof SIMPLE_RUN_NOTE_REASON)[keyof typeof SIMPLE_RUN_NOTE_REASON];

/** A parallel with more branches than this folds its finished branches into one line. */
export const DEFAULT_WIDE_PARALLEL_THRESHOLD = 5;

/**
 * The deepest a line is drawn at, the top being 0. A group at this depth draws
 * no line for its children: the deepest work going on beneath it is one "now"
 * line instead, so a method nested five levels deep still reads as a short list.
 */
export const SIMPLE_MAX_DEPTH = 2;

/** On a decision, the outcome it took; on a branch of a condition that resolved none, the outcome it stands for. */
export interface SimpleOutcome {
  /** The outcome map's key, decoded; `null` for the default outcome. */
  key: string | null;
  /** True when it is the condition's `selected_outcome`, false when read off the branch's path. */
  resolved: boolean;
}

/** On a branch step of an expanded batch, how many items stand at each state of it. */
export interface SimpleItemTally {
  done: number;
  running: number;
  failed: number;
  skipped: number;
  stopped: number;
}

/**
 * What a line says of its health, from its own invocation and from the work it
 * stands for that no line of its own shows: inside a folded group, a batch's
 * items, or the steps past the indentation cap.
 */
export interface SimpleLineHealth {
  /**
   * The work is being tried again: the attempt it is on, the highest among the
   * hidden work it stands for. Never set once the work has ended: a recovered
   * invocation reads as done and nothing more.
   */
  retryAttempt: number | null;
  /**
   * On a line that counts items, a for-each line or a branch step, how many
   * items are being tried again there, the item itself or anything beneath it.
   * Such a line has no `retryAttempt`: each item has its own.
   */
  retryingItems: number;
  /** The run is stuck here, or in the hidden work this line stands for. */
  degradation: ProgressDegradation | null;
  /** On a line that counts items, how many items hold an invocation there where the run is stuck. */
  stuckItems: number;
  /**
   * On a failed line no drawn line beneath shows the failure of: the problem
   * that ended the deepest failed invocation it stands for, when the snapshot
   * carries one.
   */
  problem: Problem | null;
}

/** One line of the checklist. */
export interface SimpleProgressLine {
  /**
   * Stable across snapshots: the invocation's path, or for an upcoming line the
   * path its step will have, so a line keeps its place when its step starts.
   * A branch step's key is the batch's path, then a `*` segment standing for
   * every item, then the step's segment; a folded line's is the path it folds
   * beneath followed by `#finished` or `#now`.
   */
  key: string;
  kind: SimpleLineKind;
  state: SimpleLineState;
  /** The pipe's description as a title, or its humanized code when the registry has none. */
  title: string;
  titleFromDescription: boolean;
  /** On a for-each line, the item's name in a sentence (`filing`), `null` when the registry does not name it. */
  forEachItem: string | null;
  outcome: SimpleOutcome | null;
  /**
   * On a for-each line, the snapshot's counts, `null` before it fans out; on a
   * branch step that is itself a batch, its items' counts summed across the
   * outer items.
   */
  counts: BatchProgress | null;
  /** On a branch step, how many items stand at each of its states. */
  tally: SimpleItemTally | null;
  /** On a finished line, how many branches it folds. */
  foldedCount: number | null;
  health: SimpleLineHealth | null;
  /** The invocation it stands for; `null` on an upcoming, branch-step or finished line. */
  invocation: ProgressInvocation | null;
  /** True when the reader can open or close it. */
  expandable: boolean;
  /** True when its children are drawn. */
  expanded: boolean;
  children: SimpleProgressLine[];
}

/** The run's own degradation, when no line carries it. */
export interface SimpleRunNote {
  reason: SimpleRunNoteReason;
  degradation: ProgressDegradation;
}

/** Where a failed run failed. */
export interface SimpleRunFailure {
  /** The top-level line holding the deepest failure, `null` when the entry pipe itself failed with nothing beneath it failing. */
  lineKey: string | null;
  /** The problem that ended the deepest failed invocation carrying one. */
  problem: Problem | null;
  /** True when a drawn line shows that problem, so the headline need not. */
  shownOnLine: boolean;
}

/** A snapshot as the simple style draws it. */
export interface SimpleProgress {
  status: RunProgressStatus;
  mode: ProgressMode;
  /** Set when the run failed. */
  failure: SimpleRunFailure | null;
  runNote: SimpleRunNote | null;
  /** The checklist's top-level lines. */
  lines: SimpleProgressLine[];
}

export interface SimpleProgressOptions {
  /**
   * The method's pipes, keyed by `pipe_ref`, of the version that ran. Without
   * it every line is titled by its humanized pipe code and no upcoming line is
   * drawn.
   */
  pipeRegistry?: TimelinePipeRegistry;
  /**
   * The `pipe_ref` of the run's entry pipe. A snapshot names it once the entry
   * pipe starts; before that, it is what lets a pending run list the steps it
   * will take.
   */
  entryPipeRef?: string;
  /** The lines the reader opened (`true`) or closed (`false`), by key. A line absent from it takes its default. */
  expanded?: Readonly<Record<string, boolean>>;
  /** A parallel with more branches than this folds its finished ones. Defaults to `DEFAULT_WIDE_PARALLEL_THRESHOLD`. */
  wideParallelThreshold?: number;
}

const STATE_OF_STATUS: Record<InvocationStatus, SimpleLineState> = {
  scheduled: SIMPLE_LINE_STATE.UPCOMING,
  running: SIMPLE_LINE_STATE.RUNNING,
  succeeded: SIMPLE_LINE_STATE.DONE,
  failed: SIMPLE_LINE_STATE.FAILED,
  skipped: SIMPLE_LINE_STATE.SKIPPED,
  canceled: SIMPLE_LINE_STATE.STOPPED,
};

/**
 * A line's state from its invocation's status. A status this version does not
 * know is read from the invocation's moments rather than refused: ended, going
 * on, or not started.
 */
function stateOf(invocation: ProgressInvocation): SimpleLineState {
  if (Object.hasOwn(STATE_OF_STATUS, invocation.status)) {
    return STATE_OF_STATUS[invocation.status];
  }
  if (invocation.ended_at) return SIMPLE_LINE_STATE.DONE;
  return invocation.started_at ? SIMPLE_LINE_STATE.RUNNING : SIMPLE_LINE_STATE.UPCOMING;
}

/** Whether a line's work is going on or in trouble, which keeps its children drawn. */
function isActiveState(state: SimpleLineState): boolean {
  return state === SIMPLE_LINE_STATE.RUNNING || state === SIMPLE_LINE_STATE.FAILED;
}

function isBatchNode(node: InvocationTreeNode): boolean {
  return (
    node.invocation.pipe_type === "PipeBatch" ||
    node.invocation.batch !== undefined ||
    node.children.some(isItemNode)
  );
}

function kindOfNode(node: InvocationTreeNode): SimpleLineKind {
  if (isBatchNode(node)) return SIMPLE_LINE_KIND.FOR_EACH;
  switch (node.invocation.pipe_type) {
    case "PipeSequence":
      return SIMPLE_LINE_KIND.GROUP;
    case "PipeParallel":
      return SIMPLE_LINE_KIND.TOGETHER;
    case "PipeCondition":
      return SIMPLE_LINE_KIND.DECISION;
    default:
      return node.children.length > 0 ? SIMPLE_LINE_KIND.GROUP : SIMPLE_LINE_KIND.STEP;
  }
}

/** The kind of the line for a step the run has not reached, from the pipe the method declares there. */
function kindOfPipe(pipe: PipeBlueprintUnion | null, batching: boolean): SimpleLineKind {
  if (batching || pipe?.type === "PipeBatch") return SIMPLE_LINE_KIND.FOR_EACH;
  switch (pipe?.type) {
    case "PipeSequence":
      return SIMPLE_LINE_KIND.GROUP;
    case "PipeParallel":
      return SIMPLE_LINE_KIND.TOGETHER;
    case "PipeCondition":
      return SIMPLE_LINE_KIND.DECISION;
    default:
      return SIMPLE_LINE_KIND.STEP;
  }
}

function isRetrying(invocation: ProgressInvocation): boolean {
  return (
    invocation.status === INVOCATION_STATUS.RUNNING &&
    invocation.attempts !== undefined &&
    invocation.attempts > 1
  );
}

// ─── What hidden work says of its health ─────────────────────────────────────

interface HiddenHealth {
  retryAttempt: number | null;
  degradation: ProgressDegradation | null;
  /** The deepest failed invocation carrying a problem, with its depth. */
  failure: { depth: number; problem: Problem } | null;
}

function emptyHidden(): HiddenHealth {
  return { retryAttempt: null, degradation: null, failure: null };
}

/** Adds one invocation's own annotations to what is gathered. */
function gather(into: HiddenHealth, invocation: ProgressInvocation): void {
  if (isRetrying(invocation)) {
    into.retryAttempt = Math.max(into.retryAttempt ?? 0, invocation.attempts ?? 0);
  }
  if (invocation.degradation && !into.degradation) into.degradation = invocation.degradation;
  const problem = invocation.last_failure?.problem;
  if (invocation.status === INVOCATION_STATUS.FAILED && problem) {
    const depth = invocationPathDepth(invocation.path);
    if (!into.failure || depth > into.failure.depth) into.failure = { depth, problem };
  }
}

/** The annotations of every invocation beneath a node, those of `skip`'s subtree left out. */
function gatherBeneath(
  node: InvocationTreeNode,
  skip: InvocationTreeNode | null = null,
  into: HiddenHealth = emptyHidden(),
): HiddenHealth {
  for (const child of node.children) {
    if (child === skip) continue;
    gather(into, child.invocation);
    gatherBeneath(child, skip, into);
  }
  return into;
}

function hasHealth(health: SimpleLineHealth): boolean {
  return (
    health.retryAttempt !== null ||
    health.retryingItems > 0 ||
    health.degradation !== null ||
    health.stuckItems > 0 ||
    health.problem !== null
  );
}

/**
 * A line's health: its own invocation's annotations, then what the hidden work
 * it stands for says. A retry shows only while the line runs, and a problem only
 * on a failed line, and only when `showProblem` says no drawn line beneath
 * shows the failure itself.
 */
function healthOf(
  state: SimpleLineState,
  own: ProgressInvocation | null,
  hidden: HiddenHealth | null,
  showProblem: boolean,
  items: { retrying: number; stuck: number } = { retrying: 0, stuck: 0 },
): SimpleLineHealth | null {
  const running = state === SIMPLE_LINE_STATE.RUNNING;
  let retryAttempt: number | null = null;
  if (running) {
    if (own && isRetrying(own)) retryAttempt = own.attempts ?? null;
    else if (hidden?.retryAttempt) retryAttempt = hidden.retryAttempt;
  }
  let problem: Problem | null = null;
  if (state === SIMPLE_LINE_STATE.FAILED && showProblem) {
    problem = hidden?.failure?.problem ?? own?.last_failure?.problem ?? null;
  }
  const health: SimpleLineHealth = {
    retryAttempt,
    retryingItems: running ? items.retrying : 0,
    degradation: own?.degradation ?? hidden?.degradation ?? null,
    stuckItems: items.stuck,
    problem,
  };
  return hasHealth(health) ? health : null;
}

// ─── The projection ──────────────────────────────────────────────────────────

interface Context {
  registry: TimelinePipeRegistry | undefined;
  expanded: Readonly<Record<string, boolean>>;
  wideParallelThreshold: number;
}

function blankLine(
  key: string,
  kind: SimpleLineKind,
  state: SimpleLineState,
  title: { title: string; fromDescription: boolean },
): SimpleProgressLine {
  return {
    key,
    kind,
    state,
    title: title.title,
    titleFromDescription: title.fromDescription,
    forEachItem: null,
    outcome: null,
    counts: null,
    tally: null,
    foldedCount: null,
    health: null,
    invocation: null,
    expandable: false,
    expanded: false,
    children: [],
  };
}

/** The line for a step of a running sequence that the run has not reached yet. */
function upcomingLine(ctx: Context, sequencePath: string, step: NumberedStep): SimpleProgressLine {
  const pipe = pipeOf(ctx.registry, step.pipeRef);
  const batching = Boolean(step.spec.batch_params);
  const line = blankLine(
    `${sequencePath}/step_${step.number}`,
    kindOfPipe(pipe, batching),
    SIMPLE_LINE_STATE.UPCOMING,
    titleOf(ctx.registry, step.pipeRef),
  );
  const itemName = step.spec.batch_params?.input_item_stuff_name;
  if (batching && itemName) line.forEachItem = humanizeInSentence(itemName);
  return line;
}

/** The outcome a branch of a condition stands for, when its condition's line does not already say it. */
function branchOutcome(
  node: InvocationTreeNode,
  parent: InvocationTreeNode | null,
): SimpleOutcome | null {
  if (!isOutcomeNode(node)) return null;
  // A resolved condition ran one outcome group, and its own line says which.
  // Several groups under a resolution contradict that; each keeps its path's name.
  if (parent?.invocation.condition && parent.children.filter(isOutcomeNode).length === 1) {
    return null;
  }
  const segment = node.segment;
  return {
    key: segment?.kind === PATH_SEGMENT_KIND.OUTCOME ? segment.key : null,
    resolved: false,
  };
}

/** The deepest invocation beneath a node in a state, the first in snapshot order among the deepest. */
function deepestBeneath(
  node: InvocationTreeNode,
  state: SimpleLineState,
): InvocationTreeNode | null {
  let found: InvocationTreeNode | null = null;
  let foundDepth = -1;
  const visit = (current: InvocationTreeNode) => {
    for (const child of current.children) {
      if (stateOf(child.invocation) === state) {
        const depth = invocationPathDepth(child.invocation.path);
        if (depth > foundDepth || (depth === foundDepth && found && child.order < found.order)) {
          found = child;
          foundDepth = depth;
        }
      }
      visit(child);
    }
  };
  visit(node);
  return found;
}

/** Past the indentation cap: the one line naming the deepest work going on, or failed, beneath a group. */
function nowLine(
  ctx: Context,
  node: InvocationTreeNode,
): {
  line: SimpleProgressLine;
  target: InvocationTreeNode;
} | null {
  // Under a failed group, work still going on beside the failure is about to
  // be canceled, so the failure is what the line names.
  const [first, second] =
    stateOf(node.invocation) === SIMPLE_LINE_STATE.FAILED
      ? [SIMPLE_LINE_STATE.FAILED, SIMPLE_LINE_STATE.RUNNING]
      : [SIMPLE_LINE_STATE.RUNNING, SIMPLE_LINE_STATE.FAILED];
  const target = deepestBeneath(node, first) ?? deepestBeneath(node, second);
  if (!target) return null;
  const invocation = target.invocation;
  const state = stateOf(invocation);
  const line = blankLine(
    `${node.invocation.path}#now`,
    SIMPLE_LINE_KIND.NOW,
    state,
    titleOf(ctx.registry, invocation.pipe_ref, invocation.pipe_code),
  );
  line.invocation = invocation;
  line.health = healthOf(state, invocation, gatherBeneath(target), true);
  return { line, target };
}

function emptyTally(): SimpleItemTally {
  return { done: 0, running: 0, failed: 0, skipped: 0, stopped: 0 };
}

function addToTally(tally: SimpleItemTally, state: SimpleLineState): void {
  if (state === SIMPLE_LINE_STATE.DONE) tally.done += 1;
  else if (state === SIMPLE_LINE_STATE.RUNNING) tally.running += 1;
  else if (state === SIMPLE_LINE_STATE.FAILED) tally.failed += 1;
  else if (state === SIMPLE_LINE_STATE.SKIPPED) tally.skipped += 1;
  else if (state === SIMPLE_LINE_STATE.STOPPED) tally.stopped += 1;
}

function sumCounts(invocations: ProgressInvocation[]): BatchProgress | null {
  const batches = invocations.map((each) => each.batch).filter((each) => each !== undefined);
  if (batches.length === 0) return null;
  return batches.reduce(
    (sum, each) => ({
      total: sum.total + each.total,
      done: sum.done + each.done,
      running: sum.running + each.running,
      failed: sum.failed + each.failed,
    }),
    { total: 0, done: 0, running: 0, failed: 0 },
  );
}

/**
 * The steps of an expanded batch's branch, each counted across the items: one
 * line per step its items reached, ordered by number, then, while the batch
 * runs and the registry declares its branch as a sequence, one per step no item
 * has reached yet. Never a line per item.
 */
function branchStepLines(
  ctx: Context,
  batchNode: InvocationTreeNode,
  branchRef: string | null,
  batchState: SimpleLineState,
): SimpleProgressLine[] {
  const items = batchNode.children.filter(isItemNode);
  // An item skipped whole never reaches its branch's steps, so a step is done
  // once every other item has passed it.
  const skippedItems = items.filter(
    (item) => stateOf(item.invocation) === SIMPLE_LINE_STATE.SKIPPED,
  ).length;
  const expected = (batchNode.invocation.batch?.total ?? items.length) - skippedItems;
  // A branch that is a condition runs each outcome's group only for the items
  // that took it, so a group expects those items, and the ones that may still
  // take it: the items going on, or not started, that have not decided yet.
  const undecided = items.filter((item) => {
    const itemState = stateOf(item.invocation);
    return (
      (itemState === SIMPLE_LINE_STATE.RUNNING || itemState === SIMPLE_LINE_STATE.UPCOMING) &&
      !item.children.some(isOutcomeNode)
    );
  }).length;
  const bySegment = new Map<string, InvocationTreeNode[]>();
  for (const item of items) {
    for (const child of item.children) {
      const raw = child.segment?.raw ?? child.invocation.path;
      const group = bySegment.get(raw);
      if (group) group.push(child);
      else bySegment.set(raw, [child]);
    }
  }
  const groups = [...bySegment.values()].sort((a, b) => compareSiblings(a[0], b[0]));

  const lines = groups.map((group) => {
    const first = group[0].invocation;
    const tally = emptyTally();
    const hidden = emptyHidden();
    let retrying = 0;
    let stuck = 0;
    for (const node of group) {
      addToTally(tally, stateOf(node.invocation));
      gather(hidden, node.invocation);
      gatherBeneath(node, null, hidden);
      if (holds(node, isRetrying)) retrying += 1;
      if (holds(node, (each) => each.degradation !== undefined)) stuck += 1;
    }
    const groupExpected = isOutcomeNode(group[0]) ? group.length + undecided : expected;
    let state: SimpleLineState;
    if (tally.running > 0) state = SIMPLE_LINE_STATE.RUNNING;
    else if (tally.failed > 0) state = SIMPLE_LINE_STATE.FAILED;
    else if (tally.done + tally.skipped >= groupExpected) state = SIMPLE_LINE_STATE.DONE;
    else if (batchState === SIMPLE_LINE_STATE.RUNNING) state = SIMPLE_LINE_STATE.RUNNING;
    else state = SIMPLE_LINE_STATE.STOPPED;
    const line = blankLine(
      `${batchNode.invocation.path}/*/${group[0].segment?.raw ?? first.pipe_code}`,
      SIMPLE_LINE_KIND.BRANCH_STEP,
      state,
      titleOf(ctx.registry, first.pipe_ref, first.pipe_code),
    );
    line.tally = tally;
    line.counts = sumCounts(group.map((node) => node.invocation));
    // Counted across the items rather than given an attempt: each item has its own.
    line.health = healthOf(state, null, { ...hidden, retryAttempt: null }, true, {
      retrying,
      stuck,
    });
    return line;
  });

  const branch = branchRef ? sequenceOf(ctx.registry, branchRef) : null;
  if (
    branch &&
    batchState === SIMPLE_LINE_STATE.RUNNING &&
    items.every((item) => sequenceMatches(branch, item))
  ) {
    let reached = 0;
    for (const item of items) {
      for (const child of item.children) reached = Math.max(reached, stepNumberOf(child) ?? 0);
    }
    for (const step of stepsAfter(branch, reached)) {
      const line = upcomingLine(ctx, `${batchNode.invocation.path}/*`, step);
      line.kind = SIMPLE_LINE_KIND.BRANCH_STEP;
      line.tally = emptyTally();
      lines.push(line);
    }
  }
  return lines;
}

/** Whether a node holds, itself or beneath it, an invocation passing `test`. */
function holds(
  node: InvocationTreeNode,
  test: (invocation: ProgressInvocation) => boolean,
): boolean {
  return test(node.invocation) || node.children.some((child) => holds(child, test));
}

/** A batch's one line: titled by its branch, with its counts, and its items' trouble as notes. */
function forEachLine(
  ctx: Context,
  node: InvocationTreeNode,
  depth: number,
  parentSequence: PipeSequenceBlueprint | null,
): SimpleProgressLine {
  const invocation = node.invocation;
  const state = stateOf(invocation);
  const joined = joinBatch(ctx.registry, node, parentSequence);
  const line = blankLine(invocation.path, SIMPLE_LINE_KIND.FOR_EACH, state, joined.title);
  line.invocation = invocation;
  line.forEachItem = joined.itemName;
  line.counts = invocation.batch ?? null;

  const items = node.children.filter(isItemNode);
  const branch = joined.branchRef ? pipeOf(ctx.registry, joined.branchRef) : null;
  const branchHasSteps =
    items.some((item) => item.children.length > 0) ||
    branch?.type === "PipeSequence" ||
    branch?.type === "PipeParallel" ||
    branch?.type === "PipeCondition";
  line.expandable = depth < SIMPLE_MAX_DEPTH && branchHasSteps;
  line.expanded = line.expandable && (ctx.expanded[line.key] ?? false);
  if (line.expanded) line.children = branchStepLines(ctx, node, joined.branchRef, state);

  // The items' retries are counted rather than given an attempt: each item has its own.
  const hidden = { ...gatherBeneath(node), retryAttempt: null };
  const stuck = items.filter((item) => holds(item, (each) => each.degradation !== undefined));
  const retrying = items.filter((item) => holds(item, isRetrying));
  const failureShownBeneath = line.children.some(
    (child) => child.state === SIMPLE_LINE_STATE.FAILED,
  );
  line.health = healthOf(state, invocation, hidden, !failureShownBeneath, {
    retrying: retrying.length,
    stuck: stuck.length,
  });
  return line;
}

/** The lines for a node's children, and for a running sequence its upcoming steps. */
function childLines(
  ctx: Context,
  node: InvocationTreeNode,
  depth: number,
  state: SimpleLineState,
): SimpleProgressLine[] {
  const sequence =
    node.invocation.pipe_type === "PipeSequence" ? joinedSequence(ctx.registry, node) : null;
  let lines = node.children.map((child) => lineOf(ctx, child, node, depth, sequence));
  if (sequence && state === SIMPLE_LINE_STATE.RUNNING) {
    const reached = Math.max(0, ...node.children.map((child) => stepNumberOf(child) ?? 0));
    for (const step of stepsAfter(sequence, reached)) {
      lines.push(upcomingLine(ctx, node.invocation.path, step));
    }
  }
  if (
    node.invocation.pipe_type === "PipeParallel" &&
    Math.max(node.children.length, node.invocation.branch_count ?? 0) > ctx.wideParallelThreshold
  ) {
    lines = foldFinished(node, lines);
  }
  return lines;
}

/** In a wide parallel, its finished branches folded into one line where the first of them stood. */
function foldFinished(node: InvocationTreeNode, lines: SimpleProgressLine[]): SimpleProgressLine[] {
  const finished = lines.filter((line) => line.state === SIMPLE_LINE_STATE.DONE);
  if (finished.length < 2) return lines;
  const folded = blankLine(
    `${node.invocation.path}#finished`,
    SIMPLE_LINE_KIND.FINISHED,
    SIMPLE_LINE_STATE.DONE,
    {
      title: "",
      fromDescription: false,
    },
  );
  folded.foldedCount = finished.length;
  const kept: SimpleProgressLine[] = [];
  for (const line of lines) {
    if (line.state !== SIMPLE_LINE_STATE.DONE) kept.push(line);
    else if (line === finished[0]) kept.push(folded);
  }
  return kept;
}

/** One invocation's line, with what it draws beneath it. */
function lineOf(
  ctx: Context,
  node: InvocationTreeNode,
  parent: InvocationTreeNode | null,
  depth: number,
  parentSequence: PipeSequenceBlueprint | null,
): SimpleProgressLine {
  const kind = kindOfNode(node);
  if (kind === SIMPLE_LINE_KIND.FOR_EACH) {
    const line = forEachLine(ctx, node, depth, parentSequence);
    line.outcome = branchOutcome(node, parent);
    return line;
  }
  const invocation = node.invocation;
  const state = stateOf(invocation);
  const line = blankLine(
    invocation.path,
    kind,
    state,
    titleOf(ctx.registry, invocation.pipe_ref, invocation.pipe_code),
  );
  line.invocation = invocation;
  line.outcome =
    kind === SIMPLE_LINE_KIND.DECISION && invocation.condition
      ? { key: invocation.condition.selected_outcome, resolved: true }
      : branchOutcome(node, parent);

  if (kind === SIMPLE_LINE_KIND.STEP) {
    line.health = healthOf(state, invocation, gatherBeneath(node), true);
    return line;
  }

  if (depth >= SIMPLE_MAX_DEPTH) {
    // Past the cap, the work beneath is one line naming the deepest of it going on.
    const now = isActiveState(state) ? nowLine(ctx, node) : null;
    line.expandable = now !== null;
    line.expanded = now !== null && (ctx.expanded[line.key] ?? true);
    const shown = line.expanded ? now : null;
    if (shown) line.children = [shown.line];
    const problemShownBeneath = Boolean(shown?.line.health?.problem);
    line.health = healthOf(
      state,
      invocation,
      gatherBeneath(node, shown?.target ?? null),
      !problemShownBeneath,
    );
    return line;
  }

  const children = childLines(ctx, node, depth + 1, state);
  line.expandable = children.length > 0;
  line.expanded = line.expandable && (ctx.expanded[line.key] ?? isActiveState(state));
  if (line.expanded) {
    line.children = children;
    const failureShownBeneath = children.some((child) => child.state === SIMPLE_LINE_STATE.FAILED);
    line.health = healthOf(state, invocation, null, !failureShownBeneath);
  } else {
    line.health = healthOf(state, invocation, gatherBeneath(node), true);
  }
  return line;
}

/** Before the entry pipe starts: the steps it will take, from the registry. */
function previewLines(ctx: Context, entryPipeRef: string): SimpleProgressLine[] {
  const sequence = sequenceOf(ctx.registry, entryPipeRef);
  if (sequence) {
    return stepsAfter(sequence, 0).map((step) => upcomingLine(ctx, entryPipeRef, step));
  }
  const pipe = pipeOf(ctx.registry, entryPipeRef);
  if (!pipe) return [];
  return [
    blankLine(
      entryPipeRef,
      kindOfPipe(pipe, false),
      SIMPLE_LINE_STATE.UPCOMING,
      titleOf(ctx.registry, entryPipeRef),
    ),
  ];
}

function walkLines(lines: SimpleProgressLine[], visit: (line: SimpleProgressLine) => void): void {
  for (const line of lines) {
    visit(line);
    walkLines(line.children, visit);
  }
}

/** Where a failed run failed: the deepest failed invocation, and the top-level line holding it. */
function failureOf(
  snapshot: ProgressSnapshot,
  lines: SimpleProgressLine[],
): SimpleRunFailure | null {
  if (snapshot.status !== RUN_PROGRESS_STATUS.FAILED) return null;
  let deepest: ProgressInvocation | null = null;
  let withProblem: ProgressInvocation | null = null;
  for (const invocation of snapshot.invocations) {
    if (invocation.status !== INVOCATION_STATUS.FAILED) continue;
    const depth = invocationPathDepth(invocation.path);
    if (!deepest || depth > invocationPathDepth(deepest.path)) deepest = invocation;
    if (
      invocation.last_failure?.problem &&
      (!withProblem || depth > invocationPathDepth(withProblem.path))
    ) {
      withProblem = invocation;
    }
  }
  const path = deepest?.path ?? null;
  const top =
    path === null
      ? undefined
      : lines.find(
          (line) => line.invocation && (path === line.key || path.startsWith(`${line.key}/`)),
        );
  const problem = withProblem?.last_failure?.problem ?? null;
  let shownOnLine = false;
  walkLines(lines, (line) => {
    if (problem && line.health?.problem === problem) shownOnLine = true;
  });
  return { lineKey: top?.key ?? null, problem, shownOnLine };
}

/** The run's own degradation, when the run reads degraded and no line carries the assessment. */
function runNoteOf(snapshot: ProgressSnapshot, lines: SimpleProgressLine[]): SimpleRunNote | null {
  const degradation = snapshot.degradation;
  if (!degradation) return null;
  if (degradation.reason === DEGRADATION_REASON.STATUS_UNAVAILABLE) {
    return { reason: SIMPLE_RUN_NOTE_REASON.UNREACHABLE, degradation };
  }
  if (degradation.reason === DEGRADATION_REASON.WORKFLOW_TASK_FAILING) {
    let carried = false;
    walkLines(lines, (line) => {
      if (line.health?.degradation) carried = true;
    });
    return carried ? null : { reason: SIMPLE_RUN_NOTE_REASON.STUCK, degradation };
  }
  return { reason: SIMPLE_RUN_NOTE_REASON.OTHER, degradation };
}

/**
 * The checklist the simple style draws for a snapshot.
 *
 * When the entry pipe is a sequence it has no line of its own: its steps are
 * the top-level lines, followed while it runs by the steps the registry
 * declares that the run has not reached. Any other entry pipe is a top-level
 * line itself. A batch is one line, never a line per item. A group's children
 * are drawn while its work is going on or has failed, and folded once it has
 * ended, unless `expanded` says otherwise; past `SIMPLE_MAX_DEPTH` the work
 * beneath a group is one "now" line. A wide parallel folds its finished
 * branches into one line. Annotations of work no line shows are shown on the
 * nearest drawn line.
 *
 * Pure, and a function of its arguments alone.
 */
export function buildSimpleProgress(
  snapshot: ProgressSnapshot,
  options: SimpleProgressOptions = {},
): SimpleProgress {
  const ctx: Context = {
    registry: options.pipeRegistry,
    expanded: options.expanded ?? {},
    wideParallelThreshold: options.wideParallelThreshold ?? DEFAULT_WIDE_PARALLEL_THRESHOLD,
  };
  const roots = buildInvocationTree(snapshot);
  let lines: SimpleProgressLine[];
  if (roots.length === 0) {
    lines =
      options.entryPipeRef && !isRunEnded(snapshot.status)
        ? previewLines(ctx, options.entryPipeRef)
        : [];
  } else if (roots.length === 1 && roots[0].invocation.pipe_type === "PipeSequence") {
    const root = roots[0];
    lines = childLines(ctx, root, 0, stateOf(root.invocation));
  } else {
    lines = roots.map((root) => lineOf(ctx, root, null, 0, null));
  }
  return {
    status: snapshot.status,
    mode: snapshot.mode,
    failure: failureOf(snapshot, lines),
    runNote: runNoteOf(snapshot, lines),
    lines,
  };
}
