import React from "react";
import type { PipeBlueprintUnion } from "@graph/types";
import { KV, PromptToggle } from "./shared";
import { labelFromLlmChoice } from "./llmChoice";

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
  const renderedUser = executionData?.rendered_user_prompt as string | undefined;

  // Prefer the runtime-resolved model; otherwise derive a label from the
  // configured llm_choice (a string handle or an inline LLMSetting object).
  const modelDisplay = resolvedModel || labelFromLlmChoice(blueprint.llm_choice);

  return (
    <>
      <KV label="Model" value={modelDisplay} />
      <KV label="Text Variable" value={blueprint.text_input_name} />
      <KV label="Multiple Output" value={isMultipleOutput} />
      <KV label="Output Multiplicity" value={blueprint.output_multiplicity} />

      {/* Rendered structuring prompt sent to the LLM. */}
      <PromptToggle label="Prompt" templateText={undefined} renderedText={renderedUser} />
    </>
  );
}
