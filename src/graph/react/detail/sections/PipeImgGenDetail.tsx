import React from "react";
import type { PipeBlueprintUnion } from "@graph/types";
import { KV, PromptToggle } from "./shared";

export function PipeImgGenSection({
  blueprint,
  executionData,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeImgGen" }>;
  executionData?: Record<string, unknown>;
}) {
  const spec = blueprint.img_gen_prompt_blueprint;
  const resolvedModel = executionData?.resolved_model as string | undefined;
  const renderedPrompt = executionData?.rendered_prompt as string | undefined;
  const renderedNegative = executionData?.rendered_negative_prompt as string | undefined;

  return (
    <>
      <KV label="Model" value={resolvedModel || blueprint.img_gen_choice} />
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

export function ImgGenExecutionData(_props: { data: Record<string, unknown> }) {
  return null;
}
