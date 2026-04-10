import React from "react";
import type {
  PipeBlueprintUnion,
  PipeComposeConstructBlueprint,
  PipeComposeConstructField,
} from "@graph/types";
import { KV, PromptToggle } from "./shared";

/** Format a non-nested, non-template construct field as a one-line contract string.
 *
 * Design rule: the pipe detail panel shows the **contract** of each field
 * (where it comes from, or what it's hardcoded to) — NOT the runtime data.
 * Runtime data lives in input/output stuff nodes, not on the pipe.
 *
 *   - `fixed`    → the literal value the pipe authored (it lives in the blueprint)
 *   - `from_var` → the dotted path into working memory (the value lives in the input stuff)
 *   - `template` → routed to PromptToggle elsewhere; this branch is unreachable
 *   - `nested`   → never reaches this function; nested fields are rendered by
 *                  ConstructFieldsBlock recursing into the sub-construct
 */
function formatLeafField(field: PipeComposeConstructField): string {
  switch (field.method) {
    case "from_var": {
      const base = `← ${field.from_path ?? "?"}`;
      return field.list_to_dict_keyed_by
        ? `${base} (keyed by ${field.list_to_dict_keyed_by})`
        : base;
    }
    case "fixed":
      return `= ${JSON.stringify(field.fixed_value)}`;
    case "nested":
      // Unreachable: nested fields are routed to recursive rendering. Kept for
      // exhaustiveness over the closed union.
      return "(nested construct)";
    case "template":
      // Unreachable: template fields are routed to PromptToggle. Kept for
      // exhaustiveness over the closed union.
      return field.template ?? "(empty template)";
  }
}

/** A field's string value is "long" when it wraps across multiple lines OR exceeds ~60 chars.
 *  Long values get a dedicated text block (label above, value in a bordered scrollable box);
 *  short values render inline as a KV row (label left, value right).
 */
const LONG_VALUE_THRESHOLD_CHARS = 60;
function isLongValue(text: string): boolean {
  return text.length > LONG_VALUE_THRESHOLD_CHARS || text.includes("\n");
}

/** Labeled multi-line text block — used for long fixed-value summaries
 *  (e.g. a `fixed = "<3000 char rationale>"` field whose JSON-stringified
 *  literal won't fit on a single KV row).
 */
function FieldBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-field-block">
      <div className="detail-field-block-label">{label}</div>
      <div className="detail-field-block-value">{value}</div>
    </div>
  );
}

/** Recursive renderer for a construct (or sub-construct) at a given indent depth.
 *
 * Splits the field map into:
 *   - leafFields: fixed / from_var → render as KV row or FieldBlock
 *   - nestedFields: nested → render as a sub-section header + recursive call
 *   - templateFields: template → render via PromptToggle
 *
 * The `depth` prop drives left padding so the tree is visually obvious without
 * needing collapse state. Depth 0 has no padding; each level adds 12px.
 */
function ConstructFieldsBlock({
  blueprint,
  depth,
  resolvedFields,
}: {
  blueprint: PipeComposeConstructBlueprint;
  depth: number;
  resolvedFields: Record<string, unknown> | null;
}) {
  const leafFields: [string, PipeComposeConstructField][] = [];
  const nestedFields: [string, PipeComposeConstructField][] = [];
  const templateFields: [string, PipeComposeConstructField][] = [];
  for (const [name, field] of Object.entries(blueprint.fields)) {
    if (field.method === "template") {
      templateFields.push([name, field]);
    } else if (field.method === "nested") {
      nestedFields.push([name, field]);
    } else {
      leafFields.push([name, field]);
    }
  }

  // Indent all rows at this depth. We use padding-left rather than nested
  // containers so KV rows still align cleanly with their FIELDS section label.
  const indentStyle = depth > 0 ? { paddingLeft: depth * 12 } : undefined;

  return (
    <>
      {leafFields.map(([name, field]) => {
        const display = formatLeafField(field);
        if (isLongValue(display)) {
          return (
            <div key={name} style={indentStyle}>
              <FieldBlock label={name} value={display} />
            </div>
          );
        }
        return (
          <div key={name} style={indentStyle}>
            <KV label={name} value={display} />
          </div>
        );
      })}

      {templateFields.map(([name, field]) => {
        const resolvedForField = resolvedFields?.[name];
        const renderedForField =
          typeof resolvedForField === "string" ? resolvedForField : undefined;
        return (
          <div key={name} style={indentStyle}>
            <PromptToggle
              label={`Template — ${name}`}
              templateText={field.template ?? null}
              renderedText={renderedForField}
            />
          </div>
        );
      })}

      {nestedFields.map(([name, field]) => {
        if (!field.nested) return null;
        return (
          <div key={name}>
            <div
              className="detail-nested-header"
              style={depth > 0 ? { paddingLeft: depth * 12 } : undefined}
            >
              <span className="detail-nested-header-name">{name}</span>
              <span className="detail-nested-header-meta">
                nested · {Object.keys(field.nested.fields).length} field
                {Object.keys(field.nested.fields).length === 1 ? "" : "s"}
              </span>
            </div>
            <ConstructFieldsBlock
              blueprint={field.nested}
              depth={depth + 1}
              // For nested sub-constructs, runtime resolved values would be
              // keyed under the parent field name in the parent map. Pipelex
              // currently flattens by field name, so we drill in optimistically
              // and let template fields find their rendered text if it exists.
              resolvedFields={
                resolvedFields && typeof resolvedFields[name] === "object" && resolvedFields[name] !== null
                  ? (resolvedFields[name] as Record<string, unknown>)
                  : null
              }
            />
          </div>
        );
      })}
    </>
  );
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
  // Only consumed for `template` fields — that's the only construct method where the pipe
  // actually computed something new (Jinja2 rendering). For `from_var` the value lives in
  // the input stuff node, and for `fixed` the value lives in the blueprint, so neither
  // belongs in the pipe detail panel.
  const resolvedFields = (executionData?.resolved_fields ?? null) as Record<string, unknown> | null;

  const constructBlueprint = blueprint.construct_blueprint;
  const hasConstruct =
    constructBlueprint !== null && Object.keys(constructBlueprint.fields).length > 0;

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

      {/* Field-level construct form: recursively render the construct blueprint
          tree. Leaf fields (fixed/from_var) render as KV rows or FieldBlocks
          showing their contract (`= literal` or `← path`). Template fields
          render via PromptToggle. Nested sub-constructs render as a header row
          followed by their indented sub-fields. */}
      {hasConstruct && (
        <>
          <div className="detail-section-label">FIELDS</div>
          <ConstructFieldsBlock
            blueprint={constructBlueprint}
            depth={0}
            resolvedFields={resolvedFields}
          />
        </>
      )}
    </>
  );
}

export function ComposeExecutionData(_props: { data: Record<string, unknown> }) {
  return null;
}
