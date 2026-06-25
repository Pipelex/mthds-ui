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
  FoldMode,
  FoldToggleOptions,
  GraphTheme,
  GraphThemeMode,
  PipeStatus,
  ConceptInfo,
} from "@graph/types";
import {
  stuffDigestFromId,
  EDGE_TYPE,
  FOLD_MODE,
  GRAPH_DIRECTION,
  GRAPH_THEME_MODE,
} from "@graph/types";
import { useSystemTheme } from "./useSystemTheme";
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
import { validateGraphSpec } from "@graph/validateGraphSpec";
import { applyFolds, findCousinControllers } from "@graph/graphFolds";
import { getLayoutedElements } from "@graph/graphLayout";
import { applyControllers } from "@graph/graphControllers";
import { DEFAULT_GRAPH_CONFIG, getPaletteForTheme } from "@graph/graphConfig";
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
  /**
   * Initial fold state applied once per graphspec. `"folded"` collapses every
   * controller into a pipe card on first render; `"expanded"` leaves them all
   * as group wrappers; `"auto"` is reserved for future heuristics and currently
   * behaves like `"expanded"`. Users can still fold/unfold individually via the
   * built-in toolbar afterwards.
   */
  initialFoldMode?: FoldMode;
  /** Hide the built-in floating toolbar (direction + controllers toggle). */
  hideToolbar?: boolean;
  /**
   * Theme *mode*: `dark | light | system`. Reactive: passing it as a prop drives
   * the active mode, and clearing it back to `undefined` hands control back to
   * `config.theme` (or the default `system`). Users can also cycle it via the
   * built-in toolbar button (unless `showThemeToggle` is `false`).
   *
   * `system` resolves to the environment theme — the browser's
   * `prefers-color-scheme`, or `systemTheme` when injected.
   *
   * Defaults to `config.theme` or `"system"`.
   */
  theme?: GraphThemeMode;
  /**
   * Host-injected environment theme, authoritative when set. Forwarded to the
   * `system` resolver so non-browser hosts (e.g. VS Code webviews, where
   * `prefers-color-scheme` is unreliable) can drive `system` from their own
   * detection. When omitted, `system` follows the browser's `prefers-color-scheme`.
   */
  systemTheme?: GraphTheme;
  /**
   * Whether to render the theme toggle button in the built-in toolbar.
   * Defaults to `true`. Set to `false` to hide it (useful when the host app
   * fully controls `theme` from the outside).
   */
  showThemeToggle?: boolean;
  /**
   * Called whenever the theme changes — from the built-in toggle, from external
   * prop / config updates, or when `system` re-resolves because the environment
   * changed. Receives both the selected `mode` (for persistence) and the
   * `resolvedTheme` (for keeping page chrome outside the container in sync).
   */
  onThemeChange?: (mode: GraphThemeMode, resolvedTheme: GraphTheme) => void;
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
  /**
   * Set to `false` when the host cannot render `<embed type="application/pdf">`
   * — e.g. VS Code webviews, which run inside Electron without the Chromium
   * PDFium plugin. Forwarded to StuffViewer.
   *
   * Default: `true`.
   */
  canEmbedPdf?: boolean;
  /**
   * Replaces the default `window.open(url, "_blank")` behavior used by the
   * StuffViewer toolbar and the PDF fallback tile. Wire this to your host's
   * external-open mechanism (e.g. `vscode.env.openExternal` via postMessage).
   */
  onOpenExternally?: (url: string, filename?: string) => void;
}

/** Stuff node detail: concept structure + data viewer. */
function StuffNodeDetail({
  nodeId,
  stuffData,
  graphspec,
  resolveStorageUrl,
  canEmbedPdf,
  onOpenExternally,
}: {
  /** Selected graph node id — identity for per-node panel state (tab reset). */
  nodeId: string;
  stuffData: StuffViewerData;
  graphspec: GraphSpec | null;
  resolveStorageUrl?: ResolveStorageUrl;
  canEmbedPdf?: boolean;
  onOpenExternally?: (url: string, filename?: string) => void;
}) {
  const conceptInfo =
    stuffData.concept && graphspec ? resolveConceptRef(graphspec, stuffData.concept) : undefined;

  return (
    <>
      {/* Concept structure (header + schema table) */}
      {conceptInfo ? (
        <ConceptDetailPanel
          concept={conceptInfo}
          ioData={stuffData}
          instanceKey={nodeId}
          resolveStorageUrl={resolveStorageUrl}
          canEmbedPdf={canEmbedPdf}
          onOpenExternally={onOpenExternally}
        />
      ) : (
        /* Fallback: just show the StuffViewer if no concept info */
        <StuffViewer
          stuff={stuffData}
          resolveStorageUrl={resolveStorageUrl}
          canEmbedPdf={canEmbedPdf}
          onOpenExternally={onOpenExternally}
        />
      )}
    </>
  );
}

/**
 * Translate a fold mode + the set of available controller IDs into an initial
 * `foldedControllers` Set. `"auto"` is reserved for a future renderer-defined
 * heuristic and currently behaves like `"expanded"`.
 */
function seedFoldedControllers(mode: FoldMode, controllerIds: ReadonlySet<string>): Set<string> {
  if (mode === FOLD_MODE.FOLDED) return new Set(controllerIds);
  return new Set();
}

/**
 * Resolve the externally-driven theme *mode* from `(themeProp, config.theme,
 * default)`. Pure function so the reactivity contract is unit-testable without
 * React.
 *
 * Contract — must hold for every transition (regression-tested in
 * `__tests__/themeResolution.test.ts`):
 * - `themeProp` wins when set
 * - falls back to `config.theme` when `themeProp` is undefined (so a host can
 *   hand theme control back to config after passing it as a prop)
 * - falls back to the library default (`system`) when neither is set
 * - a `themeProp` transition controlled→undefined→same-prior-value still
 *   round-trips through the config fallback rather than silently re-using
 *   the previous prop value
 */
export function resolveExternalThemeMode(
  themeProp: GraphThemeMode | undefined,
  configTheme: GraphThemeMode | undefined,
): GraphThemeMode {
  return themeProp ?? configTheme ?? DEFAULT_GRAPH_CONFIG.theme ?? GRAPH_THEME_MODE.SYSTEM;
}

/**
 * Collapse a theme mode + the detected environment theme into the binary
 * `GraphTheme` that drives the palette and container class. `system` follows the
 * environment; `dark`/`light` are returned as-is. Pure + exported for testing.
 */
export function resolveActiveTheme(mode: GraphThemeMode, systemTheme: GraphTheme): GraphTheme {
  return mode === GRAPH_THEME_MODE.SYSTEM ? systemTheme : mode;
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
    graphspec: graphspecProp,
    config = DEFAULT_GRAPH_CONFIG,
    initialDirection,
    initialShowControllers,
    initialFoldMode,
    hideToolbar = false,
    theme: themeProp,
    systemTheme: systemThemeProp,
    showThemeToggle = true,
    onThemeChange,
    onNavigateToPipe,
    onStuffNodeClick,
    onReactFlowInit,
    statusMap,
    onNodeSelect,
    onPaneClick,
    renderDetailExtra,
    resolveStorageUrl,
    canEmbedPdf,
    onOpenExternally,
  } = props;

  // Single boundary validator for the React render path — mirrors the standalone
  // adapter (src/standalone/adapter.ts). Memoized on prop identity so it runs
  // once per spec; validateGraphSpec normalizes io in place and is idempotent.
  const graphspec = React.useMemo(
    () => (graphspecProp === null ? null : validateGraphSpec(graphspecProp)),
    [graphspecProp],
  );

  const [direction, setDirection] = React.useState<GraphDirection>(
    () =>
      initialDirection ?? config.direction ?? DEFAULT_GRAPH_CONFIG.direction ?? GRAPH_DIRECTION.TB,
  );

  // Resolve the externally-driven mode on every render so prop AND config
  // changes both propagate (regression for PR-41 review comments: prop
  // clearing must fall back through config, and config.theme changes must
  // not stay stale). `resolveExternalThemeMode` is exported + unit-tested.
  const externalMode = resolveExternalThemeMode(themeProp, config.theme);
  const [mode, setMode] = React.useState<GraphThemeMode>(externalMode);
  const prevExternalModeRef = React.useRef<GraphThemeMode>(externalMode);
  React.useEffect(() => {
    if (externalMode !== prevExternalModeRef.current) {
      prevExternalModeRef.current = externalMode;
      setMode(externalMode);
    }
  }, [externalMode]);

  // Resolve `system` to a binary theme via the environment. `systemThemeProp`,
  // when set, is authoritative (host owns detection); otherwise this follows
  // the browser's `prefers-color-scheme` live.
  const systemTheme = useSystemTheme(systemThemeProp);
  const resolvedTheme = resolveActiveTheme(mode, systemTheme);

  // Notify the host whenever the mode OR the resolved theme changes. Covers
  // internal toggle clicks, external prop/config updates, and `system`
  // re-resolving on an environment change — all from one place — and stays
  // correct even if the host re-renders for unrelated reasons. Reports both so
  // chrome-sync uses `resolvedTheme` while persistence uses `mode`.
  const onThemeChangeRef = React.useRef(onThemeChange);
  onThemeChangeRef.current = onThemeChange;
  const prevReportedRef = React.useRef<{ mode: GraphThemeMode; resolvedTheme: GraphTheme }>({
    mode,
    resolvedTheme,
  });
  React.useEffect(() => {
    const prev = prevReportedRef.current;
    if (prev.mode !== mode || prev.resolvedTheme !== resolvedTheme) {
      prevReportedRef.current = { mode, resolvedTheme };
      onThemeChangeRef.current?.(mode, resolvedTheme);
    }
  }, [mode, resolvedTheme]);

  const effectiveFoldMode: FoldMode =
    initialFoldMode ?? config.foldMode ?? DEFAULT_GRAPH_CONFIG.foldMode ?? FOLD_MODE.EXPANDED;

  // Folded mode requires showControllers — without it the toolbar's expand-all
  // button is hidden and the user has no global path to unfold the graph.
  const [showControllers, setShowControllers] = React.useState<boolean>(() => {
    if (effectiveFoldMode === FOLD_MODE.FOLDED) return true;
    return (
      initialShowControllers ??
      config.showControllers ??
      DEFAULT_GRAPH_CONFIG.showControllers ??
      false
    );
  });
  const foldModeRef = React.useRef(effectiveFoldMode);
  foldModeRef.current = effectiveFoldMode;

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

  // Apply palette CSS vars to the container (scoped, auto-cleaned on unmount).
  // Theme-derived palette is the base; explicit `config.paletteColors` wins per-key.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const themePalette = getPaletteForTheme(resolvedTheme);
    const overrides = config.paletteColors;
    const palette = overrides ? { ...themePalette, ...overrides } : themePalette;

    for (const [cssVar, value] of Object.entries(palette)) {
      el.style.setProperty(cssVar, value);
    }

    return () => {
      for (const cssVar of Object.keys(palette)) {
        el.style.removeProperty(cssVar);
      }
    };
  }, [config.paletteColors, resolvedTheme]);

  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdge>([]);
  const reactFlowRef = React.useRef<AppRFInstance | null>(null);
  const initialDataRef = React.useRef<{
    nodes: GraphNode[];
    edges: GraphEdge[];
    _analysis: DataflowAnalysis | null;
    _graphspec: GraphSpec | null;
  } | null>(null);
  /** Un-folded build output, cached so fold-state changes can re-derive without rebuilding. */
  const rawGraphDataRef = React.useRef<{
    nodes: GraphNode[];
    edges: GraphEdge[];
    analysis: DataflowAnalysis | null;
    graphspec: GraphSpec | null;
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

  // Fold state: tracks which controllers the user has folded into pipe cards.
  // Empty by default. Reset when graphspec changes.
  const [foldedControllers, setFoldedControllers] = React.useState<Set<string>>(new Set());

  const toggleFold = React.useCallback((controllerId: string, options?: FoldToggleOptions) => {
    setFoldedControllers((prev) => {
      const next = new Set(prev);
      const shouldFold = !next.has(controllerId);

      // Solo mode (alt/option click) → only the clicked controller.
      // Default → mirror to cousins (controllers sharing the same pipe_code).
      const raw = rawGraphDataRef.current;
      const targets =
        !options?.soloMode && raw?.graphspec && raw.analysis
          ? findCousinControllers(controllerId, raw.graphspec, raw.analysis.controllerNodeIds)
          : new Set<string>([controllerId]);

      for (const id of targets) {
        if (shouldFold) next.add(id);
        else next.delete(id);
      }
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
  const foldedRef = React.useRef(foldedControllers);
  foldedRef.current = foldedControllers;
  const toggleFoldRef = React.useRef(toggleFold);
  toggleFoldRef.current = toggleFold;
  // Fold-effect bookkeeping refs. The graphspec effect writes to
  // `skipNextFoldEffectRef`/`prevFoldSizeRef` before the fold-state effect
  // reads them, so they must exist before either effect runs — declare them
  // alongside the other fold-related refs rather than next to the consumer.
  const isFirstFoldEffect = React.useRef(true);
  const prevFoldSizeRef = React.useRef(0);
  const skipNextFoldEffectRef = React.useRef(false);
  const statusMapRef = React.useRef(statusMap);
  statusMapRef.current = statusMap;

  // Re-layout when direction or layout config changes
  React.useEffect(() => {
    if (!initialDataRef.current) return;
    let cancelled = false;

    void (async () => {
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
          toggleFoldRef.current,
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
            void reactFlowRef.current.fitView({ padding: 0.1 });
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
      toggleFold,
    );
    setNodes(
      applyStatusOverrides(toAppNodes(hydrateLabels(withControllers.nodes)), statusMapRef.current),
    );
    setEdges(toAppEdges(withControllers.edges));
  }, [showControllers, expandedControllers, toggleCollapse, toggleFold]);

  // Build + layout when graphspec/edgeType changes
  React.useEffect(() => {
    if (!graphspec) {
      initialDataRef.current = null;
      rawGraphDataRef.current = null;
      layoutCacheRef.current = null;
      setNodes([]);
      setEdges([]);
      return;
    }

    let cancelled = false;

    // Reset expand overrides when graph changes. Update the ref synchronously
    // so any in-flight reads see the cleared state, not the previous graphspec's
    // expand set. Fold state is seeded below after we know the controller IDs.
    setExpandedControllers(new Set());
    expandedRef.current = new Set();

    const { graphData, analysis } = buildGraph(graphspec, edgeType);
    rawGraphDataRef.current = {
      nodes: graphData.nodes,
      edges: graphData.edges,
      analysis,
      graphspec,
    };

    // Apply the host-supplied initial fold mode now that we know which
    // controllers exist for this graph. When seedSet is empty (the
    // expanded/auto cases) or analysis is null (degenerate spec — no
    // controllers to fold), the input is the unfolded graph as-is.
    const seedSet = analysis
      ? seedFoldedControllers(foldModeRef.current, analysis.controllerNodeIds)
      : new Set<string>();
    setFoldedControllers(seedSet);
    foldedRef.current = seedSet;
    // The state update above schedules a re-render that would fire the
    // fold-state effect, which would redundantly rebuild + re-layout the
    // graph we are about to lay out with the same seed below. Tell that
    // effect to skip the next run when we already covered it here.
    skipNextFoldEffectRef.current = seedSet.size > 0;
    prevFoldSizeRef.current = seedSet.size;

    // Mirror the mount-time guarantee: a folded graph must have showControllers
    // on, otherwise the toolbar's expand-all button is hidden and the user has
    // no global path to unfold. Needed at graphspec-swap time too — the
    // useState initializer above only runs on the first render.
    if (seedSet.size > 0 && !showControllersRef.current) {
      setShowControllers(true);
      showControllersRef.current = true;
    }

    const folded =
      seedSet.size > 0 && analysis
        ? applyFolds(
            { nodes: graphData.nodes, edges: graphData.edges },
            analysis,
            graphspec,
            seedSet,
            toggleFoldRef.current,
          )
        : { nodes: graphData.nodes, edges: graphData.edges, analysis };

    initialDataRef.current = {
      nodes: folded.nodes,
      edges: folded.edges,
      _analysis: folded.analysis,
      _graphspec: graphspec,
    };

    void (async () => {
      try {
        const currentDirection = directionRef.current;
        const currentLayoutConfig = layoutConfigRef.current;
        const needsLayout = folded.nodes.some(
          (n) => !n.position || (n.position.x === 0 && n.position.y === 0),
        );
        const layouted = needsLayout
          ? await getLayoutedElements(
              folded.nodes,
              folded.edges,
              currentDirection,
              currentLayoutConfig,
              graphspec,
              folded.analysis,
            )
          : {
              nodes: folded.nodes,
              edges: folded.edges,
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
          folded.analysis,
          showControllersRef.current,
          expandedRef.current,
          toggleCollapseRef.current,
          layouted.controllerPositions,
          toggleFoldRef.current,
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
            void reactFlowRef.current.fitView({ padding: 0.1 });
            if (initialZoomRef.current !== undefined && initialZoomRef.current !== null) {
              void reactFlowRef.current.zoomTo(initialZoomRef.current);
            }
            if (panToTopRef.current) {
              const vp = reactFlowRef.current.getViewport();
              void reactFlowRef.current.setViewport({ x: vp.x, y: 20, zoom: vp.zoom });
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

  // Re-derive folded data + re-layout when foldedControllers changes (structural change)
  // Skips initial mount AND graphspec-driven resets: the graphspec effect already
  // performs the build+layout against an empty fold set and synchronously clears
  // foldedRef. If both prev and current fold sets are empty, this is a no-op
  // (avoids a redundant ELK layout pass after every graphspec change).
  // skipNextFoldEffectRef covers the non-empty-seed case where the graphspec
  // effect has already laid out the folded graph and we'd otherwise re-layout.
  React.useEffect(() => {
    if (isFirstFoldEffect.current) {
      isFirstFoldEffect.current = false;
      prevFoldSizeRef.current = foldedControllers.size;
      return;
    }
    if (skipNextFoldEffectRef.current) {
      skipNextFoldEffectRef.current = false;
      prevFoldSizeRef.current = foldedControllers.size;
      return;
    }
    const prevSize = prevFoldSizeRef.current;
    prevFoldSizeRef.current = foldedControllers.size;
    if (prevSize === 0 && foldedControllers.size === 0) return;
    if (!rawGraphDataRef.current || !rawGraphDataRef.current.analysis) return;
    const raw = rawGraphDataRef.current;
    const currentGraphspec = raw.graphspec;
    const currentAnalysis = raw.analysis;
    if (!currentGraphspec || !currentAnalysis) return;

    let cancelled = false;

    const folded = applyFolds(
      { nodes: raw.nodes, edges: raw.edges },
      currentAnalysis,
      currentGraphspec,
      foldedControllers,
      toggleFold,
    );
    initialDataRef.current = {
      nodes: folded.nodes,
      edges: folded.edges,
      _analysis: folded.analysis,
      _graphspec: currentGraphspec,
    };

    void (async () => {
      try {
        const layouted = await getLayoutedElements(
          folded.nodes,
          folded.edges,
          directionRef.current,
          layoutConfigRef.current,
          currentGraphspec,
          folded.analysis,
        );
        if (cancelled) return;
        layoutCacheRef.current = {
          nodes: layouted.nodes,
          edges: layouted.edges,
          controllerPositions: layouted.controllerPositions,
        };
        const withControllers = applyControllers(
          cloneCachedNodes(layouted.nodes),
          layouted.edges,
          currentGraphspec,
          folded.analysis,
          showControllersRef.current,
          expandedRef.current,
          toggleCollapseRef.current,
          layouted.controllerPositions,
          toggleFoldRef.current,
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
            void reactFlowRef.current.fitView({ padding: 0.1 });
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
  }, [foldedControllers, toggleFold]);

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
      toggleFoldRef.current,
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
          onNavigateToPipe(code, nodeData.pipeCardData?.status);
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
        setDetailSelection({
          kind: "stuff",
          nodeId: node.id,
          nodeData,
          stuffData: sd ?? undefined,
        });
      }

      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === node.id })));
    },
    [
      setNodes,
      onNavigateToPipe,
      onNodeSelect,
      onStuffNodeClick,
      graphspec,
      detailSelection,
      conceptOverride,
    ],
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

  // ─── Fold-all / Expand-all toolbar wiring ────────────────────────────
  // Use the RAW analysis (pre-fold) so we can refold already-folded controllers.
  const rawAnalysis = rawGraphDataRef.current?.analysis;
  const allControllerIds = rawAnalysis?.controllerNodeIds;
  const foldAllProps = React.useMemo(() => {
    if (!showControllers || !allControllerIds || allControllerIds.size === 0) {
      return {
        onFoldAll: undefined as undefined | (() => void),
        onExpandAll: undefined as undefined | (() => void),
        foldAllDisabled: false,
        expandAllDisabled: false,
      };
    }
    return {
      onFoldAll: () => setFoldedControllers(new Set(allControllerIds)),
      onExpandAll: () => setFoldedControllers(new Set()),
      foldAllDisabled: foldedControllers.size === allControllerIds.size,
      expandAllDisabled: foldedControllers.size === 0,
    };
  }, [showControllers, allControllerIds, foldedControllers]);

  return (
    <div
      ref={containerRef}
      className={`react-flow-container react-flow-container--theme-${resolvedTheme} react-flow-container--mode-${mode}`}
    >
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
        // Disable pan-on-space: the default Space activation key attaches a
        // window-level keydown handler that can swallow spacebar input in
        // text editors embedded alongside the graph (e.g. Monaco).
        panActivationKeyCode={null}
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
            nodeId={detailSelection.nodeId}
            stuffData={detailSelection.stuffData}
            graphspec={graphspec}
            resolveStorageUrl={resolveStorageUrl}
            canEmbedPdf={canEmbedPdf}
            onOpenExternally={onOpenExternally}
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
          onZoomIn={() => {
            void reactFlowRef.current?.zoomIn();
          }}
          onZoomOut={() => {
            void reactFlowRef.current?.zoomOut();
          }}
          onFitView={() => {
            void reactFlowRef.current?.fitView({ padding: 0.1 });
          }}
          onFoldAll={foldAllProps.onFoldAll}
          onExpandAll={foldAllProps.onExpandAll}
          foldAllDisabled={foldAllProps.foldAllDisabled}
          expandAllDisabled={foldAllProps.expandAllDisabled}
          themeMode={showThemeToggle ? mode : undefined}
          onThemeModeChange={showThemeToggle ? setMode : undefined}
          rightOffset={detailOpen ? panelWidth : 0}
        />
      )}
    </div>
  );
}
