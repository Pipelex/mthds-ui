/**
 * A "for each" frame's title is cut with an ellipsis when the batch's activity
 * outruns the frame, and its `title` attribute is where the whole of it shows.
 * A tooltip shows only for the element the pointer is over, so the title must
 * be the element hit there, not the frame behind a header that lets the
 * pointer through. That lives in the cascade, so it is asserted where the
 * cascade runs: the real stylesheets, the component's real markup and a hit
 * test in Chromium.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium, type Browser, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { GraphNodeData } from "@graph/types";
import { SimpleFrameNode } from "@graph/react/styles/simple/SimpleNodes";

const requireFromHere = createRequire(import.meta.url);

/** `graph-core.css` as a bundler serves it, each `@import`ed sheet inlined in place. */
const CORE = readFileSync(new URL("../graph-core.css", import.meta.url), "utf8").replace(
  /@import\s+"([^"]+)";/g,
  (_statement, specifier: string) => readFileSync(requireFromHere.resolve(specifier), "utf8"),
);
const SIMPLE = readFileSync(new URL("../styles/simple/SimpleStyle.css", import.meta.url), "utf8");

const TITLE = "Checking every clause of the agreement against the company playbook, one by one";

const FRAME = renderToStaticMarkup(
  React.createElement(SimpleFrameNode, {
    data: {
      simple: { kind: "frame", title: TITLE, status: "succeeded", graphMode: "live" },
    } as unknown as GraphNodeData,
  }),
);

const PAGE = `<!doctype html>
<html>
  <head><style>${CORE}</style><style>${SIMPLE}</style></head>
  <body style="margin: 0">
    <div class="react-flow-container">
      <div id="frame" class="react-flow__node react-flow__node-simpleFrame selectable"
        style="position: absolute; left: 20px; top: 20px; width: 220px; height: 160px">${FRAME}</div>
    </div>
  </body>
</html>`;

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.setContent(PAGE);
}, 60_000);

afterAll(async () => {
  await browser?.close();
}, 60_000);

describe("a for-each frame's cut title", () => {
  it("is the element under the pointer, so its tooltip shows the whole title", async () => {
    const hit = await page.$eval(".simple-frame-title-text", (text) => {
      const box = text.getBoundingClientRect();
      const under = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return under?.closest("[title]")?.getAttribute("title") ?? null;
    });
    expect(hit).toBe(TITLE);
  });

  it("still belongs to the frame's node, so a press on it selects and drags the frame", async () => {
    const node = await page.$eval(".simple-frame-title-text", (text) => {
      const box = text.getBoundingClientRect();
      const under = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return under?.closest(".react-flow__node")?.id ?? null;
    });
    expect(node).toBe("frame");
  });
});
