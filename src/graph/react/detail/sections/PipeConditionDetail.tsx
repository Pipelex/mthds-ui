import React from "react";
import type { PipeBlueprintUnion } from "@graph/types";
import { KV, PromptBlock } from "./shared";

export function PipeConditionSection({
  blueprint,
  executionData,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeCondition" }>;
  executionData?: Record<string, unknown>;
}) {
  const evaluatedExpression = executionData?.evaluated_expression as string | undefined;
  const selectedOutcome = executionData?.selected_outcome as string | undefined;

  return (
    <>
      <PromptBlock label="Expression" text={blueprint.expression} />
      {evaluatedExpression && <KV label="Expression Result" value={evaluatedExpression} />}
      <div>
        <div className="detail-section-label">Outcomes</div>
        {Object.entries(blueprint.outcome_map).map(([outcome, pipeCode]) => (
          <div
            key={outcome}
            className="detail-kv-row"
            style={
              selectedOutcome === pipeCode ? { background: "rgba(80,250,123,0.08)" } : undefined
            }
          >
            <span className="detail-kv-key">{outcome}</span>
            <span
              className="detail-kv-value"
              style={selectedOutcome === pipeCode ? { color: "#50FA7B" } : undefined}
            >
              {pipeCode}
            </span>
          </div>
        ))}
        <div className="detail-kv-row">
          <span className="detail-kv-key">default</span>
          <span className="detail-kv-value">{blueprint.default_outcome}</span>
        </div>
      </div>
      <KV label="Alias Expression To" value={blueprint.add_alias_from_expression_to} />
    </>
  );
}

export function ConditionExecutionData(_props: { data: Record<string, unknown> }) {
  return null;
}
