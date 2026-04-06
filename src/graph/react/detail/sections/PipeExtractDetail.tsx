import React from "react";
import type { PipeBlueprintUnion } from "@graph/types";
import { KV } from "./shared";

export function PipeExtractSection({
  blueprint,
  executionData,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeExtract" }>;
  executionData?: Record<string, unknown>;
}) {
  const resolvedModel = executionData?.resolved_model as string | undefined;

  return (
    <>
      <KV label="Model" value={resolvedModel || blueprint.extract_choice} />
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

export function ExtractExecutionData(_props: { data: Record<string, unknown> }) {
  return null;
}
