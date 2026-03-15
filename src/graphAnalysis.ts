import type { GraphSpec, DataflowAnalysis } from "./types";

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

  return childToController;
}
