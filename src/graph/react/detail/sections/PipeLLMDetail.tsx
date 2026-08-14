import React from "react";
import type { GraphSpecModelUsage, PipeBlueprintUnion } from "@graph/types";
import { KV, ModelRows, PromptToggle } from "./shared";

/**
 * Unified PipeLLM detail — merges blueprint config and runtime execution data
 * into a single view. Runtime values take precedence when available.
 */
export function PipeLLMSection({
  blueprint,
  executionData,
  modelsRan,
  modelHandles,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeLLM" }>;
  executionData?: Record<string, unknown>;
  /** Models that actually ran on this node; absent for a dry or static graph. */
  modelsRan?: GraphSpecModelUsage[];
  /** execution_data, ungated: the deck-resolved model handle exists in dry specs too. */
  modelHandles?: Record<string, unknown>;
}) {
  const spec = blueprint.llm_prompt_spec;
  const hasImageRefs = spec.user_image_references && spec.user_image_references.length > 0;
  const hasDocRefs = spec.user_document_references && spec.user_document_references.length > 0;
  const hasSysImageRefs = spec.system_image_references && spec.system_image_references.length > 0;
  const hasSysDocRefs =
    spec.system_document_references && spec.system_document_references.length > 0;

  // Runtime-resolved values (from execution_data)
  const resolvedModel = modelHandles?.resolved_model as string | undefined;
  const resolvedModelForObject = modelHandles?.resolved_model_for_object as string | undefined;
  const renderedSystem = executionData?.rendered_system_prompt as string | undefined;
  const renderedUser = executionData?.rendered_user_prompt as string | undefined;
  const structuringPath = executionData?.structuring_path as string | undefined;
  const isMultipleOutput = executionData?.is_multiple_output as boolean | undefined;

  // The authored choices, straight from the .mthds — the head of the resolution chain.
  // NOT `resolvedModel || authored`: in a live run the handle is already concrete, and
  // preferring it would hide the alias the method actually declares.
  const authoredModel = blueprint.llm_choices?.for_text;
  const authoredModelForObject = blueprint.llm_choices?.for_object;
  // A separate object pass means a second request worth naming. When it matches the
  // text pass there is one request, and the models that ran hang under that one row.
  const hasDistinctObjectRequest = Boolean(
    authoredModelForObject && authoredModelForObject !== authoredModel,
  );

  return (
    <>
      {/* Model — the request, with what it resolved to underneath when they differ.
          Every model that served this node is listed there, with call counts when
          there are several. They are NOT split across the two request rows: which
          pass a given model served is not recorded, and splitting them would be a
          guess presented as a fact. */}
      <ModelRows modelsRan={modelsRan} authored={authoredModel} handle={resolvedModel} />
      {hasDistinctObjectRequest && (
        <ModelRows
          authored={authoredModelForObject}
          handle={resolvedModelForObject}
          label="Model (object)"
        />
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
