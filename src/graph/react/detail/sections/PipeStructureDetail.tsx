import React from "react";
import type { GraphSpecModelUsage, PipeBlueprintUnion } from "@graph/types";
import { KV, ModelRows, PromptToggle } from "./shared";
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
  modelsRan,
  modelHandles,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeStructure" }>;
  executionData?: Record<string, unknown>;
  /** Models that actually ran on this node; absent for a dry or static graph. */
  modelsRan?: GraphSpecModelUsage[];
  /** execution_data, ungated: the deck-resolved model handle exists in dry specs too. */
  modelHandles?: Record<string, unknown>;
}) {
  // Runtime-resolved values (from execution_data).
  const resolvedModel = modelHandles?.resolved_model as string | undefined;
  const isMultipleOutput = executionData?.is_multiple_output as boolean | undefined;
  const renderedUser = executionData?.rendered_user_prompt as string | undefined;

  // The authored choice (a string handle or an inline LLMSetting object), shown as
  // the head of the resolution chain rather than as a fallback — see ModelRows.
  const authoredModel = labelFromLlmChoice(blueprint.llm_choice);

  return (
    <>
      <ModelRows modelsRan={modelsRan} authored={authoredModel} handle={resolvedModel} />
      <KV label="Text Variable" value={blueprint.text_input_name} />
      <KV label="Multiple Output" value={isMultipleOutput} />
      <KV label="Output Multiplicity" value={blueprint.output_multiplicity} />

      {/* Rendered structuring prompt sent to the LLM. */}
      <PromptToggle label="Prompt" templateText={undefined} renderedText={renderedUser} />
    </>
  );
}
