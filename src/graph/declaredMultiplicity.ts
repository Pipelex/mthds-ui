import type { GraphSpec, GraphSpecNodeIoItem, StuffMultiplicity } from "./types";
import { isPluralMultiplicity, isStaticGraphSpec } from "./types";
import { pipeRefOf } from "./stuffLookup";

/**
 * A spec whose io items carry no `multiplicity`, with each plural stuff's
 * multiplicity filled in from what the spec already declares.
 *
 * A graph produced by a run comes from a producer whose io items have no
 * `multiplicity` field, so every stuff would read as single. The declaration is
 * in the same spec all the same: the pipe registry holds each pipe's declared
 * slots, and batch edges name the list they fan out from and the list they
 * gather into. A stuff is plural here when any of those says so:
 *
 * - the declared output of a pipe that lists the stuff among its outputs;
 * - the declared input slot, of the same name, of a pipe that lists it among its inputs;
 * - the source of a `batch_item` edge, or the target of a `batch_aggregate` edge.
 *
 * A fixed count (`[N]`) wins over a variable-length reading, since it says more.
 *
 * Returned unchanged: a static spec, whose builder states multiplicity on every
 * plural io item itself, and a spec in which any io item already carries the
 * field, since its producer then emits it and its absence means single. When
 * something is filled in, the result is a new spec; the one given is not touched.
 */
export function withDeclaredMultiplicity(spec: GraphSpec): GraphSpec {
  if (isStaticGraphSpec(spec) || spec.nodes.some(carriesMultiplicity)) return spec;

  const declared = new Map<string, StuffMultiplicity>();
  const note = (digest: string | undefined, multiplicity: StuffMultiplicity | undefined) => {
    if (digest === undefined || !isPluralMultiplicity(multiplicity)) return;
    const known = declared.get(digest);
    // Keep the first fixed count; a variable-length reading never replaces one.
    if (known === undefined || (known === true && multiplicity !== true)) {
      declared.set(digest, multiplicity as StuffMultiplicity);
    }
  };

  for (const node of spec.nodes) {
    const ref = pipeRefOf(node);
    const blueprint = ref === undefined ? undefined : spec.pipe_registry?.[ref];
    if (blueprint === undefined) continue;
    // The registry crosses the boundary unvalidated, so either half may be absent.
    for (const output of node.io.outputs) note(output.digest, blueprint.output?.multiplicity);
    for (const input of node.io.inputs) {
      note(input.digest, blueprint.inputs?.[input.name]?.multiplicity);
    }
  }
  for (const edge of spec.edges) {
    if (edge.kind === "batch_item") note(edge.source_stuff_digest, true);
    if (edge.kind === "batch_aggregate") note(edge.target_stuff_digest, true);
  }
  if (declared.size === 0) return spec;

  const fill = (item: GraphSpecNodeIoItem): GraphSpecNodeIoItem => {
    const multiplicity = item.digest === undefined ? undefined : declared.get(item.digest);
    return multiplicity === undefined ? item : { ...item, multiplicity };
  };
  return {
    ...spec,
    nodes: spec.nodes.map((node) => ({
      ...node,
      io: { inputs: node.io.inputs.map(fill), outputs: node.io.outputs.map(fill) },
    })),
  };
}

function carriesMultiplicity(node: GraphSpec["nodes"][number]): boolean {
  return [...node.io.inputs, ...node.io.outputs].some((item) => item.multiplicity !== undefined);
}
