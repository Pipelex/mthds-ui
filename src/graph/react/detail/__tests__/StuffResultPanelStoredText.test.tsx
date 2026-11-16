/**
 * A stored text reaches the graph's data panel through the host's `loadText`.
 *
 * A runtime stores a large `Text`, `Markdown`, `Html` or `JSON` value in the
 * run's storage and hands back its reference, `{url, size, mime_type,
 * preview}`, where the inline value would be. The kernel's result view shows
 * the reference's preview and loads the whole text through the host's
 * `loadText`, which goes on its `ResultEnvProvider`. `StuffResultPanel`
 * installs its own provider whenever the host passes a result setting, and
 * the kernel's provider replaces an outer one rather than merging with it, so
 * a seam the panel does not thread is a seam no host using the graph can
 * reach. These assertions notice a panel that stops threading `loadText`, or
 * stops installing its provider when it is the only setting given.
 *
 * The value is pipeline 09's live `report`, located by digest as the graph
 * locates it and described by the `output_form` of the pipe that produced it.
 * The run's report arrived inline, so each case hands the panel the same value
 * as the reference a runtime that stored it would hand back.
 *
 * The server render shows what a reader sees before any load answers: the
 * preview, and a line saying whether the whole text is being loaded (a loader
 * is reachable) or that this is only its start (none is). The load itself, and
 * the loaded text replacing the preview when a node is opened, is pinned in a
 * browser by the `HostLoadsStoredTexts` story in
 * `GraphWithResultPanel.stories.tsx`.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import type { LoadText } from "@pipelex/mthds-form";
import { ResultEnvProvider } from "@pipelex/mthds-form/react";
import type { GraphSpecNodeIoItem } from "@graph/types";
import { findStuffByDigest } from "@graph/stuffLookup";
import { StuffResultPanel, type StuffResultPanelProps } from "@graph/react/detail/StuffResultPanel";
import type { GraphViewerProps } from "@graph/react/viewer/GraphViewer";
import { LIVE_CV_SCREENING } from "@graph/react/viewer/__stories__/pipelines/specs/_generated/live/pipeline_09";
import {
  CONTRACTS_CV_SCREENING,
  OUTPUT_FORM_CV_SCREENING,
} from "@form/react/__stories__/contracts/_generated/pipeline_09";

const REPORT_DIGEST = "mNi4t";
const REPORT_URL = "pipelex-storage://run/generated/report/value.md";
const PREVIEW = "# Candidate Screening Report";

const REPORT = findStuffByDigest(LIVE_CV_SCREENING, REPORT_DIGEST);

/** Pipeline 09's `report`, held as the reference a runtime that stored it hands back. */
function storedReport(): { stuff: GraphSpecNodeIoItem; producerPipeRef: string } {
  if (!REPORT?.producerPipeRef) throw new Error("pipeline 09's live run has no produced report");
  const text = (REPORT.item.data as { text: string }).text;
  return {
    stuff: {
      ...REPORT.item,
      data: {
        url: REPORT_URL,
        size: new TextEncoder().encode(text).length,
        mime_type: "text/markdown",
        preview: PREVIEW,
      },
    },
    producerPipeRef: REPORT.producerPipeRef,
  };
}

/** A host's loader that never answers here: the server render shows the wait. */
function loader() {
  return vi.fn<LoadText>(() => new Promise<string>(() => {}));
}

function panel(settings: Partial<StuffResultPanelProps>) {
  const { stuff, producerPipeRef } = storedReport();
  return (
    <StuffResultPanel
      pipeIoContracts={CONTRACTS_CV_SCREENING}
      outputForm={OUTPUT_FORM_CV_SCREENING}
      stuff={stuff}
      producerPipeRef={producerPipeRef}
      {...settings}
    />
  );
}

/** What the kernel's stored-text view says it is doing: `idle`, `loading` or `failed`. */
function storedTextState(html: string): string | undefined {
  return /data-stored-text="([a-z]+)"/.exec(html)?.[1];
}

describe("StuffResultPanel's stored text", () => {
  it("is typed as the kernel's loader on GraphViewer and on the panel", () => {
    expectTypeOf<GraphViewerProps["loadText"]>().toEqualTypeOf<LoadText | undefined>();
    expectTypeOf<StuffResultPanelProps["loadText"]>().toEqualTypeOf<LoadText | undefined>();
  });

  it("shows the stored text's start, saying it is only the start, when the host loads nothing", () => {
    const html = renderToStaticMarkup(panel({}));
    expect(html).toContain(PREVIEW);
    expect(storedTextState(html)).toBe("idle");
    expect(html).toContain("The start of a stored text");
  });

  it("shows the stored text's start while the host's loadText loads the whole text", () => {
    const loadText = loader();
    const html = renderToStaticMarkup(panel({ loadText }));
    expect(html).toContain(PREVIEW);
    expect(storedTextState(html)).toBe("loading");
    expect(html).toContain("Loading the whole text");
  });

  it("reaches a host provider around a panel given nothing", () => {
    const html = renderToStaticMarkup(
      <ResultEnvProvider loadText={loader()}>{panel({})}</ResultEnvProvider>,
    );
    expect(storedTextState(html)).toBe("loading");
  });

  it("installs its own provider when the host's loadText is the only setting it is given", () => {
    // An outer provider that hides the whole-result Download: the panel's own
    // provider replaces it, so the control comes back. A panel that forgot
    // `loadText` when deciding whether to install its provider would install
    // none, and the outer provider would still hide the control.
    const hidden = { result: false, files: false };
    const outerOnly = renderToStaticMarkup(
      <ResultEnvProvider downloads={hidden}>{panel({})}</ResultEnvProvider>,
    );
    expect(outerOnly).not.toMatch(/>Download</);
    const html = renderToStaticMarkup(
      <ResultEnvProvider downloads={hidden}>{panel({ loadText: loader() })}</ResultEnvProvider>,
    );
    expect(storedTextState(html)).toBe("loading");
    expect(html).toMatch(/>Download</);
  });

  it("leaves a text that arrived inline alone", () => {
    if (!REPORT?.producerPipeRef) throw new Error("pipeline 09's live run has no produced report");
    const loadText = loader();
    const html = renderToStaticMarkup(
      <StuffResultPanel
        pipeIoContracts={CONTRACTS_CV_SCREENING}
        outputForm={OUTPUT_FORM_CV_SCREENING}
        stuff={REPORT.item}
        producerPipeRef={REPORT.producerPipeRef}
        loadText={loadText}
      />,
    );
    expect(storedTextState(html)).toBeUndefined();
    expect(loadText).not.toHaveBeenCalled();
  });
});
