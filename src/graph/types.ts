// ViewSpec types (from pipelex-agent --view output)
export interface ViewSpecNode {
  id: string;
  label?: string;
  kind?: string;
  status?: string;
  position?: { x: number; y: number };
  ui?: { badges?: string[] };
  inspector?: { pipe_type?: string; pipe_code?: string };
}

export interface ViewSpecEdge {
  id: string;
  source: string;
  target: string;
  kind?: string;
  label?: string;
  animated?: boolean;
}

export interface ViewSpec {
  nodes: ViewSpecNode[];
  edges: ViewSpecEdge[];
}

// GraphSpec types (from pipelex-agent --view output)
export interface GraphSpecNodeIoItem {
  name?: string;
  digest?: string;
  concept?: string;
  content_type?: string;
}

export interface GraphSpecNodeIo {
  inputs?: GraphSpecNodeIoItem[];
  outputs?: GraphSpecNodeIoItem[];
}

export interface GraphSpecNode {
  id: string;
  pipe_code?: string;
  pipe_type?: string;
  status?: string;
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

// Dataflow analysis result
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

// Graph configuration passed from the extension
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

// Label descriptors — plain objects, no React dependency.
// GraphViewer maps these to React elements at render time.
export type LabelDescriptor =
  | { kind: "pipe"; label: string; isFailed: boolean }
  | { kind: "stuff"; label: string; concept: string }
  | {
      kind: "orchestration";
      label: string;
      status: string;
      typeText: string;
      badge: string;
    };

/**
 * Data payload for graph nodes. Extends Record<string, unknown> so it can be
 * used as the generic parameter for ReactFlow's Node<T> in the React layer
 * (see graph/react/rfTypes.ts), while remaining React-free for pure graph logic.
 */
export interface GraphNodeData extends Record<string, unknown> {
  labelDescriptor?: LabelDescriptor;
  label?: unknown;
  nodeData?: GraphSpecNode | ViewSpecNode;
  isPipe: boolean;
  isStuff: boolean;
  isController?: boolean;
  labelText: string;
  pipeCode?: string;
  pipeType?: string;
}

// ReactFlow node used in our graph
export interface GraphNode {
  id: string;
  type: string;
  data: GraphNodeData;
  position: { x: number; y: number };
  style?: Record<string, string | number>;
  parentId?: string;
  extent?: "parent";
  selected?: boolean;
}

// ReactFlow edge used in our graph
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

// Layout config subset used by getLayoutedElements
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

// Helpers: extract node dimensions from style, handling both string and number values.
// Used by post-layout passes (ensureControllerSpacing, buildControllerNodes) to read
// the actual style set by graphBuilders. NOT used by getLayoutedElements, which estimates
// dimensions from label text before styles exist — see comment in graphLayout.ts.
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
