/**
 * The failing pipe's ring has to hold in every state its node is drawn in.
 *
 * It is a box-shadow, and a box-shadow is one property: any rule that sets a
 * card's shadow for a state of its own, and outranks the ring's rule, drops the
 * ring without a trace. `.pipe-card:hover` did exactly that, so the ring went
 * away under the pointer and came back only once the card was selected. A
 * controller's group had the opposite fault: its ring hid the selection ring
 * ReactFlow's wrapper draws in the same band beneath it. Both failures are
 * silent and live in the cascade, so they are asserted where the cascade runs:
 * the real stylesheet, the components' real markup and a real pointer, in the
 * Chromium the story tests use. A synthetic `mouseover`, which is all a play
 * function can dispatch, never sets `:hover`.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium, type Browser, type Page } from "playwright";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PipeCardNode } from "@graph/react/nodes/pipe/PipeCardNode";
import type { PipeCardData } from "@graph/react/nodes/pipe/pipeCardTypes";
import { ControllerGroupNode } from "@graph/react/nodes/controller/ControllerGroupNode";

const requireFromHere = createRequire(import.meta.url);

/** `graph-core.css` as a bundler serves it, each `@import`ed sheet inlined in place. */
const STYLESHEET = readFileSync(new URL("../graph-core.css", import.meta.url), "utf8").replace(
  /@import\s+"([^"]+)";/g,
  (_statement, specifier: string) => readFileSync(requireFromHere.resolve(specifier), "utf8"),
);

const CARD: PipeCardData = {
  pipeCode: "score_match",
  pipeType: "PipeFunc",
  description: "Score the CV against the job offer",
  status: "failed",
  inputs: [{ name: "cv_text", concept: "Text" }],
  outputs: [],
  graphMode: "live",
};

const PLAIN_CARD = "#plain .pipe-card";
const FAILING_CARD = "#failing .pipe-card";
const FAILING_CONTROLLER = "#controller .controller-group-node";

/** A node as ReactFlow wraps it: its type's class on a wrapper sized by the layout. */
function rfNode(id: string, type: string, box: string, element: React.ReactElement): string {
  return (
    `<div id="${id}" class="react-flow__node react-flow__node-${type} selectable" ` +
    `style="position: absolute; ${box}">${renderToStaticMarkup(element)}</div>`
  );
}

const NODES = [
  rfNode(
    "plain",
    "pipeCard",
    "left: 20px; top: 20px; width: 220px; height: 120px",
    React.createElement(PipeCardNode, { data: { ...CARD, status: "succeeded" } }),
  ),
  rfNode(
    "failing",
    "pipeCard",
    "left: 300px; top: 20px; width: 220px; height: 120px",
    React.createElement(PipeCardNode, { data: { ...CARD, failingPipe: true } }),
  ),
  rfNode(
    "controller",
    "controllerGroup",
    "left: 20px; top: 200px; width: 320px; height: 200px",
    React.createElement(ControllerGroupNode, {
      data: { pipeType: "PipeCondition", label: "route_candidate", failingPipe: true },
    }),
  ),
].join("\n");

const PAGE = `<!doctype html>
<html>
  <head>
    <style>${STYLESHEET}</style>
    <!-- A shadow read mid-transition is neither state's: settle each change at once. -->
    <style>*, *::before, *::after { transition: none !important; }</style>
  </head>
  <body style="margin: 0">
    <div class="react-flow-container">
      ${NODES}
    </div>
  </body>
</html>`;

/** A point on the canvas no node covers. */
const AWAY = { x: 780, y: 580 };

/** The ring alone, as it rings a card or a controller's group that is not selected. */
const ERROR_RING = "0 0 0 2px var(--color-error)";

let browser: Browser;
let page: Page;

async function shadowOf(selector: string): Promise<string> {
  return page.$eval(selector, (element) => getComputedStyle(element).boxShadow);
}

/** A box-shadow value as the browser computes it under the graph's tokens. */
async function resolved(value: string): Promise<string> {
  return page.evaluate((shadow) => {
    const probe = document.createElement("div");
    probe.style.boxShadow = shadow;
    document.querySelector(".react-flow-container")!.appendChild(probe);
    const computed = getComputedStyle(probe).boxShadow;
    probe.remove();
    return computed;
  }, value);
}

async function select(nodeId: string): Promise<void> {
  await page.$eval(`#${nodeId}`, (element) => element.classList.add("selected"));
}

beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.setContent(PAGE);
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

beforeEach(async () => {
  await page.mouse.move(AWAY.x, AWAY.y);
  await page.$$eval(".react-flow__node", (nodes) =>
    nodes.forEach((node) => node.classList.remove("selected")),
  );
});

describe("the failing pipe's ring, in the browser", () => {
  it("rings the failing card at rest, over the shadow every card wears", async () => {
    expect(await shadowOf(FAILING_CARD)).toBe(await resolved(`${ERROR_RING}, var(--shadow-sm)`));
  });

  it("keeps the ring under the pointer, composed with the hover shadow a card takes", async () => {
    await page.hover(PLAIN_CARD);
    const hoverShadow = await shadowOf(PLAIN_CARD);
    expect(hoverShadow).toBe(await resolved("var(--shadow-md)"));

    await page.hover(FAILING_CARD);
    expect(await shadowOf(FAILING_CARD)).toBe(`${await resolved(ERROR_RING)}, ${hoverShadow}`);
  });

  it("keeps the card's ring outside the selection ring, under the pointer or not", async () => {
    const selected = await resolved(
      "0 0 0 2px var(--color-accent), 0 0 0 4px var(--color-error), var(--shadow-md)",
    );
    await select("failing");
    expect(await shadowOf(FAILING_CARD)).toBe(selected);
    await page.hover(FAILING_CARD);
    expect(await shadowOf(FAILING_CARD)).toBe(selected);
  });

  it("keeps a failing controller's ring under the pointer", async () => {
    const ring = await resolved(ERROR_RING);
    expect(await shadowOf(FAILING_CONTROLLER)).toBe(ring);
    await page.hover(FAILING_CONTROLLER);
    expect(await shadowOf(FAILING_CONTROLLER)).toBe(ring);
  });

  it("shows both rings on a selected failing controller, its own outside the selection ring", async () => {
    // The wrapper's selection ring sits in the band the group's ring covers, so
    // the group draws the same accent ring itself, with its own ring outside.
    const selectionRing = await resolved("0 0 0 2px var(--color-accent)");
    const bothRings = await resolved("0 0 0 2px var(--color-accent), 0 0 0 4px var(--color-error)");
    await select("controller");
    expect(await shadowOf("#controller")).toContain(selectionRing);
    expect(await shadowOf(FAILING_CONTROLLER)).toBe(bothRings);
    await page.hover(FAILING_CONTROLLER);
    expect(await shadowOf(FAILING_CONTROLLER)).toBe(bothRings);
  });
});
