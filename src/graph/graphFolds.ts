import type {
  DataflowAnalysis,
  FoldToggleOptions,
  GraphData,
  GraphEdge,
  GraphNode,
  GraphSpec,
  GraphSpecNode,
} from "./types";
import { ARROW_CLOSED_MARKER, NODE_TYPE_PIPE_CARD } from "./types";
import { buildChildToControllerMap } from "./graphAnalysis";
import { buildPipeCardPayload } from "./pipeCardPayload";

/**
 * Find every controller that shares the same `pipe_code` as `controllerId` —
 * the "cousins" of the clicked controller (other instances of the same pipe,
 * possibly living in different branches of the graph).
 *
 * The result always includes `controllerId` itself. If the controller has no
 * `pipe_code` or no cousins exist, returns a singleton set.
 *
 * Used by GraphViewer to mirror fold/expand actions across all instances of a
 * pipe — the default behavior — while alt/option-click bypasses cousin lookup
 * and toggles only the clicked controller.
 */
export function findCousinControllers(
  controllerId: string,
  graphspec: GraphSpec,
  controllerNodeIds: ReadonlySet<string>,
): Set<string> {
  const result = new Set<string>([controllerId]);
  const clicked = graphspec.nodes.find((n) => n.id === controllerId);
  const pipeCode = clicked?.pipe_code;
  if (!pipeCode) return result;
  for (const node of graphspec.nodes) {
    if (node.pipe_code !== pipeCode) continue;
    if (!controllerNodeIds.has(node.id)) continue;
    result.add(node.id);
  }
  return result;
}

/**
 * Walk the containment chain from `nodeId` upward, returning the ordered list of
 * ancestor controller IDs from immediate parent → root.
 */
export function buildContainmentChain(
  nodeId: string,
  childToCtrl: Readonly<Record<string, string>>,
): string[] {
  const chain: string[] = [];
  let current: string | undefined = childToCtrl[nodeId];
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    chain.push(current);
    seen.add(current);
    current = childToCtrl[current];
  }
  return chain;
}

/**
 * Find the **outermost** (closest to root) ancestor of `nodeId` whose ID is in
 * `foldedSet`. Returns `null` if no ancestor is folded.
 */
export function outermostFoldedAncestor(
  nodeId: string,
  childToCtrl: Readonly<Record<string, string>>,
  foldedSet: ReadonlySet<string>,
): string | null {
  const chain = buildContainmentChain(nodeId, childToCtrl);
  let outermost: string | null = null;
  for (const ancestorId of chain) {
    if (foldedSet.has(ancestorId)) outermost = ancestorId;
  }
  return outermost;
}

/**
 * Effective ID after folding: returns the outermost folded ancestor if one
 * exists; otherwise the node itself.
 */
function effectiveId(
  nodeId: string,
  childToCtrl: Readonly<Record<string, string>>,
  foldedSet: ReadonlySet<string>,
): string {
  return outermostFoldedAncestor(nodeId, childToCtrl, foldedSet) ?? nodeId;
}

function findSpecNode(graphspec: GraphSpec, id: string): GraphSpecNode | undefined {
  return graphspec.nodes.find((n) => n.id === id);
}

/**
 * Apply the fold transformation to a dataflow graph.
 *
 * For each controller in `foldedSet` that is not itself inside another folded
 * controller (outermost-wins): emit a single `pipe-card` node carrying the
 * controller's payload, and rewrite/dedup edges so the controller card replaces
 * its hidden descendants.
 *
 * The function is pure — inputs are not mutated; a fresh `{ nodes, edges,
 * analysis }` is returned.
 */
export function applyFolds(
  graphData: GraphData,
  analysis: DataflowAnalysis,
  graphspec: GraphSpec,
  foldedSet: ReadonlySet<string>,
  onToggleFold?: (controllerId: string, options?: FoldToggleOptions) => void,
): { nodes: GraphNode[]; edges: GraphEdge[]; analysis: DataflowAnalysis } {
  if (foldedSet.size === 0) {
    return { nodes: graphData.nodes, edges: graphData.edges, analysis };
  }

  const childToCtrl = buildChildToControllerMap(graphspec, analysis);

  // ─── Filter visible nodes ───────────────────────────────────────────────
  // Drop any node whose outermost folded ancestor is non-null (it's hidden
  // inside a folded controller).
  const visibleNodes: GraphNode[] = [];
  for (const node of graphData.nodes) {
    if (outermostFoldedAncestor(node.id, childToCtrl, foldedSet)) continue;
    visibleNodes.push(node);
  }

  // ─── Emit pipe-card nodes for outermost-folded controllers ──────────────
  for (const folded of foldedSet) {
    // Skip if this folded controller is itself inside another folded ancestor.
    if (outermostFoldedAncestor(folded, childToCtrl, foldedSet)) continue;
    const specNode = findSpecNode(graphspec, folded);
    if (!specNode) continue; // unknown ID — silently ignore
    if (!specNode.pipe_type) continue; // missing pipe_type — silently ignore (no payload buildable)

    const payload = buildPipeCardPayload(specNode, graphspec, analysis);
    if (onToggleFold) {
      payload.onExpand = (options?: FoldToggleOptions) => onToggleFold(folded, options);
    }

    const cardNode: GraphNode = {
      id: folded,
      type: NODE_TYPE_PIPE_CARD,
      data: {
        labelDescriptor: {
          kind: "pipe",
          label: payload.pipeCode,
          isFailed: payload.status === "failed",
        },
        nodeData: specNode,
        isPipe: false,
        isStuff: false,
        isController: true,
        labelText: payload.pipeCode,
        pipeCode: payload.pipeCode,
        pipeType: specNode.pipe_type,
        pipeCardData: payload,
      },
      position: { x: 0, y: 0 },
    };
    visibleNodes.push(cardNode);
  }

  // ─── Build updated analysis ─────────────────────────────────────────────
  // Drop folded controllers and any controller that lives inside a folded
  // outermost ancestor.
  const updatedControllerIds = new Set<string>();
  for (const ctrlId of analysis.controllerNodeIds) {
    if (foldedSet.has(ctrlId)) continue;
    if (outermostFoldedAncestor(ctrlId, childToCtrl, foldedSet)) continue;
    updatedControllerIds.add(ctrlId);
  }

  // containmentTree: only keep entries for surviving controllers; filter their
  // children to drop hidden ones (children whose outermost folded ancestor is
  // a different controller). Children that are the folded controllers themselves
  // should remain as children (they now render as pipe-card leaves).
  const updatedContainmentTree: Record<string, string[]> = {};
  for (const ctrlId of updatedControllerIds) {
    const originalChildren = analysis.containmentTree[ctrlId] ?? [];
    const survivors: string[] = [];
    for (const childId of originalChildren) {
      const outer = outermostFoldedAncestor(childId, childToCtrl, foldedSet);
      // If the child has a folded outermost ancestor that is NOT itself, drop.
      // If the child IS the folded outermost (childId is in foldedSet), keep —
      // it will appear as a pipe-card child of this controller.
      if (outer && outer !== childId) continue;
      survivors.push(childId);
    }
    updatedContainmentTree[ctrlId] = survivors;
  }

  // childNodeIds: rebuild from the updated containment tree.
  const updatedChildNodeIds = new Set<string>();
  for (const children of Object.values(updatedContainmentTree)) {
    for (const child of children) updatedChildNodeIds.add(child);
  }

  // Rewrite stuffProducers/stuffConsumers so any reference to an operator hidden
  // by a fold is replaced with its outermost folded ancestor — mirroring the
  // edge-endpoint rewrite below. Without this, buildChildToControllerMap's
  // promotion loop loses the consumer/producer trail and stuff nodes get
  // ejected to the root level when their parent controller's sibling is folded.
  const updatedStuffProducers: Record<string, string> = {};
  for (const [digest, producerId] of Object.entries(analysis.stuffProducers)) {
    updatedStuffProducers[digest] = effectiveId(producerId, childToCtrl, foldedSet);
  }

  const updatedStuffConsumers: Record<string, string[]> = {};
  for (const [digest, consumers] of Object.entries(analysis.stuffConsumers)) {
    const seen = new Set<string>();
    for (const consumerId of consumers) {
      seen.add(effectiveId(consumerId, childToCtrl, foldedSet));
    }
    updatedStuffConsumers[digest] = [...seen];
  }

  const updatedAnalysis: DataflowAnalysis = {
    stuffRegistry: analysis.stuffRegistry,
    stuffProducers: updatedStuffProducers,
    stuffConsumers: updatedStuffConsumers,
    controllerNodeIds: updatedControllerIds,
    childNodeIds: updatedChildNodeIds,
    containmentTree: updatedContainmentTree,
  };

  // ─── Rewrite edges ──────────────────────────────────────────────────────
  // Each surviving endpoint is replaced by its effective (outermost-folded)
  // ancestor or itself. Drop self-loops. Dedup by (newSrc, newDst, bucket).
  const dedupMap = new Map<string, GraphEdge>();
  for (const edge of graphData.edges) {
    const newSrc = effectiveId(edge.source, childToCtrl, foldedSet);
    const newDst = effectiveId(edge.target, childToCtrl, foldedSet);
    if (newSrc === newDst) continue;
    const bucket = edge._batchEdge ? "batch" : "data";
    const key = `${newSrc}->${newDst}|${bucket}`;
    if (dedupMap.has(key)) continue;
    // Clone the edge with rewritten endpoints; drop the stale _crossGroup flag
    // (recomputed below against folded containment).
    const cloned: GraphEdge = {
      ...edge,
      source: newSrc,
      target: newDst,
      id: edge.id,
    };
    delete cloned._crossGroup;
    dedupMap.set(key, cloned);
  }

  // Recompute _crossGroup against the folded containment. Build a fresh
  // childToCtrl from the updated analysis so the classification reflects the
  // post-fold node graph (folded controllers no longer have children).
  const foldedChildToCtrl = buildChildToControllerMap(
    {
      ...graphspec,
      // Mask out the contains edges for folded outermost controllers — they no
      // longer logically contain anything after folding.
      edges: graphspec.edges.filter((e) => {
        if (e.kind !== "contains") return true;
        return updatedControllerIds.has(e.source);
      }),
    },
    updatedAnalysis,
  );

  const rewrittenEdges: GraphEdge[] = [];
  for (const edge of dedupMap.values()) {
    const srcCtrl = foldedChildToCtrl[edge.source] || null;
    const tgtCtrl = foldedChildToCtrl[edge.target] || null;
    if (srcCtrl && tgtCtrl && srcCtrl !== tgtCtrl) {
      edge._crossGroup = true;
      edge.style = {
        ...edge.style,
        strokeWidth: 1.5,
        opacity: 0.65,
      };
    } else if (edge.style && (edge.style.opacity === 0.65 || edge.style.strokeWidth === 1.5)) {
      // Edge no longer crosses sibling groups — reset the de-emphasized style.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { opacity: _opacity, strokeWidth: _strokeWidth, ...rest } = edge.style;
      edge.style = { ...rest, strokeWidth: 2 };
      if (!edge.markerEnd) {
        edge.markerEnd = { type: ARROW_CLOSED_MARKER, color: "var(--color-edge)" };
      }
    }
    rewrittenEdges.push(edge);
  }

  return { nodes: visibleNodes, edges: rewrittenEdges, analysis: updatedAnalysis };
}
