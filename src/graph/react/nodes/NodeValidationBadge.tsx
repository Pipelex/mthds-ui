import React from "react";
import type { NodeValidationSummary } from "@graph/types";

/**
 * Corner count badge for a node's validation decoration, shared by pipe cards
 * and controller groups. The tooltip lists every issue's message (and `Fix: …`
 * line). Renders a button when `onClick` is set (opens the validation panel),
 * a plain span otherwise.
 */
export function NodeValidationBadge({
  validation,
  onClick,
}: {
  validation: NodeValidationSummary;
  onClick?: () => void;
}) {
  const label = `${validation.count} validation ${validation.count === 1 ? "issue" : "issues"}`;
  const tooltip = validation.lines.join("\n");
  const className = `node-validation-badge node-validation-badge--${validation.severity}`;
  const text = validation.count > 99 ? "99+" : String(validation.count);
  if (!onClick) {
    return (
      <span className={className} title={tooltip} aria-label={label}>
        {text}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={className}
      title={tooltip}
      aria-label={`${label} — open validation panel`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {text}
    </button>
  );
}

/** Ring modifier class for a decorated node root (empty string when undecorated). */
export function validationRingClass(validation: NodeValidationSummary | undefined): string {
  return validation ? ` node-validation-ring--${validation.severity}` : "";
}
