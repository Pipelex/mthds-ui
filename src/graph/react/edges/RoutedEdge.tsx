import { BaseEdge, getSmoothStepPath } from "@xyflow/react";
import type { Edge, EdgeProps } from "@xyflow/react";
import { fitRoute, roundedPolylinePath, routeLabelCenter } from "@graph/edgeRoutes";
import type { RoutedEdgeData } from "@graph/react/rfTypes";

/**
 * An edge drawn along the route the layout computed (`EDGE_TYPE_ROUTED`), so
 * it bends around the nodes in its way instead of crossing them, with its
 * label in the box the layout reserved. Once a node is dragged away from where
 * the layout put it, the route no longer meets its handles, and the edge falls
 * back to a rounded step between them.
 */
export function RoutedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  labelStyle,
  labelShowBg,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  style,
  markerEnd,
  markerStart,
  interactionWidth,
}: EdgeProps<Edge<RoutedEdgeData>>) {
  const route = data?.route;
  const fitted = route
    ? fitRoute(route.points, { x: sourceX, y: sourceY }, { x: targetX, y: targetY })
    : null;

  let path: string;
  let labelX: number;
  let labelY: number;
  if (route && fitted) {
    path = roundedPolylinePath(fitted);
    ({ x: labelX, y: labelY } = routeLabelCenter(route, fitted));
  } else {
    [path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 8,
    });
  }

  return (
    <BaseEdge
      id={id}
      path={path}
      labelX={labelX}
      labelY={labelY}
      label={label}
      labelStyle={labelStyle}
      labelShowBg={labelShowBg}
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
      style={style}
      markerEnd={markerEnd}
      markerStart={markerStart}
      interactionWidth={interactionWidth}
    />
  );
}
