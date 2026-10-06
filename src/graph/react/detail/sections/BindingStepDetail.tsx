import React from "react";
import type { GraphSpecNode } from "@graph/types";
import { KV } from "./shared";

/**
 * What a binding step binds: the path it reads and the name it stores the value
 * under. Both are structural, so they show in every mode, a static graph
 * included.
 *
 * pipelex records them as the node's `execution_data` (`from`, `result`), the
 * static builder too. The node itself says as much when that record is absent:
 * its `pipe_code` is the `from` path, and its one output, when it bound a value,
 * carries the `result` name.
 */
export function BindingStepSection({ node }: { node: GraphSpecNode }) {
  const executionData = node.execution_data ?? {};
  const fromPath = typeof executionData.from === "string" ? executionData.from : node.pipe_code;
  const result =
    typeof executionData.result === "string" ? executionData.result : node.io.outputs[0]?.name;
  return (
    <div>
      <div className="detail-section-label">Binding</div>
      <KV label="From" value={fromPath} />
      <KV label="Result" value={result} />
    </div>
  );
}
