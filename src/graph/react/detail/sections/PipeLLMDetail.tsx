import React from "react";
import type { PipeBlueprintUnion } from "@graph/types";
import { KV, PromptToggle } from "./shared";

/**
 * Unified PipeLLM detail — merges blueprint config and runtime execution data
 * into a single view. Runtime values take precedence when available.
 */
export function PipeLLMSection({
  blueprint,
  executionData,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeLLM" }>;
  executionData?: Record<string, unknown>;
}) {
  const spec = blueprint.llm_prompt_spec;
  const hasImageRefs = spec.user_image_references && spec.user_image_references.length > 0;
  const hasDocRefs = spec.user_document_references && spec.user_document_references.length > 0;
  const hasSysImageRefs = spec.system_image_references && spec.system_image_references.length > 0;
  const hasSysDocRefs =
    spec.system_document_references && spec.system_document_references.length > 0;

  // Runtime-resolved values (from execution_data)
  const resolvedModel = executionData?.resolved_model as string | undefined;
  const resolvedModelForObject = executionData?.resolved_model_for_object as string | undefined;
  const renderedSystem = executionData?.rendered_system_prompt as string | undefined;
  const renderedUser = executionData?.rendered_user_prompt as string | undefined;
  const structuringPath = executionData?.structuring_path as string | undefined;
  const isMultipleOutput = executionData?.is_multiple_output as boolean | undefined;

  // Model: show resolved if available, otherwise config choice
  const modelDisplay = resolvedModel || blueprint.llm_choices?.for_text;
  const modelForObjectDisplay = resolvedModelForObject || blueprint.llm_choices?.for_object;

  return (
    <>
      {/* Model */}
      <KV label="Model" value={modelDisplay} />
      {modelForObjectDisplay && modelForObjectDisplay !== modelDisplay && (
        <KV label="Model (object)" value={modelForObjectDisplay} />
      )}

      {/* Structuring — show runtime path if available, otherwise config method */}
      <KV label="Structuring" value={structuringPath || blueprint.structuring_method} />
      <KV label="Multiple Output" value={isMultipleOutput} />
      <KV label="Output Multiplicity" value={blueprint.output_multiplicity} />
      <KV label="Prompt Category" value={spec.prompt_blueprint?.category} />

      {/* References */}
      {hasImageRefs && (
        <KV label="User Image Refs" value={`${spec.user_image_references!.length} references`} />
      )}
      {hasDocRefs && (
        <KV
          label="User Document Refs"
          value={`${spec.user_document_references!.length} references`}
        />
      )}
      {hasSysImageRefs && (
        <KV
          label="System Image Refs"
          value={`${spec.system_image_references!.length} references`}
        />
      )}
      {hasSysDocRefs && (
        <KV
          label="System Document Refs"
          value={`${spec.system_document_references!.length} references`}
        />
      )}

      {/* Prompts — last, toggle between template and rendered */}
      <PromptToggle
        label="System Prompt"
        templateText={spec.system_prompt_blueprint?.template}
        renderedText={renderedSystem}
      />
      <PromptToggle
        label="Prompt"
        templateText={spec.prompt_blueprint?.template}
        renderedText={renderedUser}
      />
    </>
  );
}

/**
 * LLMExecutionData is now empty — all data is merged into PipeLLMSection above.
 * Kept as a no-op so the dispatcher doesn't need to change.
 */
export function LLMExecutionData(_props: { data: Record<string, unknown> }) {
  return null;
}
