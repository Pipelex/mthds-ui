import React from "react";
import type { GraphSpecModelUsage, PipeBlueprintUnion } from "@graph/types";
import { KV, ModelRows } from "./shared";

export function PipeExtractSection({
  blueprint,
  modelsRan,
  modelHandles,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeExtract" }>;
  /** Models that actually ran on this node; absent for a dry or static graph. */
  modelsRan?: GraphSpecModelUsage[];
  /** execution_data, ungated: the deck-resolved model handle exists in dry specs too. */
  modelHandles?: Record<string, unknown>;
}) {
  const resolvedModel = modelHandles?.resolved_model as string | undefined;

  return (
    <>
      <ModelRows modelsRan={modelsRan} authored={blueprint.extract_choice} handle={resolvedModel} />
      <KV label="Document Variable" value={blueprint.document_stuff_name} />
      <KV label="Caption Images" value={blueprint.should_caption_images} />
      <KV label="Max Page Images" value={blueprint.max_page_images} />
      <KV label="Include Page Views" value={blueprint.should_include_page_views} />
      <KV label="Page Views DPI" value={blueprint.page_views_dpi} />
      <KV label="Render JS" value={blueprint.render_js} />
      <KV label="Include Raw HTML" value={blueprint.include_raw_html} />
      <KV label="Image Variable" value={blueprint.image_stuff_name} />
    </>
  );
}
