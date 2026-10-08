/// <reference types="@vitest/browser-playwright" />
/**
 * The graph styles' review capture: every fixture of the review set, drawn in
 * each style at 1280 by 800, saved as a picture with its measurements beside
 * it. Pictures for reading, not references — nothing is compared. Run by
 * `make style-review ITERATION=<n>` (see `vitest.style-review.config.mts`); the
 * contact sheet (`scripts/style-contact-sheet.mjs`) lays a capture out for
 * review, detailed beside simple.
 */
import "../../graph-core.css";
import "../../detail/DetailPanel.css";
import "../GraphToolbar.css";
import "../../styles/simple/SimpleStyle.css";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { userEvent } from "vitest/browser";
import { afterEach, describe, expect, it } from "vitest";
import { commands, page } from "vitest/browser";

import type { GraphSpecMode, GraphStyleId, ToolbarPosition, ValidationIssue } from "@graph/types";
import { makePipeRef } from "@graph/pipeRefs";
import { TOOLBAR_POSITION } from "@graph/types";
import { identifierTokens } from "@graph/styles/styleMetrics";
import { buildStaticGraphSpecFromToml } from "@static-graph/buildStaticGraphSpec";
import { staticDiagnosticsToValidationIssues } from "@static-graph/validationIssues";
import { GraphViewer } from "../GraphViewer";
import { StyleReview } from "./StyleReview";
// Asset path, not a module import — the `@graph/*` alias rule does not apply.
import bundleGarments from "../../../../../data/static/garments_from_moodboard/bundle_with_error.mthds?raw";
import {
  REALISTIC_FIXTURES,
  REVIEW_FIXTURES,
  REVIEW_FIXTURE_IDS,
  REVIEW_SUBSET,
  type ReviewFixtureId,
} from "./styleReviewFixtures";

declare const __STYLE_REVIEW_DIR__: string;
declare const __STYLE_REVIEW_STYLES__: string;
declare const __STYLE_REVIEW_ONLY__: string;

interface Capture {
  fixture: ReviewFixtureId;
  graphStyle: GraphStyleId;
  mode: GraphSpecMode;
  direction: "LR" | "TB";
  theme: "light" | "dark";
}

/** Every fixture static, left to right, light; the subset also top to bottom, dark and live. */
function captures(): Capture[] {
  const styles = __STYLE_REVIEW_STYLES__.split(",").map((s) => s.trim()) as GraphStyleId[];
  const only = __STYLE_REVIEW_ONLY__ ? new Set(__STYLE_REVIEW_ONLY__.split(",")) : null;
  const out: Capture[] = [];
  for (const graphStyle of styles) {
    for (const fixture of REVIEW_FIXTURE_IDS) {
      if (only && !only.has(fixture)) continue;
      const base: Capture = {
        fixture,
        graphStyle,
        mode: "static",
        direction: "LR",
        theme: "light",
      };
      out.push(base);
      if (REVIEW_SUBSET.includes(fixture)) {
        out.push({ ...base, direction: "TB" });
        out.push({ ...base, theme: "dark" });
        out.push({ ...base, mode: "live" });
      }
    }
  }
  return out;
}

function captureName(c: Capture): string {
  return `${c.fixture}-${c.mode}-${c.direction}-${c.theme}`;
}

let root: Root | null = null;
let container: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

/** The viewport's zoom, read from ReactFlow's transform. */
function viewportZoom(target: HTMLElement): number {
  const viewport = target.querySelector<HTMLElement>(".react-flow__viewport");
  const match = viewport?.style.transform.match(/scale\(([\d.]+)\)/);
  return match ? parseFloat(match[1]) : NaN;
}

/** Wait until the graph has drawn and the fit view has settled. */
async function settle(target: HTMLElement): Promise<void> {
  await expect
    .poll(() => target.querySelectorAll(".react-flow__node").length, { timeout: 20000 })
    .toBeGreaterThan(0);
  let previous = "";
  await expect
    .poll(
      () => {
        const current = target.querySelector<HTMLElement>(".react-flow__viewport")?.style.transform;
        const stable = current !== undefined && current === previous;
        previous = current ?? "";
        return stable;
      },
      { timeout: 10000, interval: 250 },
    )
    .toBe(true);
}

function overlapCount(target: HTMLElement): number {
  const rects = Array.from(
    target.querySelectorAll<HTMLElement>(
      ".react-flow__node:not(.react-flow__node-simpleFrame):not(.react-flow__node-controllerGroup)",
    ),
  ).map((el) => el.getBoundingClientRect());
  let overlaps = 0;
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 2 && h > 2) overlaps++;
    }
  }
  return overlaps;
}

/**
 * The texts of the simple style drawn shorter than they are: cut by a line
 * clamp (a description too long even for the smallest title size, which keeps
 * its tooltip) or by a box the layout sized too small (a metrics bug).
 */
function clippedTexts(target: HTMLElement): { text: string; shown: number; needed: number }[] {
  return Array.from(
    target.querySelectorAll<HTMLElement>(
      ".simple-step-title, .simple-terminal-title, .simple-decision-text",
    ),
  )
    .filter((el) => el.scrollHeight > el.clientHeight + 1)
    .map((el) => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      return {
        text: el.textContent ?? "",
        shown: Math.round(el.clientHeight / lineHeight),
        needed: Math.round(el.scrollHeight / lineHeight),
      };
    });
}

/** What the picture shows, measured from the DOM: the rubric's numbers for this capture. */
function measure(target: HTMLElement, c: Capture) {
  const zoom = viewportZoom(target);
  const titleSelector = c.graphStyle === "simple" ? ".simple-step-title" : ".pipe-card-code";
  // A long title is set smaller than the others, so report the full size and the smallest.
  const titleSizes = Array.from(target.querySelectorAll<HTMLElement>(titleSelector)).map((el) =>
    parseFloat(getComputedStyle(el).fontSize),
  );
  const titleFontPx = titleSizes.length > 0 ? Math.max(...titleSizes) : NaN;
  const smallestTitleFontPx = titleSizes.length > 0 ? Math.min(...titleSizes) : NaN;
  const texts = Array.from(
    target.querySelectorAll<HTMLElement>(".react-flow__node, .react-flow__edge-text"),
  )
    .flatMap((el) =>
      Array.from(el.querySelectorAll<HTMLElement>("span, div, text, button")).filter(
        (child) => child.children.length === 0,
      ),
    )
    .map((el) => el.textContent?.trim() ?? "")
    .filter((t) => t.length > 0);
  const identifierTexts = [...new Set(texts)]
    .map((text) => ({ text, tokens: identifierTokens(text) }))
    .filter((t) => t.tokens.length > 0);
  const classCount = (selector: string) => target.querySelectorAll(selector).length;
  return {
    ...c,
    zoom,
    titleFontPx,
    effectiveTitlePx: Math.round(titleFontPx * zoom * 10) / 10,
    smallestTitleFontPx,
    effectiveSmallestTitlePx: Math.round(smallestTitleFontPx * zoom * 10) / 10,
    nodes: classCount(".react-flow__node"),
    steps: classCount(".react-flow__node-simpleStep") + classCount(".react-flow__node-pipeCard"),
    data: classCount(".react-flow__node-simpleTerminal") + classCount(".react-flow__node-default"),
    decisions: classCount(".react-flow__node-simpleDecision"),
    frames:
      classCount(".react-flow__node-simpleFrame") + classCount(".react-flow__node-controllerGroup"),
    edges: classCount(".react-flow__edge"),
    overlaps: overlapCount(target),
    clippedTexts: clippedTexts(target),
    identifierTexts,
  };
}

describe("graph styles review capture", () => {
  // What the contact sheet lays out: the review set in order, with each fixture's group.
  it("writes the review set's manifest", async () => {
    const fixtures = REVIEW_FIXTURE_IDS.map((id) => ({
      id,
      label: REVIEW_FIXTURES[id].label,
      group: REVIEW_FIXTURES[id].group,
    }));
    await commands.writeFile(
      `${__STYLE_REVIEW_DIR__}/manifest.json`,
      JSON.stringify({ fixtures, realistic: REALISTIC_FIXTURES }, null, 2),
    );
  });

  for (const c of captures()) {
    it(`${c.graphStyle} ${captureName(c)}`, async () => {
      container = document.createElement("div");
      container.style.cssText = "width: 1280px; height: 800px; position: relative;";
      document.body.style.margin = "0";
      document.body.appendChild(container);
      const target = container;
      act(() => {
        root = createRoot(target);
        root.render(<StyleReview {...c} />);
      });
      await settle(target);
      const base = `${__STYLE_REVIEW_DIR__}/${c.graphStyle}/${captureName(c)}`;
      await page.screenshot({ element: target, path: `${base}.jpg`, type: "jpeg", quality: 82 });
      await commands.writeFile(`${base}.json`, JSON.stringify(measure(target, c), null, 2));
    });
  }
});

/**
 * The simple style's interactive states, which a capture of the drawing alone
 * cannot show: the style menu open at each kind of toolbar anchor (scored for
 * V3 and V4), and a step's detail panel (design decision 10).
 */
describe("graph styles review capture: interactions", () => {
  const styles = __STYLE_REVIEW_STYLES__.split(",").map((s) => s.trim());
  if (!styles.includes("simple")) return;

  async function render(toolbarPosition?: ToolbarPosition): Promise<HTMLElement> {
    container = document.createElement("div");
    container.style.cssText = "width: 1280px; height: 800px; position: relative;";
    document.body.style.margin = "0";
    document.body.appendChild(container);
    const target = container;
    act(() => {
      root = createRoot(target);
      root.render(
        <StyleReview
          fixture="CV_SCREENING"
          graphStyle="simple"
          mode="live"
          direction="LR"
          theme="light"
          toolbarPosition={toolbarPosition}
        />,
      );
    });
    await settle(target);
    return target;
  }

  const anchors: ToolbarPosition[] = [
    TOOLBAR_POSITION.TOP_RIGHT,
    TOOLBAR_POSITION.BOTTOM_LEFT,
    TOOLBAR_POSITION.CENTER_LEFT,
  ];
  for (const anchor of anchors) {
    it(`simple menu open at ${anchor}`, async () => {
      const target = await render(anchor);
      const button = target.querySelector<HTMLElement>('[aria-haspopup="menu"]');
      if (!button) throw new Error("no style menu button");
      await userEvent.click(button);
      await expect.poll(() => target.querySelector('[role="menu"]')).not.toBeNull();
      await page.screenshot({
        element: target,
        path: `${__STYLE_REVIEW_DIR__}/interactions/menu-${anchor}.jpg`,
        type: "jpeg",
        quality: 82,
      });
    });
  }

  it("simple validation rings and badges", async () => {
    const built = buildStaticGraphSpecFromToml(bundleGarments);
    const refOf = (code: string) => {
      const node = built.spec.nodes.find((n) => n.pipe_code === code);
      return node?.domain_code && node.pipe_code
        ? makePipeRef(node.domain_code, node.pipe_code)
        : undefined;
    };
    const issues: ValidationIssue[] = [
      ...staticDiagnosticsToValidationIssues(built.diagnostics),
      {
        severity: "error",
        message: 'Output concept "MoodboardAnalysis" does not match the declared output.',
        context: "pipe.analyze_moodboard",
        pipeRef: refOf("analyze_moodboard"),
        origin: "validator",
      },
      {
        severity: "warning",
        message: "The prompt names no output format.",
        context: "pipe.propose_designs",
        pipeRef: refOf("propose_designs"),
        origin: "validator",
      },
    ];
    container = document.createElement("div");
    container.style.cssText = "width: 1280px; height: 800px; position: relative;";
    document.body.style.margin = "0";
    document.body.appendChild(container);
    const target = container;
    act(() => {
      root = createRoot(target);
      root.render(
        <GraphViewer
          graph={{ graphSpec: built.spec }}
          graphStyle="simple"
          theme="light"
          validationState="invalid"
          validationIssues={issues}
        />,
      );
    });
    await settle(target);
    await page.screenshot({
      element: target,
      path: `${__STYLE_REVIEW_DIR__}/interactions/validation.jpg`,
      type: "jpeg",
      quality: 82,
    });
  });

  it("simple detail panel of a step", async () => {
    const target = await render();
    const step = target.querySelector<HTMLElement>(".react-flow__node-simpleStep");
    if (!step) throw new Error("no step");
    await userEvent.click(step);
    await expect
      .poll(() => target.querySelectorAll(".react-flow__node.selected").length)
      .toBeGreaterThan(0);
    await new Promise((resolve) => setTimeout(resolve, 400));
    await page.screenshot({
      element: target,
      path: `${__STYLE_REVIEW_DIR__}/interactions/detail-step.jpg`,
      type: "jpeg",
      quality: 82,
    });
  });
});
