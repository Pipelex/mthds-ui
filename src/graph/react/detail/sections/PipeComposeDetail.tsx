import React from "react";
import type { PipeBlueprintUnion, PipeComposeConstructField } from "@graph/types";
import { KV, PromptToggle } from "./shared";

/** Format a static construct field definition as a human-readable summary (no runtime data). */
function formatConstructField(field: PipeComposeConstructField): string {
  switch (field.method) {
    case "from_var":
      return `← ${field.from_path ?? "?"}`;
    case "fixed":
      return `= ${JSON.stringify(field.fixed_value)}`;
    case "nested":
      return "(nested construct)";
    case "template":
      // Defensive: template fields are routed to templateFields and rendered via
      // PromptToggle, so this branch is unreachable in practice. Kept for
      // exhaustiveness over the closed union — if routing ever changes, we still
      // display something useful instead of nothing.
      return field.template ?? "(empty template)";
  }
}

/** Format a runtime-resolved value for display in a KV row. */
function formatResolvedValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${value.length} items]`;
  }
  if (typeof value === "object") return "{…}";
  return String(value);
}

export function PipeComposeSection({
  blueprint,
  executionData,
}: {
  blueprint: Extract<PipeBlueprintUnion, { type: "PipeCompose" }>;
  executionData?: Record<string, unknown>;
}) {
  const renderedText = executionData?.rendered_text as string | undefined;
  const composeMode = executionData?.compose_mode as string | undefined;
  // Runtime-resolved values keyed by field name, emitted by PipeCompose._run_construct_mode.
  const resolvedFields = (executionData?.resolved_fields ?? null) as Record<string, unknown> | null;

  const constructFields = blueprint.construct_blueprint?.fields ?? null;
  const hasConstruct = constructFields !== null && Object.keys(constructFields).length > 0;

  // Separate template fields from non-template fields for different rendering.
  // Route purely on `method === "template"` — PromptToggle already short-circuits
  // (returns null) when both templateText and renderedText are falsy, so an empty
  // template field is handled gracefully instead of being misrouted to the FIELDS
  // KV section as "(template)".
  const templateFields: [string, PipeComposeConstructField][] = [];
  const nonTemplateFields: [string, PipeComposeConstructField][] = [];
  if (constructFields) {
    for (const [name, field] of Object.entries(constructFields)) {
      if (field.method === "template") {
        templateFields.push([name, field]);
      } else {
        nonTemplateFields.push([name, field]);
      }
    }
  }

  return (
    <>
      <KV label="Mode" value={composeMode || (hasConstruct ? "construct" : "template")} />
      <KV label="Category" value={blueprint.category} />
      <KV label="Templating Style" value={blueprint.templating_style} />

      {/* Legacy monolithic template (when construct_blueprint is null) */}
      {blueprint.template && (
        <PromptToggle
          label="Template"
          templateText={blueprint.template}
          renderedText={renderedText}
        />
      )}

      {/* Field-level construct form: show non-template fields as KV rows. */}
      {/* If the run emitted resolved_fields, show the runtime value; otherwise show the blueprint summary. */}
      {nonTemplateFields.length > 0 && (
        <>
          <div className="detail-section-label">FIELDS</div>
          {nonTemplateFields.map(([name, field]) => {
            const hasResolved = resolvedFields !== null && name in resolvedFields;
            const display = hasResolved ? formatResolvedValue(resolvedFields[name]) : formatConstructField(field);
            return <KV key={name} label={name} value={display} />;
          })}
        </>
      )}

      {/* Field-level construct form: each template field gets its own PromptToggle. */}
      {/* renderedText comes from execution_data.resolved_fields[fieldName] — the Jinja-rendered text. */}
      {templateFields.map(([name, field]) => {
        const resolvedForField = resolvedFields?.[name];
        const renderedForField = typeof resolvedForField === "string" ? resolvedForField : undefined;
        return (
          <PromptToggle
            key={name}
            label={`Template — ${name}`}
            templateText={field.template ?? null}
            renderedText={renderedForField}
          />
        );
      })}
    </>
  );
}

export function ComposeExecutionData(_props: { data: Record<string, unknown> }) {
  return null;
}
