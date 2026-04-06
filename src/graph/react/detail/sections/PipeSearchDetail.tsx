import React from "react";
import type { PipeBlueprintUnion } from "@graph/types";
import { KV, PromptToggle } from "./shared";

export function PipeSearchSection({
  blueprint,
  executionData,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeSearch" }>;
  executionData?: Record<string, unknown>;
}) {
  const resolvedModel = executionData?.resolved_model as string | undefined;
  const renderedQuery = executionData?.rendered_query as string | undefined;

  return (
    <>
      <KV label="Model" value={resolvedModel || blueprint.search_choice} />
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

export function SearchExecutionData(_props: { data: Record<string, unknown> }) {
  return null;
}
