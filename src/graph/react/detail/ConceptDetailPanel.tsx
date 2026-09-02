import React from "react";
import type { ConceptInfo, GraphSpecNodeIoItem } from "@graph/types";
import "./DetailPanel.css";

// ─── Props ──────────────────────────────────────────────────────────────

export interface ConceptDetailPanelProps {
  concept: ConceptInfo;
  /** The data item for this concept instance, as the `GraphSpec` holds it. */
  ioData?: GraphSpecNodeIoItem;
  /** Whether this is a dry run (schema only, no real data). */
  isDryRun?: boolean;
  /**
   * Renders the data half. Supplied by the host (or by this package's own
   * `./form/react` entry, which renders it through the form kernel's
   * descriptor-driven `StuffViewer`); see `stuffRender.ts` for why the graph
   * does not render data itself any more.
   *
   * Without it — or when it returns nothing for this item — the panel shows the
   * structure table alone and no tabs, which is what a viewer that has not been
   * given a renderer honestly has to offer.
   */
  renderData?: () => React.ReactNode;
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
  renderData,
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
        renderData={renderData}
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
function ConceptBody({ concept, ioData, isDryRun, renderData }: ConceptDetailPanelProps) {
  // The data tab exists only when something can actually fill it. Three
  // conditions, and the third is the new one: an item, a real run behind it,
  // and a renderer that produced something for it. A tab that opens onto an
  // empty pane is worse than no tab, because it reads as data that failed to
  // load rather than as a viewer that was never given a way to show it.
  const dataView = ioData && !isDryRun ? renderData?.() : undefined;
  const hasData = Boolean(dataView);
  const [activeTab, setActiveTab] = React.useState<TabId>(hasData ? "data" : "structure");
  const baseId = React.useId();
  const tabId = (tab: TabId) => `${baseId}-tab-${tab}`;
  const panelId = (tab: TabId) => `${baseId}-tabpanel-${tab}`;

  const structure = concept.json_schema ? (
    <div>
      <div className="detail-section-label">Structure</div>
      <SchemaTable schema={concept.json_schema} />
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
        {activeTab === "data" ? dataView : structure}
      </div>
    </>
  );
}

type TabId = "data" | "structure";

// ─── Schema table renderer ──────────────────────────────────────────────

function SchemaTable({ schema }: { schema: Record<string, unknown> }) {
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  const required = new Set<string>((schema.required as string[]) ?? []);

  if (!properties || Object.keys(properties).length === 0) {
    return <div className="detail-not-available">No fields defined</div>;
  }

  const fields = Object.entries(properties);

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
        {fields.map(([fieldName, fieldSchema]) => (
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
  if (typeof schema.type === "string") return schema.type;
  if (Array.isArray(schema.type)) return schema.type.join(" | ");
  if (schema.anyOf) return "union";
  if (schema.allOf) return "all";
  if (typeof schema.$ref === "string") {
    const ref = schema.$ref;
    return ref.split("/").pop() ?? "(unresolved type)";
  }
  return "(unresolved type)";
}
