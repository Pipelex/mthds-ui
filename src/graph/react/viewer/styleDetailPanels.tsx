import React from "react";
import type { SaveFiles } from "@pipelex/mthds-form";
import type {
  DownloadDisplay,
  ResolveRendition,
  ResolveShareUrl,
  ResolveUrl,
} from "@pipelex/mthds-form/react";
import type {
  ConceptInfo,
  GraphEdge,
  GraphNodeData,
  GraphSpec,
  GraphSpecNodeIoItem,
  GraphStyleId,
  GraphTheme,
} from "@graph/types";
import { GRAPH_SPEC_MODE, GRAPH_STYLE, graphSpecMode } from "@graph/types";
import { resolveConceptRef } from "@graph/graphAnalysis";
import { buildSimpleNodeDetail } from "@graph/styles/simpleDetail";
import type { SimpleDetail, SimpleDetailTarget, SimpleValue } from "@graph/styles/simpleDetail";
import type { SimpleValueFlow } from "@graph/styles/simpleStyle";
import { StuffResultPanel } from "../detail/StuffResultPanel";
import { PipeDetailPanel } from "../detail/PipeDetailPanel";
import { ConceptDetailPanel } from "../detail/ConceptDetailPanel";
import { SimpleDetailPanel } from "../styles/simple/SimpleDetailPanel";
import type { AppNode } from "../rfTypes";
import { resultDescriptors, type GraphArtifacts } from "./graphArtifacts";

// The detail panel each graph style opens, keyed by `GraphStyleId` beside the
// style's descriptor, pipeline and node components, so a new style does not
// compile until it says which panel its nodes open. The viewer owns the panel's
// frame (`DetailPanel`), the selection and the concept a pill opened; a style's
// panel draws what goes inside.

// ─── The selection ──────────────────────────────────────────────────────────

/** What the detail panel is open on: a node of the drawing, or one of its arrows. */
export type DetailSelection =
  | {
      kind: "pipe" | "stuff" | "concept";
      nodeId: string;
      nodeData: GraphNodeData;
      conceptInfo?: ConceptInfo;
      stuffData?: GraphSpecNodeIoItem;
      /** `domain.code` of the pipe that produced the stuff, when one did. */
      producerPipeRef?: string;
      /** The first pipe reading it, for the method inputs no pipe produced. */
      consumer?: { pipeRef: string; slotName: string };
    }
  | {
      /** An arrow of a style whose arrows carry values (`valueArrows`), by its two ends. */
      kind: "arrow";
      edgeId: string;
      source: string;
      target: string;
    };

/** The node a selection is open on, or null for an arrow. */
export function selectedNodeId(selection: DetailSelection | null): string | null {
  return selection && selection.kind !== "arrow" ? selection.nodeId : null;
}

// ─── What a style's panel receives ──────────────────────────────────────────

/** How the result view fetches and saves a value's files: the viewer's own props, passed on. */
export interface ValueRenderOptions {
  resolveUrl?: ResolveUrl;
  resolveRendition?: ResolveRendition;
  resolveShareUrl?: ResolveShareUrl;
  saveFiles?: SaveFiles;
  downloads?: DownloadDisplay;
}

/**
 * What a style projected beyond its nodes, for a panel that says what the
 * canvas does not draw: the edges with the values they carry, where each value
 * goes, the runs each node stands for, and what each frame holds.
 */
export interface StyleDrawing {
  edges: readonly GraphEdge[];
  valueFlows: ReadonlyMap<string, SimpleValueFlow>;
  runs: ReadonlyMap<string, readonly string[]>;
  frameContents: Readonly<Record<string, readonly string[]>>;
}

export interface StyleDetailPanelProps {
  selection: DetailSelection;
  graphspec: GraphSpec | null;
  /** The descriptors that came with `graphspec`, in the same `graph` object. */
  artifacts: GraphArtifacts | null;
  theme: GraphTheme;
  valueOptions: ValueRenderOptions;
  /** The nodes on the canvas, as drawn: status overrides and decorations applied. */
  nodes: readonly AppNode[];
  /** What the active style projected; null while a switch of style has not been drawn yet. */
  drawing: StyleDrawing | null;
  /** Opens a concept from a pill of the detailed panel. */
  onConceptClick: (conceptCode: string) => void;
  /** Selects a drawn node and brings it into view, as a click on it would. */
  onOpenNode: (nodeId: string, event: React.MouseEvent) => void;
}

export const STYLE_DETAIL_PANELS: Record<
  GraphStyleId,
  (props: StyleDetailPanelProps) => React.ReactNode
> = {
  [GRAPH_STYLE.DETAILED]: DetailedStylePanel,
  [GRAPH_STYLE.SIMPLE]: SimpleStylePanel,
};

// ─── The detailed style's panel ─────────────────────────────────────────────

/**
 * The pipe's code, its inputs, outputs and settings, or a value's concept and
 * data: the panel the viewer drew before styles existed. A selection it cannot
 * resolve, such as an arrow, draws nothing.
 */
function DetailedStylePanel({
  selection,
  graphspec,
  artifacts,
  theme,
  valueOptions,
  onConceptClick,
}: StyleDetailPanelProps): React.ReactNode {
  if (selection.kind === "arrow" || !graphspec) return null;
  if (selection.kind === "pipe") {
    // By node id, since a pipe code does not name one node: two invocations of
    // a pipe share it, and so do two bindings of one path. A pipe card, a
    // controller group and a folded controller's card all carry their spec
    // node's id.
    const node = graphspec.nodes.find((n) => n.id === selection.nodeId);
    return node ? (
      <PipeDetailPanel node={node} spec={graphspec} onConceptClick={onConceptClick} />
    ) : null;
  }
  if (!selection.stuffData) return null;
  return (
    <StuffNodeDetail
      nodeId={selection.nodeId}
      stuffData={selection.stuffData}
      producerPipeRef={selection.producerPipeRef}
      consumer={selection.consumer}
      graphspec={graphspec}
      artifacts={artifacts}
      theme={theme}
      {...valueOptions}
    />
  );
}

/** Stuff node detail: concept structure, plus whatever the host renders for its data. */
function StuffNodeDetail({
  nodeId,
  stuffData,
  producerPipeRef,
  consumer,
  graphspec,
  artifacts,
  theme,
  ...valueOptions
}: {
  /** Selected graph node id — identity for per-node panel state (tab reset). */
  nodeId: string;
  stuffData: GraphSpecNodeIoItem;
  producerPipeRef?: string;
  consumer?: { pipeRef: string; slotName: string };
  graphspec: GraphSpec | null;
  /** The descriptors that came with `graphspec`, in the same `graph` object. */
  artifacts: GraphArtifacts | null;
  theme: GraphTheme;
} & ValueRenderOptions) {
  const conceptInfo =
    stuffData.concept && graphspec ? resolveConceptRef(graphspec, stuffData.concept) : undefined;
  const isDryRun = graphSpecMode(graphspec) === GRAPH_SPEC_MODE.DRY;

  // Built here rather than inside `ConceptDetailPanel` so both branches below
  // render the SAME panel: a stuff with no concept in the spec is still a stuff
  // whose value can be shown, and it is exactly the case the old fallback
  // treated as second-class.
  //
  // Both artifacts or neither. The contract names the payload's shape and the
  // descriptor says what the result IS, so a panel given one of the two would be
  // guessing the other — which is the whole failure `output_form` exists to end.
  const descriptors = resultDescriptors(artifacts);
  const renderData = descriptors
    ? () => (
        <ResultView
          artifacts={artifacts}
          graphspec={graphspec}
          stuff={stuffData}
          producerPipeRef={producerPipeRef}
          consumer={consumer}
          theme={theme}
          valueOptions={valueOptions}
        />
      )
    : undefined;

  if (conceptInfo) {
    return (
      <ConceptDetailPanel
        concept={conceptInfo}
        ioData={stuffData}
        isDryRun={isDryRun}
        instanceKey={nodeId}
        renderData={renderData}
      />
    );
  }
  if (isDryRun) return <div className="detail-not-available">Dry run data hidden</div>;
  // No concept in the spec, so there is no structure to show and no tabs to
  // choose between — just the data, if anything can render it.
  return <>{renderData?.() ?? <div className="detail-not-available">No data</div>}</>;
}

/** A value through the form kernel's result view, by the descriptors that came with the spec. */
function ResultView({
  artifacts,
  graphspec,
  stuff,
  producerPipeRef,
  consumer,
  theme,
  valueOptions,
}: {
  artifacts: GraphArtifacts | null;
  graphspec: GraphSpec | null;
  stuff: GraphSpecNodeIoItem;
  producerPipeRef?: string;
  consumer?: { pipeRef: string; slotName: string };
  theme: GraphTheme;
  valueOptions: ValueRenderOptions;
}) {
  const descriptors = resultDescriptors(artifacts);
  if (!descriptors) return null;
  const concept =
    stuff.concept && graphspec ? resolveConceptRef(graphspec, stuff.concept) : undefined;
  const { resolveUrl, resolveRendition, resolveShareUrl, saveFiles, downloads } = valueOptions;
  return (
    <StuffResultPanel
      {...descriptors}
      stuff={stuff}
      {...(concept ? { concept } : {})}
      {...(producerPipeRef ? { producerPipeRef } : {})}
      {...(consumer ? { consumer } : {})}
      {...(resolveUrl ? { resolveUrl } : {})}
      {...(resolveRendition ? { resolveRendition } : {})}
      {...(resolveShareUrl ? { resolveShareUrl } : {})}
      {...(saveFiles ? { saveFiles } : {})}
      {...(downloads ? { downloads } : {})}
      theme={theme}
    />
  );
}

// ─── The simple style's panel ───────────────────────────────────────────────

/**
 * The simple style's panel, in the words the canvas uses. A selection the
 * simple drawing does not hold, such as a node left open across a switch of
 * style that the simple style does not draw, gets the detailed panel instead,
 * so the reader is never shown an empty panel.
 */
function SimpleStylePanel(props: StyleDetailPanelProps): React.ReactNode {
  const { selection, graphspec, artifacts, theme, valueOptions, nodes, drawing, onOpenNode } =
    props;
  const detail = React.useMemo(() => {
    if (!graphspec || !drawing) return null;
    const target: SimpleDetailTarget =
      selection.kind === "arrow"
        ? { kind: "arrow", source: selection.source, target: selection.target }
        : { kind: "node", id: selection.nodeId };
    return buildSimpleNodeDetail(
      {
        graphspec,
        nodes: nodes.map((n) => ({ id: n.id, type: n.type ?? "", data: n.data })),
        edges: drawing.edges,
        valueFlows: drawing.valueFlows,
        runs: drawing.runs,
        frameContents: drawing.frameContents,
      },
      target,
    );
  }, [graphspec, drawing, nodes, selection]);

  if (!detail || !graphspec) return <DetailedStylePanel {...props} />;

  const renderValue = (value: SimpleValue): React.ReactNode => {
    const location = value.location;
    if (!location || location.item.data === undefined || location.item.data === null) return null;
    if (!resultDescriptors(artifacts)) return null;
    return (
      <ResultView
        artifacts={artifacts}
        graphspec={graphspec}
        stuff={location.item}
        producerPipeRef={location.producerPipeRef}
        consumer={location.consumer}
        theme={theme}
        valueOptions={valueOptions}
      />
    );
  };

  return (
    <SimpleDetailPanel
      // A new target opens with its folds closed and its first value open.
      key={detailKey(detail)}
      detail={detail}
      mode={graphSpecMode(graphspec)}
      renderValue={renderValue}
      renderTechnical={technicalFor(detail, graphspec)}
      onOpenNode={onOpenNode}
    />
  );
}

function detailKey(detail: SimpleDetail): string {
  return detail.kind === "arrow" ? `arrow:${detail.edgeId}` : `node:${detail.nodeId}`;
}

/**
 * What the technical fold holds: the detailed panel for the same node, its
 * pills inert so a click inside the fold never replaces the simple panel, or a
 * value's concept with its types. An arrow has none: its values carry theirs.
 */
function technicalFor(
  detail: SimpleDetail,
  graphspec: GraphSpec,
): (() => React.ReactNode) | undefined {
  switch (detail.kind) {
    case "step":
    case "decision":
    case "frame":
      return () => <PipeDetailPanel node={detail.specNode} spec={graphspec} />;
    case "value": {
      const item = detail.value.location?.item;
      const concept = item?.concept ? resolveConceptRef(graphspec, item.concept) : undefined;
      if (!concept) return undefined;
      return () => <ConceptDetailPanel concept={concept} ioData={item} />;
    }
    case "arrow":
      return undefined;
  }
}
