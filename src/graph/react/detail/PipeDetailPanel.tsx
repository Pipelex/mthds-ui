import React from "react";
import type {
  GraphSpecNode,
  PipeBlueprintUnion,
  PipeType,
  GraphSpec,
} from "@graph/types";
import { getPipeBlueprint } from "@graph/graphAnalysis";
import {
  formatDuration,
  KV,
  PipeLLMSection,
  LLMExecutionData,
  PipeImgGenSection,
  ImgGenExecutionData,
  PipeExtractSection,
  ExtractExecutionData,
  PipeSearchSection,
  SearchExecutionData,
  PipeComposeSection,
  ComposeExecutionData,
  PipeConditionSection,
  ConditionExecutionData,
  PipeSequenceSection,
  SequenceExecutionData,
  PipeParallelSection,
  ParallelExecutionData,
  PipeBatchSection,
  BatchExecutionData,
} from "./sections";
import "./DetailPanel.css";

// ─── Badge / Status config ─────────────────────────────────────────────

const PIPE_TYPE_BADGES: Record<PipeType, string> = {
  PipeLLM: "LLM",
  PipeExtract: "Extract",
  PipeCompose: "Compose",
  PipeImgGen: "ImgGen",
  PipeSearch: "Search",
  PipeFunc: "Func",
  PipeSequence: "Seq",
  PipeParallel: "Par",
  PipeCondition: "Cond",
  PipeBatch: "Batch",
};

const CONTROLLER_TYPES = new Set<string>([
  "PipeSequence",
  "PipeParallel",
  "PipeCondition",
  "PipeBatch",
]);

const STATUS_COLORS: Record<string, string> = {
  succeeded: "#50FA7B",
  failed: "#FF5555",
  running: "#8BE9FD",
  scheduled: "#6272a4",
  skipped: "#6272a4",
};

// ─── Props ──────────────────────────────────────────────────────────────

export interface PipeDetailPanelProps {
  node: GraphSpecNode;
  spec: GraphSpec;
  onConceptClick?: (conceptRef: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────

export function PipeDetailPanel({ node, spec, onConceptClick }: PipeDetailPanelProps) {
  const pipeType = node.pipe_type ?? "PipeFunc";
  const isController = CONTROLLER_TYPES.has(pipeType);
  const badge = PIPE_TYPE_BADGES[pipeType as PipeType] ?? pipeType;
  const status = node.status ?? "scheduled";
  const statusColor = STATUS_COLORS[status] ?? "#6272a4";

  // Look up the full blueprint from registry — search by pipe_code suffix since
  // the registry key is domain.pipe_code and the node only has pipe_code
  const blueprint = React.useMemo(() => {
    if (!node.pipe_code || !spec.pipe_registry) return undefined;
    // Direct lookup with pipeline domain
    const directKey = `${spec.pipeline_ref?.domain ?? ""}.${node.pipe_code}`;
    const direct = getPipeBlueprint(spec, directKey);
    if (direct) return direct;
    // Search all registry entries by pipe_code suffix
    for (const [ref, pipe] of Object.entries(spec.pipe_registry)) {
      if (ref.endsWith(`.${node.pipe_code}`)) return pipe as PipeBlueprintUnion;
    }
    return undefined;
  }, [node.pipe_code, spec]);

  const inputs = node.io?.inputs ?? [];
  const outputs = node.io?.outputs ?? [];
  const description = blueprint?.description ?? node.description;

  return (
    <>
      {/* Header: badge + pipe code */}
      <div className="detail-header">
        <span className={`detail-badge ${isController ? "detail-badge--controller" : "detail-badge--operator"}`}>
          {badge}
        </span>
        <span className={`detail-pipe-code ${isController ? "detail-pipe-code--controller" : ""}`}>
          {node.pipe_code ?? "unknown"}
        </span>
      </div>

      {/* Status + Duration */}
      <div className="detail-status">
        <span className="detail-status-dot" style={{ background: statusColor }} />
        <span className="detail-status-label" style={{ color: statusColor }}>
          {status}
        </span>
        {node.timing?.duration != null && (
          <span className="detail-duration">{formatDuration(node.timing.duration)}</span>
        )}
      </div>

      {/* Description */}
      {description && <div className="detail-description">{description}</div>}

      {/* Inputs */}
      {inputs.length > 0 && (
        <div>
          <div className="detail-section-label">Inputs</div>
          <div className="detail-io-list">
            {inputs.map((input, idx) => (
              <div
                key={idx}
                className="detail-io-pill"
                style={{ cursor: input.concept && onConceptClick ? "pointer" : undefined }}
                onClick={() => input.concept && onConceptClick?.(input.concept)}
              >
                <span className="detail-io-name">{input.name ?? "unnamed"}</span>
                {input.concept && <span className="detail-io-concept">{input.concept}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outputs */}
      {outputs.length > 0 && (
        <div>
          <div className="detail-section-label">Output</div>
          <div className="detail-io-list">
            {outputs.map((output, idx) => (
              <div
                key={idx}
                className="detail-io-pill"
                style={{ cursor: output.concept && onConceptClick ? "pointer" : undefined }}
                onClick={() => output.concept && onConceptClick?.(output.concept)}
              >
                <span className="detail-io-name">{output.name ?? "unnamed"}</span>
                {output.concept && <span className="detail-io-concept">{output.concept}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Separator after IO */}
      {(inputs.length > 0 || outputs.length > 0) && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }} />
      )}

      {/* Blueprint-specific sections */}
      {blueprint && (
        <BlueprintSection blueprint={blueprint} executionData={node.execution_data} />
      )}

      {/* Execution data (runtime-resolved values) */}
      {node.execution_data && Object.keys(node.execution_data).length > 0 && (
        <ExecutionDataSection executionData={node.execution_data} pipeType={pipeType} />
      )}

      {/* Error */}
      {node.error && (
        <div className="detail-error">
          <div className="detail-error-type">{node.error.error_type}</div>
          <div className="detail-error-message">{node.error.message}</div>
          {node.error.stack && <div className="detail-error-stack">{node.error.stack}</div>}
        </div>
      )}

      {/* Metrics */}
      {node.metrics && Object.keys(node.metrics).length > 0 && (
        <div>
          <div className="detail-section-label">Metrics</div>
          {Object.entries(node.metrics).map(([key, value]) => (
            <KV key={key} label={key} value={typeof value === "number" ? value.toLocaleString() : String(value)} />
          ))}
        </div>
      )}

      {/* Tags */}
      {node.tags && Object.keys(node.tags).length > 0 && (
        <div>
          <div className="detail-section-label">Tags</div>
          <div className="detail-tags">
            {Object.entries(node.tags).map(([key, value]) => (
              <span key={key} className="detail-tag">
                <span className="detail-tag-key">{key}: </span>
                <span className="detail-tag-value">{value}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Blueprint not available */}
      {!blueprint && <div className="detail-not-available">Blueprint not available</div>}
    </>
  );
}

// ─── Blueprint dispatch ─────────────────────────────────────────────────────

function BlueprintSection({
  blueprint,
  executionData,
}: {
  blueprint: PipeBlueprintUnion;
  executionData?: Record<string, unknown>;
}) {
  switch (blueprint.type) {
    case "PipeLLM":
      return <PipeLLMSection blueprint={blueprint} executionData={executionData} />;
    case "PipeImgGen":
      return <PipeImgGenSection blueprint={blueprint} executionData={executionData} />;
    case "PipeCompose":
      return <PipeComposeSection blueprint={blueprint} executionData={executionData} />;
    case "PipeExtract":
      return <PipeExtractSection blueprint={blueprint} executionData={executionData} />;
    case "PipeSearch":
      return <PipeSearchSection blueprint={blueprint} executionData={executionData} />;
    case "PipeSequence":
      return <PipeSequenceSection blueprint={blueprint} executionData={executionData} />;
    case "PipeParallel":
      return <PipeParallelSection blueprint={blueprint} executionData={executionData} />;
    case "PipeCondition":
      return <PipeConditionSection blueprint={blueprint} executionData={executionData} />;
    case "PipeBatch":
      return <PipeBatchSection blueprint={blueprint} executionData={executionData} />;
    case "PipeFunc":
      return null;
  }
}

// ─── Execution data dispatch ────────────────────────────────────────────────

function ExecutionDataSection({
  executionData,
  pipeType,
}: {
  executionData: Record<string, unknown>;
  pipeType: string;
}) {
  switch (pipeType) {
    case "PipeLLM":
      return <LLMExecutionData data={executionData} />;
    case "PipeImgGen":
      return <ImgGenExecutionData data={executionData} />;
    case "PipeExtract":
      return <ExtractExecutionData data={executionData} />;
    case "PipeSearch":
      return <SearchExecutionData data={executionData} />;
    case "PipeCompose":
      return <ComposeExecutionData data={executionData} />;
    case "PipeCondition":
      return <ConditionExecutionData data={executionData} />;
    case "PipeSequence":
      return <SequenceExecutionData data={executionData} />;
    case "PipeParallel":
      return <ParallelExecutionData data={executionData} />;
    case "PipeBatch":
      return <BatchExecutionData data={executionData} />;
    default:
      return <GenericExecutionData data={executionData} />;
  }
}

function GenericExecutionData({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <>
      <div className="detail-section-label">Execution</div>
      {entries.map(([key, value]) => (
        <KV key={key} label={key} value={String(value)} />
      ))}
    </>
  );
}
