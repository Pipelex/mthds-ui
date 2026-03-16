/**
 * ReactFlow type boundary — "ports and adapters" pattern.
 *
 * The pure graph logic (types.ts, graphBuilders, graphLayout, graphControllers)
 * uses domain types: GraphNode, GraphEdge. These are React-free and used for
 * building, layout, analysis, and controller generation.
 *
 * The React layer (this directory) uses ReactFlow's generic types:
 *   AppNode  = Node<GraphNodeData>   — ReactFlow node parameterized with our data
 *   AppEdge  = Edge<...>             — ReactFlow edge with standard fields
 *
 * Boundary mapping functions (toAppNodes, toAppEdges) convert domain types to
 * ReactFlow types at the point where data enters ReactFlow hooks (setNodes/setEdges).
 * All type conversions are localized here — no `as any` casts elsewhere.
 *
 * Why not make GraphNode extend Node<T>?
 *   types.ts must stay React-free. GraphNode.style uses Record<string, string | number>
 *   (not CSSProperties) and GraphEdge has domain-specific fields (_batchEdge, _crossGroup)
 *   that don't belong on ReactFlow's Edge type. The boundary mapping is the clean solution.
 */
import type { CSSProperties } from "react";
import type { Node, Edge, ReactFlowInstance, EdgeMarkerType } from "@xyflow/react";
import type { GraphNode, GraphEdge, GraphNodeData } from "../types";

/** ReactFlow node parameterized with our domain data. */
export type AppNode = Node<GraphNodeData>;

/** ReactFlow edge with standard fields (domain-only fields are dropped at the boundary). */
export type AppEdge = Edge<Record<string, unknown>>;

/** ReactFlow instance typed with our app node/edge types. */
export type AppRFInstance = ReactFlowInstance<AppNode, AppEdge>;

/**
 * Convert domain GraphNode[] to ReactFlow AppNode[].
 *
 * Style fields use Record<string, string | number> in the domain layer but
 * CSSProperties in React. The cast is safe because graph builders only set
 * valid CSS properties (width, height, background, border, etc.).
 */
export function toAppNodes(nodes: GraphNode[]): AppNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    data: n.data,
    position: n.position,
    style: n.style as CSSProperties | undefined,
    parentId: n.parentId,
    extent: n.extent,
    selected: n.selected,
  }));
}

/**
 * Convert domain GraphEdge[] to ReactFlow AppEdge[].
 *
 * Domain-only fields (_batchEdge, _crossGroup) are dropped — they're only used
 * by pure graph logic (layout weight calculation), not by ReactFlow rendering.
 * The markerEnd cast is safe: our { type: "arrowclosed", color } satisfies EdgeMarker.
 */
export function toAppEdges(edges: GraphEdge[]): AppEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type,
    animated: e.animated,
    label: e.label,
    labelStyle: e.labelStyle as CSSProperties | undefined,
    labelBgStyle: e.labelBgStyle as CSSProperties | undefined,
    labelBgPadding: e.labelBgPadding,
    labelBgBorderRadius: e.labelBgBorderRadius,
    style: e.style as CSSProperties | undefined,
    markerEnd: e.markerEnd as EdgeMarkerType | undefined,
  }));
}
