import React from "react";
import type { PipeBlueprintUnion } from "@graph/types";
import { KV } from "./shared";

export function PipeBatchSection({
  blueprint,
  executionData,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeBatch" }>;
  executionData?: Record<string, unknown>;
}) {
  const itemCount = executionData?.item_count as number | undefined;

  return (
    <>
      <KV label="Branch Pipe" value={blueprint.branch_pipe_code} />
      <KV label="Input List Variable" value={blueprint.batch_params.input_list_stuff_name} />
      <KV label="Input Item Variable" value={blueprint.batch_params.input_item_stuff_name} />
      {itemCount != null && <KV label="Items Processed" value={itemCount} />}
    </>
  );
}

export function BatchExecutionData(_props: { data: Record<string, unknown> }) {
  return null;
}
