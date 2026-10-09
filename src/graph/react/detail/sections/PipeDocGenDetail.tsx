import React from "react";
import type { GraphSpecModelUsage, PipeBlueprintUnion } from "@graph/types";
import { KV, ModelRows, PromptToggle } from "./shared";
import { labelFromLlmChoice } from "./llmChoice";

/**
 * The words for what the step's engine prints from, keyed by the runtime's
 * `DocGenSource` token: an open set, so a token with no entry prints as itself.
 */
const DOC_GEN_SOURCE_LABELS: Readonly<Record<string, string>> = {
  layout: "auto-layout",
  html: "HTML template",
  template_file: "template file",
};

type PipeDocGenBlueprint = Extract<PipeBlueprintUnion, { type: "PipeDocGen" }>;

/**
 * The source token a step composes from, derived from the blueprint alone for a
 * graph that ran nothing, by the runtime's own rule: no template is the
 * auto-layout, and a template is HTML for a pdf, inline or read from its file,
 * and a template file for any other format.
 */
function declaredSource(blueprint: PipeDocGenBlueprint): string {
  if (blueprint.template == null && blueprint.template_file == null) return "layout";
  if (blueprint.template != null || blueprint.doc_gen_format === "pdf") return "html";
  return "template_file";
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/**
 * A PipeDocGen step: the document it prints, the engine that prints it, what it
 * prints from, and the name it is stored under.
 *
 * It never shows the stored document's `url`, which the run's execution data
 * carries: the document is the step's output, which the graph shows through its
 * data panel, and a second, raw copy here is, with an inlined document, a wall
 * of base64.
 */
export function PipeDocGenSection({
  blueprint,
  executionData,
  modelsRan,
  modelHandles,
}: {
  blueprint: PipeDocGenBlueprint;
  /** execution_data of a real run only: the rendered file name is a product of the run. */
  executionData?: Record<string, unknown>;
  /** Models that actually ran on this node; absent for a dry or static graph. */
  modelsRan?: GraphSpecModelUsage[];
  /**
   * execution_data, ungated: the engine the deck resolves and the source the step
   * composes from are decided before anything runs, so a dry graph carries both.
   */
  modelHandles?: Record<string, unknown>;
}) {
  const format = nonEmpty(blueprint.doc_gen_format);
  const authoredEngine = labelFromLlmChoice(blueprint.doc_gen_choice);
  const resolvedEngine = nonEmpty(modelHandles?.resolved_model);
  const hasEngine = !!authoredEngine || !!resolvedEngine || (modelsRan?.length ?? 0) > 0;
  const source = nonEmpty(modelHandles?.source) ?? declaredSource(blueprint);
  const renderedFilename = nonEmpty(executionData?.filename);

  return (
    <>
      <KV label="Format" value={format?.toUpperCase()} />
      {hasEngine ? (
        <ModelRows
          label="Engine"
          modelsRan={modelsRan}
          authored={authoredEngine}
          handle={resolvedEngine}
        />
      ) : (
        <KV label="Engine" value="deck default" />
      )}
      <KV label="Source" value={DOC_GEN_SOURCE_LABELS[source] ?? source} />
      <KV label="Template File" value={blueprint.template_file} />
      <KV label="File Name" value={blueprint.filename} />
      {renderedFilename && renderedFilename !== blueprint.filename && (
        <KV label="Stored As" value={renderedFilename} />
      )}
      {blueprint.template && (
        <PromptToggle label="Template" templateText={blueprint.template} renderedText={null} />
      )}
    </>
  );
}
