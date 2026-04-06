import type { GraphSpec, DataflowAnalysis, PipeBlueprintUnion, ConceptInfo } from "./types";

export function buildDataflowAnalysis(graphspec: GraphSpec | null): DataflowAnalysis | null {
  if (!graphspec) return null;

  const stuffRegistry: Record<string, { name?: string; concept?: string; contentType?: string }> =
    {};
  const stuffProducers: Record<string, string> = {};
  const stuffConsumers: Record<string, string[]> = {};
  const containmentTree: Record<string, string[]> = {};
  const childNodeIds = new Set<string>();

  // Build containment tree from edges
  for (const edge of graphspec.edges) {
    if (edge.kind === "contains") {
      if (!containmentTree[edge.source]) containmentTree[edge.source] = [];
      containmentTree[edge.source].push(edge.target);
      childNodeIds.add(edge.target);
    }
  }

  // Controller IDs are nodes that have children
  const controllerNodeIds = new Set<string>(Object.keys(containmentTree));

  // Register stuffs from all nodes; track producers/consumers from operators only
  for (const node of graphspec.nodes) {
    const nodeIo = node.io || {};
    const isController = controllerNodeIds.has(node.id);

    // Register outputs
    for (const output of nodeIo.outputs || []) {
      if (output.digest && !stuffRegistry[output.digest]) {
        stuffRegistry[output.digest] = {
          name: output.name,
          concept: output.concept,
          contentType: output.content_type,
        };
      }
      if (output.digest && !isController) {
        stuffProducers[output.digest] = node.id;
      }
    }

    // Register inputs
    for (const input of nodeIo.inputs || []) {
      if (input.digest && !stuffRegistry[input.digest]) {
        stuffRegistry[input.digest] = {
          name: input.name,
          concept: input.concept,
          contentType: input.content_type,
        };
      }
      if (input.digest && !isController) {
        if (!stuffConsumers[input.digest]) stuffConsumers[input.digest] = [];
        stuffConsumers[input.digest].push(node.id);
      }
    }
  }

  return {
    stuffRegistry,
    stuffProducers,
    stuffConsumers,
    controllerNodeIds,
    childNodeIds,
    containmentTree,
  };
}

/**
 * Build a map from node id -> controller id for all nodes that belong to a controller.
 * Includes both direct children (operators) and stuff nodes assigned to controllers.
 *
 * Stuff nodes are placed at the lowest controller level where they connect producers
 * to consumers. A stuff node produced inside controller C is promoted to C's parent
 * if none of its consumers are inside C (output flows outward).
 */
export function buildChildToControllerMap(
  graphspec: GraphSpec,
  analysis: DataflowAnalysis,
): Record<string, string> {
  const childToController: Record<string, string> = {};

  // Direct children from containment tree
  for (const [ctrlId, children] of Object.entries(analysis.containmentTree)) {
    for (const childId of children) {
      childToController[childId] = ctrlId;
    }
  }

  // Stuff nodes produced by operators inside controllers
  for (const [digest, producerId] of Object.entries(analysis.stuffProducers)) {
    const stuffId = "stuff_" + digest;
    const ctrlId = childToController[producerId];
    if (ctrlId) {
      childToController[stuffId] = ctrlId;
    }
  }

  // Stuff produced by controllers themselves -> assign to parent controller
  for (const node of graphspec.nodes) {
    if (!analysis.controllerNodeIds.has(node.id)) continue;
    const parentCtrlId = childToController[node.id];
    if (!parentCtrlId) continue;
    for (const output of node.io?.outputs || []) {
      if (!output.digest) continue;
      const stuffId = "stuff_" + output.digest;
      if (!childToController[stuffId]) {
        childToController[stuffId] = parentCtrlId;
      }
    }
  }

  // Batch item stuff (fan-out) -> assign to the PipeBatch controller
  for (const edge of graphspec.edges) {
    if (edge.kind === "batch_item" && edge.target_stuff_digest) {
      const stuffId = "stuff_" + edge.target_stuff_digest;
      // edge.source is the PipeBatch controller node
      if (analysis.controllerNodeIds.has(edge.source)) {
        childToController[stuffId] = edge.source;
      }
    }
  }

  // ─── Promote stuff nodes whose consumers are all outside their controller ──
  // Stuff involved in stuff-to-stuff edges (batch/parallel) should not be promoted
  // when they have no operator consumers — they're intermediate batch/parallel data.
  const stuffInStuffEdges = new Set<string>();
  for (const edge of graphspec.edges) {
    if (
      edge.kind === "batch_item" ||
      edge.kind === "batch_aggregate" ||
      edge.kind === "parallel_combine"
    ) {
      if (edge.source_stuff_digest) stuffInStuffEdges.add(edge.source_stuff_digest);
      if (edge.target_stuff_digest) stuffInStuffEdges.add(edge.target_stuff_digest);
    }
  }

  const stuffPrefix = "stuff_";
  const stuffEntries = Object.keys(childToController).filter((id) => id.startsWith(stuffPrefix));

  for (const stuffId of stuffEntries) {
    const digest = stuffId.slice(stuffPrefix.length);
    let assignedCtrl: string | undefined = childToController[stuffId];
    if (!assignedCtrl) continue;

    const consumers = analysis.stuffConsumers[digest] || [];

    if (consumers.length === 0) {
      // No operator consumers — promote to root only if this is a pure final output
      // (not involved in batch/parallel stuff-to-stuff edges)
      if (!stuffInStuffEdges.has(digest)) {
        delete childToController[stuffId];
      }
      continue;
    }

    // Has consumers — promote until we find a level where at least one consumer is inside
    while (assignedCtrl) {
      const ctrl = assignedCtrl;
      const hasConsumerInside = consumers.some((consumerId) =>
        isDescendantOf(consumerId, ctrl, childToController),
      );
      if (hasConsumerInside) break;

      const parentCtrl: string | undefined = childToController[assignedCtrl];
      if (parentCtrl) {
        childToController[stuffId] = parentCtrl;
        assignedCtrl = parentCtrl;
      } else {
        delete childToController[stuffId];
        assignedCtrl = undefined;
      }
    }
  }

  return childToController;
}

/** Check if nodeId is a descendant of ancestorCtrlId in the containment hierarchy. */
function isDescendantOf(
  nodeId: string,
  ancestorCtrlId: string,
  childToController: Record<string, string>,
): boolean {
  let current = childToController[nodeId];
  while (current) {
    if (current === ancestorCtrlId) return true;
    current = childToController[current];
  }
  return false;
}

// ─── Registry lookup helpers ───────────────────────────────────────────────

export function getPipeBlueprint(spec: GraphSpec, pipeRef: string): PipeBlueprintUnion | undefined {
  return spec.pipe_registry?.[pipeRef];
}

export function getConceptInfo(spec: GraphSpec, conceptRef: string): ConceptInfo | undefined {
  return spec.concept_registry?.[conceptRef];
}

export function resolveConceptRef(spec: GraphSpec, codeOrRef: string): ConceptInfo | undefined {
  if (!spec.concept_registry) return undefined;
  // Direct lookup first (e.g., "test_domain.Summary")
  const direct = spec.concept_registry[codeOrRef];
  if (direct) return direct;
  // Search by code (e.g., "Summary" matches "test_domain.Summary")
  for (const info of Object.values(spec.concept_registry)) {
    if (info.code === codeOrRef) return info;
  }
  return undefined;
}
