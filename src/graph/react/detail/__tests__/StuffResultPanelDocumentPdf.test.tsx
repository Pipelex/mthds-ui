/**
 * The host's PDF of an office document reaches the graph's data panel.
 *
 * The kernel's `ResultEnvProvider` takes `resolveDocumentPdf`, and a document
 * the browser cannot render, such as a Word file, then offers its Preview
 * toggle and opens onto the pages of the PDF the host makes of it.
 * `StuffResultPanel` installs its own provider whenever the host passes a
 * result setting, and the kernel's provider replaces an outer one rather than
 * merging with it, so a seam the panel does not thread is a seam no host using
 * the graph can reach. These assertions notice a panel that stops threading
 * it, or stops installing its provider when it is the only setting given.
 *
 * The document is pipeline 09's live `cv` input, located by digest as the graph
 * locates it, and described by the input form of the pipe that reads it, since
 * no pipe produced it. The run's CV is a PDF, which the browser renders and the
 * kernel never asks about, so each case hands the panel the same input as the
 * Word file a host would hold: the kernel decides which documents to ask about
 * only from their declared type and name.
 *
 * `GraphViewer` threads the seam to this panel beside `resolveUrl`. That hop is
 * pinned at runtime by the `HostConvertsOfficeDocuments` story in
 * `GraphWithResultPanel.stories.tsx`, which reads the props the graph handed
 * the panel through a spy, and here by type.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  ResultEnvProvider,
  type AskDocumentPdf,
  type LoadBytes,
  type PdfWorkerConfig,
  type ResolveDocumentPdf,
} from "@pipelex/mthds-form/react";
import type { GraphSpecNodeIoItem } from "@graph/types";
import { findStuffByDigest } from "@graph/stuffLookup";
import { StuffResultPanel, type StuffResultPanelProps } from "@graph/react/detail/StuffResultPanel";
import type { GraphViewerProps } from "@graph/react/viewer/GraphViewer";
import { LIVE_CV_SCREENING } from "@graph/react/viewer/__stories__/pipelines/specs/_generated/live/pipeline_09";
import {
  CONTRACTS_CV_SCREENING,
  INPUT_FORM_CV_SCREENING,
  OUTPUT_FORM_CV_SCREENING,
} from "@form/react/__stories__/contracts/_generated/pipeline_09";

// The kernel's provider, spied on so a case reads the props the panel really
// handed it; it renders as the kernel's own.
vi.mock("@pipelex/mthds-form/react", async (importOriginal) => {
  const kernel = await importOriginal<typeof import("@pipelex/mthds-form/react")>();
  return { ...kernel, ResultEnvProvider: vi.fn(kernel.ResultEnvProvider) };
});

const CV_DIGEST = "AyZkr";
const DOCX_URL = "pipelex-storage://run/inputs/John-Doe-CV.docx";
const DOCX_NAME = "John-Doe-CV.docx";
const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * The kernel's Preview toggle, open or folded. A preview starts open since kernel
 * 0.39.1, so the server renders it expanded; matching either state keeps the
 * cases that expect no toggle at all from passing against an open one.
 */
const PREVIEW_TOGGLE = "aria-expanded=";

const CV = findStuffByDigest(LIVE_CV_SCREENING, CV_DIGEST);

/** Pipeline 09's `cv` input, held as a Word file, and the pipe slot that reads it. */
function wordCv(): { stuff: GraphSpecNodeIoItem; consumer: { pipeRef: string; slotName: string } } {
  if (!CV?.consumer) throw new Error("pipeline 09's live run has no cv input read by a pipe");
  const data = CV.item.data as Record<string, unknown>;
  return {
    stuff: {
      ...CV.item,
      content_type: DOCX_TYPE,
      data: { ...data, url: DOCX_URL, public_url: null, mime_type: DOCX_TYPE, filename: DOCX_NAME },
    },
    consumer: CV.consumer,
  };
}

/** A host that converts every office document it is asked about, its ask never settling here. */
function converts() {
  const ask = vi.fn<AskDocumentPdf>(() => new Promise(() => {}));
  const resolveDocumentPdf = vi.fn<ResolveDocumentPdf>(() => ask);
  return { ask, resolveDocumentPdf };
}

function panel(settings: Partial<StuffResultPanelProps>) {
  const { stuff, consumer } = wordCv();
  return (
    <StuffResultPanel
      pipeIoContracts={CONTRACTS_CV_SCREENING}
      outputForm={OUTPUT_FORM_CV_SCREENING}
      inputForm={INPUT_FORM_CV_SCREENING}
      stuff={stuff}
      consumer={consumer}
      {...settings}
    />
  );
}

describe("StuffResultPanel's PDF of an office document", () => {
  it("is typed as the kernel's seam on GraphViewer and on the panel", () => {
    expectTypeOf<GraphViewerProps["resolveDocumentPdf"]>().toEqualTypeOf<
      ResolveDocumentPdf | undefined
    >();
    expectTypeOf<StuffResultPanelProps["resolveDocumentPdf"]>().toEqualTypeOf<
      ResolveDocumentPdf | undefined
    >();
  });

  it("draws the Word file as a document with no preview when the host converts nothing", () => {
    const html = renderToStaticMarkup(panel({}));
    expect(html).toContain(DOCX_NAME);
    expect(html).not.toContain(PREVIEW_TOGGLE);
  });

  it("asks the host's resolveDocumentPdf with the document's url, name and type, and offers a preview", () => {
    const { ask, resolveDocumentPdf } = converts();
    const html = renderToStaticMarkup(panel({ resolveDocumentPdf }));
    expect(resolveDocumentPdf).toHaveBeenCalledWith(DOCX_URL, {
      filename: DOCX_NAME,
      mimeType: DOCX_TYPE,
    });
    expect(html).toContain(PREVIEW_TOGGLE);
    // Deciding is not asking: the conversion starts as the open preview mounts
    // in a browser, which a server render never reaches.
    expect(ask).not.toHaveBeenCalled();
  });

  it("offers no preview where the host's resolveDocumentPdf answers nothing", () => {
    const html = renderToStaticMarkup(panel({ resolveDocumentPdf: () => undefined }));
    expect(html).not.toContain(PREVIEW_TOGGLE);
  });

  it("offers a preview from a host provider around a panel given nothing", () => {
    const { resolveDocumentPdf } = converts();
    const html = renderToStaticMarkup(
      <ResultEnvProvider resolveDocumentPdf={resolveDocumentPdf}>{panel({})}</ResultEnvProvider>,
    );
    expect(resolveDocumentPdf).toHaveBeenCalled();
    expect(html).toContain(PREVIEW_TOGGLE);
  });

  it("hands one provider the conversion, the bytes and the worker a converted PDF on another origin needs", () => {
    // Since kernel 0.42.3 a `ready` answer on another origin, such as a
    // presigned storage link, is drawn from `loadBytes`, asked with that
    // answer's URL, when the same provider also holds `pdfWorker`. The
    // drawing happens in a browser, after the ask settles, which a server
    // render never reaches, so what this package owns is that the three
    // settings arrive together on the provider the kernel reads.
    const { ask, resolveDocumentPdf } = converts();
    const loadBytes = vi.fn<LoadBytes>(() => new Promise(() => {}));
    const pdfWorker: PdfWorkerConfig = { workerSrc: "/pdf.worker.min.mjs" };
    vi.mocked(ResultEnvProvider).mockClear();
    const html = renderToStaticMarkup(panel({ resolveDocumentPdf, loadBytes, pdfWorker }));
    const providers = vi.mocked(ResultEnvProvider).mock.calls.map(([props]) => props);
    expect(providers).toHaveLength(1);
    expect(providers[0]?.resolveDocumentPdf).toBe(resolveDocumentPdf);
    expect(providers[0]?.loadBytes).toBe(loadBytes);
    expect(providers[0]?.pdfWorker).toBe(pdfWorker);
    expect(resolveDocumentPdf).toHaveBeenCalledWith(DOCX_URL, {
      filename: DOCX_NAME,
      mimeType: DOCX_TYPE,
    });
    expect(html).toContain(PREVIEW_TOGGLE);
    // The ask, and the bytes of the PDF it answers, are asked for in a
    // browser only, as the open preview mounts and nears the viewport.
    expect(ask).not.toHaveBeenCalled();
    expect(loadBytes).not.toHaveBeenCalled();
  });

  it("installs its own provider when the host's resolveDocumentPdf is the only setting it is given", () => {
    // The panel's provider replaces the outer one, so the outer function is
    // never asked. A panel that forgot `resolveDocumentPdf` when deciding
    // whether to install its provider would install none, and the outer
    // function would be the one asked.
    const outer = converts();
    const own = converts();
    renderToStaticMarkup(
      <ResultEnvProvider resolveDocumentPdf={outer.resolveDocumentPdf}>
        {panel({ resolveDocumentPdf: own.resolveDocumentPdf })}
      </ResultEnvProvider>,
    );
    expect(own.resolveDocumentPdf).toHaveBeenCalled();
    expect(outer.resolveDocumentPdf).not.toHaveBeenCalled();
  });
});
