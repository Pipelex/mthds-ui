/**
 * A stored text nested inside a value reaches the graph's data panel.
 *
 * The kernel's views load a stored `Text`, `Markdown`, `Html` or `JSON` value
 * they draw themselves, but not one nested inside another native's content,
 * such as a `Page`, whose text sits under `text_and_images.text`: the kernel's
 * page view reads the text only when it arrived inline. So the panel loads the
 * stored texts nested in a node's value itself, through the host's `loadText`,
 * with the kernel's own walk (`loadStoredValues`), and draws the loaded value.
 *
 * These assertions pin that load in Node: what it hands back for a `Page[]`
 * whose text the runtime stored, for a read that fails, and for a value that
 * holds no stored text, and the rule that picks what the panel shows while a
 * load runs. The panel drawing the loaded text when its node is opened, its
 * Download when a text could not be read, a node opened again after a failed
 * read, and a host re-polling an equal value are pinned in a browser by the
 * `HostLoadsStoredPageTexts`, `StoredPageTextFails`,
 * `StoredPageTextReadsAgainOnReopen` and `RepolledPagesKeepTheirTexts` stories
 * in `GraphWithResultPanel.stories.tsx`.
 *
 * The value is pipeline 09's live `pages`, the `Page[]` its extract step
 * produced, located by digest as the graph locates it and described by the
 * `output_form` of the pipe that produced it. The run's pages arrived inline,
 * so each case hands over the same value with each page's text held as the
 * reference a runtime that stored it would hand back.
 */
import { describe, expect, it, vi } from "vitest";
import {
  buildResultField,
  getPipeIOContract,
  getPipeOutputForm,
  type LoadText,
  type RunField,
} from "@pipelex/mthds-form";
import { findStuffByDigest } from "@graph/stuffLookup";
import { parsePipeRef } from "@graph/pipeRefs";
import {
  loadNestedStoredTexts,
  shownNestedValue,
  type SettledNestedTexts,
} from "@graph/react/detail/nestedStoredTexts";
import { LIVE_CV_SCREENING } from "@graph/react/viewer/__stories__/pipelines/specs/_generated/live/pipeline_09";
import {
  CONTRACTS_CV_SCREENING,
  OUTPUT_FORM_CV_SCREENING,
} from "@form/react/__stories__/contracts/_generated/pipeline_09";

const PAGES_DIGEST = "UbyYf";
const PAGES = findStuffByDigest(LIVE_CV_SCREENING, PAGES_DIGEST);

interface PageData {
  text_and_images: { text: Record<string, unknown> | null; images: unknown[] };
}

function pageUrl(index: number): string {
  return `pipelex-storage://run/generated/pages/${index}/value.txt`;
}

/** The `pages` field, built from the producing pipe's descriptors as the panel builds it. */
function pagesField(): RunField {
  const parsed = parsePipeRef(PAGES?.producerPipeRef ?? "");
  if (!parsed?.domainPath) throw new Error("pipeline 09's live run has no produced pages");
  const descriptor = getPipeOutputForm(
    OUTPUT_FORM_CV_SCREENING,
    parsed.domainPath,
    parsed.pipeCode,
  );
  const contract = getPipeIOContract(CONTRACTS_CV_SCREENING, parsed.domainPath, parsed.pipeCode);
  if (!descriptor || !contract) throw new Error("pipeline 09's pages have no descriptor");
  return buildResultField(descriptor, contract.output.json_schema);
}

/** The pages as the run produced them, each page's text inline. */
function inlinePages(): { items: PageData[] } {
  if (!PAGES) throw new Error("pipeline 09's live run has no pages");
  return PAGES.item.data as { items: PageData[] };
}

/** Each page's whole text, by the address the stored copy below holds it at. */
function pageTexts(): Map<string, string> {
  return new Map(
    inlinePages().items.map((page, index) => [
      pageUrl(index),
      (page.text_and_images.text as { text: string }).text,
    ]),
  );
}

/** The same pages with each page's text held as the reference a runtime that stored it hands back. */
function storedPages(): { items: PageData[] } {
  return {
    items: inlinePages().items.map((page, index) => {
      const text = (page.text_and_images.text as { text: string }).text;
      return {
        ...page,
        text_and_images: {
          ...page.text_and_images,
          text: {
            url: pageUrl(index),
            size: new TextEncoder().encode(text).length,
            mime_type: "text/plain",
            preview: text.slice(0, 10),
          },
        },
      };
    }),
  };
}

describe("loadNestedStoredTexts", () => {
  it("loads the whole text of each page whose text the runtime stored", async () => {
    const texts = pageTexts();
    const load = vi.fn<LoadText>((url) => Promise.resolve(texts.get(url) ?? ""));
    const stored = storedPages();

    const loaded = await loadNestedStoredTexts(pagesField(), stored, load);

    expect(loaded).not.toBeNull();
    expect(loaded?.unloaded).toBe(0);
    const pages = (loaded?.value as { items: PageData[] }).items;
    expect(pages).toHaveLength(stored.items.length);
    pages.forEach((page, index) => {
      expect(page.text_and_images.text).toEqual({ text: texts.get(pageUrl(index)) });
    });
    expect(load).toHaveBeenCalledWith(pageUrl(0));
    // The value it was handed is left as it was.
    expect(stored.items[0]?.text_and_images.text).toHaveProperty("url", pageUrl(0));
  });

  it("keeps the references, and counts them, when a read fails", async () => {
    const load = vi.fn<LoadText>(() => Promise.reject(new Error("refused")));
    const stored = storedPages();

    const loaded = await loadNestedStoredTexts(pagesField(), stored, load);

    expect(loaded?.unloaded).toBe(stored.items.length);
    // Nothing was loaded, so the value is the same one: no reference is turned into a text.
    expect(loaded?.value).toBe(stored);
  });

  it("reads nothing, and answers null, for a value that holds no stored text", async () => {
    const load = vi.fn<LoadText>(() => Promise.resolve("never"));

    const loaded = await loadNestedStoredTexts(pagesField(), inlinePages(), load);

    expect(loaded).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("reads nothing for an absent value", async () => {
    const load = vi.fn<LoadText>(() => Promise.resolve("never"));
    await expect(loadNestedStoredTexts(pagesField(), null, load)).resolves.toBeNull();
    await expect(loadNestedStoredTexts(pagesField(), undefined, load)).resolves.toBeNull();
    expect(load).not.toHaveBeenCalled();
  });
});

describe("shownNestedValue", () => {
  const NODE = "stuff_pages";
  const OTHER_NODE = "stuff_other";

  /** The pages of `NODE` once their texts were read. */
  function settledPages(): { stored: { items: PageData[] }; settled: SettledNestedTexts } {
    const stored = storedPages();
    return { stored, settled: { key: NODE, value: stored, shown: inlinePages() } };
  }

  it("shows the value as it came before any load settled", () => {
    const stored = storedPages();
    expect(shownNestedValue(null, NODE, stored)).toBe(stored);
  });

  it("shows the loaded value for the value it was loaded from", () => {
    const { stored, settled } = settledPages();
    expect(shownNestedValue(settled, NODE, stored)).toBe(settled.shown);
  });

  it("keeps the loaded value while an equal value re-created by a poll is read again", () => {
    const { stored, settled } = settledPages();
    const repolled = structuredClone(stored);
    expect(repolled).not.toBe(stored);
    expect(shownNestedValue(settled, NODE, repolled)).toBe(settled.shown);
  });

  it("never shows one node's loaded value on another node", () => {
    const { stored, settled } = settledPages();
    expect(shownNestedValue(settled, OTHER_NODE, stored)).toBe(stored);
    const repolled = structuredClone(stored);
    expect(shownNestedValue(settled, OTHER_NODE, repolled)).toBe(repolled);
  });
});
