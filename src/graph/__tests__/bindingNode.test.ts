/**
 * A sequence's binding step in a run graph: pipelex emits it as a node of kind
 * `binding`, class `BindingStep`, reading its root's stuff and producing the
 * value it binds. The dataflow graph draws it as a card between the two.
 */
import { describe, expect, it } from "vitest";

import { buildPipeCardPayload } from "@graph/pipeCardPayload";
import type { BindingNode } from "@graph/types";
import { BINDING_STEP_TYPE, isBindingNode, NODE_TYPE_PIPE_CARD, stuffNodeId } from "@graph/types";
import { validateGraphSpec } from "@graph/validateGraphSpec";

import { buildGraph } from "../graphBuilders";
import { makeBindingSpec, makeEmptyBindingSpec, runFullPipeline } from "./testUtils";

describe("a binding node in a run graph", () => {
  it("passes the boundary validator", () => {
    expect(() => validateGraphSpec(makeBindingSpec())).not.toThrow();
  });

  it("is drawn as a pipe card naming its from path and its class", async () => {
    const { graphData } = await runFullPipeline(makeBindingSpec());
    const card = graphData.nodes.find((node) => node.id === "bind");
    expect(card?.type).toBe(NODE_TYPE_PIPE_CARD);
    expect(card?.data.pipeCode).toBe("catalog.pages");
    expect(card?.data.pipeType).toBe(BINDING_STEP_TYPE);
    expect(card?.data.pipeCardData).toMatchObject({
      pipeCode: "catalog.pages",
      pipeType: "BindingStep",
      inputs: [{ name: "catalog", concept: "Catalog" }],
      outputs: [{ name: "_bound_catalog_pages", concept: "CatalogPage[]" }],
    });
  });

  it("sits between the root it reads and the list it binds", async () => {
    const { graphData } = await runFullPipeline(makeBindingSpec());
    const edgePairs = graphData.edges.map((edge) => `${edge.source} -> ${edge.target}`);
    expect(edgePairs).toContain(`${stuffNodeId("d_catalog")} -> bind`);
    expect(edgePairs).toContain(`bind -> ${stuffNodeId("d_pages")}`);
  });

  it("is the producer of what it binds, which the batch then reads", async () => {
    const { analysis } = await runFullPipeline(makeBindingSpec());
    expect(analysis?.stuffProducers.d_pages).toEqual(["bind"]);
    expect(analysis?.stuffConsumers.d_catalog).toContain("bind");
  });

  it("survives layout and the controller pass inside its sequence", async () => {
    const { appNodes } = await runFullPipeline(makeBindingSpec());
    const card = appNodes.find((node) => node.id === "bind");
    expect(card).toBeDefined();
    expect(card?.parentId).toBe("seq");
    expect(Number.isFinite(card?.position.x)).toBe(true);
  });
});

// pipelex closes a binding whose root was absent with empty IO, skipped when
// the absence was recorded and failed when it was not. Such a binding carries
// no data flow, and the graph must still draw it: it is a step of its sequence,
// and its status and error are what the viewer has to show.
describe.each(["failed", "skipped"] as const)("a %s binding node with empty IO", (status) => {
  it("passes the boundary validator", () => {
    expect(() => validateGraphSpec(makeEmptyBindingSpec(status))).not.toThrow();
  });

  it("is drawn when it is all its graph holds", () => {
    const { graphData, analysis } = buildGraph(makeEmptyBindingSpec(status), "bezier");
    expect(analysis).not.toBeNull();
    expect(graphData.nodes.map((node) => node.id)).toEqual(["bind"]);
    expect(graphData.nodes[0].data.nodeData?.status).toBe(status);
  });

  it("is drawn beside a pipe that produces a stuff", () => {
    const { graphData } = buildGraph(
      makeEmptyBindingSpec(status, { besideProducer: true }),
      "bezier",
    );
    const drawn = graphData.nodes.map((node) => node.id);
    expect(drawn).toContain("bind");
    expect(drawn).toContain("title");
    expect(graphData.edges.some((edge) => edge.source === "bind" || edge.target === "bind")).toBe(
      false,
    );
  });

  it.each([false, true])(
    "lands inside its sequence's group after layout (beside a producer: %s)",
    async (besideProducer) => {
      const { appNodes } = await runFullPipeline(makeEmptyBindingSpec(status, { besideProducer }));
      const card = appNodes.find((node) => node.id === "bind");
      expect(card?.type).toBe(NODE_TYPE_PIPE_CARD);
      expect(card?.parentId).toBe("seq");
      expect(appNodes.some((node) => node.id === "seq")).toBe(true);
      expect(Number.isFinite(card?.position.x)).toBe(true);
    },
  );
});

describe("buildPipeCardPayload on a binding node", () => {
  it("names the from path and marks the bound list plural", () => {
    const node = makeBindingSpec().nodes.find(isBindingNode) as BindingNode;
    expect(buildPipeCardPayload(node)).toEqual({
      pipeCode: "catalog.pages",
      pipeType: "BindingStep",
      description: "Binds 'catalog.pages' to '_bound_catalog_pages'",
      status: "succeeded",
      inputs: [{ name: "catalog", concept: "Catalog" }],
      outputs: [{ name: "_bound_catalog_pages", concept: "CatalogPage[]" }],
    });
  });
});

describe("isBindingNode", () => {
  it("tells a binding node from a pipe-call node", () => {
    const spec = makeBindingSpec();
    expect(spec.nodes.filter(isBindingNode).map((node) => node.id)).toEqual(["bind"]);
  });
});
