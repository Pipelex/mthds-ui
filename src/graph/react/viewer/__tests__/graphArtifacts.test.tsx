import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it } from "vitest";
import { DEFAULT_FIELD_STRINGS } from "@pipelex/mthds-form/react";
import type { InputForm, OutputForm, PipeIOContracts } from "@pipelex/mthds-form";

import type { GraphSpec } from "@graph/types";
import { findStuffByDigest } from "@graph/stuffLookup";
import { StuffResultPanel } from "@graph/react/detail/StuffResultPanel";
import type { GraphViewerProps } from "@graph/react/viewer/GraphViewer";
import { LIVE_CV_SCREENING } from "@graph/react/viewer/__stories__/pipelines/specs/_generated/live/pipeline_09";
import {
  CONTRACTS_CV_SCREENING,
  INPUT_FORM_CV_SCREENING,
  OUTPUT_FORM_CV_SCREENING,
} from "@form/react/__stories__/contracts/_generated/pipeline_09";
import {
  graphArtifactsFrom,
  resultDescriptors,
  type GraphArtifacts,
  type GraphArtifactsSource,
} from "../graphArtifacts";

const UNDESCRIBED = DEFAULT_FIELD_STRINGS.resultUndescribed;

/** One run's four artifacts, spelled as its results carry them on the wire. */
const RUN_RESULTS: GraphArtifactsSource = {
  graph_spec: LIVE_CV_SCREENING,
  pipe_io_contracts: CONTRACTS_CV_SCREENING,
  output_form: OUTPUT_FORM_CV_SCREENING,
  input_form: INPUT_FORM_CV_SCREENING,
};

/** The first data item some pipe of `spec` produced, located as GraphViewer locates it. */
function firstProducedStuff(spec: GraphSpec) {
  for (const node of spec.nodes) {
    for (const output of node.io?.outputs ?? []) {
      if (!output.digest) continue;
      const found = findStuffByDigest(spec, output.digest);
      if (found?.producerPipeRef && found.item.data != null) return found;
    }
  }
  throw new Error("the fixture has no produced stuff with a value");
}

/**
 * Render a data node's value the way GraphViewer's detail panel does: locate
 * the stuff in the bundle's own graph, take the bundle's descriptors through
 * `resultDescriptors`, and hand both to `StuffResultPanel`.
 */
function renderStuffPanel(graph: GraphArtifacts): string {
  const descriptors = resultDescriptors(graph);
  if (!descriptors) throw new Error("the bundle carries no descriptors");
  const location = firstProducedStuff(graph.graphSpec);
  return renderToStaticMarkup(
    React.createElement(StuffResultPanel, {
      ...descriptors,
      stuff: location.item,
      ...(location.producerPipeRef ? { producerPipeRef: location.producerPipeRef } : {}),
      ...(location.consumer ? { consumer: location.consumer } : {}),
    }),
  );
}

/** Re-key a `pipe_ref`-keyed artifact as the method would after renaming every pipe. */
function renamePipes<T extends object>(artifact: T): T {
  return Object.fromEntries(
    Object.entries(artifact).map(([pipeRef, value]) => {
      const dot = pipeRef.lastIndexOf(".");
      return [`${pipeRef.slice(0, dot)}.renamed_${pipeRef.slice(dot + 1)}`, value];
    }),
  ) as T;
}

describe("graphArtifactsFrom", () => {
  it("reads the graph and its three descriptors out of one run's results", () => {
    const graph = graphArtifactsFrom(RUN_RESULTS);
    expect(graph).toEqual({
      graphSpec: LIVE_CV_SCREENING,
      pipeIoContracts: CONTRACTS_CV_SCREENING,
      outputForm: OUTPUT_FORM_CV_SCREENING,
      inputForm: INPUT_FORM_CV_SCREENING,
    });
  });

  it("returns null when the source carries no graph", () => {
    expect(graphArtifactsFrom({ ...RUN_RESULTS, graph_spec: null })).toBeNull();
    expect(graphArtifactsFrom({ pipe_io_contracts: CONTRACTS_CV_SCREENING })).toBeNull();
  });

  it("keeps a graph whose run wrote no descriptors, with none", () => {
    const graph = graphArtifactsFrom({ graph_spec: LIVE_CV_SCREENING, pipe_io_contracts: null });
    expect(graph?.graphSpec).toBe(LIVE_CV_SCREENING);
    expect(resultDescriptors(graph)).toBeNull();
  });
});

describe("resultDescriptors", () => {
  it("is null without a graph, and without either half of the pair", () => {
    expect(resultDescriptors(null)).toBeNull();
    expect(resultDescriptors({ graphSpec: LIVE_CV_SCREENING })).toBeNull();
    expect(
      resultDescriptors({ graphSpec: LIVE_CV_SCREENING, pipeIoContracts: CONTRACTS_CV_SCREENING }),
    ).toBeNull();
    expect(
      resultDescriptors({ graphSpec: LIVE_CV_SCREENING, outputForm: OUTPUT_FORM_CV_SCREENING }),
    ).toBeNull();
  });

  it("carries input_form only beside the pair", () => {
    expect(
      resultDescriptors({
        graphSpec: LIVE_CV_SCREENING,
        pipeIoContracts: CONTRACTS_CV_SCREENING,
        outputForm: OUTPUT_FORM_CV_SCREENING,
      }),
    ).toEqual({ pipeIoContracts: CONTRACTS_CV_SCREENING, outputForm: OUTPUT_FORM_CV_SCREENING });
    expect(
      resultDescriptors({ graphSpec: LIVE_CV_SCREENING, inputForm: INPUT_FORM_CV_SCREENING }),
    ).toBeNull();
  });
});

describe("the detail panel reads descriptors keyed by the graph's own refs", () => {
  it("lays a produced value out from the descriptors that came with its graph", () => {
    const html = renderStuffPanel(graphArtifactsFrom(RUN_RESULTS)!);
    expect(html).not.toContain(UNDESCRIBED);
    expect(html.length).toBeGreaterThan(0);
  });

  it("falls back to the raw value when the descriptors belong to a renamed method", () => {
    // What a host produced by pairing a past run's graph with the CURRENT
    // method's artifacts, after its pipes were renamed: every lookup by the
    // graph's `pipe_ref` misses. The panel still shows the value, labelled.
    const html = renderStuffPanel({
      graphSpec: LIVE_CV_SCREENING,
      pipeIoContracts: renamePipes(CONTRACTS_CV_SCREENING),
      outputForm: renamePipes(OUTPUT_FORM_CV_SCREENING),
      inputForm: renamePipes(INPUT_FORM_CV_SCREENING),
    });
    expect(html).toContain(UNDESCRIBED);
  });
});

describe("GraphViewer takes the graph and its descriptors as one object", () => {
  it("has no prop that carries a spec or a descriptor apart from the others", () => {
    // The separate props are what let a host pair one source's graph with
    // another source's descriptors. They are gone, so the mismatch can no
    // longer be written as two props side by side.
    expectTypeOf<GraphViewerProps>().not.toHaveProperty("graphspec");
    expectTypeOf<GraphViewerProps>().not.toHaveProperty("contracts");
    expectTypeOf<GraphViewerProps>().not.toHaveProperty("outputForm");
    expectTypeOf<GraphViewerProps>().not.toHaveProperty("inputForm");
    expectTypeOf<GraphViewerProps["graph"]>().toEqualTypeOf<GraphArtifacts | null>();
  });

  it("types each descriptor as the standard's artifact, nullable as the wire carries it", () => {
    expectTypeOf<GraphArtifacts["graphSpec"]>().toEqualTypeOf<GraphSpec>();
    expectTypeOf<GraphArtifacts["pipeIoContracts"]>().toEqualTypeOf<
      PipeIOContracts | null | undefined
    >();
    expectTypeOf<GraphArtifacts["outputForm"]>().toEqualTypeOf<OutputForm | null | undefined>();
    expectTypeOf<GraphArtifacts["inputForm"]>().toEqualTypeOf<InputForm | null | undefined>();
  });
});
