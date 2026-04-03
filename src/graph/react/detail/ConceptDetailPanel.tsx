import React from "react";
import type { ConceptInfo, GraphSpecNodeIoItem } from "@graph/types";
import { StuffViewer } from "../stuff/StuffViewer";
import type { StuffViewerData } from "../stuff/stuffViewerTypes";
import "./DetailPanel.css";

// ─── Props ──────────────────────────────────────────────────────────────

export interface ConceptDetailPanelProps {
  concept: ConceptInfo;
  /** IO data for this concept instance (from a live run). If provided, shows real data. */
  ioData?: GraphSpecNodeIoItem;
  /** Whether this is a dry run (schema only, no real data). */
  isDryRun?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────

export function ConceptDetailPanel({ concept, ioData, isDryRun }: ConceptDetailPanelProps) {
  return (
    <>
      {/* Header */}
      <div className="detail-header">
        <span className="detail-concept-code">{concept.code}</span>
        <span className="detail-concept-domain">{concept.domain_code}</span>
      </div>

      {/* Description */}
      {concept.description && <div className="detail-description">{concept.description}</div>}

      {/* Refinement chain */}
      {concept.refines && (
        <div className="detail-refines">
          refines <span className="detail-refines-code">{concept.refines}</span>
        </div>
      )}

      {/* Structure schema */}
      {concept.json_schema ? (
        <div>
          <div className="detail-section-label">Structure</div>
          <SchemaTable schema={concept.json_schema} isDryRun={isDryRun} />
        </div>
      ) : (
        <div className="detail-not-available">Schema not available</div>
      )}

      {/* Instance data (live runs only) */}
      {ioData && !isDryRun && (
        <div>
          <div className="detail-section-label">Data</div>
          <StuffViewer stuff={ioDataToStuffViewerData(ioData)} />
        </div>
      )}
    </>
  );
}

// ─── Schema table renderer ──────────────────────────────────────────────

function SchemaTable({
  schema,
  isDryRun,
}: {
  schema: Record<string, unknown>;
  isDryRun?: boolean;
}) {
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  const required = new Set<string>((schema.required as string[]) ?? []);

  if (!properties || Object.keys(properties).length === 0) {
    return <div className="detail-not-available">No fields defined</div>;
  }

  const fields = Object.entries(properties);
  // In dry run mode, only show required fields
  const visibleFields = isDryRun ? fields.filter(([name]) => required.has(name)) : fields;

  return (
    <table className="detail-schema-table">
      <thead>
        <tr>
          <th>Field</th>
          <th>Type</th>
          <th></th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {visibleFields.map(([fieldName, fieldSchema]) => (
          <tr key={fieldName}>
            <td className="detail-schema-field">{fieldName}</td>
            <td className="detail-schema-type">{extractType(fieldSchema)}</td>
            <td>
              {required.has(fieldName) && <span className="detail-schema-required">req</span>}
            </td>
            <td>{(fieldSchema.description as string) ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function extractType(schema: Record<string, unknown>): string {
  if (schema.type) return String(schema.type);
  if (schema.anyOf) return "union";
  if (schema.allOf) return "all";
  if (schema.$ref) {
    const ref = String(schema.$ref);
    return ref.split("/").pop() ?? "ref";
  }
  return "unknown";
}

function ioDataToStuffViewerData(ioData: GraphSpecNodeIoItem): StuffViewerData {
  return {
    digest: ioData.digest ?? "",
    name: ioData.name,
    concept: ioData.concept,
    contentType: ioData.content_type,
    data: ioData.data,
    dataText: ioData.data_text,
    dataHtml: ioData.data_html,
  };
}
