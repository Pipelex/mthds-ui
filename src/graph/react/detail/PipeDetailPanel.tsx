import React from "react";
import type {
  GraphSpecNode,
  PipeBlueprintUnion,
  PipeType,
  GraphSpec,
} from "@graph/types";
import { getPipeBlueprint } from "@graph/graphAnalysis";
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

function formatDuration(seconds: number): string {
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  return `${seconds.toFixed(2)}s`;
}

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

  // Look up the full blueprint from registry
  const pipeRef = node.pipe_code ? `${spec.pipeline_ref?.domain ?? ""}.${node.pipe_code}` : "";
  const blueprint = pipeRef ? getPipeBlueprint(spec, pipeRef) : undefined;

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

      {/* Blueprint-specific sections */}
      {blueprint && <BlueprintSection blueprint={blueprint} />}

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
            <div key={key} className="detail-kv-row">
              <span className="detail-kv-key">{key}</span>
              <span className="detail-kv-value">{typeof value === "number" ? value.toLocaleString() : String(value)}</span>
            </div>
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

// ─── Blueprint-specific sections ────────────────────────────────────────

function BlueprintSection({ blueprint }: { blueprint: PipeBlueprintUnion }) {
  switch (blueprint.type) {
    case "PipeLLM":
      return <PipeLLMSection blueprint={blueprint} />;
    case "PipeImgGen":
      return <PipeImgGenSection blueprint={blueprint} />;
    case "PipeSequence":
      return <PipeSequenceSection blueprint={blueprint} />;
    case "PipeCondition":
      return <PipeConditionSection blueprint={blueprint} />;
    default:
      return null;
  }
}

function PipeLLMSection({ blueprint }: { blueprint: Extract<PipeBlueprintUnion, { type: "PipeLLM" }> }) {
  const prompt = blueprint.llm_prompt_spec?.prompt_blueprint?.template;
  const systemPrompt = blueprint.llm_prompt_spec?.system_prompt_blueprint?.template;

  return (
    <>
      {systemPrompt && (
        <div>
          <div className="detail-section-label">System Prompt</div>
          <div className="detail-prompt-block">{systemPrompt}</div>
        </div>
      )}
      {prompt && (
        <div>
          <div className="detail-section-label">Prompt</div>
          <div className="detail-prompt-block">{prompt}</div>
        </div>
      )}
      {blueprint.structuring_method && (
        <div className="detail-kv-row">
          <span className="detail-kv-key">Structuring</span>
          <span className="detail-kv-value">{blueprint.structuring_method}</span>
        </div>
      )}
    </>
  );
}

function PipeImgGenSection({ blueprint }: { blueprint: Extract<PipeBlueprintUnion, { type: "PipeImgGen" }> }) {
  const prompt = blueprint.img_gen_prompt_blueprint?.prompt_blueprint?.template;
  const negPrompt = blueprint.img_gen_prompt_blueprint?.negative_prompt_blueprint?.template;

  return (
    <>
      {prompt && (
        <div>
          <div className="detail-section-label">Prompt</div>
          <div className="detail-prompt-block">{prompt}</div>
        </div>
      )}
      {negPrompt && (
        <div>
          <div className="detail-section-label">Negative Prompt</div>
          <div className="detail-prompt-block">{negPrompt}</div>
        </div>
      )}
      {blueprint.aspect_ratio && (
        <div className="detail-kv-row">
          <span className="detail-kv-key">Aspect Ratio</span>
          <span className="detail-kv-value">{blueprint.aspect_ratio}</span>
        </div>
      )}
      {blueprint.output_format && (
        <div className="detail-kv-row">
          <span className="detail-kv-key">Format</span>
          <span className="detail-kv-value">{blueprint.output_format}</span>
        </div>
      )}
    </>
  );
}

function PipeSequenceSection({ blueprint }: { blueprint: Extract<PipeBlueprintUnion, { type: "PipeSequence" }> }) {
  const steps = blueprint.sequential_sub_pipes ?? [];
  if (steps.length === 0) return null;

  return (
    <div>
      <div className="detail-section-label">Steps</div>
      <div className="detail-steps-list">
        {steps.map((step, idx) => (
          <div key={idx} className="detail-step-item">
            <span className="detail-step-index">{idx + 1}</span>
            <span className="detail-step-code">{step.pipe_code}</span>
            {step.output_name && (
              <span className="detail-io-concept">-&gt; {step.output_name}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PipeConditionSection({ blueprint }: { blueprint: Extract<PipeBlueprintUnion, { type: "PipeCondition" }> }) {
  return (
    <>
      {blueprint.expression && (
        <div>
          <div className="detail-section-label">Expression</div>
          <div className="detail-prompt-block">{blueprint.expression}</div>
        </div>
      )}
      {blueprint.outcome_map && Object.keys(blueprint.outcome_map).length > 0 && (
        <div>
          <div className="detail-section-label">Outcomes</div>
          {Object.entries(blueprint.outcome_map).map(([outcome, pipeCode]) => (
            <div key={outcome} className="detail-kv-row">
              <span className="detail-kv-key">{outcome}</span>
              <span className="detail-kv-value">{pipeCode}</span>
            </div>
          ))}
          {blueprint.default_outcome && (
            <div className="detail-kv-row">
              <span className="detail-kv-key">default</span>
              <span className="detail-kv-value">{blueprint.default_outcome}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
