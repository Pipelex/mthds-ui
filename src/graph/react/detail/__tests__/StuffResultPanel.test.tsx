/**
 * The heading the graph's data panel draws over a value, in each presentation.
 *
 * Since kernel 0.25.0, the kernel's `StuffViewer` draws a title in `app` only
 * when its host passes `name`, so a host that heads a result itself gets no
 * second heading under its own. The graph's panel heads nothing itself: the
 * stuff's name on the panel is the only thing that says which value the reader
 * opened. So `StuffResultPanel` always passes the stuff's name, and these
 * assertions notice a panel that stops doing so, in a host that sets `app`
 * around the graph as much as in the default `studio`.
 *
 * An HTML page (`native.Html`) is the one result the kernel leaves untitled in
 * `app` even when named, by its own design: the page heads itself. The last
 * case pins that exception, so the docs' claim about it stays true.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { OutputForm, PipeIOContracts } from "@pipelex/mthds-form";
import {
  FieldPresentationProvider,
  humanizeFieldName,
  type FieldPresentation,
} from "@pipelex/mthds-form/react";
import type { GraphSpec, GraphSpecNodeIoItem } from "@graph/types";
import { findStuffByDigest } from "@graph/stuffLookup";
import { StuffResultPanel } from "@graph/react/detail/StuffResultPanel";
import { LIVE_CV_SCREENING } from "@graph/react/viewer/__stories__/pipelines/specs/_generated/live/pipeline_09";
import { LIVE_ALL_NATIVE_CONCEPTS } from "@graph/react/viewer/__stories__/pipelines/specs/_generated/live/pipeline_34";
import {
  CONTRACTS_CV_SCREENING,
  OUTPUT_FORM_CV_SCREENING,
} from "@form/react/__stories__/contracts/_generated/pipeline_09";
import {
  CONTRACTS_ALL_NATIVE_CONCEPTS,
  OUTPUT_FORM_ALL_NATIVE_CONCEPTS,
} from "@form/react/__stories__/contracts/_generated/pipeline_34";

interface ProducedStuff {
  item: GraphSpecNodeIoItem;
  producerPipeRef: string;
}

/** The descriptors a run's results carry beside its graph spec. */
interface Descriptors {
  pipeIoContracts: PipeIOContracts;
  outputForm: OutputForm;
}

const CV_SCREENING: Descriptors = {
  pipeIoContracts: CONTRACTS_CV_SCREENING,
  outputForm: OUTPUT_FORM_CV_SCREENING,
};

const ALL_NATIVE_CONCEPTS: Descriptors = {
  pipeIoContracts: CONTRACTS_ALL_NATIVE_CONCEPTS,
  outputForm: OUTPUT_FORM_ALL_NATIVE_CONCEPTS,
};

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

function renderPanel(
  stuff: ProducedStuff,
  presentation: FieldPresentation,
  descriptors: Descriptors = CV_SCREENING,
): string {
  return renderToStaticMarkup(
    <FieldPresentationProvider presentation={presentation}>
      <StuffResultPanel
        pipeIoContracts={descriptors.pipeIoContracts}
        outputForm={descriptors.outputForm}
        stuff={stuff.item}
        producerPipeRef={stuff.producerPipeRef}
      />
    </FieldPresentationProvider>,
  );
}

const STUFFS = producedStuffs(LIVE_CV_SCREENING);

/**
 * The `native.Html` result of pipeline 34's live run, as `render_html`, the
 * operator that rendered it, describes it. It is read off that pipe's node
 * rather than located by digest, because the parallel above it lists its
 * branches' outputs too and comes first in the spec, so a digest lookup would
 * name the parallel as the producer and describe the page as its composite.
 */
const HTML_PAGE: ProducedStuff | undefined = (() => {
  const node = LIVE_ALL_NATIVE_CONCEPTS.nodes.find(
    (candidate) => candidate.pipe_code === "render_html",
  );
  const item = node?.io?.outputs?.[0];
  return item ? { item, producerPipeRef: "native_sampler.render_html" } : undefined;
})();

function htmlPage(): ProducedStuff {
  if (!HTML_PAGE) throw new Error("pipeline 34's live run has no render_html result");
  return HTML_PAGE;
}

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

  describe("over an HTML page", () => {
    it("has the live run's page to draw", () => {
      expect(HTML_PAGE).toBeDefined();
    });

    it("names the page in studio, as the method wrote it", () => {
      const page = htmlPage();
      expect(renderPanel(page, "studio", ALL_NATIVE_CONCEPTS)).toContain(`>${page.item.name}<`);
    });

    it("draws the page in app with no title above it, though the panel names it", () => {
      const page = htmlPage();
      const html = renderPanel(page, "app", ALL_NATIVE_CONCEPTS);
      // The kernel read the value as a page: it offers the page's own download,
      // which it draws only then. So the missing title is the kernel's choice
      // over a page, not a panel that drew nothing. (Its frame mounts in the
      // browser, so static markup holds only the frame's container.)
      expect(html).toContain('aria-label="Download HTML"');
      expect(html).not.toContain(`>${humanizeFieldName(page.item.name)}<`);
      expect(html).not.toContain(`>${page.item.name}<`);
      expect(html).not.toContain(">Output<");
    });
  });
});
