import React from "react";
import type {
  GraphSpecModelUsage,
  GraphSpecNode,
  PipeBlueprintUnion,
  PipeType,
  GraphSpec,
} from "@graph/types";
import { isDryGraphSpec, isStaticGraphSpec } from "@graph/types";
import { getPipeBlueprint } from "@graph/graphAnalysis";
import {
  formatDuration,
  KV,
  PipeLLMSection,
  PipeImgGenSection,
  PipeExtractSection,
  PipeSearchSection,
  PipeStructureSection,
  PipeComposeSection,
  PipeConditionSection,
  PipeSequenceSection,
  PipeParallelSection,
  PipeBatchSection,
  UsageCostInline,
  UsageDetails,
  shouldDumpExecutionData,
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
  PipeStructure: "Structure",
  PipeSignature: "Signature",
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
  canceled: "#6272a4",
};

// ─── Props ──────────────────────────────────────────────────────────────

export interface PipeDetailPanelProps {
  node: GraphSpecNode;
  spec: GraphSpec;
  onConceptClick?: (conceptRef: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────

export function PipeDetailPanel({ node, spec, onConceptClick }: PipeDetailPanelProps) {
  const pipeType = node.pipe_type;
  const isController = CONTROLLER_TYPES.has(pipeType);
  const isStatic = isStaticGraphSpec(spec);
  const showsGeneratedData = !isStatic && !isDryGraphSpec(spec);
  const badge = PIPE_TYPE_BADGES[pipeType];
  const status = node.status;
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
      if (ref.endsWith(`.${node.pipe_code}`)) return pipe;
    }
    return undefined;
  }, [node.pipe_code, spec]);

  const [usageExpanded, setUsageExpanded] = React.useState(false);

  const inputs = node.io?.inputs ?? [];
  const outputs = node.io?.outputs ?? [];
  const description = blueprint?.description ?? node.description;

  return (
    <>
      {/* Sticky header: badge, status, description, IO */}
      <div className="detail-sticky-header">
        {/* Header: badge + pipe code */}
        <div className="detail-header">
          <span
            className={`detail-badge ${isController ? "detail-badge--controller" : "detail-badge--operator"}`}
          >
            {badge}
          </span>
          <span
            className={`detail-pipe-code ${isController ? "detail-pipe-code--controller" : ""}`}
          >
            {node.pipe_code}
          </span>
        </div>

        {/* Status + Duration + Cost — three facts about the same run, on one
            line. Cost is gated on showsGeneratedData, i.e. a real run: a dry run
            executes nothing, so its usage counts are simulated and stating a
            price (even "none") would answer a question that does not apply. */}
        {!isStatic && (
          <div className="detail-status">
            <span className="detail-status-dot" style={{ background: statusColor }} />
            <span className="detail-status-label" style={{ color: statusColor }}>
              {status}
            </span>
            {node.timing?.duration != null && (
              <span className="detail-duration">{formatDuration(node.timing.duration)}</span>
            )}
            {showsGeneratedData && node.usage && (
              <UsageCostInline
                usage={node.usage}
                isController={isController}
                expanded={usageExpanded}
                onToggle={() => setUsageExpanded((value) => !value)}
              />
            )}
          </div>
        )}

        {showsGeneratedData && node.usage && usageExpanded && (
          <UsageDetails usage={node.usage} isController={isController} />
        )}

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
                  <span className="detail-io-name">{input.name}</span>
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
                  <span className="detail-io-name">{output.name}</span>
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
      </div>

      {/* Blueprint-specific sections */}
      {blueprint && (
        <BlueprintSection
          blueprint={blueprint}
          executionData={showsGeneratedData ? node.execution_data : undefined}
          modelsRan={showsGeneratedData ? node.usage?.by_model : undefined}
          // Model resolution is NOT gated on showsGeneratedData, unlike every other
          // execution_data field. Resolving `@default-general` to `claude-4.6-sonnet`
          // is a deterministic deck lookup, not a measurement of a run — a dry spec
          // carries it too, and hiding it there left the Model row showing an alias
          // with nothing under it.
          modelHandles={node.execution_data}
        />
      )}

      {/* Execution data (runtime-resolved values) */}
      {showsGeneratedData && node.execution_data && Object.keys(node.execution_data).length > 0 && (
        <ExecutionDataSection
          executionData={node.execution_data}
          pipeType={pipeType}
          hasBlueprint={!!blueprint}
        />
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
      {showsGeneratedData && node.metrics && Object.keys(node.metrics).length > 0 && (
        <div>
          <div className="detail-section-label">Metrics</div>
          {Object.entries(node.metrics).map(([key, value]) => (
            <KV
              key={key}
              label={key}
              value={typeof value === "number" ? value.toLocaleString() : String(value)}
            />
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
  modelsRan,
  modelHandles,
}: {
  blueprint: PipeBlueprintUnion;
  executionData?: Record<string, unknown>;
  /** Models that actually ran on this node — see ModelRows in ./sections/shared. */
  modelsRan?: GraphSpecModelUsage[];
  /** execution_data, ungated: the deck-resolved model handle is available in dry specs too. */
  modelHandles?: Record<string, unknown>;
}) {
  switch (blueprint.type) {
    case "PipeLLM":
      return (
        <PipeLLMSection
          blueprint={blueprint}
          executionData={executionData}
          modelsRan={modelsRan}
          modelHandles={modelHandles}
        />
      );
    case "PipeImgGen":
      return (
        <PipeImgGenSection
          blueprint={blueprint}
          executionData={executionData}
          modelsRan={modelsRan}
          modelHandles={modelHandles}
        />
      );
    case "PipeCompose":
      return <PipeComposeSection blueprint={blueprint} executionData={executionData} />;
    case "PipeExtract":
      return (
        <PipeExtractSection
          blueprint={blueprint}
          modelsRan={modelsRan}
          modelHandles={modelHandles}
        />
      );
    case "PipeSearch":
      return (
        <PipeSearchSection
          blueprint={blueprint}
          executionData={executionData}
          modelsRan={modelsRan}
          modelHandles={modelHandles}
        />
      );
    case "PipeStructure":
      return (
        <PipeStructureSection
          blueprint={blueprint}
          executionData={executionData}
          modelsRan={modelsRan}
          modelHandles={modelHandles}
        />
      );
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
    case "PipeSignature":
      return (
        <div className="detail-not-available">
          Signature stub — declared but not yet implemented.
        </div>
      );
    default:
      // Defensive: a blueprint whose `type` the renderer doesn't know yet
      // (runtime ahead of this library) degrades to no extra section.
      return null;
  }
}

// ─── Execution data dispatch ────────────────────────────────────────────────

function ExecutionDataSection({
  executionData,
  pipeType,
  hasBlueprint,
}: {
  executionData: Record<string, unknown>;
  pipeType: string;
  hasBlueprint: boolean;
}) {
  // Known pipe types merge their runtime data into the blueprint section, so
  // there is nothing extra to render once that section mounted. The raw dump is
  // only shown when the blueprint failed to resolve (so runtime data isn't lost)
  // or for types without a merged section (PipeFunc, PipeSignature, unknown).
  if (!shouldDumpExecutionData(pipeType, hasBlueprint)) return null;
  return <GenericExecutionData data={executionData} />;
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
