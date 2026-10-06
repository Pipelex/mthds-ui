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
  GraphSpecNodeIoItem,
  DataflowAnalysis,
  FoldMode,
  FoldToggleOptions,
  GraphStyleId,
  GraphTheme,
  GraphThemeMode,
  PipeStatus,
  ConceptInfo,
  ToolbarPosition,
  ValidationIssue,
  ValidationState,
} from "@graph/types";
import {
  BINDING_STEP_TYPE,
  stuffDigestFromId,
  EDGE_TYPE,
  FOLD_MODE,
  GRAPH_SPEC_MODE,
  GRAPH_DIRECTION,
  GRAPH_THEME_MODE,
  graphSpecMode,
} from "@graph/types";
import { useSystemTheme } from "./useSystemTheme";
import { buildChildToControllerMap, resolveConceptRef } from "@graph/graphAnalysis";
import {
  applyValidationDecorations,
  buildValidationDecorations,
  resolveIssueTargetNodeId,
} from "@graph/graphValidation";
import { findStuffByDigest } from "@graph/stuffLookup";
import type { SaveFiles } from "@pipelex/mthds-form";
import type { DownloadDisplay, ResolveShareUrl, ResolveUrl } from "@pipelex/mthds-form/react";
import { StuffResultPanel } from "../detail/StuffResultPanel";
import { resultDescriptors, type GraphArtifacts } from "./graphArtifacts";
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
import type { ControllerRect } from "@graph/graphControllers";
import { DEFAULT_GRAPH_CONFIG, getPaletteForTheme } from "@graph/graphConfig";
import { GRAPH_STYLES, resolveGraphStyle, resolveStyleMenu } from "@graph/styles/graphStyles";
import { GRAPH_STYLE_PIPELINES } from "@graph/styles/stylePipelines";
import { hydrateLabels } from "./renderLabel";
import { GraphToolbar } from "./GraphToolbar";
import { controllerNodeTypes } from "../nodes/controller/ControllerGroupNode";
import { PipeCardRFNode } from "../nodes/pipe/PipeCardNode";
import { simpleNodeTypes } from "../styles/simple/SimpleNodes";

// Stable reference — must be declared outside the component to avoid ReactFlow
// re-mounts. Every style's node components are registered once, here.
const nodeTypes = {
  ...controllerNodeTypes,
  pipeCard: PipeCardRFNode,
  ...simpleNodeTypes,
};

export interface GraphViewerProps {
  /**
   * The graph to draw, together with the artifacts that describe its pipes —
   * all four from ONE source: a run's results, or a method's validate report
   * beside the dry or static graph of that same method. `null` draws nothing.
   *
   * One object rather than a spec prop and three descriptor props, because the
   * detail panel looks a data node's descriptor up by the `pipe_ref` of the pipe
   * that produced it IN THIS GRAPH. A graph paired with another source's
   * descriptors misses every lookup. See `GraphArtifacts`.
   *
   * Without `pipeIoContracts` and `outputForm`, the panel still works: it shows
   * the concept's structure table and no data tab, which is the honest floor
   * for a graph whose artifacts the host does not hold.
   */
  graph: GraphArtifacts | null;
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
   * Anchor for the built-in toolbar. Controlled + reactive: pass a new value to
   * move it, and the viewer reacts immediately. This library does NOT persist the
   * value — the host owns it (read its own state, change it by passing a new prop).
   *
   * Orientation (horizontal row vs vertical column) is derived from the position,
   * not configured separately: only `center-left` / `center-right` render a
   * vertical bar; the four corners plus `top-center` / `bottom-center` are
   * horizontal.
   *
   * Precedence: this prop → `config.toolbarPosition` → `"top-right"`.
   */
  toolbarPosition?: ToolbarPosition;
  /**
   * The style the graph is drawn in: `detailed` (every pipe with its inputs,
   * outputs and settings) or `simple` (the method's steps in plain words).
   * Reactive, like `theme`: passing it drives the active style, and clearing it
   * back to `undefined` hands control to `config.graphStyle`, then the default
   * `detailed`. The toolbar's style menu, when shown, changes it too. A value
   * naming no registered style is treated as unset. This library persists
   * nothing: the host keeps the choice, reported by `onGraphStyleChange`.
   */
  graphStyle?: GraphStyleId;
  /**
   * Called whenever the style changes — from the menu, or from a prop or config
   * update — so the host can persist it. Not called on mount.
   */
  onGraphStyleChange?: (style: GraphStyleId) => void;
  /**
   * Show a style menu in the toolbar. Opt-in: `true` offers every registered
   * style in registry order, a list offers those styles in that order, and the
   * default offers no menu, for a host that fixes the style for its audience.
   * A menu needs two styles to choose between.
   */
  styleMenu?: boolean | readonly GraphStyleId[];
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
  onStuffNodeClick?: (stuff: GraphSpecNodeIoItem) => void;
  onReactFlowInit?: (instance: AppRFInstance) => void;
  /**
   * Layer 2 execution state: pipe_code → current status. Updates node status dots in real-time.
   * A binding card is never matched: its `pipeCode` is the path it binds, not a pipe's code.
   */
  statusMap?: Record<string, PipeStatus>;
  /** Called when any node is clicked with full node data. Use for detail/inspector panels. */
  onNodeSelect?: (nodeId: string, nodeData: GraphNodeData, event: React.MouseEvent) => void;
  /** Called when the graph background (pane) is clicked. Use to dismiss detail panels. */
  onPaneClick?: () => void;
  /** Render extra content below the built-in detail panel content for the selected node. */
  renderDetailExtra?: (nodeId: string, nodeData: GraphNodeData) => React.ReactNode;
  /**
   * Turns the runtime's own `pipelex-storage://…` reference into a URL a
   * browser can fetch, so files in a result actually paint.
   *
   * Without it the panel falls back to whatever `public_url` the payload
   * carries — which on the hosted platform is a PRESIGNED URL with an hour's
   * life, baked into the stored result. Yesterday's run then shows broken
   * images, and the URL answers `403` in a way that reads as a permissions
   * problem rather than an expiry. A resolver is what makes a stored result
   * durable, so supply one if your storage has an authenticated read path.
   */
  resolveUrl?: ResolveUrl;
  /**
   * Mints a URL that works OUTSIDE this page, for the copy control.
   *
   * Distinct from `resolveUrl` because the two answers genuinely differ: a
   * display URL may be a path behind the host's own session — which is what
   * lets a strict `img-src 'self'` stand — and that URL is useless to whoever
   * pastes it. A shared one carries its own credential and is minted per click,
   * since it starts expiring the moment it exists.
   */
  resolveShareUrl?: ResolveShareUrl;
  /**
   * Delivers the files the result panel's downloads hand over: its Download
   * control and each file's own button.
   *
   * Without it the kernel saves them in the browser tab, through an object URL
   * and a clicked link. A host whose view runs in a sandboxed frame is refused
   * both, so its downloads fail without a word unless it supplies this, handing
   * the planned files to its own bridge. It goes on the panel's provider beside
   * `resolveUrl`, which replaces an outer provider rather than merging with it,
   * so a `saveFiles` set around the graph does not reach the panel.
   */
  saveFiles?: SaveFiles;
  /**
   * Which of the result panel's download controls are drawn: the whole-result
   * Download (`result`) and each file's own button (`files`, which also takes
   * the kinds that carry one). Both are drawn by default.
   */
  downloads?: DownloadDisplay;
  /**
   * State of the toolbar's validation widget. The widget renders only when this
   * is set — `undefined` (the default) disables the feature entirely. Reactive:
   * a host typically drives `validating → valid | invalid | error` as its
   * validator progresses, without re-mounting the viewer.
   */
  validationState?: ValidationState;
  /**
   * Issues listed in the validation widget's dropdown (the badge shows their
   * count). Presentation-only — the host decides which issues to surface per
   * state (validator errors, static-analysis diagnostics, or a mix; see
   * `staticDiagnosticsToValidationIssues` in `@pipelex/mthds-ui/static-graph`).
   */
  validationIssues?: ValidationIssue[];
  /**
   * Called when an issue row is clicked, with the row's index in
   * `validationIssues`. Wire this to source navigation in the host.
   */
  onValidationIssueClick?: (index: number, issue: ValidationIssue) => void;
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
  resolveUrl,
  resolveShareUrl,
  saveFiles,
  downloads,
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
  resolveUrl?: ResolveUrl;
  resolveShareUrl?: ResolveShareUrl;
  saveFiles?: SaveFiles;
  downloads?: DownloadDisplay;
}) {
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
        <StuffResultPanel
          {...descriptors}
          stuff={stuffData}
          {...(conceptInfo ? { concept: conceptInfo } : {})}
          {...(producerPipeRef ? { producerPipeRef } : {})}
          {...(consumer ? { consumer } : {})}
          {...(resolveUrl ? { resolveUrl } : {})}
          {...(resolveShareUrl ? { resolveShareUrl } : {})}
          {...(saveFiles ? { saveFiles } : {})}
          {...(downloads ? { downloads } : {})}
          theme={theme}
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

/**
 * Resolve the toolbar anchor from `(positionProp, config.toolbarPosition,
 * default)`. Pure + exported so the controlled/reactive precedence is
 * unit-testable without React. Mirrors `resolveExternalThemeMode`:
 * - the `toolbarPosition` prop wins when set,
 * - falls back to `config.toolbarPosition` when the prop is undefined,
 * - falls back to the library default (`top-right`) when neither is set.
 */
export function resolveToolbarPosition(
  positionProp: ToolbarPosition | undefined,
  configPosition: ToolbarPosition | undefined,
): ToolbarPosition {
  // `DEFAULT_GRAPH_CONFIG.toolbarPosition` is the single source of the library
  // default (typed non-optional), so the chain needs no extra literal floor.
  return positionProp ?? configPosition ?? DEFAULT_GRAPH_CONFIG.toolbarPosition;
}

/** Remove the transient flash class (undefined when nothing else remains). */
function stripFlash(className: string | undefined): string | undefined {
  return className?.replace(/\s*\bnode-validation-flash\b/, "") || undefined;
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
    if (node.data.graphMode === "static" || node.data.pipeCardData?.graphMode === "static") {
      return node;
    }
    // A binding card's `pipeCode` is its `from` path, which a pipe may share
    // (`from = "summary"` beside a pipe coded `summary`): no status keyed by
    // pipe code is about it.
    if (node.data.pipeType === BINDING_STEP_TYPE) return node;
    const pipeCode = node.data.pipeCode;
    if (!pipeCode || !Object.hasOwn(statusMap, pipeCode)) return node;
    const newStatus = statusMap[pipeCode];
    const simple = node.data.simple;
    // The simple style's steps, decisions and frames carry a status; its inputs and outputs do not.
    const simpleWithStatus = simple && "status" in simple ? simple : undefined;
    const currentStatus = simpleWithStatus
      ? simpleWithStatus.status
      : node.data.pipeCardData?.status;
    if (currentStatus === newStatus) return node;
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
        simple: simpleWithStatus ? { ...simpleWithStatus, status: newStatus } : simple,
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
  stuffData?: GraphSpecNodeIoItem;
  /** `domain.code` of the pipe that produced the stuff, when one did. */
  producerPipeRef?: string;
  /** The first pipe reading it, for the method inputs no pipe produced. */
  consumer?: { pipeRef: string; slotName: string };
}

export function GraphViewer(props: GraphViewerProps) {
  const {
    graph,
    config = DEFAULT_GRAPH_CONFIG,
    initialDirection,
    initialShowControllers,
    initialFoldMode,
    hideToolbar = false,
    theme: themeProp,
    graphStyle: graphStyleProp,
    onGraphStyleChange,
    styleMenu,
    toolbarPosition: toolbarPositionProp,
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
    resolveUrl,
    resolveShareUrl,
    saveFiles,
    downloads,
    validationState,
    validationIssues,
    onValidationIssueClick,
  } = props;

  // The spec is read out of the `graph` bundle and memoized on ITS identity,
  // not the wrapper's: a host writing `graph={{ graphSpec, … }}` inline hands
  // over a new wrapper every render, and keying the build on that would re-run
  // the ELK layout on every parent render.
  const graphspecProp = graph?.graphSpec ?? null;

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

  // The style follows the same controlled + reactive contract as the theme
  // mode: resolved from (prop, config, default) on every render, adopted when
  // that resolution changes, and changeable from the toolbar menu in between.
  const externalStyle = resolveGraphStyle(graphStyleProp, config.graphStyle);
  const [graphStyle, setGraphStyle] = React.useState<GraphStyleId>(externalStyle);
  const prevExternalStyleRef = React.useRef<GraphStyleId>(externalStyle);
  React.useEffect(() => {
    if (externalStyle !== prevExternalStyleRef.current) {
      prevExternalStyleRef.current = externalStyle;
      setGraphStyle(externalStyle);
    }
  }, [externalStyle]);
  const onGraphStyleChangeRef = React.useRef(onGraphStyleChange);
  onGraphStyleChangeRef.current = onGraphStyleChange;
  const prevReportedStyleRef = React.useRef<GraphStyleId>(graphStyle);
  React.useEffect(() => {
    if (prevReportedStyleRef.current !== graphStyle) {
      prevReportedStyleRef.current = graphStyle;
      onGraphStyleChangeRef.current?.(graphStyle);
    }
  }, [graphStyle]);
  const graphStyleRef = React.useRef(graphStyle);
  graphStyleRef.current = graphStyle;
  const styleCapabilities = GRAPH_STYLES[graphStyle].capabilities;

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
    /** The style these nodes were projected for. */
    _graphStyle: GraphStyleId;
  } | null>(null);
  /** Un-folded build output, cached so fold-state changes can re-derive without rebuilding. */
  const rawGraphDataRef = React.useRef<{
    nodes: GraphNode[];
    edges: GraphEdge[];
    analysis: DataflowAnalysis | null;
    graphspec: GraphSpec | null;
    /** Containment map derived once per graphspec (pure in graphspec+analysis). */
    childToCtrl: Record<string, string>;
  } | null>(null);
  const layoutCacheRef = React.useRef<{
    nodes: GraphNode[];
    edges: GraphEdge[];
    controllerPositions?: Record<string, { x: number; y: number; width: number; height: number }>;
    /**
     * The graphspec these layouted nodes belong to. Cache-reuse effects must
     * skip when this is not the graphspec in `initialDataRef` — on a graphspec
     * swap the cache is only refreshed after the async layout resolves, and
     * rebuilding controllers from old nodes against the new spec would render
     * garbage (or throw on the id mismatch).
     */
    graphspec: GraphSpec | null;
    /**
     * The style these layouted nodes were drawn in. The same guard as
     * `graphspec`, for a style switch: until the new style's layout resolves,
     * the cache holds the previous style's nodes, and framing them with the new
     * style's pass would render garbage.
     */
    graphStyle: GraphStyleId;
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
  const validationIssuesRef = React.useRef(validationIssues);
  validationIssuesRef.current = validationIssues;
  const selectedNodeIdRef = React.useRef<string | null>(null);
  selectedNodeIdRef.current = detailSelection?.nodeId ?? null;

  // Validation dropdown open state — owned here (not in GraphToolbar) so node
  // badges can open the panel too. The toolbar reports toggle/dismiss requests
  // through onValidationOpenChange.
  const [validationOpen, setValidationOpen] = React.useState(false);
  const openValidationPanel = React.useCallback(() => setValidationOpen(true), []);
  // Badges only get a click handler while the panel can actually appear —
  // otherwise they'd render as buttons whose click has no visible effect.
  const validationWidgetAvailable = validationState !== undefined && !hideToolbar;
  const validationWidgetAvailableRef = React.useRef(validationWidgetAvailable);
  validationWidgetAvailableRef.current = validationWidgetAvailable;

  // Final per-render node pass, shared by every setNodes site: hydrate labels,
  // apply execution-status overrides, then stamp validation decorations derived
  // from the CURRENT issues + fold state (folded controllers roll up their
  // hidden descendants' issues). Reads refs only, so the callback is stable.
  const decorateNodes = React.useCallback(
    (nodes: GraphNode[]): AppNode[] => {
      const raw = rawGraphDataRef.current;
      const decorations = buildValidationDecorations(
        validationIssuesRef.current,
        raw?.graphspec ?? null,
        raw?.childToCtrl ?? {},
        foldedRef.current,
      );
      const decorated = applyValidationDecorations(
        applyStatusOverrides(toAppNodes(hydrateLabels(nodes)), statusMapRef.current),
        decorations,
        validationWidgetAvailableRef.current ? openValidationPanel : undefined,
      );
      // The node open in the detail panel stays selected through a rebuild —
      // a style switch, a re-layout — since every style keeps the spec's ids.
      const selectedId = selectedNodeIdRef.current;
      return selectedId
        ? decorated.map((n) => (n.id === selectedId ? { ...n, selected: true } : n))
        : decorated;
    },
    [openValidationPanel],
  );

  // The style's frame pass over a laid-out graph: the one place the viewer
  // wraps nodes in frames, shared by every path that re-renders from a layout.
  // Takes the style the layout was drawn in, never the current one, so a path
  // reusing a cached layout frames it the way it was projected.
  const frameLayout = React.useCallback(
    (
      style: GraphStyleId,
      layout: {
        nodes: GraphNode[];
        edges: GraphEdge[];
        controllerPositions?: Record<string, ControllerRect>;
      },
      graphspec: GraphSpec | null,
      analysis: DataflowAnalysis | null,
    ) =>
      GRAPH_STYLE_PIPELINES[style].frame({
        nodes: cloneCachedNodes(layout.nodes),
        edges: layout.edges,
        graphspec,
        analysis,
        controllerPositions: layout.controllerPositions,
        showControllers: showControllersRef.current,
        expandedControllers: expandedRef.current,
        onToggleCollapse: toggleCollapseRef.current,
        onToggleFold: toggleFoldRef.current,
      }),
    [],
  );

  /** Whether the layout cache holds the nodes `initialDataRef` was projected to. */
  const cacheMatchesData = (): boolean => {
    const cache = layoutCacheRef.current;
    const data = initialDataRef.current;
    return (
      cache !== null &&
      data !== null &&
      cache.graphspec === data._graphspec &&
      cache.graphStyle === data._graphStyle
    );
  };

  // Panel row click → host source-jump AND graph pan/flash to the target node
  // (when the issue targets one). The flash is a transient class on the
  // ReactFlow node wrapper; it is dropped on the next full node rebuild, which
  // is fine — it only needs to outlive its CSS animation.
  const nodesRef = React.useRef<AppNode[]>([]);
  nodesRef.current = nodes;
  const onValidationIssueClickRef = React.useRef(onValidationIssueClick);
  onValidationIssueClickRef.current = onValidationIssueClick;
  const flashTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    },
    [],
  );

  const handleValidationIssueClick = React.useCallback(
    (index: number, issue: ValidationIssue) => {
      onValidationIssueClickRef.current?.(index, issue);
      const raw = rawGraphDataRef.current;
      if (!raw?.graphspec || !raw.analysis) return;
      const targetId = resolveIssueTargetNodeId(
        issue,
        raw.graphspec,
        raw.childToCtrl,
        foldedRef.current,
        new Set(nodesRef.current.map((n) => n.id)),
      );
      if (!targetId) return;
      void reactFlowRef.current?.fitView({
        nodes: [{ id: targetId }],
        duration: 500,
        padding: 0.4,
      });
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      setNodes((nds) =>
        nds.map((n) => {
          const base = stripFlash(n.className);
          if (n.id === targetId) {
            return {
              ...n,
              className: base ? `${base} node-validation-flash` : "node-validation-flash",
            };
          }
          return base === n.className ? n : { ...n, className: base };
        }),
      );
      flashTimeoutRef.current = setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) => {
            const base = stripFlash(n.className);
            return base === n.className ? n : { ...n, className: base };
          }),
        );
      }, 1800);
    },
    [setNodes],
  );

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
          GRAPH_STYLES[data._graphStyle].layout ?? layoutConfig,
          data._graphspec,
          data._analysis,
        );
        if (cancelled) return;
        layoutCacheRef.current = {
          nodes: relayouted.nodes,
          edges: relayouted.edges,
          controllerPositions: relayouted.controllerPositions,
          graphspec: data._graphspec,
          graphStyle: data._graphStyle,
        };
        const withControllers = frameLayout(
          data._graphStyle,
          relayouted,
          data._graphspec,
          data._analysis,
        );
        setNodes(decorateNodes(withControllers.nodes));
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
    const cache = layoutCacheRef.current;
    const data = initialDataRef.current;
    // Mid-swap guard: the cache still holds the previous graphspec's (or
    // style's) layout until the async layout lands; the in-flight build will
    // repaint anyway.
    if (!cache || !data || !cacheMatchesData()) return;
    const withControllers = frameLayout(cache.graphStyle, cache, data._graphspec, data._analysis);
    setNodes(decorateNodes(withControllers.nodes));
    setEdges(toAppEdges(withControllers.edges));
  }, [showControllers, expandedControllers, toggleCollapse, toggleFold, decorateNodes]);

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

    const style = graphStyleRef.current;
    const pipeline = GRAPH_STYLE_PIPELINES[style];
    const { graphData, analysis } = buildGraph(graphspec, edgeType);
    rawGraphDataRef.current = {
      nodes: graphData.nodes,
      edges: graphData.edges,
      analysis,
      graphspec,
      childToCtrl: analysis ? buildChildToControllerMap(graphspec, analysis) : {},
    };

    // Apply the host-supplied initial fold mode now that we know which
    // controllers exist for this graph. When seedSet is empty (the
    // expanded/auto cases) or analysis is null (degenerate spec — no
    // controllers to fold), the input is the unfolded graph as-is.
    // The host's fold mode, plus whatever the style folds on a fresh graph.
    const seedSet = analysis
      ? new Set([
          ...seedFoldedControllers(foldModeRef.current, analysis.controllerNodeIds),
          ...pipeline.defaultFolds(graphspec, analysis),
        ])
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
    // Only a style whose folds are undone from controller frames needs them.
    if (
      seedSet.size > 0 &&
      GRAPH_STYLES[style].capabilities.controllerFrameToggle &&
      !showControllersRef.current
    ) {
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
    const projected = pipeline.project({
      graphspec,
      nodes: folded.nodes,
      edges: folded.edges,
      analysis: folded.analysis,
      rawAnalysis: analysis,
      edgeType,
    });

    initialDataRef.current = {
      nodes: projected.nodes,
      edges: projected.edges,
      _analysis: projected.analysis,
      _graphspec: graphspec,
      _graphStyle: style,
    };

    void (async () => {
      try {
        const currentDirection = directionRef.current;
        const currentLayoutConfig = GRAPH_STYLES[style].layout ?? layoutConfigRef.current;
        const needsLayout = projected.nodes.some(
          (n) => !n.position || (n.position.x === 0 && n.position.y === 0),
        );
        const layouted = needsLayout
          ? await getLayoutedElements(
              projected.nodes,
              projected.edges,
              currentDirection,
              currentLayoutConfig,
              graphspec,
              projected.analysis,
            )
          : {
              nodes: projected.nodes,
              edges: projected.edges,
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
          graphspec,
          graphStyle: style,
        };
        const withControllers = frameLayout(style, layouted, graphspec, projected.analysis);

        setNodes(decorateNodes(withControllers.nodes));
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
    // A style switch rebuilds like an edge-type change: the same spec, drawn anew.
  }, [graphspec, edgeType, graphStyle]);

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

    const style = graphStyleRef.current;
    const folded = applyFolds(
      { nodes: raw.nodes, edges: raw.edges },
      currentAnalysis,
      currentGraphspec,
      foldedControllers,
      toggleFold,
    );
    const projected = GRAPH_STYLE_PIPELINES[style].project({
      graphspec: currentGraphspec,
      nodes: folded.nodes,
      edges: folded.edges,
      analysis: folded.analysis,
      rawAnalysis: currentAnalysis,
      edgeType,
    });
    initialDataRef.current = {
      nodes: projected.nodes,
      edges: projected.edges,
      _analysis: projected.analysis,
      _graphspec: currentGraphspec,
      _graphStyle: style,
    };

    void (async () => {
      try {
        const layouted = await getLayoutedElements(
          projected.nodes,
          projected.edges,
          directionRef.current,
          GRAPH_STYLES[style].layout ?? layoutConfigRef.current,
          currentGraphspec,
          projected.analysis,
        );
        if (cancelled) return;
        layoutCacheRef.current = {
          nodes: layouted.nodes,
          edges: layouted.edges,
          controllerPositions: layouted.controllerPositions,
          graphspec: currentGraphspec,
          graphStyle: style,
        };
        const withControllers = frameLayout(style, layouted, currentGraphspec, projected.analysis);
        setNodes(decorateNodes(withControllers.nodes));
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
    const cache = layoutCacheRef.current;
    const data = initialDataRef.current;
    // Mid-swap guard — see the layoutCacheRef.graphspec doc comment.
    if (!cache || !data || !cacheMatchesData()) return;
    const withControllers = frameLayout(cache.graphStyle, cache, data._graphspec, data._analysis);
    setNodes(decorateNodes(withControllers.nodes));
    setEdges(toAppEdges(withControllers.edges));
  }, [statusMap, decorateNodes]);

  // Re-stamp validation decorations when the issues change (reuses cached
  // layout — a verdict flip must never re-run ELK or reset the viewport).
  React.useEffect(() => {
    const cache = layoutCacheRef.current;
    const data = initialDataRef.current;
    // Mid-swap guard: when graphspec and validationIssues change in the same
    // commit (a host delivering a new file plus its known issues at once), the
    // cache still holds the OLD graphspec's nodes until the async layout lands
    // — rebuilding from it against the new spec would render garbage. The
    // in-flight graphspec build stamps the fresh issues itself via
    // decorateNodes, so skipping here loses nothing.
    if (!cache || !data || !cacheMatchesData()) return;
    const withControllers = frameLayout(cache.graphStyle, cache, data._graphspec, data._analysis);
    setNodes(decorateNodes(withControllers.nodes));
    // validationWidgetAvailable: badge clickability must follow widget
    // visibility (validationState / hideToolbar flips re-stamp the handler).
  }, [validationIssues, validationWidgetAvailable, decorateNodes]);

  // Handle node click — opens detail panel + fires external callbacks
  const onNodeClick = React.useCallback(
    (event: React.MouseEvent, node: AppNode) => {
      const nodeData = node.data;

      // Fire external callbacks
      onNodeSelect?.(node.id, nodeData, event);
      // A binding card names the path it binds, not a pipe, so there is no pipe to navigate to.
      if ((nodeData.isController || nodeData.isPipe) && nodeData.pipeType !== BINDING_STEP_TYPE) {
        const code = nodeData.pipeCode || nodeData.labelText;
        if (code && onNavigateToPipe) {
          onNavigateToPipe(code, nodeData.pipeCardData?.status);
        }
      } else if (nodeData.isStuff && onStuffNodeClick && graphspec) {
        const found = findStuffByDigest(graphspec, stuffDigestFromId(node.id));
        if (found) onStuffNodeClick(found.item);
      }

      // Update detail panel (toggle off if same node clicked again)
      setConceptOverride(null);
      if (detailSelection?.nodeId === node.id && !conceptOverride) {
        setDetailSelection(null);
      } else if (nodeData.isPipe || nodeData.isController) {
        setDetailSelection({ kind: "pipe", nodeId: node.id, nodeData });
      } else if (nodeData.isStuff && graphspec) {
        const found = findStuffByDigest(graphspec, stuffDigestFromId(node.id));
        setDetailSelection({
          kind: "stuff",
          nodeId: node.id,
          nodeData,
          stuffData: found?.item,
          producerPipeRef: found?.producerPipeRef,
          consumer: found?.consumer,
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

  // Resolve the selected card's GraphSpecNode for the detail panel — by node id,
  // since a pipe code does not name one node: two invocations of a pipe share
  // it, and so do two bindings of one path. A pipe card, a controller group and
  // a folded controller's card all carry their spec node's id.
  const selectedSpecNode =
    detailSelection?.kind === "pipe" && graphspec
      ? graphspec.nodes.find((n) => n.id === detailSelection.nodeId)
      : undefined;

  const detailOpen = detailSelection !== null || conceptOverride !== null;

  // Controlled + reactive: resolved on every render (no local state) so a new
  // `toolbarPosition` prop or `config.toolbarPosition` propagates immediately.
  const effectiveToolbarPosition = resolveToolbarPosition(
    toolbarPositionProp,
    config.toolbarPosition,
  );

  // ─── Fold-all / Expand-all toolbar wiring ────────────────────────────
  // Use the RAW analysis (pre-fold) so we can refold already-folded controllers.
  const rawAnalysis = rawGraphDataRef.current?.analysis;
  const allControllerIds = rawAnalysis?.controllerNodeIds;
  // Fold-all and expand-all, where the style supports them; a style whose folds
  // are undone from controller frames offers them only while those are shown.
  const foldControlsAvailable =
    styleCapabilities.foldAll && (!styleCapabilities.controllerFrameToggle || showControllers);
  const foldAllProps = React.useMemo(() => {
    if (!foldControlsAvailable || !allControllerIds || allControllerIds.size === 0) {
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
  }, [foldControlsAvailable, allControllerIds, foldedControllers]);

  const styleMenuOptions = React.useMemo(() => resolveStyleMenu(styleMenu), [styleMenu]);

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
        {!hideToolbar && (
          <GraphToolbar
            direction={direction}
            onDirectionChange={setDirection}
            showControllers={showControllers}
            onShowControllersChange={
              styleCapabilities.controllerFrameToggle ? setShowControllers : undefined
            }
            graphStyle={graphStyle}
            styleMenuOptions={styleMenuOptions}
            onGraphStyleChange={setGraphStyle}
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
            position={effectiveToolbarPosition}
            validationState={validationState}
            validationIssues={validationIssues}
            // Always the wrapped handler: it optionally calls the host's
            // source-jump and, independently, pans/flashes to the issue's target
            // node — a built-in that works without a host handler, so rows stay
            // interactive whether or not the host wired `onValidationIssueClick`.
            onValidationIssueClick={handleValidationIssueClick}
            validationOpen={validationOpen}
            onValidationOpenChange={setValidationOpen}
          />
        )}
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
            producerPipeRef={detailSelection.producerPipeRef}
            consumer={detailSelection.consumer}
            graphspec={graphspec}
            theme={resolvedTheme}
            artifacts={graph}
            resolveUrl={resolveUrl}
            resolveShareUrl={resolveShareUrl}
            saveFiles={saveFiles}
            downloads={downloads}
          />
        ) : null}
        {renderDetailExtra &&
          detailSelection &&
          !conceptOverride &&
          renderDetailExtra(detailSelection.nodeId, detailSelection.nodeData)}
      </DetailPanel>
    </div>
  );
}
