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

/**
 * How many items one page of a batch holds: an expanded batch with more items
 * than this draws them a page at a time, and a collapsed one keeps at most this
 * many of its items in trouble in view. The same as the wide threshold, so an
 * expanded batch never draws more items at once than a batch that starts
 * expanded.
 */
export const DEFAULT_BATCH_PAGE_SIZE = 10;

export interface TimelineRowsOptions {
  /**
   * The batches a reader expanded (`true`) or collapsed (`false`), by path. A
   * batch absent from it takes the default: collapsed when wide, else expanded.
   */
  expandedBatches?: Readonly<Record<string, boolean>>;
  /** A batch with more items than this is wide. Defaults to `DEFAULT_WIDE_BATCH_THRESHOLD`. */
  wideBatchThreshold?: number;
  /**
   * The page the reader turned each batch to, by path, from 0. A batch absent
   * from it opens on its first page, and an index past its last page draws the
   * last one.
   */
  batchPages?: Readonly<Record<string, number>>;
  /**
   * How many items one page of a batch holds, whether it started collapsed or
   * not. Defaults to `DEFAULT_BATCH_PAGE_SIZE`; a size below one takes the default.
   */
  batchPageSize?: number;
}

/** A run of consecutive items sharing one status, in item order: one cell of a batch's strip. */
export interface TimelineStripSegment {
  status: InvocationStatus;
  /** The number of the first item of the run, from 1. */
  firstItem: number;
  /** How many items the run holds. */
  count: number;
}

/**
 * The page of an expanded batch's items that is drawn: a fixed range of item
 * numbers, never of positions among the items the snapshot holds, so an item
 * appearing while the batch fans out lands inside the page it belongs to.
 */
export interface TimelineBatchPage {
  /** Which page, from 0. */
  index: number;
  /** How many pages the batch's items make. */
  count: number;
  /** The number of the first item in its range, from 1. */
  firstItem: number;
  /** The number of the last item in its range. */
  lastItem: number;
  /**
   * How many items the pages span: the batch's total, or the highest item
   * number the snapshot holds when that is larger.
   */
  itemCount: number;
}

/** An item in trouble that is not drawn, and the page that holds it. */
export interface TimelineTroubleJump {
  /** The item's number, from 1. */
  item: number;
  /** The page holding it, from 0. */
  page: number;
  /** Why it is in trouble: a failure anywhere beneath it wins over a stuck invocation. */
  reason: KeptVisibleReason;
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
   * While expanded and holding more items than one page, the page drawn;
   * otherwise `null`: every item is drawn, or the batch is collapsed.
   */
  page: TimelineBatchPage | null;
  /**
   * The first item in trouble that is not drawn: while paged, the first after
   * the current page, wrapping to the start of the batch; while collapsed, the
   * first the one-page cap leaves out. `null` when every item in trouble is drawn.
   */
  nextTrouble: TimelineTroubleJump | null;
  /** While collapsed, how many items in trouble the one-page cap leaves out, by reason. */
  troubleNotShown: Record<KeptVisibleReason, number>;
  /**
   * How many of the items the snapshot holds are not drawn: while expanded,
   * those off the current page; while collapsed, every item but the ones kept in
   * view, those holding a failed or stuck invocation, themselves or anywhere
   * beneath them, at most one page of them.
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

/** The kinds of entry `buildTimelineRows` returns: an invocation's row, or a batch's pager. */
export const TIMELINE_ENTRY_KIND = {
  INVOCATION: "invocation",
  PAGER: "pager",
} as const;

export type TimelineEntryKind = (typeof TIMELINE_ENTRY_KIND)[keyof typeof TIMELINE_ENTRY_KIND];

/** One drawn row: one invocation, at its place in the tree. */
export interface TimelineRow {
  kind: typeof TIMELINE_ENTRY_KIND.INVOCATION;
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

/**
 * A batch's pager, drawn after the last row of the items it shows, at their
 * depth. While the batch is expanded over several pages, it turns them and
 * offers the jump to the next item in trouble; while collapsed, it stands where
 * the one-page cap left items in trouble out, and says how many.
 */
export interface TimelineItemPager {
  kind: typeof TIMELINE_ENTRY_KIND.PAGER;
  /** The batch's path. */
  batchPath: string;
  /** The batch's pipe code, which names the pager. */
  pipeCode: string;
  /** The depth of the batch's items, one below its row. */
  depth: number;
  /** The batch, as its row carries it. */
  batch: TimelineBatch;
}

/** One entry of what a timeline draws, in drawing order. */
export type TimelineEntry = TimelineRow | TimelineItemPager;

/** Whether an entry is an invocation's row rather than a batch's pager. */
export function isTimelineRow(entry: TimelineEntry): entry is TimelineRow {
  return entry.kind === TIMELINE_ENTRY_KIND.INVOCATION;
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

/** An item's number, read off its `item_<n>` segment. */
function itemNumberOf(item: TreeNode): number {
  return isOrdinalSegment(item.segment) ? item.segment.ordinal : 0;
}

/** The page size an option asks for, or the default when it asks for none, or for less than one item. */
function pageSizeOf(requested: number | undefined): number {
  return requested !== undefined && Number.isFinite(requested) && requested >= 1
    ? Math.floor(requested)
    : DEFAULT_BATCH_PAGE_SIZE;
}

/** The page a reader asked for, kept among the batch's pages: the first when none was asked for. */
function pageIndexOf(requested: number | undefined, count: number): number {
  if (requested === undefined || Number.isNaN(requested)) return 0;
  return Math.min(Math.max(0, Math.floor(requested)), count - 1);
}

/** A batch's row and which of its items are drawn, each with why when kept in view. */
interface BatchView {
  batch: TimelineBatch;
  drawn: Map<TreeNode, KeptVisibleReason | null>;
}

/**
 * Lays one batch out. Expanded over more items than one page, it draws the
 * items numbered in the current page's range; expanded over one page, every
 * item. Collapsed, it draws its items in trouble, at most a page of them, those
 * where the run is stuck first, then the failed ones, each by item number.
 * Either way, the first item in trouble left out, by item number, is the jump.
 */
function viewBatch(
  invocation: ProgressInvocation,
  items: TreeNode[],
  troubleOf: (node: TreeNode) => KeptVisibleReason | null,
  settings: {
    threshold: number;
    pageSize: number;
    expanded: boolean | undefined;
    page: number | undefined;
  },
): BatchView {
  const { threshold, pageSize } = settings;
  const total = invocation.batch?.total ?? items.length;
  const wide = total > threshold;
  const expanded = settings.expanded ?? !wide;
  // The items in trouble, in item order, each with its number and why.
  const troubled = items.flatMap((node) => {
    const reason = troubleOf(node);
    return reason ? [{ node, number: itemNumberOf(node), reason }] : [];
  });
  const jumpTo = (target: (typeof troubled)[number] | undefined): TimelineTroubleJump | null =>
    target
      ? {
          item: target.number,
          page: Math.floor((target.number - 1) / pageSize),
          reason: target.reason,
        }
      : null;
  const drawn = new Map<TreeNode, KeptVisibleReason | null>();
  const troubleNotShown: Record<KeptVisibleReason, number> = {
    [KEPT_VISIBLE_REASON.FAILED]: 0,
    [KEPT_VISIBLE_REASON.DEGRADED]: 0,
  };
  let page: TimelineBatchPage | null = null;
  let nextTrouble: TimelineTroubleJump | null = null;

  if (expanded) {
    // Items are in item order, so the last one held has the highest number.
    const highestHeld = items.length > 0 ? itemNumberOf(items[items.length - 1]) : 0;
    const extent = Math.max(total, highestHeld);
    const count = Math.max(1, Math.ceil(extent / pageSize));
    if (count > 1) {
      const index = pageIndexOf(settings.page, count);
      const firstItem = index * pageSize + 1;
      const lastItem = Math.min((index + 1) * pageSize, extent);
      page = { index, count, firstItem, lastItem, itemCount: extent };
      for (const item of items) {
        const number = itemNumberOf(item);
        if (number >= firstItem && number <= lastItem) drawn.set(item, null);
      }
      nextTrouble = jumpTo(
        troubled.find((each) => each.number > lastItem) ??
          troubled.find((each) => each.number < firstItem),
      );
    } else {
      for (const item of items) drawn.set(item, null);
    }
  } else {
    // The page kept in view takes the items where the run is stuck first, since
    // the run is waiting on them, then the failed ones, each by item number; the
    // kept items are still drawn in item order.
    const ranked = [...troubled].sort(
      (a, b) =>
        Number(a.reason !== KEPT_VISIBLE_REASON.DEGRADED) -
          Number(b.reason !== KEPT_VISIBLE_REASON.DEGRADED) || a.number - b.number,
    );
    const kept = new Set(ranked.slice(0, pageSize).map((each) => each.node));
    for (const { node, reason } of troubled) {
      if (kept.has(node)) drawn.set(node, reason);
      else troubleNotShown[reason] += 1;
    }
    nextTrouble = jumpTo(troubled.find((each) => !kept.has(each.node)));
  }

  return {
    batch: {
      counts: invocation.batch ?? null,
      total,
      strip: stripOf(items),
      wide,
      expanded,
      page,
      nextTrouble,
      troubleNotShown,
      hiddenItemCount: items.length - drawn.size,
    },
    drawn,
  };
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
 * it, so the trouble can be pointed at, along with the rows leading to it.
 *
 * Both states are bounded by one page of items (`batchPageSize`). Expanded over
 * more items than a page, a batch draws the page the reader turned it to, by
 * item number, and a pager entry after the last row of its items. Collapsed, it
 * keeps at most one page of its items in trouble in view, those where the run
 * is stuck first, then the failed ones, each by item number, and when more are in trouble a pager entry stands after them saying
 * so. The pager carries the jump to the first item in trouble left out.
 *
 * Pure, and a function of the snapshot and the options alone: the same snapshot
 * always yields the same rows, so repainting with a newer snapshot keeps every
 * row it still holds at its place relative to the others, and a page keeps its
 * range of items while the batch fans out.
 */
export function buildTimelineRows(
  snapshot: ProgressSnapshot,
  options: TimelineRowsOptions = {},
): TimelineEntry[] {
  const threshold = options.wideBatchThreshold ?? DEFAULT_WIDE_BATCH_THRESHOLD;
  const pageSize = pageSizeOf(options.batchPageSize);
  const expandedBatches = options.expandedBatches ?? {};
  const batchPages = options.batchPages ?? {};
  const rows: TimelineEntry[] = [];
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
    const view = isBatch
      ? viewBatch(invocation, items, troubleOf, {
          threshold,
          pageSize,
          expanded: expandedBatches[invocation.path],
          page: batchPages[invocation.path],
        })
      : null;
    const batch = view?.batch ?? null;
    // A segment is worded against the invocation one level up, and only that
    // one: under an ancestor further up, its step count or batch total would
    // describe another controller.
    const owner =
      parent && parentInvocationPath(invocation.path) === parent.invocation.path ? parent : null;
    const outcome = outcomeOf(node, owner);
    rows.push({
      kind: TIMELINE_ENTRY_KIND.INVOCATION,
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
    if (!view) {
      for (const child of node.children) visit(child, node, depth + 1, null);
      return;
    }
    const leftOut =
      view.batch.troubleNotShown[KEPT_VISIBLE_REASON.FAILED] +
      view.batch.troubleNotShown[KEPT_VISIBLE_REASON.DEGRADED];
    const pager: TimelineItemPager | null =
      view.batch.page || leftOut > 0
        ? {
            kind: TIMELINE_ENTRY_KIND.PAGER,
            batchPath: invocation.path,
            pipeCode: invocation.pipe_code,
            depth: depth + 1,
            batch: view.batch,
          }
        : null;
    // The pager follows the last row of the items drawn, or the batch's own row
    // when its page holds none the snapshot has reached.
    let lastDrawn: TreeNode | null = null;
    for (const child of node.children) if (view.drawn.has(child)) lastDrawn = child;
    if (pager && !lastDrawn) rows.push(pager);
    for (const child of node.children) {
      if (!isItemNode(child)) {
        visit(child, node, depth + 1, null);
        continue;
      }
      if (!view.drawn.has(child)) continue;
      visit(child, node, depth + 1, view.drawn.get(child) ?? null);
      if (pager && child === lastDrawn) rows.push(pager);
    }
  };

  for (const root of roots) visit(root, null, 0, null);
  return rows;
}
