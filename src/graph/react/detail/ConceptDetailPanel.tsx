import React from "react";
import type { ConceptInfo, GraphSpecNodeIoItem } from "@graph/types";
import { StuffViewer } from "../stuff/StuffViewer";
import type { ResolveStorageUrl, StuffViewerData } from "../stuff/stuffViewerTypes";
import "./DetailPanel.css";

// ─── Props ──────────────────────────────────────────────────────────────

export interface ConceptDetailPanelProps {
  concept: ConceptInfo;
  /** IO data for this concept instance. Accepts GraphSpecNodeIoItem or StuffViewerData. */
  ioData?: GraphSpecNodeIoItem | StuffViewerData;
  /** Whether this is a dry run (schema only, no real data). */
  isDryRun?: boolean;
  /** Resolver for `pipelex-storage://` URIs when rendering media in StuffViewer. */
  resolveStorageUrl?: ResolveStorageUrl;
  /** Forwarded to {@link StuffViewer}. Set `false` when the host can't embed PDFs. */
  canEmbedPdf?: boolean;
  /** Forwarded to {@link StuffViewer}. Overrides default `window.open` behavior. */
  onOpenExternally?: (url: string, filename?: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────

export function ConceptDetailPanel({
  concept,
  ioData,
  isDryRun,
  resolveStorageUrl,
  canEmbedPdf,
  onOpenExternally,
}: ConceptDetailPanelProps) {
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
          <StuffViewer
            stuff={toStuffViewerData(ioData)}
            resolveStorageUrl={resolveStorageUrl}
            canEmbedPdf={canEmbedPdf}
            onOpenExternally={onOpenExternally}
          />
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

function toStuffViewerData(ioData: GraphSpecNodeIoItem | StuffViewerData): StuffViewerData {
  // Already a StuffViewerData (has "digest" key)
  if ("digest" in ioData) return ioData as StuffViewerData;
  // Convert from GraphSpecNodeIoItem
  return {
    digest: (ioData as GraphSpecNodeIoItem).digest ?? "",
    name: (ioData as GraphSpecNodeIoItem).name,
    concept: (ioData as GraphSpecNodeIoItem).concept,
    contentType: (ioData as GraphSpecNodeIoItem).content_type,
    data: (ioData as GraphSpecNodeIoItem).data,
    dataText: (ioData as GraphSpecNodeIoItem).data_text,
    dataHtml: (ioData as GraphSpecNodeIoItem).data_html,
  };
}
