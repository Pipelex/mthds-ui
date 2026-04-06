import React from "react";
import type { PipeBlueprintUnion } from "@graph/types";

export function PipeSequenceSection({
  blueprint,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeSequence" }>;
  executionData?: Record<string, unknown>;
}) {
  return (
    <div>
      <div className="detail-section-label">Steps</div>
      <div className="detail-steps-list">
        {blueprint.sequential_sub_pipes.map((step, idx) => (
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

export function SequenceExecutionData(_props: { data: Record<string, unknown> }) {
  return null;
}
