/**
 * The heading the graph's data panel draws over a value, in each presentation.
 *
 * Since kernel 0.25.0, the kernel's `StuffViewer` draws a title in `app` only
 * when its host passes `name`, so a host that heads a result itself gets no
 * second heading under its own. The graph's panel heads nothing itself: the
 * stuff's name on the panel is the only thing that says which value the reader
 * opened. So `StuffResultPanel` always names the stuff, and these assertions
 * notice a panel that stops doing so, in a host that sets `app` around the
 * graph as much as in the default `studio`.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  FieldPresentationProvider,
  humanizeFieldName,
  type FieldPresentation,
} from "@pipelex/mthds-form/react";
import type { GraphSpec, GraphSpecNodeIoItem } from "@graph/types";
import { findStuffByDigest } from "@graph/stuffLookup";
import { StuffResultPanel } from "@graph/react/detail/StuffResultPanel";
import { LIVE_CV_SCREENING } from "@graph/react/viewer/__stories__/pipelines/specs/_generated/live/pipeline_09";
import {
  CONTRACTS_CV_SCREENING,
  OUTPUT_FORM_CV_SCREENING,
} from "@form/react/__stories__/contracts/_generated/pipeline_09";

interface ProducedStuff {
  item: GraphSpecNodeIoItem;
  producerPipeRef: string;
}

/** Every data item some pipe of `spec` produced with a value, located as GraphViewer locates it. */
function producedStuffs(spec: GraphSpec): ProducedStuff[] {
  const found = new Map<string, ProducedStuff>();
  for (const node of spec.nodes) {
    for (const output of node.io?.outputs ?? []) {
      if (!output.digest || found.has(output.digest)) continue;
      const location = findStuffByDigest(spec, output.digest);
      if (location?.producerPipeRef && location.item.data != null) {
        found.set(output.digest, {
          item: location.item,
          producerPipeRef: location.producerPipeRef,
        });
      }
    }
  }
  return [...found.values()];
}

function renderPanel(stuff: ProducedStuff, presentation: FieldPresentation): string {
  return renderToStaticMarkup(
    <FieldPresentationProvider presentation={presentation}>
      <StuffResultPanel
        pipeIoContracts={CONTRACTS_CV_SCREENING}
        outputForm={OUTPUT_FORM_CV_SCREENING}
        stuff={stuff.item}
        producerPipeRef={stuff.producerPipeRef}
      />
    </FieldPresentationProvider>,
  );
}

const STUFFS = producedStuffs(LIVE_CV_SCREENING);

describe("StuffResultPanel's heading", () => {
  it("has produced values to head", () => {
    expect(STUFFS.length).toBeGreaterThan(0);
  });

  it.each(STUFFS.map((stuff) => [stuff.item.name, stuff] as const))(
    "names %s in studio, as the method wrote it",
    (name, stuff) => {
      expect(renderPanel(stuff, "studio")).toContain(`>${name}<`);
    },
  );

  it.each(STUFFS.map((stuff) => [stuff.item.name, stuff] as const))(
    "names %s in app, in words, rather than leaving the value unheaded",
    (name, stuff) => {
      const html = renderPanel(stuff, "app");
      expect(html).toContain(`>${humanizeFieldName(name)}<`);
      // The descriptor's root is `output` for every pipe; the panel never
      // falls back to it.
      expect(html).not.toContain(">Output<");
    },
  );
});
