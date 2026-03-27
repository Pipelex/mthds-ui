import type { GraphSpec, DataflowAnalysis, GraphNode, GraphEdge } from "./types";
import {
  CONTROLLER_PADDING_X,
  CONTROLLER_PADDING_TOP,
  CONTROLLER_PADDING_BOTTOM,
  NODE_TYPE_CONTROLLER,
  nodeWidth,
  nodeHeight,
  isStuffNodeId,
} from "./types";
import { buildChildToControllerMap } from "./graphAnalysis";

/** Max visible children before a parallel/batch controller auto-collapses. */
export const MAX_VISIBLE_CONTROLLER_CHILDREN = 5;

/**
 * Collect all descendant node IDs of a controller (recursive).
 */
function getDescendants(
  controllerId: string,
  containmentTree: Readonly<Record<string, readonly string[]>>,
  controllerNodeIds: ReadonlySet<string>,
): Set<string> {
  const result = new Set<string>();
  const stack = [controllerId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    for (const childId of containmentTree[id] || []) {
      result.add(childId);
      if (controllerNodeIds.has(childId)) stack.push(childId);
    }
  }
  return result;
}

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
    if (!isStuffNodeId(nodeId)) continue;
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

    // Scale padding by nesting depth: deeper controllers get more breathing room
    const depth = depthCache[controllerId] ?? 0;
    const depthScale = 1 + depth * 0.15; // +15% per nesting level
    const padX = Math.round(CONTROLLER_PADDING_X * depthScale);
    const padTop = Math.round(CONTROLLER_PADDING_TOP * depthScale);
    const padBottom = Math.round(CONTROLLER_PADDING_BOTTOM * depthScale);

    const groupX = minX - padX;
    const groupY = minY - padTop;
    const groupW = maxX - minX + 2 * padX;
    const groupH = maxY - minY + padTop + padBottom;

    const info = controllerInfo[controllerId] || {};
    const pipeCode = info.pipe_code || controllerId.split(":").pop() || controllerId;
    const groupNode: GraphNode = {
      id: controllerId,
      type: NODE_TYPE_CONTROLLER,
      data: {
        label: pipeCode,
        pipeType: info.pipe_type,
        isController: true,
        isPipe: false,
        isStuff: false,
        pipeCode: pipeCode,
        labelText: pipeCode,
      },
      position: { x: groupX, y: groupY },
      style: {
        width: groupW + "px",
        height: groupH + "px",
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
 *
 * When `expandedControllers` is provided, PipeParallel/PipeBatch controllers with
 * more than MAX_VISIBLE_CONTROLLER_CHILDREN children are auto-collapsed unless the
 * controller ID is in the expanded set.
 */
export function applyControllers(
  layoutedNodes: GraphNode[],
  layoutedEdges: GraphEdge[],
  graphspec: GraphSpec | null,
  analysis: DataflowAnalysis | null,
  showControllers: boolean,
  expandedControllers?: ReadonlySet<string>,
  onToggleCollapse?: (controllerId: string) => void,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (!showControllers || !analysis || !graphspec) {
    return { nodes: layoutedNodes, edges: layoutedEdges };
  }

  // ─── Compute child counts and effective collapse state ─────────────────
  const childCounts: Record<string, number> = {};
  const collapsedSet = new Set<string>();

  const controllerTypeMap: Record<string, string> = {};
  for (const node of graphspec.nodes) {
    if (analysis.controllerNodeIds.has(node.id)) {
      controllerTypeMap[node.id] = node.pipe_type || "";
    }
  }

  for (const ctrlId of analysis.controllerNodeIds) {
    const directChildren = analysis.containmentTree[ctrlId] || [];
    childCounts[ctrlId] = directChildren.length;
    const pipeType = controllerTypeMap[ctrlId] || "";
    const isCollapsible = pipeType === "PipeParallel" || pipeType === "PipeBatch";
    if (
      isCollapsible &&
      directChildren.length > MAX_VISIBLE_CONTROLLER_CHILDREN &&
      !expandedControllers?.has(ctrlId)
    ) {
      collapsedSet.add(ctrlId);
    }
  }

  // ─── Filter hidden children for collapsed controllers ──────────────────
  let filteredNodes = layoutedNodes;
  let filteredEdges = layoutedEdges;

  if (collapsedSet.size > 0) {
    const hiddenNodes = new Set<string>();

    for (const ctrlId of collapsedSet) {
      const directChildren = analysis.containmentTree[ctrlId] || [];
      const toHide = directChildren.slice(MAX_VISIBLE_CONTROLLER_CHILDREN);
      for (const childId of toHide) {
        hiddenNodes.add(childId);
        if (analysis.controllerNodeIds.has(childId)) {
          for (const d of getDescendants(
            childId,
            analysis.containmentTree,
            analysis.controllerNodeIds,
          )) {
            hiddenNodes.add(d);
          }
        }
      }
    }

    // Also hide stuff nodes inside collapsed controllers that have no visible
    // pipe connection. We ignore stuff-to-stuff edges (batch_item/batch_aggregate)
    // because those would keep orphaned branch stuff nodes alive.
    const childToCtrl = buildChildToControllerMap(graphspec, analysis);
    for (const node of layoutedNodes) {
      if (!isStuffNodeId(node.id) || hiddenNodes.has(node.id)) continue;
      const ctrlId = childToCtrl[node.id];
      if (!ctrlId || !collapsedSet.has(ctrlId)) continue;
      const pipeEdges = layoutedEdges.filter((e) => {
        if (e.source !== node.id && e.target !== node.id) return false;
        const other = e.source === node.id ? e.target : e.source;
        return !isStuffNodeId(other); // only pipe connections
      });
      if (
        pipeEdges.length === 0 ||
        pipeEdges.every((e) => {
          const other = e.source === node.id ? e.target : e.source;
          return hiddenNodes.has(other);
        })
      ) {
        hiddenNodes.add(node.id);
      }
    }

    filteredNodes = layoutedNodes.filter((n) => !hiddenNodes.has(n.id));
    filteredEdges = layoutedEdges.filter(
      (e) => !hiddenNodes.has(e.source) && !hiddenNodes.has(e.target),
    );
  }

  // ─── Build controller group nodes from visible children ────────────────
  const controllerNodes = buildControllerNodes(graphspec, analysis, filteredNodes);
  if (controllerNodes.length === 0) {
    return { nodes: filteredNodes, edges: filteredEdges };
  }

  // Inject collapse metadata into controller node data
  for (const cn of controllerNodes) {
    const count = childCounts[cn.id] ?? 0;
    const isCollapsed = collapsedSet.has(cn.id);
    cn.data.childCount = count;
    cn.data.isCollapsed = isCollapsed;
    if (onToggleCollapse) {
      const id = cn.id;
      cn.data.onToggleCollapse = () => onToggleCollapse(id);
    }
  }

  const allNodes = [...controllerNodes, ...filteredNodes];

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

  return { nodes: allNodes, edges: filteredEdges };
}
