import React from "react";
import type { PipeBlueprintUnion } from "@graph/types";
import { KV } from "./shared";

export function PipeParallelSection({
  blueprint,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeParallel" }>;
  executionData?: Record<string, unknown>;
}) {
  return (
    <>
      <div>
        <div className="detail-section-label">Branches</div>
        <div className="detail-steps-list">
          {blueprint.parallel_sub_pipes.map((branch, idx) => (
            <div key={idx} className="detail-step-item">
              <span className="detail-step-code">{branch.pipe_code}</span>
              {branch.output_name && (
                <span className="detail-io-concept">-&gt; {branch.output_name}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <KV label="Add Each Output" value={blueprint.add_each_output} />
      <KV label="Combined Output" value={blueprint.combined_output} />
    </>
  );
}

export function ParallelExecutionData(_props: { data: Record<string, unknown> }) {
  return null;
}
