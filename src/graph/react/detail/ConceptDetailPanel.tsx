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
  /**
   * Identity of the selected node/instance (e.g. the graph node id). Drives
   * the Data/Structure tab reset: a new `instanceKey` remounts the body so
   * the Data tab is selected again. Without it, two nodes sharing the same
   * concept AND the same stuff name/digest (typical for batch branches) would
   * keep the previous node's tab selection.
   */
  instanceKey?: string;
}

// ─── Component ──────────────────────────────────────────────────────────

export function ConceptDetailPanel({
  concept,
  ioData,
  isDryRun,
  resolveStorageUrl,
  canEmbedPdf,
  onOpenExternally,
  instanceKey,
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

      <ConceptBody
        key={
          instanceKey ??
          `${concept.code}:${ioData && "digest" in ioData ? ioData.digest : (ioData?.name ?? "")}`
        }
        concept={concept}
        ioData={ioData}
        isDryRun={isDryRun}
        resolveStorageUrl={resolveStorageUrl}
        canEmbedPdf={canEmbedPdf}
        onOpenExternally={onOpenExternally}
      />
    </>
  );
}

/**
 * Structure + data sections. When instance data exists, the two are split
 * into "Data" / "Structure" tabs with Data shown by default — the schema
 * table is reference material, not something to scroll past on every click.
 * Without data (dry run / unexecuted), the structure renders directly.
 */
function ConceptBody({
  concept,
  ioData,
  isDryRun,
  resolveStorageUrl,
  canEmbedPdf,
  onOpenExternally,
}: ConceptDetailPanelProps) {
  const hasData = Boolean(ioData) && !isDryRun;
  const [activeTab, setActiveTab] = React.useState<TabId>(hasData ? "data" : "structure");
  const baseId = React.useId();
  const tabId = (tab: TabId) => `${baseId}-tab-${tab}`;
  const panelId = (tab: TabId) => `${baseId}-tabpanel-${tab}`;

  const structure = concept.json_schema ? (
    <div>
      <div className="detail-section-label">Structure</div>
      <SchemaTable schema={concept.json_schema} isDryRun={isDryRun} />
    </div>
  ) : (
    <div className="detail-not-available">Schema not available</div>
  );

  if (!hasData) return structure;

  // ARIA tabs keyboard pattern: arrows move between the two tabs (and
  // activate, per "selection follows focus"), Home/End jump to first/last.
  const onTabKeyDown = (event: React.KeyboardEvent) => {
    let next: TabId;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowRight":
        next = activeTab === "data" ? "structure" : "data";
        break;
      case "Home":
        next = "data";
        break;
      case "End":
        next = "structure";
        break;
      default:
        return;
    }
    event.preventDefault();
    setActiveTab(next);
    document.getElementById(tabId(next))?.focus();
  };

  const renderTab = (tab: TabId, label: string) => (
    <button
      type="button"
      role="tab"
      id={tabId(tab)}
      aria-selected={activeTab === tab}
      aria-controls={panelId(tab)}
      tabIndex={activeTab === tab ? 0 : -1}
      className={`detail-tab ${activeTab === tab ? "detail-tab--active" : ""}`}
      onClick={() => setActiveTab(tab)}
      onKeyDown={onTabKeyDown}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="detail-tabs" role="tablist" aria-label="Concept views">
        {renderTab("data", "Data")}
        {renderTab("structure", "Structure")}
      </div>
      <div role="tabpanel" id={panelId(activeTab)} aria-labelledby={tabId(activeTab)}>
        {activeTab === "data" ? (
          <StuffViewer
            stuff={toStuffViewerData(ioData!)}
            resolveStorageUrl={resolveStorageUrl}
            canEmbedPdf={canEmbedPdf}
            onOpenExternally={onOpenExternally}
          />
        ) : (
          structure
        )}
      </div>
    </>
  );
}

type TabId = "data" | "structure";

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
    return ref.split("/").pop() ?? "(unresolved type)";
  }
  return "(unresolved type)";
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
