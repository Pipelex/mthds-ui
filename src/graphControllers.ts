import type { GraphSpec, DataflowAnalysis, GraphNode, GraphEdge } from "./types";
import {
  CONTROLLER_PADDING_X,
  CONTROLLER_PADDING_TOP,
  CONTROLLER_PADDING_BOTTOM,
  nodeWidth,
  nodeHeight,
} from "./types";
import { buildChildToControllerMap } from "./graphAnalysis";

/**
 * Build controller group nodes that wrap child operators/stuff nodes.
 *
 * **Side effect:** mutates `layoutedNodes` entries to set `parentId`, `extent`,
 * and convert positions to parent-relative coordinates.
 */
export function buildControllerNodes(
  graphspec: GraphSpec,
  analysis: DataflowAnalysis,
  layoutedNodes: GraphNode[],
): GraphNode[] {
  const nodeById: Record<string, GraphNode> = {};
  for (const n of layoutedNodes) {
    nodeById[n.id] = n;
  }

  const controllerInfo: Record<string, GraphSpec["nodes"][number]> = {};
  for (const node of graphspec.nodes) {
    if (analysis.controllerNodeIds.has(node.id)) {
      controllerInfo[node.id] = node;
    }
  }

  const depthCache: Record<string, number> = {};
  const depthVisiting = new Set<string>();
  function getDepth(controllerId: string): number {
    if (depthCache[controllerId] !== undefined) return depthCache[controllerId];
    if (depthVisiting.has(controllerId)) {
      throw new Error(
        `Cycle detected in containment tree: controller "${controllerId}" is part of a containment cycle`,
      );
    }
    depthVisiting.add(controllerId);
    const children = analysis.containmentTree[controllerId] || [];
    let maxChildDepth = -1;
    for (const childId of children) {
      if (analysis.controllerNodeIds.has(childId)) {
        maxChildDepth = Math.max(maxChildDepth, getDepth(childId));
      }
    }
    depthVisiting.delete(controllerId);
    depthCache[controllerId] = maxChildDepth + 1;
    return depthCache[controllerId];
  }

  const childToController = buildChildToControllerMap(graphspec, analysis);
  const controllerStuffChildren: Record<string, string[]> = {};
  for (const [nodeId, ctrlId] of Object.entries(childToController)) {
    if (!nodeId.startsWith("stuff_")) continue;
    if (!nodeById[nodeId]) continue;
    if (!controllerStuffChildren[ctrlId]) controllerStuffChildren[ctrlId] = [];
    controllerStuffChildren[ctrlId].push(nodeId);
  }

  const controllerIds = Array.from(analysis.controllerNodeIds);
  for (const id of controllerIds) getDepth(id);
  controllerIds.sort((a, b) => depthCache[a] - depthCache[b]);

  const controllerNodes: GraphNode[] = [];
  const childToParent: Record<string, string> = {};

  for (const controllerId of controllerIds) {
    // Skip the root controller (main pipe) — it wraps everything and adds no value
    if (!childToController[controllerId]) continue;

    const directChildren = analysis.containmentTree[controllerId] || [];
    const renderedChildren = directChildren.filter((cid) => nodeById[cid]);
    const stuffChildren = controllerStuffChildren[controllerId] || [];
    const allChildren = [...renderedChildren, ...stuffChildren];

    if (allChildren.length === 0) continue;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const childId of allChildren) {
      const child = nodeById[childId];
      const pos = child.position;
      const w = nodeWidth(child);
      const h = nodeHeight(child);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + w);
      maxY = Math.max(maxY, pos.y + h);
    }

    const groupX = minX - CONTROLLER_PADDING_X;
    const groupY = minY - CONTROLLER_PADDING_TOP;
    const groupW = maxX - minX + 2 * CONTROLLER_PADDING_X;
    const groupH = maxY - minY + CONTROLLER_PADDING_TOP + CONTROLLER_PADDING_BOTTOM;

    const info = controllerInfo[controllerId] || {};
    const pipeCode = info.pipe_code || controllerId.split(":").pop() || controllerId;
    const pipeType = info.pipe_type || "";
    const isImplicitBatch = pipeType === "PipeBatch" && pipeCode.endsWith("_batch");
    const groupNode: GraphNode = {
      id: controllerId,
      type: "controllerGroup",
      data: {
        label: isImplicitBatch ? null : pipeCode,
        pipeType: isImplicitBatch ? "implicit PipeBatch" : pipeType,
        isController: true,
        isPipe: false,
        isStuff: false,
        pipeCode: isImplicitBatch ? pipeCode.slice(0, -6) : pipeCode,
        labelText: pipeCode,
      },
      position: { x: groupX, y: groupY },
      style: {
        width: groupW + "px",
        height: groupH + "px",
        background: "var(--color-controller-bg)",
        border: "2px dashed var(--color-controller-border)",
        borderRadius: "12px",
        padding: "0",
      },
    };

    controllerNodes.push(groupNode);
    nodeById[controllerId] = groupNode;

    for (const childId of allChildren) {
      childToParent[childId] = controllerId;
    }
  }

  // Convert child positions to parent-relative and set parentId
  for (const [childId, parentId] of Object.entries(childToParent)) {
    const child = nodeById[childId];
    const parent = nodeById[parentId];
    if (!child || !parent) continue;
    child.position = {
      x: child.position.x - parent.position.x,
      y: child.position.y - parent.position.y,
    };
    child.parentId = parentId;
    child.extent = "parent";
  }

  return controllerNodes;
}

/**
 * Apply controller containers to layouted nodes if showControllers is enabled.
 */
export function applyControllers(
  layoutedNodes: GraphNode[],
  layoutedEdges: GraphEdge[],
  graphspec: GraphSpec | null,
  analysis: DataflowAnalysis | null,
  showControllers: boolean,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (!showControllers || !analysis || !graphspec) {
    return { nodes: layoutedNodes, edges: layoutedEdges };
  }

  const controllerNodes = buildControllerNodes(graphspec, analysis, layoutedNodes);
  if (controllerNodes.length === 0) {
    return { nodes: layoutedNodes, edges: layoutedEdges };
  }

  const allNodes = [...controllerNodes, ...layoutedNodes];

  // Sort: ReactFlow requires parent group nodes before their children.
  const nodeMap: Record<string, GraphNode> = {};
  for (const n of allNodes) nodeMap[n.id] = n;
  const depthOf: Record<string, number> = {};
  const depthVisiting = new Set<string>();
  function getContainmentDepth(id: string): number {
    if (depthOf[id] !== undefined) return depthOf[id];
    if (depthVisiting.has(id)) {
      throw new Error(
        `Cycle detected in node parent chain: node "${id}" references itself as an ancestor`,
      );
    }
    depthVisiting.add(id);
    const n = nodeMap[id];
    depthOf[id] = n && n.parentId ? 1 + getContainmentDepth(n.parentId) : 0;
    depthVisiting.delete(id);
    return depthOf[id];
  }
  for (const n of allNodes) getContainmentDepth(n.id);
  allNodes.sort((a, b) => depthOf[a.id] - depthOf[b.id]);

  return { nodes: allNodes, edges: layoutedEdges };
}
