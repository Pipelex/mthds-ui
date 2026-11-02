/**
 * A search result in the graph's data panel reaches the kernel's search arm.
 *
 * Since kernel 0.27.0, a `native.SearchResult` in the `app` presentation is
 * drawn as its answer, typeset as Markdown with each inline citation a link to
 * the source it counts to, then a "Sources" list holding each page once. The
 * panel adds nothing of its own: it hands the kernel the descriptor and the
 * value, and these assertions notice a panel that starts reading the value
 * itself, or stops handing the kernel what lets it recognise a search.
 *
 * The result is pipeline 09's live search, a real one whose answer cites its
 * sources as `[1][8]`, located by digest as `GraphViewer` locates it. Its
 * `search_candidate` pipe is a branch of the `enrich_candidate` parallel, which
 * lists the result among its own outputs and comes first in the spec, so this
 * is also where a lookup that named the parallel as the producer shows: the
 * panel would describe the search with the parallel's composite, and the
 * kernel would never see a search to draw. No live run here lists a page
 * twice, so the deduplication case is that run with its first source listed
 * once more at the end, the one change the kernel's own stories make for it.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readSearchResultContent } from "@pipelex/mthds-form";
import { FieldPresentationProvider, type FieldPresentation } from "@pipelex/mthds-form/react";
import type { GraphSpecNodeIoItem } from "@graph/types";
import { findStuffByDigest } from "@graph/stuffLookup";
import { StuffResultPanel } from "@graph/react/detail/StuffResultPanel";
import { LIVE_CV_SCREENING } from "@graph/react/viewer/__stories__/pipelines/specs/_generated/live/pipeline_09";
import {
  CONTRACTS_CV_SCREENING,
  OUTPUT_FORM_CV_SCREENING,
} from "@form/react/__stories__/contracts/_generated/pipeline_09";

interface SearchStuff {
  item: GraphSpecNodeIoItem;
  producerPipeRef: string;
}

/** The live search result, located by its digest as the graph locates it. */
function searchResult(): SearchStuff {
  const digest = LIVE_CV_SCREENING.nodes
    .flatMap((node) => node.io?.outputs ?? [])
    .find((output) => output.concept === "SearchResult")?.digest;
  const location = digest ? findStuffByDigest(LIVE_CV_SCREENING, digest) : undefined;
  if (!location?.producerPipeRef) throw new Error("pipeline 09's live run has no search result");
  return { item: location.item, producerPipeRef: location.producerPipeRef };
}

function renderPanel(stuff: SearchStuff, presentation: FieldPresentation): string {
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

/** Each citation link the markup holds, as `[n]` and the address it opens. */
function citationLinks(html: string): { text: string; href: string }[] {
  return [...html.matchAll(/<a href="([^"]+)"[^>]*>(\[\d+\])<\/a>/g)].map((match) => ({
    href: match[1],
    text: match[2],
  }));
}

/** The entries of the list the "Sources" heading labels. */
function sourceEntries(html: string): string[] {
  const heading = html.match(/<p id="([^"]+)"[^>]*>Sources<\/p>/);
  if (!heading) return [];
  const list = html.match(new RegExp(`<ul aria-labelledby="${heading[1]}"[^>]*>(.*?)</ul>`));
  return list ? [...list[1].matchAll(/<li\b.*?<\/li>/g)].map((entry) => entry[0]) : [];
}

describe("StuffResultPanel over a search result", () => {
  it("has the live run's search result to draw, produced by the search", () => {
    const stuff = searchResult();
    expect(stuff.producerPipeRef).toBe("recruitment.search_candidate");
    const content = readSearchResultContent(stuff.item.data);
    expect(content?.answer).toMatch(/\[\d+\]/);
    expect(content?.sources.length).toBeGreaterThan(0);
  });

  it("draws the answer in app with each citation a link to the source it counts to", () => {
    const stuff = searchResult();
    const content = readSearchResultContent(stuff.item.data)!;
    const links = citationLinks(renderPanel(stuff, "app"));
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const citation = Number(link.text.slice(1, -1));
      const source = content.sources.find((candidate) => candidate.citations.includes(citation));
      expect(link.href, link.text).toBe(source?.href);
    }
  });

  it("lists the sources in app under their heading, each once, linked and named", () => {
    const stuff = searchResult();
    const content = readSearchResultContent(stuff.item.data)!;
    const entries = sourceEntries(renderPanel(stuff, "app"));
    expect(entries).toHaveLength(content.sources.length);
    const first = content.sources[0];
    expect(entries[0]).toContain(">[1]<");
    expect(entries[0]).toContain(`href="${first.href}"`);
    expect(entries[0]).toContain('rel="noopener noreferrer"');
    // A source is a web page, not a file: no download beside it.
    expect(entries.join("")).not.toMatch(/aria-label="Download/);
  });

  it("lists a page the run returned twice once, marked with both citations", () => {
    const stuff = searchResult();
    const data = stuff.item.data as { answer: string; sources: unknown[] };
    const repeated: SearchStuff = {
      ...stuff,
      item: { ...stuff.item, data: { ...data, sources: [...data.sources, data.sources[0]] } },
    };
    const twice = data.sources.length + 1;
    const entries = sourceEntries(renderPanel(repeated, "app"));
    expect(entries).toHaveLength(data.sources.length);
    expect(entries[0]).toContain(`>[1][${twice}]<`);
  });

  it("keeps the record in studio, with no citation linked and no sources heading", () => {
    const html = renderPanel(searchResult(), "studio");
    expect(citationLinks(html)).toHaveLength(0);
    expect(sourceEntries(html)).toHaveLength(0);
    expect(html).toContain(">answer<");
    expect(html).toContain(">sources<");
  });
});
