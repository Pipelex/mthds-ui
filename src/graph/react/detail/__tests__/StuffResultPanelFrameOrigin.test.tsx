/**
 * Which documents the graph's data panel previews in a frame.
 *
 * Since kernel 0.39.0 the result view frames a document only when the host's
 * `resolveUrl` answered it on the page's own origin. A URL the payload names, a
 * third party's `https:` PDF included, and a resolver's answer on another origin
 * are shown as the document's link, with no Preview. The graph's panel frames
 * nothing itself: it hands `resolveUrl` to the kernel's provider, so the rule is
 * the kernel's. These assertions notice a panel that stops threading the
 * resolver (the host's own documents would lose their preview) and a kernel
 * that frames a third party's page again (a method's document would be drawn
 * inside the host's page).
 *
 * The document is pipeline 09's live `cv` input, which the run read from a
 * public bucket: a third party's PDF, exactly the case the rule is about. It is
 * located by digest as the graph locates it and described by the input form of
 * the pipe that reads it. A server render has no page origin, so only a
 * root-relative answer can be framed here; the kernel's own suite covers an
 * absolute same-origin answer, framed once the browser says the origin.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ResolveUrl } from "@pipelex/mthds-form/react";
import { findStuffByDigest } from "@graph/stuffLookup";
import { StuffResultPanel } from "@graph/react/detail/StuffResultPanel";
import { LIVE_CV_SCREENING } from "@graph/react/viewer/__stories__/pipelines/specs/_generated/live/pipeline_09";
import {
  CONTRACTS_CV_SCREENING,
  INPUT_FORM_CV_SCREENING,
  OUTPUT_FORM_CV_SCREENING,
} from "@form/react/__stories__/contracts/_generated/pipeline_09";

const CV_DIGEST = "AyZkr";
const HOST_PATH = "/api/assets/John-Doe-CV.pdf";
const CDN_URL = "https://cdn.example/John-Doe-CV.pdf";

/**
 * The kernel's Preview toggle, open or folded. A preview starts open since kernel
 * 0.39.1, so the server renders it expanded; matching either state keeps the
 * cases that expect no toggle at all from passing against an open one.
 */
const PREVIEW_TOGGLE = "aria-expanded=";

const CV = findStuffByDigest(LIVE_CV_SCREENING, CV_DIGEST);

function cvUrl(): string {
  const url = (CV?.item.data as { url?: unknown } | undefined)?.url;
  if (typeof url !== "string") throw new Error("pipeline 09's live run has no cv document");
  return url;
}

function panel(resolveUrl?: ResolveUrl): string {
  if (!CV?.consumer) throw new Error("pipeline 09's live run has no cv input read by a pipe");
  return renderToStaticMarkup(
    <StuffResultPanel
      pipeIoContracts={CONTRACTS_CV_SCREENING}
      outputForm={OUTPUT_FORM_CV_SCREENING}
      inputForm={INPUT_FORM_CV_SCREENING}
      stuff={CV.item}
      consumer={CV.consumer}
      {...(resolveUrl ? { resolveUrl } : {})}
    />,
  );
}

describe("StuffResultPanel's document frame", () => {
  it("has a third party's PDF to draw: the live run's CV, on an https URL", () => {
    expect(cvUrl()).toMatch(/^https:\/\//);
  });

  it("links a third party's PDF the payload names, and offers no preview", () => {
    const html = panel();
    expect(html).toContain(`href="${cvUrl()}"`);
    expect(html).not.toContain(PREVIEW_TOGGLE);
  });

  it("links a document the host's resolver answers on another origin", () => {
    const html = panel(() => CDN_URL);
    expect(html).toContain(`href="${CDN_URL}"`);
    expect(html).not.toContain(PREVIEW_TOGGLE);
  });

  it("links a document a pass-through resolver hands back unchanged", () => {
    const html = panel((url) => url);
    expect(html).not.toContain(PREVIEW_TOGGLE);
  });

  it("previews a document the host's resolver serves on the page's own origin", () => {
    const html = panel(() => HOST_PATH);
    expect(html).toContain(`href="${HOST_PATH}"`);
    expect(html).toContain(PREVIEW_TOGGLE);
  });
});
