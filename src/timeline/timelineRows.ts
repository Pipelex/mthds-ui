import {
  INVOCATION_STATUS,
  type BatchProgress,
  type InvocationStatus,
  type ProgressInvocation,
  type ProgressSnapshot,
} from "./progressSnapshot";
import {
  PATH_SEGMENT_KIND,
  isOrdinalSegment,
  parentInvocationPath,
  type PathSegment,
} from "./invocationPath";
import {
  buildInvocationTree,
  isItemNode,
  isOutcomeNode,
  type InvocationTreeNode,
} from "./invocationTree";

/**
 * A batch holding more items than this starts collapsed into its one row. A
 * timeline row is one line, so the bar is set higher than the graph's own
 * auto-fold, which folds a controller drawn as a block of cards.
 */
export const DEFAULT_WIDE_BATCH_THRESHOLD = 10;

export interface TimelineRowsOptions {
  /**
   * The batches a reader expanded (`true`) or collapsed (`false`), by path. A
   * batch absent from it takes the default: collapsed when wide, else expanded.
   */
  expandedBatches?: Readonly<Record<string, boolean>>;
  /** A batch with more items than this is wide. Defaults to `DEFAULT_WIDE_BATCH_THRESHOLD`. */
  wideBatchThreshold?: number;
}

/** A run of consecutive items sharing one status, in item order: one cell of a batch's strip. */
export interface TimelineStripSegment {
  status: InvocationStatus;
  /** The number of the first item of the run, from 1. */
  firstItem: number;
  /** How many items the run holds. */
  count: number;
}

/** What a batch's one row shows of its items. */
export interface TimelineBatch {
  /** The snapshot's own counts, `null` when it carries none (a batch that has not fanned out). */
  counts: BatchProgress | null;
  /** The total the row reads: the counts' `total`, else the number of items the snapshot holds. */
  total: number;
  /** The items' states in item order, consecutive equal states merged. */
  strip: TimelineStripSegment[];
  /** True when the batch holds more items than the wide threshold. */
  wide: boolean;
  /** True when its item rows are drawn. */
  expanded: boolean;
  /**
   * How many of its item rows are hidden: none while expanded, and while
   * collapsed every item but the ones kept in view, those holding a failed or
   * stuck invocation, themselves or anywhere beneath them.
   */
  hiddenItemCount: number;
}

/**
 * Which outcome a condition's branch row stands for. When its condition has
 * resolved, the outcome is the resolution's, the key the condition matched,
 * which may differ from the key in the path: a path names an outcome group by
 * the first key that runs its pipe. A dry run's condition, which runs every
 * group and resolves none, names each by its path.
 */
export interface TimelineOutcome {
  /** The outcome map's key, decoded; `null` for the default outcome. */
  key: string | null;
  /** True when it comes from the condition's `selected_outcome`, false when read off the path. */
  fromResolution: boolean;
}

/**
 * Why an item row of a collapsed batch is drawn anyway: an invocation that
 * failed, or one where the run is stuck (carrying `degradation`), is the item
 * itself or lies anywhere beneath it. A failure anywhere beneath wins over a
 * stuck invocation.
 */
export const KEPT_VISIBLE_REASON = {
  FAILED: "failed",
  DEGRADED: "degraded",
} as const;

export type KeptVisibleReason = (typeof KEPT_VISIBLE_REASON)[keyof typeof KEPT_VISIBLE_REASON];

/** One drawn row: one invocation, at its place in the tree. */
export interface TimelineRow {
  path: string;
  /** The path of the row it nests under: its nearest ancestor the snapshot holds, `null` at the top. */
  parentPath: string | null;
  /** Its nesting level among the drawn rows, 0 at the top. */
  depth: number;
  /** The last segment of its path, `null` for the entry pipe's. */
  segment: PathSegment | null;
  /** Its place under its parent, worded as the summary words it: `step 2 of 4`, `item 3 of 40`, `outcome detailed`. */
  placeLabel: string | null;
  /** On a condition's branch, the outcome it stands for. */
  outcome: TimelineOutcome | null;
  invocation: ProgressInvocation;
  /** How many child rows it has in the snapshot, drawn or not. */
  childCount: number;
  /** On a batch, what its row shows of its items. */
  batch: TimelineBatch | null;
  /** Set on an item row drawn under a collapsed batch, saying why. */
  keptVisible: KeptVisibleReason | null;
}

type TreeNode = InvocationTreeNode;

/** What a collapsed batch keeps each node in view for, read over its whole subtree. */
type TroubleMap = Map<TreeNode, KeptVisibleReason | null>;

/**
 * Records each node's trouble from its whole subtree, bottom-up, once per
 * tree: failed when any invocation in it failed, else degraded when any
 * carries `degradation`, else none. Read over the subtree rather than the node
 * alone, so an item of a collapsed batch stays in view for a failure or a stuck
 * invocation however deep beneath it, inside a nested batch included.
 */
function markTrouble(node: TreeNode, trouble: TroubleMap): KeptVisibleReason | null {
  let failed = node.invocation.status === INVOCATION_STATUS.FAILED;
  let degraded = node.invocation.degradation !== undefined;
  for (const child of node.children) {
    const reason = markTrouble(child, trouble);
    if (reason === KEPT_VISIBLE_REASON.FAILED) failed = true;
    if (reason === KEPT_VISIBLE_REASON.DEGRADED) degraded = true;
  }
  let reason: KeptVisibleReason | null = null;
  if (failed) reason = KEPT_VISIBLE_REASON.FAILED;
  else if (degraded) reason = KEPT_VISIBLE_REASON.DEGRADED;
  trouble.set(node, reason);
  return reason;
}

function placeLabelOf(
  segment: PathSegment | null,
  parent: ProgressInvocation | null,
  outcome: TimelineOutcome | null,
): string | null {
  if (!segment) return null;
  const of = (count: number | undefined) => (count === undefined ? "" : ` of ${count}`);
  switch (segment.kind) {
    case PATH_SEGMENT_KIND.STEP:
      return `step ${segment.ordinal}${of(parent?.step_count)}`;
    case PATH_SEGMENT_KIND.BRANCH:
      return `branch ${segment.ordinal}${of(parent?.branch_count)}`;
    case PATH_SEGMENT_KIND.ITEM:
      return `item ${segment.ordinal}${of(parent?.batch?.total)}`;
    case PATH_SEGMENT_KIND.OUTCOME:
    case PATH_SEGMENT_KIND.DEFAULT:
      return outcome && outcome.key !== null ? `outcome ${outcome.key}` : "default outcome";
    default:
      return segment.raw;
  }
}

function outcomeOf(node: TreeNode, parent: TreeNode | null): TimelineOutcome | null {
  const segment = node.segment;
  if (segment?.kind !== PATH_SEGMENT_KIND.OUTCOME && segment?.kind !== PATH_SEGMENT_KIND.DEFAULT) {
    return null;
  }
  const resolution = parent?.invocation.condition;
  const outcomeSiblings = parent ? parent.children.filter(isOutcomeNode).length : 0;
  // A resolved condition ran one outcome group, so its one branch is the
  // outcome it took. Several branches under a resolution contradict that, and
  // then no branch can be told to be the chosen one: each keeps its path's name.
  if (resolution && outcomeSiblings === 1) {
    return { key: resolution.selected_outcome, fromResolution: true };
  }
  return {
    key: segment.kind === PATH_SEGMENT_KIND.OUTCOME ? segment.key : null,
    fromResolution: false,
  };
}

function stripOf(items: TreeNode[]): TimelineStripSegment[] {
  const strip: TimelineStripSegment[] = [];
  items.forEach((item, index) => {
    const status = item.invocation.status;
    const firstItem = isOrdinalSegment(item.segment) ? item.segment.ordinal : index + 1;
    const last = strip[strip.length - 1];
    if (last && last.status === status && last.firstItem + last.count === firstItem) {
      last.count += 1;
    } else {
      strip.push({ status, firstItem, count: 1 });
    }
  });
  return strip;
}

/**
 * The rows a timeline draws for a snapshot, in drawing order: every invocation
 * before its descendants, nested by path, each labelled with its place under
 * its parent.
 *
 * A batch is one row whatever its width (decision on batch progress display):
 * its row carries the snapshot's counts and a strip of its items' states, and
 * its item rows are drawn only while it is expanded. A wide batch starts
 * collapsed; a narrow one starts expanded; `expandedBatches` overrides either.
 * Collapsed, it still draws each item holding an invocation that failed or
 * where the run is stuck (one carrying `degradation`), whether the item itself
 * or anything beneath it, a nested batch's item included, with everything under
 * it, so the trouble can always be pointed at, along with the rows leading to it.
 *
 * Pure, and a function of the snapshot and the options alone: the same snapshot
 * always yields the same rows, so repainting with a newer snapshot keeps every
 * row it still holds at its place relative to the others.
 */
export function buildTimelineRows(
  snapshot: ProgressSnapshot,
  options: TimelineRowsOptions = {},
): TimelineRow[] {
  const threshold = options.wideBatchThreshold ?? DEFAULT_WIDE_BATCH_THRESHOLD;
  const expandedBatches = options.expandedBatches ?? {};
  const rows: TimelineRow[] = [];
  const roots = buildInvocationTree(snapshot);
  const trouble: TroubleMap = new Map();
  for (const root of roots) markTrouble(root, trouble);
  const troubleOf = (node: TreeNode) => trouble.get(node) ?? null;

  const visit = (
    node: TreeNode,
    parent: TreeNode | null,
    depth: number,
    keptVisible: KeptVisibleReason | null,
  ) => {
    const invocation = node.invocation;
    const items = node.children.filter(isItemNode);
    const isBatch = invocation.batch !== undefined || items.length > 0;
    let batch: TimelineBatch | null = null;
    let expanded = true;
    if (isBatch) {
      const total = invocation.batch?.total ?? items.length;
      const wide = total > threshold;
      expanded = expandedBatches[invocation.path] ?? !wide;
      const keptCount = expanded ? 0 : items.filter((item) => troubleOf(item) !== null).length;
      batch = {
        counts: invocation.batch ?? null,
        total,
        strip: stripOf(items),
        wide,
        expanded,
        hiddenItemCount: expanded ? 0 : items.length - keptCount,
      };
    }
    // A segment is worded against the invocation one level up, and only that
    // one: under an ancestor further up, its step count or batch total would
    // describe another controller.
    const owner =
      parent && parentInvocationPath(invocation.path) === parent.invocation.path ? parent : null;
    const outcome = outcomeOf(node, owner);
    rows.push({
      path: invocation.path,
      parentPath: node.parentPath,
      depth,
      segment: node.segment,
      placeLabel: placeLabelOf(node.segment, owner?.invocation ?? null, outcome),
      outcome,
      invocation,
      childCount: node.children.length,
      batch,
      keptVisible,
    });
    for (const child of node.children) {
      if (expanded || !isItemNode(child)) {
        visit(child, node, depth + 1, null);
        continue;
      }
      const reason = troubleOf(child);
      if (reason) visit(child, node, depth + 1, reason);
    }
  };

  for (const root of roots) visit(root, null, 0, null);
  return rows;
}
