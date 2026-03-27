import dagre from "dagre";
import type { GraphNode, GraphEdge, GraphSpec, DataflowAnalysis, LayoutConfig } from "./types";
import {
  CONTROLLER_PADDING_X,
  CONTROLLER_PADDING_TOP,
  CONTROLLER_PADDING_BOTTOM,
  nodeWidth,
  nodeHeight,
} from "./types";
import { buildChildToControllerMap } from "./graphAnalysis";

export function getLayoutedElements(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: string,
  layoutConfig?: LayoutConfig,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  direction = direction || "TB";
  const nodesep = layoutConfig?.nodesep ?? 80;
  const ranksep = layoutConfig?.ranksep ?? 70;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep,
    ranksep,
    edgesep: 30,
    marginx: 40,
    marginy: 40,
  });

  const isHorizontal = direction === "LR" || direction === "RL";

  // NOTE: These dimensions are intentionally different from nodeWidth()/nodeHeight() in types.ts.
  // Dagre needs estimated sizes *before* styles are set (styles are written by graphBuilders).
  // Post-layout passes (ensureControllerSpacing, buildControllerNodes) then read the actual
  // style.width/style.height via nodeWidth()/nodeHeight(). The two serve different pipeline stages.
  const nodeWidths: Record<string, number> = {};
  const nodeHeights: Record<string, number> = {};
  nodes.forEach((node) => {
    const nodeData = node.data || {};
    const isStuff = nodeData.isStuff;
    const labelText = nodeData.labelText || "";
    const isPipeCard = node.type === "pipeCard";
    const estimatedWidth = Math.max(180, Math.min(400, labelText.length * 8 + 60));

    // Pipe card CSS: LR → min 180 / max 240, TB → min 280 / max 400.
    const pipeCardMinWidth = isHorizontal ? 180 : 280;
    const pipeCardMaxWidth = isHorizontal ? 240 : 400;
    let width: number;
    if (isStuff) {
      width = Math.max(180, estimatedWidth);
    } else if (isPipeCard && nodeData.pipeCardData) {
      // Use CSS max-width as the dagre estimate. Pipe card content (description + IO)
      // typically fills to max-width; underestimating causes output nodes to crowd
      // the card's right edge since the position is anchored at the left.
      width = pipeCardMaxWidth;
    } else {
      width = Math.max(isPipeCard ? pipeCardMinWidth : 200, estimatedWidth);
    }

    // Adaptive height: account for IO sections on pipe cards.
    // CSS layout: padding(12+12) + header(~20) + per IO section(gap 8 + row ~22 = 30).
    // LR cards are narrower → more pill wrapping → taller.
    let height: number;
    if (isStuff) {
      height = 60;
    } else if (isPipeCard && nodeData.pipeCardData) {
      const pcd = nodeData.pipeCardData;
      const inputCount = pcd.inputs?.length ?? 0;
      const outputCount = pcd.outputs?.length ?? 0;
      const hasDesc = !!pcd.description || !!nodeData.nodeData?.description;
      const baseHeight = 44 + (hasDesc ? 24 : 0); // padding(24) + header(20) + description(24?)
      // LR: label above pills → taller section base; TB: label beside pills
      const sectionBase = isHorizontal ? 38 : 30;
      const inputSection = inputCount > 0 ? sectionBase : 0;
      const outputSection = outputCount > 0 ? sectionBase : 0;
      // LR stacks pills vertically (1/row); TB wraps (~3/row)
      const pillsPerRow = isHorizontal ? 1 : 3;
      const visibleInputs = Math.min(inputCount, 4); // MAX_VISIBLE_INPUTS = 4
      const inputExtraRows = Math.max(0, Math.ceil(visibleInputs / pillsPerRow) - 1);
      const outputExtraRows = Math.max(0, Math.ceil(outputCount / pillsPerRow) - 1);
      height = Math.min(
        320,
        baseHeight + inputSection + outputSection + (inputExtraRows + outputExtraRows) * 24,
      );
    } else {
      height = isPipeCard ? 120 : 70;
    }
    nodeWidths[node.id] = width;
    nodeHeights[node.id] = height;
    g.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    const opts: Record<string, unknown> = {};
    if (edge._crossGroup) {
      opts.weight = 0;
    }
    if (edge._batchEdge) {
      opts.weight = 0;
    }
    g.setEdge(edge.source, edge.target, opts);
  });

  dagre.layout(g);

  const result = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    if (!nodeWithPosition) {
      throw new Error(`dagre did not produce position for node "${node.id}"`);
    }
    const width = nodeWidths[node.id];
    const height = nodeHeights[node.id];
    // Inject direction into pipeCardData so the card component can adjust orientation
    const pipeCardData = node.data.pipeCardData;
    const cardDirection = isHorizontal ? ("LR" as const) : ("TB" as const);
    const updatedPipeCardData = pipeCardData
      ? { ...pipeCardData, direction: cardDirection }
      : undefined;
    return {
      ...node,
      data: {
        ...node.data,
        _estimatedWidth: width,
        _estimatedHeight: height,
        pipeCardData: updatedPipeCardData,
      },
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
      sourcePosition: (isHorizontal
        ? direction === "LR"
          ? "right"
          : "left"
        : "bottom") as GraphNode["sourcePosition"],
      targetPosition: (isHorizontal
        ? direction === "LR"
          ? "left"
          : "right"
        : "top") as GraphNode["targetPosition"],
    };
  });

  return { nodes: result, edges };
}

/**
 * Post-layout pass that resolves overlaps and improves alignment. Direction-aware (TB/LR).
 */
export function ensureControllerSpacing(
  nodes: GraphNode[],
  graphspec: GraphSpec | null,
  analysis: DataflowAnalysis | null,
  direction: string,
): GraphNode[] {
  if (!analysis || !graphspec) return nodes;
  const isHorizontal = direction === "LR" || direction === "RL";

  const childToCtrl = buildChildToControllerMap(graphspec, analysis);
  const MIN_GAP = 30;

  function isDescendantOf(nodeId: string, ctrlId: string): boolean {
    const visited = new Set<string>();
    let c = childToCtrl[nodeId];
    while (c) {
      if (c === ctrlId) return true;
      if (visited.has(c)) {
        throw new Error(
          `Cycle detected in controller hierarchy while checking ancestry of "${nodeId}"`,
        );
      }
      visited.add(c);
      c = childToCtrl[c];
    }
    return false;
  }

  const result = nodes.map((n) => ({ ...n, position: { ...n.position } }));

  const ctrlIndices: Record<string, number[]> = {};
  for (const ctrlId of analysis.controllerNodeIds) {
    const indices: number[] = [];
    for (let i = 0; i < result.length; i++) {
      if (isDescendantOf(result[i].id, ctrlId)) indices.push(i);
    }
    if (indices.length > 0) ctrlIndices[ctrlId] = indices;
  }

  function computeBox(ctrlId: string) {
    const indices = ctrlIndices[ctrlId];
    if (!indices) return null;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const idx of indices) {
      const n = result[idx];
      const w = nodeWidth(n);
      const h = nodeHeight(n);
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + w);
      maxY = Math.max(maxY, n.position.y + h);
    }
    return {
      padLeft: minX - CONTROLLER_PADDING_X,
      padTop: minY - CONTROLLER_PADDING_TOP,
      padRight: maxX + CONTROLLER_PADDING_X,
      padBottom: maxY + CONTROLLER_PADDING_BOTTOM,
    };
  }

  // Phase 1: resolve overlaps between sibling controller groups
  for (const [_parentId, childIds] of Object.entries(analysis.containmentTree)) {
    const childCtrls = childIds.filter(
      (id) => analysis.controllerNodeIds.has(id) && ctrlIndices[id],
    );
    if (childCtrls.length < 2) continue;

    for (let pass = 0; pass < 6; pass++) {
      let anyShifted = false;

      for (let i = 0; i < childCtrls.length; i++) {
        for (let j = i + 1; j < childCtrls.length; j++) {
          const boxA = computeBox(childCtrls[i]);
          const boxB = computeBox(childCtrls[j]);
          if (!boxA || !boxB) continue;

          const hOverlap =
            Math.min(boxA.padRight, boxB.padRight) - Math.max(boxA.padLeft, boxB.padLeft);
          const vOverlap =
            Math.min(boxA.padBottom, boxB.padBottom) - Math.max(boxA.padTop, boxB.padTop);
          if (hOverlap <= 0 || vOverlap <= 0) continue;

          if (isHorizontal) {
            const bottomCtrl = boxA.padTop <= boxB.padTop ? childCtrls[j] : childCtrls[i];
            for (const idx of ctrlIndices[bottomCtrl]) {
              result[idx].position.y += vOverlap + MIN_GAP;
            }
          } else {
            const rightCtrl = boxA.padLeft <= boxB.padLeft ? childCtrls[j] : childCtrls[i];
            for (const idx of ctrlIndices[rightCtrl]) {
              result[idx].position.x += hOverlap + MIN_GAP;
            }
          }
          anyShifted = true;
        }
      }
      if (!anyShifted) break;
    }
  }

  // Phase 2: push loose nodes away from child controller padded boxes
  for (const [_parentId, childIds] of Object.entries(analysis.containmentTree)) {
    const childCtrls = childIds.filter(
      (id) => analysis.controllerNodeIds.has(id) && ctrlIndices[id],
    );
    if (childCtrls.length === 0) continue;

    const inAnyChildCtrl = new Set<number>();
    for (const ctrlId of childCtrls) {
      for (const idx of ctrlIndices[ctrlId]) inAnyChildCtrl.add(idx);
    }

    const boxes: Record<string, ReturnType<typeof computeBox>> = {};
    let ctrlsMinY = Infinity,
      ctrlsMaxY = -Infinity;
    let ctrlsMinX = Infinity,
      ctrlsMaxX = -Infinity;
    for (const ctrlId of childCtrls) {
      const box = computeBox(ctrlId);
      if (!box) continue;
      boxes[ctrlId] = box;
      ctrlsMinY = Math.min(ctrlsMinY, box.padTop);
      ctrlsMaxY = Math.max(ctrlsMaxY, box.padBottom);
      ctrlsMinX = Math.min(ctrlsMinX, box.padLeft);
      ctrlsMaxX = Math.max(ctrlsMaxX, box.padRight);
    }
    if (ctrlsMinY === Infinity) continue;

    const ctrlsCenter = isHorizontal ? (ctrlsMinX + ctrlsMaxX) / 2 : (ctrlsMinY + ctrlsMaxY) / 2;

    const parentIndices = new Set<number>();
    for (let i = 0; i < result.length; i++) {
      if (inAnyChildCtrl.has(i)) continue;
      const n = result[i];
      if (childToCtrl[n.id] === _parentId || !childToCtrl[n.id]) {
        parentIndices.add(i);
      }
    }

    let maxPushBefore = 0,
      maxPushAfter = 0;

    for (const i of parentIndices) {
      const n = result[i];
      const w = nodeWidth(n);
      const h = nodeHeight(n);

      for (const ctrlId of childCtrls) {
        const box = boxes[ctrlId];
        if (!box) continue;

        const hOvlp =
          Math.min(box.padRight, n.position.x + w) - Math.max(box.padLeft, n.position.x);
        const vOvlp =
          Math.min(box.padBottom, n.position.y + h) - Math.max(box.padTop, n.position.y);
        if (hOvlp <= 0 || vOvlp <= 0) continue;

        if (isHorizontal) {
          const nodeCenterX = n.position.x + w / 2;
          const boxCenterX = (box.padLeft + box.padRight) / 2;
          if (nodeCenterX < boxCenterX) {
            const needed = n.position.x + w - box.padLeft + MIN_GAP;
            maxPushBefore = Math.max(maxPushBefore, needed);
          } else {
            const needed = box.padRight - n.position.x + MIN_GAP;
            maxPushAfter = Math.max(maxPushAfter, needed);
          }
        } else {
          const nodeCenterY = n.position.y + h / 2;
          const boxCenterY = (box.padTop + box.padBottom) / 2;
          if (nodeCenterY < boxCenterY) {
            const needed = n.position.y + h - box.padTop + MIN_GAP;
            maxPushBefore = Math.max(maxPushBefore, needed);
          } else {
            const needed = box.padBottom - n.position.y + MIN_GAP;
            maxPushAfter = Math.max(maxPushAfter, needed);
          }
        }
      }
    }

    if (maxPushBefore > 0 || maxPushAfter > 0) {
      for (const i of parentIndices) {
        const n = result[i];
        const w = nodeWidth(n);
        const h = nodeHeight(n);

        if (isHorizontal) {
          const nodeBottom = n.position.y + h;
          if (nodeBottom <= ctrlsMinY || n.position.y >= ctrlsMaxY) continue;
          const nodeCenterX = n.position.x + w / 2;
          if (maxPushBefore > 0 && nodeCenterX < ctrlsCenter) {
            result[i].position.x -= maxPushBefore;
          }
          if (maxPushAfter > 0 && nodeCenterX >= ctrlsCenter) {
            result[i].position.x += maxPushAfter;
          }
        } else {
          const nodeRight = n.position.x + w;
          if (nodeRight <= ctrlsMinX || n.position.x >= ctrlsMaxX) continue;
          const nodeCenterY = n.position.y + h / 2;
          if (maxPushBefore > 0 && nodeCenterY < ctrlsCenter) {
            result[i].position.y -= maxPushBefore;
          }
          if (maxPushAfter > 0 && nodeCenterY >= ctrlsCenter) {
            result[i].position.y += maxPushAfter;
          }
        }
      }
    }
  }

  // Build controller info lookup (used by Phase 3 and Phase 4)
  const controllerInfoMap: Record<string, GraphSpec["nodes"][number]> = {};
  for (const node of graphspec.nodes) {
    if (analysis.controllerNodeIds.has(node.id)) {
      controllerInfoMap[node.id] = node;
    }
  }

  // Phase 3: align loose input stuff nodes near their downstream controller
  const INPUT_MARGIN = 40; // gap between input stuff node and controller boundary
  for (let i = 0; i < result.length; i++) {
    const n = result[i];
    if (childToCtrl[n.id]) continue;
    if (!n.id.startsWith("stuff_")) continue;

    const digest = n.id.replace("stuff_", "");
    const consumers = analysis.stuffConsumers[digest];
    if (!consumers || consumers.length === 0) continue;

    const targetCtrls = new Set<string>();
    for (const consumerId of consumers) {
      const ctrl = childToCtrl[consumerId];
      if (ctrl) targetCtrls.add(ctrl);
    }

    // Collect all target controller boxes
    const targetBoxes: NonNullable<ReturnType<typeof computeBox>>[] = [];
    for (const ctrlId of targetCtrls) {
      const b = computeBox(ctrlId);
      if (b) targetBoxes.push(b);
    }
    if (targetBoxes.length === 0) continue;

    // Compute the bounding box of all target controllers
    let allMinX = Infinity,
      allMinY = Infinity,
      allMaxX = -Infinity,
      allMaxY = -Infinity;
    for (const b of targetBoxes) {
      allMinX = Math.min(allMinX, b.padLeft);
      allMinY = Math.min(allMinY, b.padTop);
      allMaxX = Math.max(allMaxX, b.padRight);
      allMaxY = Math.max(allMaxY, b.padBottom);
    }

    const w = nodeWidth(n);
    const h = nodeHeight(n);

    if (isHorizontal) {
      // Vertically center across all target controllers, position to the left
      const centerY = (allMinY + allMaxY) / 2;
      result[i].position.y = centerY - h / 2;
      // Place to the left of the leftmost controller boundary with margin
      result[i].position.x = Math.min(result[i].position.x, allMinX - w - INPUT_MARGIN);
    } else {
      // Horizontally center across all target controllers, position above
      const centerX = (allMinX + allMaxX) / 2;
      result[i].position.x = centerX - w / 2;
      // Place above the topmost controller boundary with margin
      result[i].position.y = Math.min(result[i].position.y, allMinY - h - INPUT_MARGIN);
    }
  }

  // Phase 4: align nodes within each leaf controller into a single column
  const orderAxis = isHorizontal ? "y" : "x";
  for (const ctrlId of analysis.controllerNodeIds) {
    const children = analysis.containmentTree[ctrlId] || [];
    const hasChildCtrl = children.some((id) => analysis.controllerNodeIds.has(id));
    if (hasChildCtrl) continue;

    const ctrlNode = controllerInfoMap[ctrlId];
    if (
      ctrlNode &&
      (ctrlNode.pipe_type === "PipeParallel" ||
        ctrlNode.pipe_type === "PipeBatch" ||
        ctrlNode.pipe_type === "PipeCondition")
    )
      continue;

    const indices = ctrlIndices[ctrlId];
    if (!indices || indices.length < 2) continue;

    const centers = indices.map((idx) => {
      const n = result[idx];
      const w = nodeWidth(n);
      return n.position[orderAxis] + (orderAxis === "x" ? w / 2 : nodeHeight(n) / 2);
    });
    centers.sort((a, b) => a - b);
    const median = centers[Math.floor(centers.length / 2)];

    for (const idx of indices) {
      const n = result[idx];
      const w = nodeWidth(n);
      const halfSize = orderAxis === "x" ? w / 2 : nodeHeight(n) / 2;
      result[idx].position[orderAxis] = median - halfSize;
    }
  }

  // Phase 5: reorder loose input stuff nodes to minimize edge crossings.
  // When multiple unparented stuff nodes are stacked on the entry side, their
  // vertical/horizontal order should match their primary consumers' order.
  const looseStuffIndices: number[] = [];
  for (let i = 0; i < result.length; i++) {
    const n = result[i];
    if (childToCtrl[n.id]) continue;
    if (!n.id.startsWith("stuff_")) continue;
    const digest = n.id.replace("stuff_", "");
    const cons = analysis.stuffConsumers[digest];
    if (!cons || cons.length === 0) continue;
    looseStuffIndices.push(i);
  }

  if (looseStuffIndices.length >= 2) {
    // For each loose stuff node, compute the average cross-axis position of its consumers
    const crossAxis = isHorizontal ? "y" : "x";
    const targetCenters: { idx: number; center: number }[] = [];
    for (const idx of looseStuffIndices) {
      const n = result[idx];
      const digest = n.id.replace("stuff_", "");
      const cons = analysis.stuffConsumers[digest] || [];
      let sum = 0,
        count = 0;
      for (const consumerId of cons) {
        const consIdx = result.findIndex((r) => r.id === consumerId);
        if (consIdx >= 0) {
          const cn = result[consIdx];
          sum +=
            cn.position[crossAxis] + (crossAxis === "x" ? nodeWidth(cn) / 2 : nodeHeight(cn) / 2);
          count++;
        }
      }
      targetCenters.push({ idx, center: count > 0 ? sum / count : 0 });
    }

    // Sort by target center position
    targetCenters.sort((a, b) => a.center - b.center);

    // Collect current cross-axis positions (sorted)
    const currentPositions = looseStuffIndices
      .map((idx) => result[idx].position[crossAxis])
      .sort((a, b) => a - b);

    // Assign sorted positions to sorted nodes, preserving spacing
    for (let j = 0; j < targetCenters.length; j++) {
      result[targetCenters[j].idx].position[crossAxis] = currentPositions[j];
    }
  }

  // Phase 6: align stuff nodes with their producer on the cross-axis.
  // This ensures output stuff nodes (e.g., "merged") sit at the same vertical
  // level as the pipe card that produced them, even in non-leaf controllers
  // where Phase 4 doesn't apply.
  // Uses _estimatedHeight (set by getLayoutedElements) for accurate centering —
  // nodeHeight() defaults to 70px for pipe cards without style.height, which is wrong.
  const crossAxis6 = isHorizontal ? "y" : "x";
  for (let i = 0; i < result.length; i++) {
    const n = result[i];
    if (!n.id.startsWith("stuff_")) continue;

    const digest = n.id.replace("stuff_", "");
    const producerId = analysis.stuffProducers[digest];
    if (!producerId) continue;

    const producerIdx = result.findIndex((r) => r.id === producerId);
    if (producerIdx < 0) continue;

    const producer = result[producerIdx];
    // Only align if they're in the same controller group
    if (childToCtrl[n.id] !== childToCtrl[producerId]) continue;

    const estSize = (node: GraphNode) => {
      if (crossAxis6 === "x") {
        return (node.data._estimatedWidth as number | undefined) ?? nodeWidth(node);
      }
      return (node.data._estimatedHeight as number | undefined) ?? nodeHeight(node);
    };
    const producerCenter = producer.position[crossAxis6] + estSize(producer) / 2;
    const stuffHalf = estSize(n) / 2;
    result[i].position[crossAxis6] = producerCenter - stuffHalf;
  }

  return result;
}
