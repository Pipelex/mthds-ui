/**
 * The host's bytes seam for a PDF the kernel draws itself reaches the graph's
 * data panel.
 *
 * Since kernel 0.41.0 the result view draws a PDF it cannot frame (one the host
 * serves from another origin, such as a presigned storage URL) page by page
 * with pdf.js, when its `ResultEnvProvider` is given `loadBytes` and
 * `pdfWorker`; `openExternal` routes the links inside those pages. All three
 * are read only in a browser, once a document nears the viewport, so a server
 * render cannot show the drawing itself, which the kernel's own suite pins.
 * What this package owns is the hand-off: `StuffResultPanel` installs its own
 * provider whenever the host passes a result setting, and the kernel's provider
 * replaces an outer one rather than merging with it, so a setting the panel
 * does not thread is a setting no host using the graph can reach. The kernel's
 * provider is spied on here, so each assertion reads the props the panel
 * really handed it.
 *
 * `GraphViewer` threads the three settings to this panel beside `resolveUrl`.
 * That hop is pinned at runtime by the `HostDrawsPdfsFromBytes` story in
 * `GraphWithResultPanel.stories.tsx`, and here by type.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  ResultEnvProvider,
  type LoadBytes,
  type OpenExternal,
  type PdfWorkerConfig,
} from "@pipelex/mthds-form/react";
import { findStuffByDigest } from "@graph/stuffLookup";
import { StuffResultPanel, type StuffResultPanelProps } from "@graph/react/detail/StuffResultPanel";
import type { GraphViewerProps } from "@graph/react/viewer/GraphViewer";
import { LIVE_CV_SCREENING } from "@graph/react/viewer/__stories__/pipelines/specs/_generated/live/pipeline_09";
import {
  CONTRACTS_CV_SCREENING,
  INPUT_FORM_CV_SCREENING,
  OUTPUT_FORM_CV_SCREENING,
} from "@form/react/__stories__/contracts/_generated/pipeline_09";

vi.mock("@pipelex/mthds-form/react", async (importOriginal) => {
  const kernel = await importOriginal<typeof import("@pipelex/mthds-form/react")>();
  return { ...kernel, ResultEnvProvider: vi.fn(kernel.ResultEnvProvider) };
});

const CV_DIGEST = "AyZkr";
const CV = findStuffByDigest(LIVE_CV_SCREENING, CV_DIGEST);
const PDF_WORKER: PdfWorkerConfig = { workerSrc: "/pdf.worker.min.mjs", version: "6.5.438" };

function panel(settings: Partial<StuffResultPanelProps>) {
  if (!CV?.consumer) throw new Error("pipeline 09's live run has no cv input read by a pipe");
  return (
    <StuffResultPanel
      pipeIoContracts={CONTRACTS_CV_SCREENING}
      outputForm={OUTPUT_FORM_CV_SCREENING}
      inputForm={INPUT_FORM_CV_SCREENING}
      stuff={CV.item}
      consumer={CV.consumer}
      {...settings}
    />
  );
}

/** The props of every `ResultEnvProvider` rendered, outermost first. */
function providerProps() {
  return vi.mocked(ResultEnvProvider).mock.calls.map(([props]) => props);
}

afterEach(() => {
  vi.mocked(ResultEnvProvider).mockClear();
});

describe("StuffResultPanel's PDF drawn from the host's bytes", () => {
  it("is typed as the kernel's settings on GraphViewer and on the panel", () => {
    expectTypeOf<GraphViewerProps["loadBytes"]>().toEqualTypeOf<LoadBytes | undefined>();
    expectTypeOf<GraphViewerProps["pdfWorker"]>().toEqualTypeOf<PdfWorkerConfig | undefined>();
    expectTypeOf<GraphViewerProps["openExternal"]>().toEqualTypeOf<OpenExternal | undefined>();
    expectTypeOf<StuffResultPanelProps["loadBytes"]>().toEqualTypeOf<LoadBytes | undefined>();
    expectTypeOf<StuffResultPanelProps["pdfWorker"]>().toEqualTypeOf<PdfWorkerConfig | undefined>();
    expectTypeOf<StuffResultPanelProps["openExternal"]>().toEqualTypeOf<OpenExternal | undefined>();
  });

  it("hands the host's loadBytes, pdfWorker and openExternal to its own provider", () => {
    const loadBytes = vi.fn<LoadBytes>(() => new Promise(() => {}));
    const openExternal = vi.fn<OpenExternal>();
    renderToStaticMarkup(
      panel({
        resolveUrl: () => "https://bucket.example/cv.pdf",
        loadBytes,
        pdfWorker: PDF_WORKER,
        openExternal,
      }),
    );
    const [own] = providerProps();
    expect(own?.loadBytes).toBe(loadBytes);
    expect(own?.pdfWorker).toBe(PDF_WORKER);
    expect(own?.openExternal).toBe(openExternal);
    // Read in a browser only, as the document nears the viewport.
    expect(loadBytes).not.toHaveBeenCalled();
    expect(openExternal).not.toHaveBeenCalled();
  });

  it.each([
    ["loadBytes", { loadBytes: vi.fn<LoadBytes>() }],
    ["pdfWorker", { pdfWorker: PDF_WORKER }],
    ["openExternal", { openExternal: vi.fn<OpenExternal>() }],
  ] as const)(
    "installs its own provider when the host's %s is the only setting it is given",
    (name, settings) => {
      // The panel's provider sits inside the host's, so it is the second one
      // rendered. A panel that forgot this setting when deciding whether to
      // install its provider would render none, and the host's would be alone.
      renderToStaticMarkup(
        <ResultEnvProvider resolveUrl={() => undefined}>{panel(settings)}</ResultEnvProvider>,
      );
      const props = providerProps();
      expect(props).toHaveLength(2);
      expect(props[1]?.[name]).toBe(Object.values(settings)[0]);
    },
  );

  it("installs no provider of its own when the host passes no setting", () => {
    renderToStaticMarkup(panel({}));
    expect(providerProps()).toEqual([]);
  });

  it("shows a PDF the host serves from another origin as its link on a server render", () => {
    // A server does not know the page's origin, so the kernel decides between
    // a frame and a drawing only in the browser; the link is what both start
    // from, and the bytes seam is not asked.
    const loadBytes = vi.fn<LoadBytes>();
    const html = renderToStaticMarkup(
      panel({
        resolveUrl: () => "https://bucket.example/cv.pdf",
        loadBytes,
        pdfWorker: PDF_WORKER,
      }),
    );
    expect(html).toContain('href="https://bucket.example/cv.pdf"');
    expect(loadBytes).not.toHaveBeenCalled();
  });
});
