import React, { useState } from "react";
import type { PipeCardData, PipeControllerType, PipeStatus, PipeType } from "./pipeCardTypes";

// ─── Pipe type badge labels ──────────────────────────────────────────────

const PIPE_TYPE_BADGES: Record<PipeType, string> = {
  PipeLLM: "LLM",
  PipeExtract: "Extract",
  PipeCompose: "Compose",
  PipeImgGen: "ImgGen",
  PipeSearch: "Search",
  PipeFunc: "Func",
  PipeSignature: "Signature",
  PipeSequence: "Sequence",
  PipeParallel: "Parallel",
  PipeCondition: "Condition",
  PipeBatch: "Batch",
};

// Derived from `PipeControllerType` so adding a new controller variant in
// `types.ts` produces a compile error here until the table is updated.
const CONTROLLER_TYPE_TABLE: Record<PipeControllerType, true> = {
  PipeSequence: true,
  PipeParallel: true,
  PipeCondition: true,
  PipeBatch: true,
};

function isControllerType(pipeType: PipeType): pipeType is PipeControllerType {
  return pipeType in CONTROLLER_TYPE_TABLE;
}

const STATUS_CONFIG: Record<PipeStatus, { color: string; label: string }> = {
  succeeded: { color: "#50FA7B", label: "Succeeded" },
  failed: { color: "#FF5555", label: "Failed" },
  running: { color: "#8BE9FD", label: "Running" },
  scheduled: { color: "#6272a4", label: "Scheduled" },
  skipped: { color: "#6272a4", label: "Skipped" },
  canceled: { color: "#6272a4", label: "Canceled" },
};

const MAX_VISIBLE_INPUTS = 4;

function getBadge(pipeType: PipeType): string {
  return PIPE_TYPE_BADGES[pipeType];
}

// ─── PipeCardBase — shared card rendering for all pipe types ─────────────

export interface PipeCardBaseProps {
  data: PipeCardData;
  /** Extra content rendered below the I/O section (for per-type customization) */
  children?: React.ReactNode;
}

export function PipeCardBase({ data, children }: PipeCardBaseProps) {
  const badge = getBadge(data.pipeType);
  const statusConfig = STATUS_CONFIG[data.status];
  const isRunning = data.status === "running";
  const isController = isControllerType(data.pipeType);
  const isSignature = data.pipeType === "PipeSignature";
  const [inputsExpanded, setInputsExpanded] = useState(false);

  const hasMany = data.inputs.length > MAX_VISIBLE_INPUTS;
  const visibleInputs =
    hasMany && !inputsExpanded ? data.inputs.slice(0, MAX_VISIBLE_INPUTS) : data.inputs;
  const hiddenCount = data.inputs.length - MAX_VISIBLE_INPUTS;

  const dirClass = data.direction === "TB" ? "pipe-card--tb" : "pipe-card--lr";
  const controllerClass = isController ? " pipe-card--controller" : "";
  const signatureClass = isSignature ? " pipe-card--signature" : "";
  const badgeClass = isController
    ? "pipe-card-badge pipe-card-badge--controller"
    : isSignature
      ? "pipe-card-badge pipe-card-badge--signature"
      : "pipe-card-badge";

  return (
    <div className={`pipe-card ${dirClass}${controllerClass}${signatureClass}`}>
      {/* Header: badge + pipe code + status + (optional) expand */}
      <div className="pipe-card-header">
        <span className={badgeClass}>{badge}</span>
        <span className="pipe-card-code" title={data.pipeCode}>
          {data.pipeCode}
        </span>
        <span
          className="pipe-card-status"
          style={{ color: statusConfig.color }}
          title={statusConfig.label}
        >
          <span
            className={`pipe-card-status-dot ${isRunning ? "pipe-card-status-dot--pulse" : ""}`}
            style={{ background: statusConfig.color }}
          />
        </span>
        {data.onExpand && (
          <button
            type="button"
            className="pipe-card-expand"
            title="Expand controller (alt/option: only this one)"
            aria-label="Expand controller"
            onClick={(e) => {
              e.stopPropagation();
              data.onExpand?.({ soloMode: e.altKey });
            }}
          >
            ⤢
          </button>
        )}
      </div>

      {/* Description — clamped via CSS */}
      {data.description && (
        <span className="pipe-card-description" title={data.description}>
          {data.description}
        </span>
      )}

      {/* Inputs */}
      {data.inputs.length > 0 && (
        <div className="pipe-card-io">
          <span className="pipe-card-io-label">INPUTS</span>
          <div className="pipe-card-io-pills">
            {visibleInputs.map((input) => (
              <span
                key={input.name}
                className="pipe-card-io-pill"
                title={`${input.name}: ${input.concept}`}
              >
                <span className="pipe-card-io-pill-name">{input.name}</span>
                <span className="pipe-card-io-pill-concept">{input.concept}</span>
              </span>
            ))}
            {hasMany && (
              <button
                className="pipe-card-io-more"
                onClick={(e) => {
                  e.stopPropagation();
                  setInputsExpanded((v) => !v);
                }}
              >
                {inputsExpanded ? "show less" : `+${hiddenCount} more`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Outputs */}
      {data.outputs.length > 0 && (
        <div className="pipe-card-io">
          <span className="pipe-card-io-label">OUTPUT</span>
          <div className="pipe-card-io-pills">
            {data.outputs.map((output) => (
              <span
                key={output.name}
                className="pipe-card-io-pill"
                title={`${output.name}: ${output.concept}`}
              >
                <span className="pipe-card-io-pill-name">{output.name}</span>
                <span className="pipe-card-io-pill-concept">{output.concept}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Per-type extra content slot */}
      {children}
    </div>
  );
}
