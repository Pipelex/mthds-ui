import React from "react";
import type { PipeBlueprintUnion } from "@graph/types";
import { KV, PromptToggle } from "./shared";

/**
 * Unified PipeStructure detail — merges blueprint config and runtime execution
 * data into a single view. Runtime values take precedence when available.
 * PipeStructure is an LLM-backed operator that turns a single Text input into a
 * structured concept.
 */
export function PipeStructureSection({
  blueprint,
  executionData,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeStructure" }>;
  executionData?: Record<string, unknown>;
}) {
  // Runtime-resolved values (from execution_data).
  const resolvedModel = executionData?.resolved_model as string | undefined;
  const isMultipleOutput = executionData?.is_multiple_output as boolean | undefined;
  const structuringPath = executionData?.structuring_path as string | undefined;
  const renderedUser = executionData?.rendered_user_prompt as string | undefined;

  // Config LLM choice is only a plain string handle here; an inline setting
  // object isn't a single label, so fall back to the resolved runtime model.
  const llmChoice = typeof blueprint.llm_choice === "string" ? blueprint.llm_choice : undefined;
  const modelDisplay = resolvedModel || llmChoice;

  return (
    <>
      <KV label="Model" value={modelDisplay} />
      <KV label="Text Variable" value={blueprint.text_input_name} />
      <KV label="Structuring" value={structuringPath} />
      <KV label="Multiple Output" value={isMultipleOutput} />
      <KV label="Output Multiplicity" value={blueprint.output_multiplicity} />

      {/* Rendered structuring prompt sent to the LLM. */}
      <PromptToggle label="Prompt" templateText={undefined} renderedText={renderedUser} />
    </>
  );
}

/**
 * No-op: all PipeStructure runtime data is merged into PipeStructureSection
 * above. Kept so the dispatcher's per-type branch stays uniform.
 */
export function StructureExecutionData(_props: { data: Record<string, unknown> }) {
  return null;
}
