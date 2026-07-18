// Validation decorations — project targeted ValidationIssues onto rendered nodes.
//
// Pure module (no React): GraphViewer derives a per-node decoration map from
// the same `validationIssues` prop that feeds the validation panel, then stamps
// it onto node data. Node components render the ring + badge from that stamp.

import type { GraphNodeData, GraphSpec, NodeValidationSummary, ValidationIssue } from "./types";
import { outermostFoldedAncestor } from "./graphFolds";
import { makePipeRef } from "./pipeRefs";

/**
 * Resolve which GraphSpec node ids an issue targets:
 * - `nodeId` → that precise invocation (wins over `pipeRef` when both are set);
 * - `pipeRef` → every spec node invoking that exact `domain_code.pipe_code`
 *   pipe (a pipe can appear in several places in the graph). The match is on
 *   the qualified ref — never on the bare code — so two domains declaring the
 *   same pipe code can never cross-decorate. A node missing either identity
 *   field cannot be qualified and is never matched;
 * - neither → no targets (the issue stays panel-only).
 */
function issueTargetIds(issue: ValidationIssue, graphspec: GraphSpec): string[] {
  if (issue.nodeId) return [issue.nodeId];
  if (issue.pipeRef) {
    return graphspec.nodes
      .filter(
        (n) =>
          n.domain_code !== undefined &&
          n.pipe_code !== undefined &&
          makePipeRef(n.domain_code, n.pipe_code) === issue.pipeRef,
      )
      .map((n) => n.id);
  }
  return [];
}

/**
 * Build the per-node decoration map for the current fold state.
 *
 * Each issue's target ids are remapped through the fold containment
 * (`outermostFoldedAncestor`): an issue on a node hidden inside a folded
 * controller decorates the folded controller's card instead, so folding never
 * hides an error. Targets that don't resolve to a rendered node (e.g. a
 * diagnostic about a pipe that was skipped during the static walk) simply
 * produce no decoration — those issues stay panel-only.
 *
 * Counts are per issue × target invocation: a folded controller containing two
 * invocations of a broken pipe shows 2, matching the sum of the badges that
 * become visible when it is expanded.
 */
export function buildValidationDecorations(
  issues: readonly ValidationIssue[] | undefined,
  graphspec: GraphSpec | null,
  childToCtrl: Readonly<Record<string, string>>,
  foldedSet: ReadonlySet<string>,
): Map<string, NodeValidationSummary> {
  const decorations = new Map<string, NodeValidationSummary>();
  if (!issues || issues.length === 0 || !graphspec) return decorations;

  for (const issue of issues) {
    for (const targetId of issueTargetIds(issue, graphspec)) {
      const visibleId = outermostFoldedAncestor(targetId, childToCtrl, foldedSet) ?? targetId;
      const existing = decorations.get(visibleId);
      const lines = [issue.message, ...(issue.suggestedFix ? [`Fix: ${issue.suggestedFix}`] : [])];
      if (existing) {
        if (issue.severity === "error") existing.severity = "error";
        existing.count += 1;
        existing.lines.push(...lines);
      } else {
        decorations.set(visibleId, { severity: issue.severity, count: 1, lines });
      }
    }
  }
  return decorations;
}

/**
 * Resolve the rendered node a panel row should navigate to: the issue's first
 * target, remapped through the fold containment, and only if that id is
 * actually rendered. `null` for panel-only issues (no target, or the target
 * never became a node).
 */
export function resolveIssueTargetNodeId(
  issue: ValidationIssue,
  graphspec: GraphSpec | null,
  childToCtrl: Readonly<Record<string, string>>,
  foldedSet: ReadonlySet<string>,
  renderedNodeIds: ReadonlySet<string>,
): string | null {
  if (!graphspec) return null;
  for (const targetId of issueTargetIds(issue, graphspec)) {
    const visibleId = outermostFoldedAncestor(targetId, childToCtrl, foldedSet) ?? targetId;
    if (renderedNodeIds.has(visibleId)) return visibleId;
  }
  return null;
}

/**
 * Stamp the decoration map onto rendered nodes (and their pipe-card payloads).
 * Nodes whose decoration is unchanged are returned as-is; a node whose issues
 * disappeared gets its stamp cleared, so verdict flips are fully reactive.
 * `onBadgeClick` (when provided) rides along on decorated nodes only — the
 * badge renders as a button that opens the validation panel.
 */
export function applyValidationDecorations<T extends { id: string; data: GraphNodeData }>(
  nodes: T[],
  decorations: ReadonlyMap<string, NodeValidationSummary>,
  onBadgeClick?: () => void,
): T[] {
  return nodes.map((node) => {
    const decoration = decorations.get(node.id);
    if (!decoration && !node.data.validation && !node.data.pipeCardData?.validation) return node;
    const badgeClick = decoration ? onBadgeClick : undefined;
    return {
      ...node,
      data: {
        ...node.data,
        validation: decoration,
        onValidationBadgeClick: badgeClick,
        pipeCardData: node.data.pipeCardData
          ? {
              ...node.data.pipeCardData,
              validation: decoration,
              onValidationBadgeClick: badgeClick,
            }
          : node.data.pipeCardData,
      },
    };
  });
}
