// ─── Pipe type taxonomy ─────────────────────────────────────────────────────
// Operators perform work; controllers orchestrate other pipes.

export type PipeOperatorType =
  | "PipeLLM"
  | "PipeExtract"
  | "PipeCompose"
  | "PipeImgGen"
  | "PipeSearch"
  | "PipeFunc";

export type PipeControllerType = "PipeSequence" | "PipeParallel" | "PipeCondition" | "PipeBatch";

export type PipeType = PipeOperatorType | PipeControllerType;

export type PipeStatus = "succeeded" | "failed" | "running" | "scheduled" | "skipped";

// ─── Node type constants ────────────────────────────────────────────────────
// Used by graphBuilders and consumed by ReactFlow custom node registration.

export const NODE_TYPE_PIPE_CARD = "pipeCard" as const;
export const NODE_TYPE_STUFF = "default" as const;
export const NODE_TYPE_CONTROLLER = "controllerGroup" as const;

// ─── Stuff node ID helpers ──────────────────────────────────────────────────
// Stuff (data) nodes use a "stuff_<digest>" convention throughout the graph.

export const STUFF_ID_PREFIX = "stuff_";

export function stuffNodeId(digest: string): string {
  return STUFF_ID_PREFIX + digest;
}

export function isStuffNodeId(id: string): boolean {
  return id.startsWith(STUFF_ID_PREFIX);
}

export function stuffDigestFromId(id: string): string {
  return id.slice(STUFF_ID_PREFIX.length);
}

// ─── GraphSpec types (from pipelex-agent --view output) ─────────────────────

export interface GraphSpecNodeIoItem {
  name?: string;
  digest?: string;
  concept?: string;
  content_type?: string;
  preview?: string;
  size?: number;
  data?: unknown;
  data_text?: string;
  data_html?: string;
  extra?: Record<string, unknown>;
}

export interface GraphSpecNodeIo {
  inputs?: GraphSpecNodeIoItem[];
  outputs?: GraphSpecNodeIoItem[];
}

export interface GraphSpecNode {
  id: string;
  pipe_code?: string;
  pipe_type?: PipeType;
  description?: string;
  status?: PipeStatus;
  io?: GraphSpecNodeIo;
}

export type GraphSpecEdgeKind =
  | "contains"
  | "data"
  | "batch_item"
  | "batch_aggregate"
  | "parallel_combine";

export interface GraphSpecEdge {
  id?: string;
  source: string;
  target: string;
  kind: GraphSpecEdgeKind;
  label?: string;
  source_stuff_digest?: string;
  target_stuff_digest?: string;
}

export interface GraphSpec {
  nodes: GraphSpecNode[];
  edges: GraphSpecEdge[];
}

// ─── Dataflow analysis result ───────────────────────────────────────────────

export interface DataflowAnalysis {
  readonly stuffRegistry: Readonly<
    Record<string, { name?: string; concept?: string; contentType?: string }>
  >;
  readonly stuffProducers: Readonly<Record<string, string>>;
  readonly stuffConsumers: Readonly<Record<string, readonly string[]>>;
  readonly controllerNodeIds: ReadonlySet<string>;
  readonly childNodeIds: ReadonlySet<string>;
  readonly containmentTree: Readonly<Record<string, readonly string[]>>;
}

// ─── Graph configuration ────────────────────────────────────────────────────

export type GraphDirection = "TB" | "LR" | "RL" | "BT";
export type EdgeType = "bezier" | "step" | "straight" | "smoothstep";

export interface GraphConfig {
  direction?: GraphDirection;
  showControllers?: boolean;
  nodesep?: number;
  ranksep?: number;
  edgeType?: EdgeType;
  initialZoom?: number | null;
  panToTop?: boolean;
  paletteColors?: Record<string, string>;
}

// ─── Label descriptors ──────────────────────────────────────────────────────
// Plain objects, no React dependency. GraphViewer maps these to React elements.

export type LabelDescriptor =
  | { kind: "pipe"; label: string; isFailed: boolean }
  | { kind: "stuff"; label: string; concept: string };

// ─── Pipe card payload ──────────────────────────────────────────────────────
// Built by graphBuilders, consumed by PipeCardNode in the React layer.

export interface PipeCardPayload {
  pipeCode: string;
  pipeType: PipeOperatorType;
  description?: string;
  status: PipeStatus;
  inputs: { name: string; concept: string }[];
  outputs: { name: string; concept: string }[];
  /** Layout direction — injected by the layout engine */
  direction?: "LR" | "TB";
}

// ─── Graph node data ────────────────────────────────────────────────────────
// Extends Record<string, unknown> for ReactFlow's Node<T> generic parameter.

export type StuffRole = "input" | "output";

export interface GraphNodeData extends Record<string, unknown> {
  labelDescriptor?: LabelDescriptor;
  label?: unknown;
  nodeData?: GraphSpecNode;
  isPipe: boolean;
  isStuff: boolean;
  isController?: boolean;
  labelText: string;
  pipeCode?: string;
  pipeType?: PipeType;
  pipeCardData?: PipeCardPayload;
  /** For stuff nodes: "input" (no producer), "output" (no consumer), or undefined (intermediate). */
  stuffRole?: StuffRole;
  /** For stuff nodes: the digest used to build the node ID. */
  stuffDigest?: string;
}

// ─── Graph node / edge / data ───────────────────────────────────────────────

export interface GraphNode {
  id: string;
  type: string;
  data: GraphNodeData;
  position: { x: number; y: number };
  style?: Record<string, string | number>;
  sourcePosition?: "top" | "bottom" | "left" | "right";
  targetPosition?: "top" | "bottom" | "left" | "right";
  parentId?: string;
  extent?: "parent";
  selected?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated?: boolean;
  label?: string;
  labelStyle?: Record<string, string | number>;
  labelBgStyle?: Record<string, string | number>;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
  style?: Record<string, string | number>;
  markerEnd?: { type: string; color: string };
  _batchEdge?: boolean;
  _crossGroup?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Layout ─────────────────────────────────────────────────────────────────

export interface LayoutConfig {
  nodesep?: number;
  ranksep?: number;
}

// Controller padding constants (shared between layout and controller modules)
export const CONTROLLER_PADDING_X = 40;
export const CONTROLLER_PADDING_TOP = 48;
export const CONTROLLER_PADDING_BOTTOM = 20;

// Default marker type string (avoids ReactFlow dependency in pure modules)
export const ARROW_CLOSED_MARKER = "arrowclosed";

// ─── Node dimension helpers ─────────────────────────────────────────────────
// Extract dimensions from style. Used by buildControllerNodes.
// NOT used by getLayoutedElements, which estimates dimensions before styles exist.

export function nodeWidth(n: GraphNode): number {
  const raw = n.style?.width;
  if (raw == null) return 200;
  const w = typeof raw === "number" ? raw : parseFloat(raw);
  return isNaN(w) || w <= 0 ? 200 : w;
}

export function nodeHeight(n: GraphNode): number {
  const raw = n.style?.height;
  if (raw != null) {
    const h = typeof raw === "number" ? raw : parseFloat(raw);
    if (!isNaN(h) && h > 0) return h;
  }
  return n.data?.isStuff ? 60 : 70;
}
