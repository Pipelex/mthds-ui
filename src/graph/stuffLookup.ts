import { makePipeRef } from "./pipeRefs";
import type { GraphSpec, GraphSpecNode, GraphSpecNodeIoItem } from "./types";
import { isBindingNode } from "./types";

/**
 * Where a data item lives in a `GraphSpec`, and which pipe put it there.
 *
 * The producing pipe is the half that is not obvious and the half that matters:
 * a stuff carries a concept, but the artifacts that describe how to RENDER it —
 * `output_form` and the output half of `pipe_io_contracts` — are keyed by
 * `pipe_ref`, not by concept. So a panel that wants to show a result as the
 * standard describes it has to walk from the data back to the pipe that
 * resolved to it, and this is that walk, done once at the boundary rather than
 * re-derived by every consumer.
 */
export interface StuffLocation {
  /** The item as the spec holds it, richest copy first (see below). */
  item: GraphSpecNodeIoItem;
  /**
   * `domain.code` of the pipe whose OUTPUT this is, when the spec names one.
   *
   * Absent for a pipeline-level input, which no pipe produced, for a value a
   * binding step bound, which no pipe produced either, and for a node missing
   * either half of the ref. A consumer must treat it as optional: a
   * method's own inputs are stuff too, and they are the common case at the top
   * of every graph.
   */
  producerPipeRef?: string;
  /**
   * The first pipe that CONSUMES it, and the slot it arrives in.
   *
   * The fallback identity for a method's own inputs, which no pipe produced and
   * which therefore no `output_form` describes. What does describe them is the
   * consuming pipe's `input_form` entry for that slot — the same field, seen
   * from the other side — so a renderer that holds the input artifacts can show
   * a method input as something better than a JSON dump.
   *
   * First rather than all, deliberately: several pipes may read the same stuff,
   * and every one of them describes it identically, because they are describing
   * the concept it carries. A list here would be a list of the same answer.
   */
  consumer?: { pipeRef: string; slotName: string };
}

/**
 * `domain.code`, or nothing when the node does not carry both halves, or is a
 * binding node: its `pipe_code` is the path it binds, so `domain.<path>` names
 * no pipe, and a path spelled like a pipe's code would pick up that pipe's
 * descriptors.
 *
 * Assembled with `makePipeRef` rather than a template literal so every consumer
 * agrees with the runtime on what a ref is — the domain path may be
 * multi-segment, and this repo has exactly one place that spelling lives.
 */
export function pipeRefOf(node: GraphSpecNode): string | undefined {
  if (isBindingNode(node) || !node.pipe_code || !node.domain_code) return undefined;
  return makePipeRef(node.domain_code, node.pipe_code);
}

/**
 * Find a data item by digest, preferring the pipe that PRODUCED it.
 *
 * Two passes, and the order is the point rather than an optimization. The same
 * digest appears on the producer's `outputs` and again on every consumer's
 * `inputs`, and only the producer's copy is guaranteed to carry the payload —
 * a consumer's may be a reference with `data` elided. Taking the first match in
 * spec order would therefore hand back an emptier copy of the same stuff
 * depending on how the nodes happened to be sorted.
 *
 * The second pass exists for the items no pipe produced: a method's declared
 * inputs appear only as some pipe's `inputs`, so a digest-first walk that
 * searched outputs alone would report the top of every graph as missing.
 */
export function findStuffByDigest(spec: GraphSpec, digest: string): StuffLocation | null {
  const consumer = findConsumer(spec, digest);
  const produced = findProducer(spec, digest);
  if (produced) {
    const producerPipeRef = pipeRefOf(produced.node);
    return {
      item: produced.item,
      ...(producerPipeRef ? { producerPipeRef } : {}),
      ...(consumer ? { consumer } : {}),
    };
  }
  for (const node of spec.nodes) {
    for (const input of node.io?.inputs ?? []) {
      if (input.digest === digest) return { item: input, ...(consumer ? { consumer } : {}) };
    }
  }
  return null;
}

/**
 * The node whose output this digest is, and its copy of it: the INNERMOST node
 * listing the digest among its outputs.
 *
 * A controller lists outputs of the pipes it contains as its own: a sequence
 * its last step's, a condition its chosen branch's, and a parallel with
 * `add_each_output` every branch's, beside the composite it combines them into.
 * The controller comes first in the spec, so taking the first node listing the
 * digest named the parallel as the producer of a branch's result, and the panel
 * described that result with the parallel's `native.Composite` descriptor: a
 * search result lost its answer-and-sources view, an HTML page its page, a
 * gallery its tiles. The pipe that actually produced it is the one none of
 * whose descendants lists the digest too, and that is the one whose descriptor
 * says what the value is. It is the operator wherever one lists it, and a
 * controller only for a value no operator lists, such as a batch's list, which
 * the parallel holding that batch lists too.
 *
 * Descendants are read off the spec's `contains` edges, the containment the
 * dataflow analysis draws the graph from (`graphAnalysis.ts`), so the panel
 * names the pipe the graph draws the stuff's edge from.
 */
function findProducer(
  spec: GraphSpec,
  digest: string,
): { node: GraphSpecNode; item: GraphSpecNodeIoItem } | undefined {
  const listing: { node: GraphSpecNode; item: GraphSpecNodeIoItem }[] = [];
  for (const node of spec.nodes) {
    const item = node.io?.outputs?.find((output) => output.digest === digest);
    if (item) listing.push({ node, item });
  }
  if (listing.length <= 1) return listing[0];
  const children = new Map<string, string[]>();
  for (const edge of spec.edges ?? []) {
    if (edge.kind !== "contains") continue;
    const contained = children.get(edge.source);
    if (contained) contained.push(edge.target);
    else children.set(edge.source, [edge.target]);
  }
  const listed = new Set(listing.map(({ node }) => node.id));
  return (
    listing.find(({ node }) => !containsAnyOf(node.id, children, listed)) ??
    // A containment cycle, which a valid spec cannot hold: the first listing.
    listing[0]
  );
}

/** Whether any node nested under `id`, at any depth, is one of `targets`. */
function containsAnyOf(
  id: string,
  children: ReadonlyMap<string, readonly string[]>,
  targets: ReadonlySet<string>,
): boolean {
  const seen = new Set<string>([id]);
  const pending = [...(children.get(id) ?? [])];
  while (pending.length > 0) {
    const next = pending.pop()!;
    if (seen.has(next)) continue;
    if (targets.has(next)) return true;
    seen.add(next);
    pending.push(...(children.get(next) ?? []));
  }
  return false;
}

/** The first pipe reading this digest, and the slot name it reads it as. */
function findConsumer(
  spec: GraphSpec,
  digest: string,
): { pipeRef: string; slotName: string } | undefined {
  for (const node of spec.nodes) {
    const pipeRef = pipeRefOf(node);
    if (!pipeRef) continue;
    for (const input of node.io?.inputs ?? []) {
      if (input.digest === digest) return { pipeRef, slotName: input.name };
    }
  }
  return undefined;
}
