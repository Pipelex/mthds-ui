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

import { makeBindingSpec, runFullPipeline } from "./testUtils";

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
