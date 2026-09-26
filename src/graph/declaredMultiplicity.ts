import type {
  GraphSpec,
  GraphSpecNode,
  GraphSpecNodeIoItem,
  StuffMultiplicity,
  SubPipeSpec,
} from "./types";
import { isPluralMultiplicity, isStaticGraphSpec } from "./types";
import { pipeRefOf } from "./stuffLookup";

/**
 * A spec whose io items carry no `multiplicity`, with each plural stuff's
 * multiplicity filled in from what the spec already declares.
 *
 * A graph produced by a run comes from a producer whose io items have no
 * `multiplicity` field, so every stuff would read as single. The declaration is
 * in the same spec all the same: the pipe registry holds each pipe's declared
 * slots and each controller's steps, and batch edges name the list they fan out
 * from and the list they gather into. A stuff is plural here when any of those
 * says so:
 *
 * - the declared output of a pipe that lists the stuff among its outputs;
 * - the declared input slot, of the same name, of a pipe that lists it among its inputs;
 * - the source of a `batch_item` edge, or the target of a `batch_aggregate` edge;
 * - the `nb_output` or `multiple_output` of the step that ran the operator producing it.
 *
 * A fixed count (`[N]`) wins over a variable-length reading, since it says more,
 * and a step's own count wins over all of them, as it does at run time.
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
  for (const [digest, multiplicity] of invokedMultiplicities(spec)) {
    if (isPluralMultiplicity(multiplicity)) declared.set(digest, multiplicity);
    else declared.delete(digest);
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

/**
 * The multiplicity each operator's output was invoked at, by digest, mirroring
 * the static builder's walk.
 *
 * A step's `nb_output` or `multiple_output` lives on its controller's sub-pipe
 * as `output_multiplicity`, never on the invoked pipe's registry entry, which
 * two steps may share at different counts. A step reaches its node through the
 * controller's `contains` edges. A sequence runs its steps one at a time and
 * stops at a failure, so its children are a prefix of its steps, in order, and
 * they pair by position: a step's `result` is optional and two steps may write
 * the same one, so a name cannot pair them. A parallel's branches each carry a
 * distinct `result`, which names the child's output, and a branch that failed
 * before starting leaves a gap, so they pair by name.
 *
 * A step declaring no count runs under the one its sequence or condition was
 * itself invoked at, since the runtime copies run params down; a parallel's
 * branches and a batch's branch do not inherit it. Only a count or `true` is
 * recorded, the values that override a pipe's own declaration.
 */
function invokedMultiplicities(spec: GraphSpec): Map<string, StuffMultiplicity> {
  const byId = new Map(spec.nodes.map((node) => [node.id, node]));
  const children = new Map<string, GraphSpecNode[]>();
  const contained = new Set<string>();
  for (const edge of spec.edges) {
    const child = edge.kind === "contains" ? byId.get(edge.target) : undefined;
    if (child === undefined) continue;
    contained.add(child.id);
    const siblings = children.get(edge.source);
    if (siblings === undefined) children.set(edge.source, [child]);
    else siblings.push(child);
  }

  const invoked = new Map<string, StuffMultiplicity>();
  // A malformed spec may nest a node twice or in a loop; each is read once.
  const visited = new Set<string>();
  const visit = (node: GraphSpecNode, multiplicity: SubPipeSpec["output_multiplicity"]) => {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    if (node.kind !== "controller") {
      if (typeof multiplicity !== "number" && multiplicity !== true) return;
      for (const output of node.io.outputs) {
        if (output.digest !== undefined) invoked.set(output.digest, multiplicity);
      }
      return;
    }
    const ref = pipeRefOf(node);
    const blueprint = ref === undefined ? undefined : spec.pipe_registry?.[ref];
    // The registry crosses the boundary unvalidated, so a step list may be absent.
    const sequence: SubPipeSpec[] | undefined =
      blueprint?.type === "PipeSequence" ? blueprint.sequential_sub_pipes : undefined;
    const branches: SubPipeSpec[] | undefined =
      blueprint?.type === "PipeParallel" ? blueprint.parallel_sub_pipes : undefined;
    const inherited =
      blueprint?.type === "PipeSequence" || blueprint?.type === "PipeCondition"
        ? multiplicity
        : null;
    (children.get(node.id) ?? []).forEach((child, index) => {
      const names = new Set(child.io.outputs.map((output) => output.name));
      const step =
        sequence?.[index] ??
        branches?.find((sub) => sub.output_name != null && names.has(sub.output_name));
      visit(child, step?.output_multiplicity ?? inherited);
    });
  };
  for (const node of spec.nodes) {
    if (!contained.has(node.id)) visit(node, null);
  }
  return invoked;
}

function carriesMultiplicity(node: GraphSpec["nodes"][number]): boolean {
  return [...node.io.inputs, ...node.io.outputs].some((item) => item.multiplicity !== undefined);
}
