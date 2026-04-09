import React from "react";
import type { PipeBlueprintUnion } from "@graph/types";
import { KV, PromptToggle } from "./shared";

export function PipeComposeSection({
  blueprint,
  executionData,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeCompose" }>;
  executionData?: Record<string, unknown>;
}) {
  const renderedText = executionData?.rendered_text as string | undefined;
  const composeMode = executionData?.compose_mode as string | undefined;

  return (
    <>
      <KV label="Mode" value={composeMode || "template"} />
      <KV label="Category" value={blueprint.category} />
      <KV label="Templating Style" value={blueprint.templating_style} />
      <PromptToggle
        label="Template"
        templateText={blueprint.template}
        renderedText={renderedText}
      />
    </>
  );
}

export function ComposeExecutionData(_props: { data: Record<string, unknown> }) {
  return null;
}
