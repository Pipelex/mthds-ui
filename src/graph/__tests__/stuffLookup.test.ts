import { describe, expect, it } from "vitest";
import { findStuffByDigest, pipeRefOf } from "@graph/stuffLookup";
import type { GraphSpec, GraphSpecNode } from "@graph/types";
import { LIVE_CV_SCREENING } from "@graph/react/viewer/__stories__/pipelines/specs/_generated/live/pipeline_09";
import { LIVE_ALL_NATIVE_CONCEPTS } from "@graph/react/viewer/__stories__/pipelines/specs/_generated/live/pipeline_34";

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

describe("pipeRefOf on a binding node", () => {
  it("reports nothing, even when the path is spelled like a pipe's code", () => {
    // A binding's pipe_code is the path it binds; `domain.summary` would name
    // the pipe `summary` and hand the panel that pipe's descriptors.
    expect(
      pipeRefOf(
        node({
          kind: "binding",
          pipe_type: "BindingStep",
          domain_code: "news",
          pipe_code: "summary",
        }),
      ),
    ).toBeUndefined();
  });
});

describe("findStuffByDigest with a binding", () => {
  // `from = "summary"` binds the stuff named `summary` under `brief`; the
  // method also has a pipe coded `summary`. The bound value is described by
  // the pipe that reads it, never by the pipe its path happens to spell.
  const summarize = node({
    id: "summarize",
    domain_code: "news",
    pipe_code: "summary",
    io: { inputs: [], outputs: [{ name: "summary", concept: "Text", digest: "d_summary" }] },
  });
  const binding = node({
    id: "bind",
    kind: "binding",
    pipe_type: "BindingStep",
    domain_code: "news",
    pipe_code: "summary",
    io: {
      inputs: [{ name: "summary", concept: "Text", digest: "d_summary" }],
      outputs: [{ name: "brief", concept: "Text", digest: "d_brief" }],
    },
  });
  const reader = node({
    id: "reader",
    domain_code: "news",
    pipe_code: "publish",
    io: { inputs: [{ name: "brief", concept: "Text", digest: "d_brief" }], outputs: [] },
  });

  it("names no producer pipe for a bound value, and the pipe reading it as its consumer", () => {
    const found = findStuffByDigest(spec([summarize, binding, reader]), "d_brief");
    expect(found?.producerPipeRef).toBeUndefined();
    expect(found?.consumer).toEqual({ pipeRef: "news.publish", slotName: "brief" });
  });

  it("never takes a binding as the consumer of the root it reads", () => {
    const found = findStuffByDigest(spec([summarize, binding, reader]), "d_summary");
    expect(found?.producerPipeRef).toBe("news.summary");
    expect(found?.consumer).toBeUndefined();
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

describe("findStuffByDigest under a controller that lists its children's outputs", () => {
  // A parallel with `add_each_output` lists each branch's output beside its
  // own composite, and a sequence lists its last step's. The controller comes
  // first in the spec, and its descriptor is the composite's, not the result's.
  const parallel = node({
    id: "parallel",
    kind: "controller",
    pipe_type: "PipeParallel",
    domain_code: "d",
    pipe_code: "enrich",
    io: {
      inputs: [],
      outputs: [
        { name: "search_result", concept: "SearchResult", digest: "branch", data: { a: 1 } },
        { name: "assets", concept: "Composite", digest: "combined", data: { b: 2 } },
      ],
    },
  });
  const branch = node({
    id: "branch",
    pipe_type: "PipeSearch",
    domain_code: "d",
    pipe_code: "search",
    io: {
      inputs: [],
      outputs: [
        { name: "search_result", concept: "SearchResult", digest: "branch", data: { a: 1 } },
      ],
    },
  });
  const contains = (source: string, target: string) => ({
    id: `${source}->${target}`,
    source,
    target,
    kind: "contains",
  });

  it("names the branch that produced a result, not the parallel listing it", () => {
    const graph = { nodes: [parallel, branch], edges: [contains("parallel", "branch")] };
    const found = findStuffByDigest(graph as unknown as GraphSpec, "branch");
    expect(found?.producerPipeRef).toBe("d.search");
  });

  it("names the parallel for the composite only it lists", () => {
    const graph = { nodes: [parallel, branch], edges: [contains("parallel", "branch")] };
    const found = findStuffByDigest(graph as unknown as GraphSpec, "combined");
    expect(found?.producerPipeRef).toBe("d.enrich");
  });

  it("names the innermost controller when no operator lists the value", () => {
    // A batch's list, which the parallel holding the batch lists too.
    const outer = node({
      id: "outer",
      kind: "controller",
      pipe_type: "PipeParallel",
      domain_code: "d",
      pipe_code: "outer",
      io: { inputs: [], outputs: [{ name: "results", digest: "list", data: [] }] },
    });
    const batch = node({
      id: "batch",
      kind: "controller",
      pipe_type: "PipeBatch",
      domain_code: "d",
      pipe_code: "each",
      io: { inputs: [], outputs: [{ name: "results", digest: "list", data: [] }] },
    });
    const item = node({ id: "item", domain_code: "d", pipe_code: "one" });
    const graph = {
      nodes: [outer, batch, item],
      edges: [contains("outer", "batch"), contains("batch", "item")],
    };
    const found = findStuffByDigest(graph as unknown as GraphSpec, "list");
    expect(found?.producerPipeRef).toBe("d.each");
  });
});

describe("findStuffByDigest on live runs", () => {
  /** The pipe the graph names as the producer of `pipeCode`'s first output. */
  function producerOfOutput(graph: GraphSpec, pipeCode: string): string | undefined {
    const digest = graph.nodes.find((candidate) => candidate.pipe_code === pipeCode)?.io
      ?.outputs?.[0]?.digest;
    return digest ? findStuffByDigest(graph, digest)?.producerPipeRef : undefined;
  }

  it("names a parallel branch's search as the producer of its search result", () => {
    // Pipeline 09: `enrich_candidate` runs `search_candidate` beside the card.
    expect(producerOfOutput(LIVE_CV_SCREENING, "search_candidate")).toBe(
      "recruitment.search_candidate",
    );
  });

  it("names a parallel branch's renderer as the producer of its HTML page", () => {
    // Pipeline 34: `sample_natives` runs every native sampler as a branch.
    expect(producerOfOutput(LIVE_ALL_NATIVE_CONCEPTS, "render_html")).toBe(
      "native_sampler.render_html",
    );
  });
});
