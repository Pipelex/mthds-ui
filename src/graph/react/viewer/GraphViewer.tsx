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
  DataflowAnalysis,
} from "@graph/types";
import type { AppNode, AppEdge, AppRFInstance } from "../rfTypes";
import { toAppNodes, toAppEdges } from "../rfTypes";
import { buildGraph } from "@graph/graphBuilders";
import { getLayoutedElements, ensureControllerSpacing } from "@graph/graphLayout";
import { applyControllers } from "@graph/graphControllers";
import { DEFAULT_GRAPH_CONFIG } from "@graph/graphConfig";
import { hydrateLabels } from "./renderLabel";
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
  direction?: GraphDirection;
  showControllers?: boolean;
  onNavigateToPipe?: (pipeCode: string) => void;
  onReactFlowInit?: (instance: AppRFInstance) => void;
}

function cloneCachedNodes(nodes: GraphNode[]): GraphNode[] {
  return nodes.map((n) => ({
    ...n,
    position: { ...n.position },
    data: { ...n.data },
    style: n.style ? { ...n.style } : undefined,
  }));
}

export function GraphViewer(props: GraphViewerProps) {
  const {
    graphspec,
    config = DEFAULT_GRAPH_CONFIG,
    direction = config.direction ?? DEFAULT_GRAPH_CONFIG.direction ?? "TB",
    showControllers = config.showControllers ?? DEFAULT_GRAPH_CONFIG.showControllers ?? false,
    onNavigateToPipe,
    onReactFlowInit,
  } = props;

  const containerRef = React.useRef<HTMLDivElement>(null);

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
  const layoutCacheRef = React.useRef<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);

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

  const edgeType = config.edgeType || "bezier";
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

  // Re-layout when direction or layout config changes
  React.useEffect(() => {
    if (!initialDataRef.current) return;

    const relayouted = getLayoutedElements(
      initialDataRef.current.nodes,
      initialDataRef.current.edges,
      direction,
      layoutConfig,
    );
    const spaced = initialDataRef.current._analysis
      ? ensureControllerSpacing(
          relayouted.nodes,
          initialDataRef.current._graphspec,
          initialDataRef.current._analysis,
          direction,
        )
      : relayouted.nodes;
    layoutCacheRef.current = { nodes: spaced, edges: relayouted.edges };
    const withControllers = applyControllers(
      cloneCachedNodes(spaced),
      relayouted.edges,
      initialDataRef.current._graphspec,
      initialDataRef.current._analysis,
      showControllersRef.current,
      expandedRef.current,
      toggleCollapseRef.current,
    );
    setNodes(toAppNodes(hydrateLabels(withControllers.nodes)));
    setEdges(toAppEdges(withControllers.edges));
    const timer = setTimeout(() => {
      if (reactFlowRef.current) {
        reactFlowRef.current.fitView({ padding: 0.1 });
      }
    }, 50);
    return () => clearTimeout(timer);
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
    );
    setNodes(toAppNodes(hydrateLabels(withControllers.nodes)));
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

    // Reset expand overrides when graph changes
    setExpandedControllers(new Set());

    const { graphData, analysis } = buildGraph(graphspec, edgeType);
    initialDataRef.current = {
      nodes: graphData.nodes,
      edges: graphData.edges,
      _analysis: analysis,
      _graphspec: graphspec,
    };

    const currentDirection = directionRef.current;
    const currentLayoutConfig = layoutConfigRef.current;
    const needsLayout = graphData.nodes.some(
      (n) => !n.position || (n.position.x === 0 && n.position.y === 0),
    );
    const layouted = needsLayout
      ? getLayoutedElements(graphData.nodes, graphData.edges, currentDirection, currentLayoutConfig)
      : graphData;
    const spaced =
      analysis && graphspec
        ? ensureControllerSpacing(layouted.nodes, graphspec, analysis, currentDirection)
        : layouted.nodes;
    layoutCacheRef.current = { nodes: spaced, edges: layouted.edges };
    const withControllers = applyControllers(
      cloneCachedNodes(spaced),
      layouted.edges,
      graphspec,
      analysis,
      showControllersRef.current,
      expandedRef.current,
      toggleCollapseRef.current,
    );

    setNodes(toAppNodes(hydrateLabels(withControllers.nodes)));
    setEdges(toAppEdges(withControllers.edges));

    // Fit view after render, then apply zoom/pan overrides
    const timer = setTimeout(() => {
      if (reactFlowRef.current) {
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
    return () => clearTimeout(timer);
  }, [graphspec, edgeType]);

  // Handle node click
  const onNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: AppNode) => {
      const nodeData = node.data;
      if (nodeData.isController || nodeData.isPipe) {
        const code = nodeData.pipeCode || nodeData.labelText;
        if (code && onNavigateToPipe) {
          onNavigateToPipe(code);
        }
      }

      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === node.id })));
    },
    [setNodes, onNavigateToPipe],
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

  return (
    <div ref={containerRef} className="react-flow-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
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
    </div>
  );
}
