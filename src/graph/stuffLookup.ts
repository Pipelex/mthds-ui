import { makePipeRef } from "./pipeRefs";
import type { GraphSpec, GraphSpecNode, GraphSpecNodeIoItem } from "./types";

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
   * Absent for a pipeline-level input, which no pipe produced, and for a node
   * missing either half of the ref. A consumer must treat it as optional: a
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
 * `domain.code`, or nothing when the node does not carry both halves.
 *
 * Assembled with `makePipeRef` rather than a template literal so every consumer
 * agrees with the runtime on what a ref is — the domain path may be
 * multi-segment, and this repo has exactly one place that spelling lives.
 */
export function pipeRefOf(node: GraphSpecNode): string | undefined {
  if (!node.pipe_code || !node.domain_code) return undefined;
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
  for (const node of spec.nodes) {
    for (const output of node.io?.outputs ?? []) {
      if (output.digest === digest) {
        const producerPipeRef = pipeRefOf(node);
        return {
          item: output,
          ...(producerPipeRef ? { producerPipeRef } : {}),
          ...(consumer ? { consumer } : {}),
        };
      }
    }
  }
  for (const node of spec.nodes) {
    for (const input of node.io?.inputs ?? []) {
      if (input.digest === digest) return { item: input, ...(consumer ? { consumer } : {}) };
    }
  }
  return null;
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
