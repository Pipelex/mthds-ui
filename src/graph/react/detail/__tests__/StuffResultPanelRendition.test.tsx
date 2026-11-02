/**
 * The host's smaller copies of its pictures reach the graph's data panel.
 *
 * Since kernel 0.26.0, the kernel's `ResultEnvProvider` takes
 * `resolveRendition`, and a gallery's tiles and a table cell's thumbnails are
 * drawn from the copy it answers. `StuffResultPanel` installs its own provider
 * whenever the host passes a result setting, and the kernel's provider replaces
 * an outer one rather than merging with it, so a seam the panel does not thread
 * is a seam no host using the graph can reach. These assertions notice a panel
 * that stops threading it, or stops installing its provider when it is the only
 * setting given.
 *
 * The result is pipeline 34's live `illustrate` output, a text with a list of
 * pictures, read off that pipe's node as the heading test reads its HTML page.
 * Its picture's `url` member is whatever the model wrote, which no browser can
 * fetch, so the host's `resolveUrl` answers a fetchable one, exactly as a host
 * resolves a stored reference: the kernel asks for a copy only of a picture it
 * can already paint.
 *
 * `GraphViewer` threads the seam to this panel beside `resolveUrl`. Located as
 * the graph locates it, by digest, the `illustrated` value is described by the
 * parallel that lists it, whose composite draws its pictures as rows rather
 * than tiles, and no other live fixture holds a gallery or a thumbnail, so a
 * story mounting the graph has no tile to observe. That hop is pinned at
 * runtime instead by the `HostKeepsCopiesOfPictures` story in
 * `GraphWithResultPanel.stories.tsx`, which reads the props the graph handed
 * the panel through a spy, and here by type.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  ResultEnvProvider,
  type ResolveRendition,
  type ResolveUrl,
} from "@pipelex/mthds-form/react";
import type { GraphSpecNodeIoItem } from "@graph/types";
import { StuffResultPanel, type StuffResultPanelProps } from "@graph/react/detail/StuffResultPanel";
import type { GraphViewerProps } from "@graph/react/viewer/GraphViewer";
import { LIVE_ALL_NATIVE_CONCEPTS } from "@graph/react/viewer/__stories__/pipelines/specs/_generated/live/pipeline_34";
import {
  CONTRACTS_ALL_NATIVE_CONCEPTS,
  OUTPUT_FORM_ALL_NATIVE_CONCEPTS,
} from "@form/react/__stories__/contracts/_generated/pipeline_34";

const PRODUCER = "native_sampler.illustrate";
const WHOLE = "https://files.test/roadmap.png";

const ILLUSTRATED: GraphSpecNodeIoItem | undefined = LIVE_ALL_NATIVE_CONCEPTS.nodes.find(
  (candidate) => candidate.pipe_code === "illustrate",
)?.io?.outputs?.[0];

function illustrated(): GraphSpecNodeIoItem {
  if (!ILLUSTRATED) throw new Error("pipeline 34's live run has no illustrate result");
  return ILLUSTRATED;
}

/** The `url` member of the result's one picture, as the payload carries it. */
function pictureUrl(): string {
  const data = illustrated().data as { images?: { url: string }[] } | undefined;
  const url = data?.images?.[0]?.url;
  if (!url) throw new Error("the illustrate result carries no picture");
  return url;
}

const resolveUrl: ResolveUrl = () => WHOLE;

/** A host's copies, named for the width the kernel asked for. */
function copies() {
  return vi.fn<ResolveRendition>((_url, { width }) => `https://files.test/roadmap-${width}w.png`);
}

function renderPanel(settings: Partial<StuffResultPanelProps>): string {
  return renderToStaticMarkup(
    <StuffResultPanel
      pipeIoContracts={CONTRACTS_ALL_NATIVE_CONCEPTS}
      outputForm={OUTPUT_FORM_ALL_NATIVE_CONCEPTS}
      stuff={illustrated()}
      producerPipeRef={PRODUCER}
      {...settings}
    />,
  );
}

describe("StuffResultPanel's smaller copies of pictures", () => {
  it("is typed as the kernel's seam on GraphViewer and on the panel", () => {
    expectTypeOf<GraphViewerProps["resolveRendition"]>().toEqualTypeOf<
      ResolveRendition | undefined
    >();
    expectTypeOf<StuffResultPanelProps["resolveRendition"]>().toEqualTypeOf<
      ResolveRendition | undefined
    >();
  });

  it("has a list of pictures to draw", () => {
    expect(pictureUrl()).toBeTypeOf("string");
  });

  it("draws the whole picture in a tile when the host keeps no copies", () => {
    const html = renderPanel({ resolveUrl });
    expect(html).toContain(`src="${WHOLE}"`);
    expect(html).not.toContain("roadmap-");
  });

  it("draws a tile from the host's copy, asked with the picture's own url member", () => {
    const resolveRendition = copies();
    const html = renderPanel({ resolveUrl, resolveRendition });
    expect(resolveRendition).toHaveBeenCalled();
    const [url, request] = resolveRendition.mock.calls[0];
    expect(url).toBe(pictureUrl());
    expect(request.width).toBeGreaterThan(0);
    expect(html).toContain(`src="https://files.test/roadmap-${request.width}w.png"`);
  });

  it("draws the whole picture where the host's copy answers nothing", () => {
    const html = renderPanel({ resolveUrl, resolveRendition: () => undefined });
    expect(html).toContain(`src="${WHOLE}"`);
  });

  it("draws a tile from the copies of a host provider around a panel given nothing", () => {
    const resolveRendition = copies();
    const html = renderToStaticMarkup(
      <ResultEnvProvider resolveUrl={resolveUrl} resolveRendition={resolveRendition}>
        <StuffResultPanel
          pipeIoContracts={CONTRACTS_ALL_NATIVE_CONCEPTS}
          outputForm={OUTPUT_FORM_ALL_NATIVE_CONCEPTS}
          stuff={illustrated()}
          producerPipeRef={PRODUCER}
        />
      </ResultEnvProvider>,
    );
    const [, request] = resolveRendition.mock.calls[0];
    expect(html).toContain(`src="https://files.test/roadmap-${request.width}w.png"`);
  });

  it("installs its own provider when the host's copies are the only setting it is given", () => {
    // The panel's provider replaces the outer one, so the outer `resolveUrl`
    // no longer applies and the picture cannot be painted: that is the
    // documented cost of mixing the two lanes. A panel that forgot the copies
    // when deciding whether to install its provider would install none, let
    // the outer `resolveUrl` paint the whole picture, and drop the copies.
    const html = renderToStaticMarkup(
      <OuterResolver>
        <StuffResultPanel
          pipeIoContracts={CONTRACTS_ALL_NATIVE_CONCEPTS}
          outputForm={OUTPUT_FORM_ALL_NATIVE_CONCEPTS}
          stuff={illustrated()}
          producerPipeRef={PRODUCER}
          resolveRendition={copies()}
        />
      </OuterResolver>,
    );
    expect(html).not.toContain(`src="${WHOLE}"`);
  });
});

/** A host provider around the panel, resolving every picture to the whole one. */
function OuterResolver({ children }: { children: React.ReactNode }) {
  return <ResultEnvProvider resolveUrl={resolveUrl}>{children}</ResultEnvProvider>;
}
