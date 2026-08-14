import React from "react";
import type { GraphSpecModelUsage, PipeBlueprintUnion } from "@graph/types";
import { KV, ModelRows, PromptToggle } from "./shared";

export function PipeImgGenSection({
  blueprint,
  executionData,
  modelsRan,
  modelHandles,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeImgGen" }>;
  executionData?: Record<string, unknown>;
  /** Models that actually ran on this node; absent for a dry or static graph. */
  modelsRan?: GraphSpecModelUsage[];
  /** execution_data, ungated: the deck-resolved model handle exists in dry specs too. */
  modelHandles?: Record<string, unknown>;
}) {
  const spec = blueprint.img_gen_prompt_blueprint;
  const resolvedModel = modelHandles?.resolved_model as string | undefined;
  const renderedPrompt = executionData?.rendered_prompt as string | undefined;
  const renderedNegative = executionData?.rendered_negative_prompt as string | undefined;

  return (
    <>
      <ModelRows modelsRan={modelsRan} authored={blueprint.img_gen_choice} handle={resolvedModel} />
      <PromptToggle
        label="Prompt"
        templateText={spec.prompt_blueprint?.template}
        renderedText={renderedPrompt}
      />
      <PromptToggle
        label="Negative Prompt"
        templateText={spec.negative_prompt_blueprint?.template}
        renderedText={renderedNegative}
      />
      <KV label="Aspect Ratio" value={blueprint.aspect_ratio} />
      <KV label="Output Format" value={blueprint.output_format} />
      <KV label="Background" value={blueprint.background} />
      <KV label="Is Raw" value={blueprint.is_raw} />
      <KV label="Seed" value={blueprint.seed} />
      <KV
        label="Images"
        value={(executionData?.nb_images as number) ?? blueprint.output_multiplicity}
      />
    </>
  );
}
