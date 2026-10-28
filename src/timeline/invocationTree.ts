import type { ProgressInvocation, ProgressSnapshot } from "./progressSnapshot";
import {
  PATH_SEGMENT_KIND,
  isOrdinalSegment,
  lastPathSegment,
  parentInvocationPath,
  type PathSegment,
} from "./invocationPath";

/** One invocation of a snapshot, at its place in the tree its paths make. */
export interface InvocationTreeNode {
  invocation: ProgressInvocation;
  /** Its index in the snapshot's `invocations`. */
  order: number;
  /** The last segment of its path, `null` for a root path. */
  segment: PathSegment | null;
  /** The path of the node it nests under: its nearest ancestor the snapshot holds, `null` at the top. */
  parentPath: string | null;
  /** Its children, ordered by the number in their segment, then in snapshot order. */
  children: InvocationTreeNode[];
}

/** The order of two siblings: by the number in their segment, numbered ones first, then in snapshot order. */
export function compareSiblings(a: InvocationTreeNode, b: InvocationTreeNode): number {
  const aOrdinal = isOrdinalSegment(a.segment) ? a.segment.ordinal : null;
  const bOrdinal = isOrdinalSegment(b.segment) ? b.segment.ordinal : null;
  if (aOrdinal !== null && bOrdinal !== null && aOrdinal !== bOrdinal) return aOrdinal - bOrdinal;
  if (aOrdinal !== null && bOrdinal === null) return -1;
  if (aOrdinal === null && bOrdinal !== null) return 1;
  return a.order - b.order;
}

/**
 * The snapshot's invocations as a tree, each under its nearest ancestor the
 * snapshot holds. A whole-run snapshot holds every ancestor, so this is its
 * path tree; a snapshot of part of a run starts at its `root_path`, and an
 * invocation whose parent is missing still nests under what is there rather
 * than being lost. Children are ordered by the number in their segment, and
 * outcome groups, which carry none, keep the snapshot's order, the order they
 * started in. A path the snapshot lists twice keeps its first entry. The roots
 * come in snapshot order.
 */
export function buildInvocationTree(snapshot: ProgressSnapshot): InvocationTreeNode[] {
  const byPath = new Map<string, InvocationTreeNode>();
  snapshot.invocations.forEach((invocation, order) => {
    if (byPath.has(invocation.path)) return;
    byPath.set(invocation.path, {
      invocation,
      order,
      segment: lastPathSegment(invocation.path),
      parentPath: null,
      children: [],
    });
  });

  const roots: InvocationTreeNode[] = [];
  for (const node of byPath.values()) {
    let ancestor = parentInvocationPath(node.invocation.path);
    while (ancestor !== null && !byPath.has(ancestor)) ancestor = parentInvocationPath(ancestor);
    const parent = ancestor === null ? undefined : byPath.get(ancestor);
    if (parent) {
      node.parentPath = parent.invocation.path;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  for (const node of byPath.values()) node.children.sort(compareSiblings);
  roots.sort((a, b) => a.order - b.order);
  return roots;
}

/** Whether a node is a batch's item: its path ends in `item_<n>`. */
export function isItemNode(node: InvocationTreeNode): boolean {
  return node.segment?.kind === PATH_SEGMENT_KIND.ITEM;
}

/** Whether a node is a condition's outcome group: its path ends in `outcome_<key>` or `default`. */
export function isOutcomeNode(node: InvocationTreeNode): boolean {
  return (
    node.segment?.kind === PATH_SEGMENT_KIND.OUTCOME ||
    node.segment?.kind === PATH_SEGMENT_KIND.DEFAULT
  );
}
