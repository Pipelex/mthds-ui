import React from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  BackgroundVariant,
} from "@xyflow/react";

import type {
  GraphSpec,
  GraphConfig,
  GraphDirection,
  GraphNode,
  GraphEdge,
  GraphNodeData,
  DataflowAnalysis,
  PipeStatus,
  ConceptInfo,
} from "@graph/types";
import { stuffDigestFromId, EDGE_TYPE } from "@graph/types";
import { resolveConceptRef } from "@graph/graphAnalysis";
import type { ResolveStorageUrl, StuffViewerData } from "../stuff/stuffViewerTypes";
import { findStuffDataByDigest } from "../stuff/stuffViewerUtils";
import { StuffViewer } from "../stuff/StuffViewer";
import { DetailPanel } from "../detail/DetailPanel";
import { useResizable } from "../detail/useResizable";
import { PipeDetailPanel } from "../detail/PipeDetailPanel";
import { ConceptDetailPanel } from "../detail/ConceptDetailPanel";
import type { AppNode, AppEdge, AppRFInstance } from "../rfTypes";
import { toAppNodes, toAppEdges } from "../rfTypes";
import { buildGraph } from "@graph/graphBuilders";
import { getLayoutedElements } from "@graph/graphLayout";
import { applyControllers } from "@graph/graphControllers";
import { DEFAULT_GRAPH_CONFIG } from "@graph/graphConfig";
import { hydrateLabels } from "./renderLabel";
import { GraphToolbar } from "./GraphToolbar";
import { controllerNodeTypes } from "../nodes/controller/ControllerGroupNode";
import { PipeCardRFNode } from "../nodes/pipe/PipeCardNode";

// Stable reference — must be declared outside the component to avoid ReactFlow re-mounts
const nodeTypes = {
  ...controllerNodeTypes,
  pipeCard: PipeCardRFNode,
};

export interface GraphViewerProps {
  graphspec: GraphSpec | null;
  config?: GraphConfig;
  /** Initial layout direction. Users can toggle this via the built-in toolbar. */
  initialDirection?: GraphDirection;
  /** Initial controller-grouping state. Users can toggle this via the built-in toolbar. */
  initialShowControllers?: boolean;
  /** Hide the built-in floating toolbar (direction + controllers toggle). */
  hideToolbar?: boolean;
  onNavigateToPipe?: (pipeCode: string, status?: PipeStatus) => void;
  onStuffNodeClick?: (stuffData: StuffViewerData) => void;
  onReactFlowInit?: (instance: AppRFInstance) => void;
  /** Layer 2 execution state: pipe_code → current status. Updates node status dots in real-time. */
  statusMap?: Record<string, PipeStatus>;
  /** Called when any node is clicked with full node data. Use for detail/inspector panels. */
  onNodeSelect?: (nodeId: string, nodeData: GraphNodeData, event: React.MouseEvent) => void;
  /** Called when the graph background (pane) is clicked. Use to dismiss detail panels. */
  onPaneClick?: () => void;
  /** Render extra content below the built-in detail panel content for the selected node. */
  renderDetailExtra?: (nodeId: string, nodeData: GraphNodeData) => React.ReactNode;
  /**
   * Resolver for `pipelex-storage://` URIs. Passed down to StuffViewer so it can
   * exchange internal URIs for browser-fetchable presigned URLs when rendering media.
   */
  resolveStorageUrl?: ResolveStorageUrl;
}

/** Stuff node detail: concept structure + data viewer. */
function StuffNodeDetail({
  stuffData,
  graphspec,
  resolveStorageUrl,
}: {
  stuffData: StuffViewerData;
  graphspec: GraphSpec | null;
  resolveStorageUrl?: ResolveStorageUrl;
}) {
  const conceptInfo = stuffData.concept && graphspec
    ? resolveConceptRef(graphspec, stuffData.concept)
    : undefined;

  return (
    <>
      {/* Concept structure (header + schema table) */}
      {conceptInfo ? (
        <ConceptDetailPanel
          concept={conceptInfo}
          ioData={stuffData}
          resolveStorageUrl={resolveStorageUrl}
        />
      ) : (
        /* Fallback: just show the StuffViewer if no concept info */
        <StuffViewer stuff={stuffData} resolveStorageUrl={resolveStorageUrl} />
      )}
    </>
  );
}

function cloneCachedNodes(nodes: GraphNode[]): GraphNode[] {
  return nodes.map((n) => ({
    ...n,
    position: { ...n.position },
    data: { ...n.data },
    style: n.style ? { ...n.style } : undefined,
  }));
}

/** Apply Layer 2 execution state overrides to rendered nodes. */
export function applyStatusOverrides(
  nodes: AppNode[],
  statusMap: Record<string, PipeStatus> | undefined,
): AppNode[] {
  if (!statusMap || Object.keys(statusMap).length === 0) return nodes;
  return nodes.map((node) => {
    const pipeCode = node.data.pipeCode;
    if (!pipeCode || !Object.hasOwn(statusMap, pipeCode)) return node;
    const newStatus = statusMap[pipeCode];
    if (node.data.pipeCardData?.status === newStatus) return node;
    return {
      ...node,
      data: {
        ...node.data,
        nodeData: node.data.nodeData
          ? { ...node.data.nodeData, status: newStatus }
          : node.data.nodeData,
        pipeCardData: node.data.pipeCardData
          ? { ...node.data.pipeCardData, status: newStatus }
          : node.data.pipeCardData,
      },
    };
  });
}

// ─── Detail panel selection state ──────────────────────────────────────

interface DetailSelection {
  kind: "pipe" | "stuff" | "concept";
  nodeId: string;
  nodeData: GraphNodeData;
  conceptInfo?: ConceptInfo;
  stuffData?: StuffViewerData;
}

export function GraphViewer(props: GraphViewerProps) {
  const {
    graphspec,
    config = DEFAULT_GRAPH_CONFIG,
    initialDirection,
    initialShowControllers,
    hideToolbar = false,
    onNavigateToPipe,
    onStuffNodeClick,
    onReactFlowInit,
    statusMap,
    onNodeSelect,
    onPaneClick,
    renderDetailExtra,
    resolveStorageUrl,
  } = props;

  const [direction, setDirection] = React.useState<GraphDirection>(
    () => initialDirection ?? config.direction ?? DEFAULT_GRAPH_CONFIG.direction ?? "TB",
  );
  const [showControllers, setShowControllers] = React.useState<boolean>(
    () =>
      initialShowControllers ??
      config.showControllers ??
      DEFAULT_GRAPH_CONFIG.showControllers ??
      false,
  );

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Detail panel state (built-in)
  const [detailSelection, setDetailSelection] = React.useState<DetailSelection | null>(null);
  const [conceptOverride, setConceptOverride] = React.useState<ConceptInfo | null>(null);

  // Panel resize
  const {
    width: panelWidth,
    isDragging: isPanelDragging,
    handleMouseDown: onResizeMouseDown,
  } = useResizable({ defaultWidth: 380, minWidth: 280, maxWidth: 800, containerRef });

  // Reset detail panel when graphspec changes
  React.useEffect(() => {
    setDetailSelection(null);
    setConceptOverride(null);
  }, [graphspec]);

  // Apply palette CSS vars to the container (scoped, auto-cleaned on unmount)
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const palette = config.paletteColors ?? DEFAULT_GRAPH_CONFIG.paletteColors;
    if (!palette) return;

    for (const [cssVar, value] of Object.entries(palette)) {
      el.style.setProperty(cssVar, value);
    }

    return () => {
      for (const cssVar of Object.keys(palette)) {
        el.style.removeProperty(cssVar);
      }
    };
  }, [config.paletteColors]);

  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdge>([]);
  const reactFlowRef = React.useRef<AppRFInstance | null>(null);
  const initialDataRef = React.useRef<{
    nodes: GraphNode[];
    edges: GraphEdge[];
    _analysis: DataflowAnalysis | null;
    _graphspec: GraphSpec | null;
  } | null>(null);
  const layoutCacheRef = React.useRef<{
    nodes: GraphNode[];
    edges: GraphEdge[];
    controllerPositions?: Record<string, { x: number; y: number; width: number; height: number }>;
  } | null>(null);

  // Collapse state: tracks which controllers the user explicitly expanded.
  // Parallel/Batch with >5 children are collapsed by default.
  const [expandedControllers, setExpandedControllers] = React.useState<Set<string>>(new Set());

  const toggleCollapse = React.useCallback((controllerId: string) => {
    setExpandedControllers((prev) => {
      const next = new Set(prev);
      if (next.has(controllerId)) next.delete(controllerId);
      else next.add(controllerId);
      return next;
    });
  }, []);

  const edgeType = config.edgeType || EDGE_TYPE.DEFAULT;
  const layoutConfig = React.useMemo(
    () => ({ nodesep: config.nodesep, ranksep: config.ranksep }),
    [config.nodesep, config.ranksep],
  );

  const showControllersRef = React.useRef(showControllers);
  showControllersRef.current = showControllers;
  const directionRef = React.useRef(direction);
  directionRef.current = direction;
  const layoutConfigRef = React.useRef(layoutConfig);
  layoutConfigRef.current = layoutConfig;
  const initialZoomRef = React.useRef(config.initialZoom);
  initialZoomRef.current = config.initialZoom;
  const panToTopRef = React.useRef(config.panToTop);
  panToTopRef.current = config.panToTop;
  const expandedRef = React.useRef(expandedControllers);
  expandedRef.current = expandedControllers;
  const toggleCollapseRef = React.useRef(toggleCollapse);
  toggleCollapseRef.current = toggleCollapse;
  const statusMapRef = React.useRef(statusMap);
  statusMapRef.current = statusMap;

  // Re-layout when direction or layout config changes
  React.useEffect(() => {
    if (!initialDataRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const data = initialDataRef.current;
        if (!data) return;
        const relayouted = await getLayoutedElements(
          data.nodes,
          data.edges,
          direction,
          layoutConfig,
          data._graphspec,
          data._analysis,
        );
        if (cancelled) return;
        layoutCacheRef.current = {
          nodes: relayouted.nodes,
          edges: relayouted.edges,
          controllerPositions: relayouted.controllerPositions,
        };
        const withControllers = applyControllers(
          cloneCachedNodes(relayouted.nodes),
          relayouted.edges,
          data._graphspec,
          data._analysis,
          showControllersRef.current,
          expandedRef.current,
          toggleCollapseRef.current,
          relayouted.controllerPositions,
        );
        setNodes(
          applyStatusOverrides(
            toAppNodes(hydrateLabels(withControllers.nodes)),
            statusMapRef.current,
          ),
        );
        setEdges(toAppEdges(withControllers.edges));
        setTimeout(() => {
          if (!cancelled && reactFlowRef.current) {
            reactFlowRef.current.fitView({ padding: 0.1 });
          }
        }, 50);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[GraphViewer] ELK layout failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [direction, layoutConfig]);

  // Rebuild controllers when showControllers or collapse state changes (reuses cached layout)
  React.useEffect(() => {
    if (!layoutCacheRef.current || !initialDataRef.current) return;
    const cachedNodes = cloneCachedNodes(layoutCacheRef.current.nodes);
    const cachedEdges = layoutCacheRef.current.edges;
    const withControllers = applyControllers(
      cachedNodes,
      cachedEdges,
      initialDataRef.current._graphspec,
      initialDataRef.current._analysis,
      showControllers,
      expandedControllers,
      toggleCollapse,
      layoutCacheRef.current.controllerPositions,
    );
    setNodes(
      applyStatusOverrides(toAppNodes(hydrateLabels(withControllers.nodes)), statusMapRef.current),
    );
    setEdges(toAppEdges(withControllers.edges));
  }, [showControllers, expandedControllers, toggleCollapse]);

  // Build + layout when graphspec/edgeType changes
  React.useEffect(() => {
    if (!graphspec) {
      initialDataRef.current = null;
      layoutCacheRef.current = null;
      setNodes([]);
      setEdges([]);
      return;
    }

    let cancelled = false;

    // Reset expand overrides when graph changes
    setExpandedControllers(new Set());

    const { graphData, analysis } = buildGraph(graphspec, edgeType);
    initialDataRef.current = {
      nodes: graphData.nodes,
      edges: graphData.edges,
      _analysis: analysis,
      _graphspec: graphspec,
    };

    (async () => {
      try {
        const currentDirection = directionRef.current;
        const currentLayoutConfig = layoutConfigRef.current;
        const needsLayout = graphData.nodes.some(
          (n) => !n.position || (n.position.x === 0 && n.position.y === 0),
        );
        const layouted = needsLayout
          ? await getLayoutedElements(
            graphData.nodes,
            graphData.edges,
            currentDirection,
            currentLayoutConfig,
            graphspec,
            analysis,
          )
          : {
            ...graphData,
            controllerPositions: {} as Record<
              string,
              { x: number; y: number; width: number; height: number }
            >,
          };
        if (cancelled) return;
        layoutCacheRef.current = {
          nodes: layouted.nodes,
          edges: layouted.edges,
          controllerPositions: layouted.controllerPositions,
        };
        const withControllers = applyControllers(
          cloneCachedNodes(layouted.nodes),
          layouted.edges,
          graphspec,
          analysis,
          showControllersRef.current,
          expandedRef.current,
          toggleCollapseRef.current,
          layouted.controllerPositions,
        );

        setNodes(
          applyStatusOverrides(
            toAppNodes(hydrateLabels(withControllers.nodes)),
            statusMapRef.current,
          ),
        );
        setEdges(toAppEdges(withControllers.edges));

        // Fit view after render, then apply zoom/pan overrides
        setTimeout(() => {
          if (!cancelled && reactFlowRef.current) {
            reactFlowRef.current.fitView({ padding: 0.1 });
            if (initialZoomRef.current !== undefined && initialZoomRef.current !== null) {
              reactFlowRef.current.zoomTo(initialZoomRef.current);
            }
            if (panToTopRef.current) {
              const vp = reactFlowRef.current.getViewport();
              reactFlowRef.current.setViewport({ x: vp.x, y: 20, zoom: vp.zoom });
            }
          }
        }, 100);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[GraphViewer] ELK layout failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [graphspec, edgeType]);

  // Apply Layer 2 execution state when statusMap changes (reuses cached layout).
  // On mount, statusMap is applied inline by the graphspec build effect above.
  // This effect handles runtime changes only (SSE updates arriving after initial render).
  React.useEffect(() => {
    if (!layoutCacheRef.current || !initialDataRef.current) return;
    const cachedNodes = cloneCachedNodes(layoutCacheRef.current.nodes);
    const cachedEdges = layoutCacheRef.current.edges;
    const withControllers = applyControllers(
      cachedNodes,
      cachedEdges,
      initialDataRef.current._graphspec,
      initialDataRef.current._analysis,
      showControllersRef.current,
      expandedRef.current,
      toggleCollapseRef.current,
      layoutCacheRef.current.controllerPositions,
    );
    setNodes(applyStatusOverrides(toAppNodes(hydrateLabels(withControllers.nodes)), statusMap));
    setEdges(toAppEdges(withControllers.edges));
  }, [statusMap]);

  // Handle node click — opens detail panel + fires external callbacks
  const onNodeClick = React.useCallback(
    (event: React.MouseEvent, node: AppNode) => {
      const nodeData = node.data;

      // Fire external callbacks
      onNodeSelect?.(node.id, nodeData, event);
      if (nodeData.isController || nodeData.isPipe) {
        const code = nodeData.pipeCode || nodeData.labelText;
        if (code && onNavigateToPipe) {
          onNavigateToPipe(code, nodeData.pipeCardData?.status as PipeStatus | undefined);
        }
      } else if (nodeData.isStuff && onStuffNodeClick && graphspec) {
        const digest = stuffDigestFromId(node.id);
        const sd = findStuffDataByDigest(graphspec, digest);
        if (sd) onStuffNodeClick(sd);
      }

      // Update detail panel (toggle off if same node clicked again)
      setConceptOverride(null);
      if (detailSelection?.nodeId === node.id && !conceptOverride) {
        setDetailSelection(null);
      } else if (nodeData.isPipe || nodeData.isController) {
        setDetailSelection({ kind: "pipe", nodeId: node.id, nodeData });
      } else if (nodeData.isStuff && graphspec) {
        const digest = stuffDigestFromId(node.id);
        const sd = findStuffDataByDigest(graphspec, digest);
        setDetailSelection({ kind: "stuff", nodeId: node.id, nodeData, stuffData: sd ?? undefined });
      }

      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === node.id })));
    },
    [setNodes, onNavigateToPipe, onNodeSelect, onStuffNodeClick, graphspec, detailSelection, conceptOverride],
  );

  const onInit = React.useCallback(
    (reactFlowInstance: AppRFInstance) => {
      reactFlowRef.current = reactFlowInstance;
      if (onReactFlowInit) {
        onReactFlowInit(reactFlowInstance);
      }
    },
    [onReactFlowInit],
  );

  // Dismiss detail panel on pane click
  const handlePaneClick = React.useCallback(() => {
    setDetailSelection(null);
    setConceptOverride(null);
    onPaneClick?.();
  }, [onPaneClick]);

  // Navigate from pipe IO concept → concept detail
  const handleConceptClick = React.useCallback(
    (conceptCode: string) => {
      if (!graphspec) return;
      const info = resolveConceptRef(graphspec, conceptCode);
      if (info) setConceptOverride(info);
    },
    [graphspec],
  );

  // Resolve the selected pipe's GraphSpecNode for the detail panel
  const selectedSpecNode =
    detailSelection?.kind === "pipe" && graphspec
      ? graphspec.nodes.find((n) => n.pipe_code === detailSelection.nodeData.pipeCode)
      : undefined;

  const detailOpen = detailSelection !== null || conceptOverride !== null;

  return (
    <div ref={containerRef} className="react-flow-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={handlePaneClick}
        onInit={onInit}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        defaultEdgeOptions={{ type: edgeType }}
        panOnScroll
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-bg-dots)"
        />
      </ReactFlow>
      <DetailPanel
        isOpen={detailOpen}
        onClose={handlePaneClick}
        width={panelWidth}
        isDragging={isPanelDragging}
        onResizeHandleMouseDown={onResizeMouseDown}
      >
        {conceptOverride ? (
          <ConceptDetailPanel concept={conceptOverride} />
        ) : selectedSpecNode && graphspec ? (
          <PipeDetailPanel
            node={selectedSpecNode}
            spec={graphspec}
            onConceptClick={handleConceptClick}
          />
        ) : detailSelection?.stuffData ? (
          <StuffNodeDetail
            stuffData={detailSelection.stuffData}
            graphspec={graphspec}
            resolveStorageUrl={resolveStorageUrl}
          />
        ) : null}
        {renderDetailExtra &&
          detailSelection &&
          !conceptOverride &&
          renderDetailExtra(detailSelection.nodeId, detailSelection.nodeData)}
      </DetailPanel>
      {!hideToolbar && (
        <GraphToolbar
          direction={direction}
          onDirectionChange={setDirection}
          showControllers={showControllers}
          onShowControllersChange={setShowControllers}
          rightOffset={detailOpen ? panelWidth : 0}
        />
      )}
    </div>
  );
}
