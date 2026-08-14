import React from "react";
import type { GraphSpecModelUsage, PipeBlueprintUnion } from "@graph/types";
import { KV, ModelRows, PromptToggle } from "./shared";

export function PipeSearchSection({
  blueprint,
  executionData,
  modelsRan,
  modelHandles,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeSearch" }>;
  executionData?: Record<string, unknown>;
  /** Models that actually ran on this node; absent for a dry or static graph. */
  modelsRan?: GraphSpecModelUsage[];
  /** execution_data, ungated: the deck-resolved model handle exists in dry specs too. */
  modelHandles?: Record<string, unknown>;
}) {
  const resolvedModel = modelHandles?.resolved_model as string | undefined;
  const renderedQuery = executionData?.rendered_query as string | undefined;

  return (
    <>
      <ModelRows modelsRan={modelsRan} authored={blueprint.search_choice} handle={resolvedModel} />
      <PromptToggle
        label="Search Query"
        templateText={blueprint.prompt_blueprint.template}
        renderedText={renderedQuery}
      />
      <KV label="Max Results" value={blueprint.max_results_override} />
      <KV label="Include Images" value={blueprint.include_images_override} />
      <KV label="Structured Output" value={blueprint.is_structured_output} />
      <KV label="From Date" value={blueprint.from_date} />
      <KV label="To Date" value={blueprint.to_date} />
      {blueprint.include_domains && blueprint.include_domains.length > 0 && (
        <KV label="Include Domains" value={blueprint.include_domains.join(", ")} />
      )}
      {blueprint.exclude_domains && blueprint.exclude_domains.length > 0 && (
        <KV label="Exclude Domains" value={blueprint.exclude_domains.join(", ")} />
      )}
    </>
  );
}
