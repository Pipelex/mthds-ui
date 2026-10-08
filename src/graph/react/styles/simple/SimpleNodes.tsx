import React from "react";
import { Handle, Position } from "@xyflow/react";
import type {
  GraphNodeData,
  NodeValidationSummary,
  PipeStatus,
  SimpleNodePayload,
  StepCategory,
} from "@graph/types";
import {
  NODE_TYPE_SIMPLE_DECISION,
  NODE_TYPE_SIMPLE_FRAME,
  NODE_TYPE_SIMPLE_STEP,
  NODE_TYPE_SIMPLE_TERMINAL,
} from "@graph/types";
import { STEP_CATEGORY_WORDS } from "@graph/styles/simpleStyle";
import { NodeValidationBadge, validationRingClass } from "../../nodes/NodeValidationBadge";

// ─── Icons ──────────────────────────────────────────────────────────────────

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function Icon({ size = 13, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg {...ICON_PROPS} width={size} height={size}>
      {children}
    </svg>
  );
}

/** Each category's icon. Keyed by `StepCategory`, so a new category does not compile without one. */
const CATEGORY_ICONS: Record<StepCategory, React.ReactNode> = {
  ai: (
    <>
      <path d="M9.94 15.5a2 2 0 0 0-1.44-1.44l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
    </>
  ),
  extract: (
    <>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 8h8" />
      <path d="M7 12h10" />
      <path d="M7 16h6" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  code: (
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>
  ),
  template: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>
  ),
  document: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M12 18v-6" />
      <path d="m9 15 3 3 3-3" />
    </>
  ),
  judge: (
    <>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </>
  ),
  planned: <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />,
  steps: (
    <>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </>
  ),
  parallel: (
    <>
      <path d="M16 3h5v5" />
      <path d="M8 3H3v5" />
      <path d="M12 22v-8.3a4 4 0 0 0-1.17-2.87L3 3" />
      <path d="m15 9 6-6" />
    </>
  ),
  decision: <path d="M12 2 22 12 12 22 2 12Z" />,
  repeat: (
    <>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </>
  ),
  pick: (
    <>
      <polyline points="15 10 20 15 15 20" />
      <path d="M4 4v7a4 4 0 0 0 4 4h12" />
    </>
  ),
};

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

const STATUS_LABELS: Record<PipeStatus, string> = {
  succeeded: "Done",
  failed: "Failed",
  running: "Running",
  scheduled: "Waiting",
  skipped: "Skipped",
  canceled: "Canceled",
};

const STATUS_ICONS: Record<PipeStatus, React.ReactNode> = {
  succeeded: <polyline points="20 6 9 17 4 12" />,
  failed: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  running: <path d="M21 12a9 9 0 1 1-6.22-8.56" />,
  scheduled: <circle cx="12" cy="12" r="8" />,
  skipped: <line x1="5" y1="12" x2="19" y2="12" />,
  canceled: <line x1="5" y1="12" x2="19" y2="12" />,
};

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
