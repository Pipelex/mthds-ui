import React from "react";
import { useEdges, useNodes, useNodesInitialized, useReactFlow, useStore } from "@xyflow/react";

import type { AppEdge, AppNode, RoutedEdgeData } from "../rfTypes";
import { stillContentBounds, stillViewport } from "./stillViewport";

/**
 * The still presentation's viewport, rendered inside `<ReactFlow>` so it can read
 * the flow's store: once every node is measured, and again whenever the nodes or
 * the container's width change, it fits the drawing to the width (never past its
 * natural size) and reports the height the container must take to show all of
 * it. Renders nothing. It depends on the width alone, not the height, so the
 * height it reports cannot feed back into it.
 */
export function StillFit({ onHeight }: { onHeight: (height: number) => void }) {
  const width = useStore((s) => s.width);
  const nodesInitialized = useNodesInitialized();
  const nodes = useNodes<AppNode>();
  const edges = useEdges<AppEdge>();
  const { getNodesBounds, setViewport } = useReactFlow<AppNode, AppEdge>();

  React.useLayoutEffect(() => {
    if (!nodesInitialized || nodes.length === 0) return;
    // `getNodesBounds` reads the flow's own lookup, so a node framed inside
    // another is placed by its absolute position, not its parent-relative one.
    const bounds = stillContentBounds(
      getNodesBounds(nodes),
      edges.map((e) => (e.data as RoutedEdgeData | undefined)?.route),
    );
    const view = stillViewport(bounds, width);
    if (!view) return;
    void setViewport({ x: view.x, y: view.y, zoom: view.zoom });
    onHeight(view.height);
  }, [nodesInitialized, nodes, edges, width, getNodesBounds, setViewport, onHeight]);

  return null;
}
