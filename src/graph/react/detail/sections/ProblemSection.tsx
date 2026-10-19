import React from "react";
import type { GraphSpecNode } from "@graph/types";
import { problemFailingPipe } from "@graph/types";
import { KV } from "./shared";

/** A failed node's problem document, as `GraphSpecNode.error` carries it. */
type NodeProblem = NonNullable<GraphSpecNode["error"]>;

/**
 * Why a node failed, read from its problem document by the core members alone,
 * so a problem from any conforming runtime renders the same: its `title` and
 * `code`, its `detail`, the pipe it failed in from its `location`, with the
 * path down to it from the run's main pipe, and its `next_step`. A member a
 * runtime adds of its own, such as a stack trace, is never shown.
 *
 * `failedHere` says whether the node the panel shows is the pipe its run failed
 * in, by the rule the graph rings it by (`isFailingPipeNode`), so the panel and
 * the card never disagree. A controller fails when a pipe beneath it does, so
 * its problem names that pipe rather than itself, and the panel says which one;
 * on the pipe at fault it says the failure is its own. A binding is never that
 * pipe, even when its `from` path spells the sequence its problem locates.
 */
export function ProblemSection({
  problem,
  failedHere,
}: {
  problem: NodeProblem;
  failedHere: boolean;
}) {
  const failingPipe = problemFailingPipe(problem);
  const pipePath = problem.location?.path ?? [];
  return (
    <div className="detail-problem">
      <div className="detail-problem-header">
        {problem.title && <span className="detail-problem-title">{problem.title}</span>}
        <code className="detail-problem-code" title="Problem code">
          {problem.code}
        </code>
      </div>
      {problem.detail && <div className="detail-problem-detail">{problem.detail}</div>}
      {failingPipe !== undefined && (
        <div className="detail-problem-location">
          <KV label="Failed in" value={failedHere ? `${failingPipe} (this pipe)` : failingPipe} />
          {pipePath.length > 1 && (
            <div
              className="detail-problem-path"
              title="From the run's main pipe to the failing one"
            >
              {pipePath.join(" › ")}
            </div>
          )}
        </div>
      )}
      {problem.next_step.detail && (
        <div className="detail-problem-next-step">
          <div className="detail-section-label">Next step</div>
          <div className="detail-problem-next-step-detail">{problem.next_step.detail}</div>
        </div>
      )}
    </div>
  );
}
