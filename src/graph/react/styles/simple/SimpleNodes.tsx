import React from "react";
import { Handle, Position } from "@xyflow/react";
import type {
  GraphNodeData,
  NodeValidationSummary,
  PipeStatus,
  SimpleNodePayload,
} from "@graph/types";
import {
  NODE_TYPE_SIMPLE_DECISION,
  NODE_TYPE_SIMPLE_FRAME,
  NODE_TYPE_SIMPLE_STEP,
  NODE_TYPE_SIMPLE_TERMINAL,
} from "@graph/types";
import { STEP_CATEGORY_WORDS } from "@graph/styles/simpleStyle";
import { CATEGORY_ICONS, Icon, STATUS_ICONS, STATUS_LABELS } from "./simpleIcons";
import { NodeValidationBadge, validationRingClass } from "../../nodes/NodeValidationBadge";

const EXPAND_ICON = (
  <Icon size={12}>
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </Icon>
);

const COLLAPSE_ICON = (
  <Icon size={12}>
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </Icon>
);

// ─── Run status ─────────────────────────────────────────────────────────────

/** The run status mark a step shows once the method has run; nothing in a static graph. */
function StatusMark({ status, graphMode }: { status: PipeStatus; graphMode?: string }) {
  if (graphMode === "static") return null;
  return (
    <span
      className={`simple-status simple-status--${status}`}
      title={STATUS_LABELS[status]}
      aria-label={STATUS_LABELS[status]}
    >
      <Icon size={11}>{STATUS_ICONS[status]}</Icon>
    </span>
  );
}

// ─── Shared wrapper pieces ──────────────────────────────────────────────────

interface SimpleRFNodeProps {
  data: GraphNodeData;
  sourcePosition?: Position;
  targetPosition?: Position;
}

function Handles({
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  children,
}: {
  sourcePosition?: Position;
  targetPosition?: Position;
  children: React.ReactNode;
}) {
  return (
    <>
      <Handle type="target" position={targetPosition} className="simple-handle" />
      {children}
      <Handle type="source" position={sourcePosition} className="simple-handle" />
    </>
  );
}

function ValidationMark({
  validation,
  onClick,
}: {
  validation?: NodeValidationSummary;
  onClick?: () => void;
}) {
  return validation ? <NodeValidationBadge validation={validation} onClick={onClick} /> : null;
}

function payloadOf<K extends SimpleNodePayload["kind"]>(
  data: GraphNodeData,
  kinds: readonly K[],
): Extract<SimpleNodePayload, { kind: K }> | null {
  const simple = data.simple;
  if (!simple || !(kinds as readonly string[]).includes(simple.kind)) return null;
  return simple as Extract<SimpleNodePayload, { kind: K }>;
}

// ─── Step ───────────────────────────────────────────────────────────────────

/** A step: what the pipe does, in its author's words, with a plain category word. */
export function SimpleStepNode({ data, sourcePosition, targetPosition }: SimpleRFNodeProps) {
  const step = payloadOf(data, ["step"] as const);
  if (!step) return null;
  const statusClass = step.graphMode !== "static" ? ` simple-step--${step.status}` : "";
  return (
    <Handles sourcePosition={sourcePosition} targetPosition={targetPosition}>
      <div
        className={`simple-step simple-step--${step.category}${statusClass}${validationRingClass(data.validation)}`}
      >
        <div className="simple-step-header">
          <span className="simple-step-category">
            <Icon>{CATEGORY_ICONS[step.category]}</Icon>
            {STEP_CATEGORY_WORDS[step.category]}
          </span>
          <StatusMark status={step.status} graphMode={step.graphMode} />
          <ValidationMark validation={data.validation} onClick={data.onValidationBadgeClick} />
        </div>
        <div
          className="simple-step-title"
          title={step.title}
          style={{
            fontSize: step.titleFit.fontPx,
            lineHeight: `${step.titleFit.lineHeightPx}px`,
            WebkitLineClamp: step.titleFit.maxLines,
          }}
        >
          {step.title}
        </div>
        {step.forEach && (
          <span className="simple-step-foreach">
            <Icon size={11}>{CATEGORY_ICONS.repeat}</Icon>
            {step.forEach}
          </span>
        )}
        {step.innerStepCount !== undefined && (
          <button
            type="button"
            className="simple-step-open"
            title="Show the steps inside (alt/option: only this one)"
            onClick={(event) => {
              event.stopPropagation();
              step.onExpand?.({ soloMode: event.altKey });
            }}
            disabled={!step.onExpand}
          >
            {EXPAND_ICON}
            {step.innerStepCount === 1 ? "1 step inside" : `${step.innerStepCount} steps inside`}
          </button>
        )}
      </div>
    </Handles>
  );
}

// ─── Input and output ───────────────────────────────────────────────────────

/** The document shape's outline: a page whose foot is a wave. Stretched to the node. */
const DOCUMENT_PATH = "M1 1 H99 V84 C80 98 62 74 44 86 C28 96 14 96 1 88 Z";

function DocumentShape({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d={DOCUMENT_PATH} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A method input or final output: a document, stacked when it is a list. */
export function SimpleTerminalNode({ data, sourcePosition, targetPosition }: SimpleRFNodeProps) {
  const terminal = payloadOf(data, ["input", "output"] as const);
  if (!terminal) return null;
  return (
    <Handles sourcePosition={sourcePosition} targetPosition={targetPosition}>
      <div
        className={`simple-terminal simple-terminal--${terminal.kind}${terminal.isList ? " simple-terminal--list" : ""}`}
      >
        {terminal.isList && (
          <>
            <DocumentShape className="simple-terminal-shape simple-terminal-shape--back2" />
            <DocumentShape className="simple-terminal-shape simple-terminal-shape--back1" />
          </>
        )}
        <DocumentShape className="simple-terminal-shape" />
        <div className="simple-terminal-text">
          <span className="simple-terminal-title" title={terminal.title}>
            {terminal.title}
          </span>
          {terminal.subtitle && (
            <span className="simple-terminal-subtitle">{terminal.subtitle}</span>
          )}
        </div>
      </div>
    </Handles>
  );
}

// ─── Decision ───────────────────────────────────────────────────────────────

/** A decision: a diamond carrying what the condition decides; its arrows carry the outcomes. */
export function SimpleDecisionNode({ data, sourcePosition, targetPosition }: SimpleRFNodeProps) {
  const decision = payloadOf(data, ["decision"] as const);
  if (!decision) return null;
  const statusClass = decision.graphMode !== "static" ? ` simple-decision--${decision.status}` : "";
  return (
    <Handles sourcePosition={sourcePosition} targetPosition={targetPosition}>
      <div className={`simple-decision${statusClass}${validationRingClass(data.validation)}`}>
        <svg
          className="simple-decision-shape"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M50 1 L99 50 L50 99 L1 50 Z" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="simple-decision-text" title={decision.title}>
          {decision.title}
        </div>
        <div className="simple-decision-marks">
          <StatusMark status={decision.status} graphMode={decision.graphMode} />
          <ValidationMark validation={data.validation} onClick={data.onValidationBadgeClick} />
        </div>
      </div>
    </Handles>
  );
}

// ─── "For each" frame ───────────────────────────────────────────────────────

/** A batch whose branch has several steps: a light frame saying "for each", with a stack behind it. */
export function SimpleFrameNode({ data }: { data: GraphNodeData }) {
  const frame = payloadOf(data, ["frame"] as const);
  if (!frame) return null;
  return (
    <div className={`simple-frame${validationRingClass(data.validation)}`}>
      <div className="simple-frame-header">
        <span className="simple-frame-title">
          <Icon size={12}>{CATEGORY_ICONS.repeat}</Icon>
          {frame.title}
        </span>
        <StatusMark status={frame.status} graphMode={frame.graphMode} />
        <ValidationMark validation={data.validation} onClick={data.onValidationBadgeClick} />
        {frame.onFold && (
          <button
            type="button"
            className="simple-frame-fold"
            title="Fold into one step (alt/option: only this one)"
            aria-label="Fold into one step"
            onClick={(event) => {
              event.stopPropagation();
              frame.onFold?.({ soloMode: event.altKey });
            }}
          >
            {COLLAPSE_ICON}
          </button>
        )}
      </div>
    </div>
  );
}

// Stable reference — registered once in GraphViewer's module-level node types.
export const simpleNodeTypes = {
  [NODE_TYPE_SIMPLE_STEP]: SimpleStepNode,
  [NODE_TYPE_SIMPLE_TERMINAL]: SimpleTerminalNode,
  [NODE_TYPE_SIMPLE_DECISION]: SimpleDecisionNode,
  [NODE_TYPE_SIMPLE_FRAME]: SimpleFrameNode,
};
