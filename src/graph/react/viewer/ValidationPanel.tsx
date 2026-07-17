import React from "react";
import {
  TOOLBAR_POSITION,
  VALIDATION_STATE,
  type ToolbarPosition,
  type ValidationIssue,
  type ValidationState,
} from "@graph/types";

/**
 * Human label for a validation state + issue count. Used as the widget button's
 * title/aria-label and as the panel header. Pure, unit-testable.
 */
export function validationLabel(state: ValidationState, issueCount: number): string {
  const issues = issueCount === 1 ? "1 issue" : `${issueCount} issues`;
  switch (state) {
    case VALIDATION_STATE.VALIDATING:
      return issueCount > 0 ? `Validating method… — ${issues}` : "Validating method…";
    case VALIDATION_STATE.VALID:
      return issueCount > 0 ? `Method is valid — ${issues}` : "Method is valid";
    case VALIDATION_STATE.INVALID:
      return `Method is invalid — ${issues}`;
    case VALIDATION_STATE.ERROR:
      return "Validation could not run";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

/**
 * How the dropdown opens relative to the validation button, derived from the
 * toolbar anchor so the panel always unfolds toward the graph, never off-screen:
 * `down-*`/`up-*` for horizontal bars (top vs bottom anchors), aligned to the
 * button's `start` (left) or `end` (right) edge; `side-end`/`side-start` for the
 * vertical bars, opening away from the hugged edge.
 */
export type ValidationPanelPlacement =
  | "down-start"
  | "down-end"
  | "up-start"
  | "up-end"
  | "side-start"
  | "side-end";

/** Derive the dropdown placement from the toolbar anchor. Pure, unit-testable. */
export function validationPanelPlacement(position: ToolbarPosition): ValidationPanelPlacement {
  switch (position) {
    case TOOLBAR_POSITION.TOP_LEFT:
    case TOOLBAR_POSITION.TOP_CENTER:
      return "down-start";
    case TOOLBAR_POSITION.TOP_RIGHT:
      return "down-end";
    case TOOLBAR_POSITION.BOTTOM_LEFT:
    case TOOLBAR_POSITION.BOTTOM_CENTER:
      return "up-start";
    case TOOLBAR_POSITION.BOTTOM_RIGHT:
      return "up-end";
    case TOOLBAR_POSITION.CENTER_LEFT:
      return "side-end";
    case TOOLBAR_POSITION.CENTER_RIGHT:
      return "side-start";
    default: {
      const _exhaustive: never = position;
      return _exhaustive;
    }
  }
}

/** Fallback body text when the host supplied no issues for the current state. */
export function validationEmptyText(state: ValidationState): string {
  switch (state) {
    case VALIDATION_STATE.VALIDATING:
      return "Validating…";
    case VALIDATION_STATE.VALID:
      return "No issues found.";
    case VALIDATION_STATE.INVALID:
      return "No details available.";
    case VALIDATION_STATE.ERROR:
      return "Validation could not run.";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export interface ValidationPanelProps {
  state: ValidationState;
  issues: ValidationIssue[];
  /** Row-click handler; rows render as buttons only when this is set. */
  onIssueClick?: (index: number, issue: ValidationIssue) => void;
  placement: ValidationPanelPlacement;
  /** Id of the panel root, referenced by the toolbar button's aria-controls. */
  id?: string;
}

/**
 * The dropdown listing validation issues, opened from the toolbar's validation
 * widget. Purely presentational: the host owns the issue list and what a row
 * click does (typically: navigate to the issue's source location).
 */
export function ValidationPanel({
  state,
  issues,
  onIssueClick,
  placement,
  id,
}: ValidationPanelProps) {
  return (
    <div
      id={id}
      className={`graph-validation-panel graph-validation-panel--${placement}`}
      role="region"
      aria-label="Validation issues"
    >
      <div className="graph-validation-panel-header">{validationLabel(state, issues.length)}</div>
      {/* Explicit role="list": list-style:none strips implicit list semantics in Safari. */}
      {issues.length === 0 ? (
        <div className="graph-validation-empty">{validationEmptyText(state)}</div>
      ) : (
        <ul className="graph-validation-issues" role="list">
          {issues.map((issue, index) => {
            const clickable = onIssueClick !== undefined;
            const meta = (issue.context || issue.file) && (
              <div className="graph-validation-issue-meta">
                {issue.context && (
                  <span className="graph-validation-issue-context">{issue.context}</span>
                )}
                {issue.file && <span className="graph-validation-issue-file">{issue.file}</span>}
              </div>
            );
            // Button semantics go on an inner body element, not the <li> itself,
            // so each row keeps its listitem role for assistive tech.
            return (
              <li
                key={index}
                className={
                  `graph-validation-issue graph-validation-issue--${issue.severity}` +
                  (clickable ? " graph-validation-issue--clickable" : "")
                }
              >
                <div
                  className="graph-validation-issue-body"
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? () => onIssueClick(index, issue) : undefined}
                  onKeyDown={
                    clickable
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onIssueClick(index, issue);
                          }
                        }
                      : undefined
                  }
                >
                  {meta}
                  <div className="graph-validation-issue-message">{issue.message}</div>
                  {issue.suggestedFix && (
                    <div className="graph-validation-issue-fix">{issue.suggestedFix}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
