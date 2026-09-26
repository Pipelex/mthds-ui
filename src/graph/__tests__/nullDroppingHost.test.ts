/**
 * A GraphSpec relayed by a host that drops `null` values.
 *
 * ChatGPT removes every null-valued key from the tool results it hands an MCP App
 * view, so a spec reaches the renderer with each `null` pipelex wrote turned into an
 * absent key. These tests take every committed pipelex spec, which carries pipelex's
 * own nulls, drop them the same way, and require the result to load, build and render
 * exactly as the original does.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import type { GraphSpec } from "../types";
import { validateGraphSpec } from "../validateGraphSpec";
import { buildGraph } from "../graphBuilders";
import { PipeDetailPanel } from "@graph/react/detail/PipeDetailPanel";
import { dropNullValues } from "./testUtils";

const PIPELINES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../data/pipelines",
);

const EDGE_TYPE = "bezier";

const SPEC_FILES = readdirSync(PIPELINES_DIR)
  .filter((dir) => dir.startsWith("pipeline_"))
  .flatMap((dir) => ["dry", "live"].map((mode) => path.join(dir, `${mode}_run_graph_spec.json`)))
  .filter((file) => existsSync(path.join(PIPELINES_DIR, file)))
  .sort();

function readRawSpec(file: string): unknown {
  return JSON.parse(readFileSync(path.join(PIPELINES_DIR, file), "utf-8"));
}

/** The spec as pipelex wrote it, and the same spec after the relay dropped its nulls. */
function loadPair(file: string): { original: GraphSpec; relayed: GraphSpec } {
  return {
    original: validateGraphSpec(readRawSpec(file)),
    relayed: validateGraphSpec(dropNullValues(readRawSpec(file))),
  };
}

function renderEveryDetailPanel(spec: GraphSpec): string[] {
  return spec.nodes.map((node) =>
    renderToStaticMarkup(React.createElement(PipeDetailPanel, { node, spec })),
  );
}

describe("a spec relayed by a host that drops nulls", () => {
  it("finds the committed pipelex specs", () => {
    expect(SPEC_FILES.length).toBeGreaterThan(0);
  });

  it("really drops something from the specs it relays", () => {
    // Guards the premise: were the fixtures ever regenerated without nulls, every
    // test below would pass without exercising anything.
    const raw = JSON.stringify(SPEC_FILES.map(readRawSpec));
    expect(raw).toContain(":null");
    expect(
      JSON.stringify(SPEC_FILES.map((file) => dropNullValues(readRawSpec(file)))),
    ).not.toContain(":null");
  });

  it.each(SPEC_FILES)("%s validates to the same usage as the original", (file) => {
    const { original, relayed } = loadPair(file);

    expect(relayed.usage).toStrictEqual(original.usage);
    relayed.nodes.forEach((node, index) => {
      expect(node.usage).toStrictEqual(original.nodes[index].usage);
    });
  });

  it.each(SPEC_FILES)("%s builds the same graph as the original", (file) => {
    const { original, relayed } = loadPair(file);

    // Built nodes carry their spec node along, so the relayed graph still lacks the
    // nulls of pass-through fields (an IO item's `preview`, a node's `skip_reason`).
    // Compared with nulls dropped on both sides, everything the builder derives must
    // match; the test above holds the costs to their restored `null`.
    expect(dropNullValues(buildGraph(relayed, EDGE_TYPE).graphData)).toEqual(
      dropNullValues(buildGraph(original, EDGE_TYPE).graphData),
    );
  });

  it.each(SPEC_FILES)("%s renders every node's detail panel as the original does", (file) => {
    const { original, relayed } = loadPair(file);

    expect(renderEveryDetailPanel(relayed)).toEqual(renderEveryDetailPanel(original));
  });
});
