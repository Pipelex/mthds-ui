import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildGraph } from "@graph/graphBuilders";
import type { GraphSpec, PipeCardPayload } from "@graph/types";
import { validateGraphSpec } from "@graph/validateGraphSpec";

import { buildStaticGraphSpecFromToml } from "../buildStaticGraphSpec";

const DOOR_NOTICE_BUNDLE = readFileSync(
  path.resolve(
    __dirname,
    "../../../data/mthds-corpus/entries/operator_doc_gen_door_notice/bundle.mthds",
  ),
  "utf8",
);

/** The card payload of the graph's one PipeDocGen step. */
function docGenCard(spec: GraphSpec): PipeCardPayload | undefined {
  validateGraphSpec(spec);
  const { graphData } = buildGraph(spec, "bezier");
  const cards = graphData.nodes.filter((node) => node.data.pipeType === "PipeDocGen");
  expect(cards).toHaveLength(1);
  return cards[0].data.pipeCardData;
}

describe("a PipeDocGen step's card, from its method", () => {
  it("carries the format the corpus entry declares", () => {
    const { spec } = buildStaticGraphSpecFromToml(DOOR_NOTICE_BUNDLE);

    expect(docGenCard(spec)?.docGenFormat).toBe("pdf");
  });

  it("carries no format when the graph has no registry to read it from", () => {
    const { spec } = buildStaticGraphSpecFromToml(DOOR_NOTICE_BUNDLE);
    delete spec.pipe_registry;

    expect(docGenCard(spec)).not.toHaveProperty("docGenFormat");
  });

  it("carries no format for a step that omits it, rather than an empty chip", () => {
    const withoutFormat = DOOR_NOTICE_BUNDLE.replace(/^format\s*=.*$/m, "");
    expect(withoutFormat).not.toContain('format      = "pdf"');
    const { spec } = buildStaticGraphSpecFromToml(withoutFormat);

    expect(docGenCard(spec)).not.toHaveProperty("docGenFormat");
  });
});
