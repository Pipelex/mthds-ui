import { describe, expect, it } from "vitest";
import { findStuffByDigest, pipeRefOf } from "@graph/stuffLookup";
import type { GraphSpec, GraphSpecNode } from "@graph/types";

/**
 * The walk from a data item back to the pipe that produced it.
 *
 * It exists because the artifacts that describe how to RENDER a result —
 * `output_form` and the output half of `pipe_io_contracts` — are keyed by
 * `pipe_ref`, while a graph selection gives you a digest. This is that join,
 * and the two properties worth pinning are both easy to get wrong by writing
 * the obvious single-pass version.
 */

function node(partial: Partial<GraphSpecNode>): GraphSpecNode {
  return {
    id: "n",
    kind: "operator",
    pipe_type: "PipeLLM",
    status: "succeeded",
    io: { inputs: [], outputs: [] },
    ...partial,
  } as GraphSpecNode;
}

function spec(nodes: GraphSpecNode[]): GraphSpec {
  return { nodes, edges: [] } as unknown as GraphSpec;
}

describe("pipeRefOf", () => {
  it("joins the domain and the code", () => {
    expect(pipeRefOf(node({ domain_code: "recruitment", pipe_code: "analyze" }))).toBe(
      "recruitment.analyze",
    );
  });

  it("keeps a multi-segment domain path whole", () => {
    // A ref is split on the LAST dot, so the domain may be several segments.
    expect(pipeRefOf(node({ domain_code: "legal.contracts", pipe_code: "score" }))).toBe(
      "legal.contracts.score",
    );
  });

  it("reports nothing when either half is missing", () => {
    // A stuff node, a controller with no domain: not every node names a pipe,
    // and a half-built ref would resolve to nothing while looking like a ref.
    expect(pipeRefOf(node({ pipe_code: "analyze" }))).toBeUndefined();
    expect(pipeRefOf(node({ domain_code: "recruitment" }))).toBeUndefined();
  });
});

describe("findStuffByDigest", () => {
  it("prefers the PRODUCER's copy over a consumer's, whatever the node order", () => {
    // The same digest appears on the producer's outputs and again on every
    // consumer's inputs, and only the producer's copy is guaranteed to carry
    // the payload. A first-match-in-spec-order walk returns the emptier copy
    // whenever the consumer happens to be listed first - which is exactly the
    // order a sequence's nodes come in when a later pipe is written first.
    const consumer = node({
      id: "consumer",
      domain_code: "d",
      pipe_code: "later",
      io: { inputs: [{ name: "profile", digest: "abc" }], outputs: [] },
    });
    const producer = node({
      id: "producer",
      domain_code: "d",
      pipe_code: "earlier",
      io: { inputs: [], outputs: [{ name: "profile", digest: "abc", data: { real: true } }] },
    });

    const found = findStuffByDigest(spec([consumer, producer]), "abc");
    expect(found?.producerPipeRef).toBe("d.earlier");
    expect(found?.item.data).toEqual({ real: true });
  });

  it("finds a method INPUT, and reports no producer for it", () => {
    // The common case at the top of every graph: a stuff appearing only as some
    // pipe's input. An outputs-only walk would report it missing, and a walk
    // that invented a producer would look the wrong artifact up.
    const consumer = node({
      id: "consumer",
      domain_code: "d",
      pipe_code: "first",
      io: { inputs: [{ name: "cv", digest: "in1" }], outputs: [] },
    });

    const found = findStuffByDigest(spec([consumer]), "in1");
    expect(found?.item.name).toBe("cv");
    expect(found?.producerPipeRef).toBeUndefined();
  });

  it("reports a producer with no ref as found, not as unproduced", () => {
    // A node that produced it but names no domain: the item is still there, and
    // only the ref is missing. Conflating the two would hide the payload.
    const producer = node({
      id: "producer",
      io: { inputs: [], outputs: [{ name: "x", digest: "d1", data: 1 }] },
    });

    const found = findStuffByDigest(spec([producer]), "d1");
    expect(found?.item.data).toBe(1);
    expect(found?.producerPipeRef).toBeUndefined();
  });

  it("returns null for a digest no node carries", () => {
    expect(findStuffByDigest(spec([node({})]), "nope")).toBeNull();
  });
});
