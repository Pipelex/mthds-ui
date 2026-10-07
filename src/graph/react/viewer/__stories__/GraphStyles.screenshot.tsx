/**
 * Visual regression for the simple style: every story of the review set
 * (`GraphStyles.stories.tsx`), drawn in the simple style as Storybook draws it,
 * compared with a committed reference image. The references were each read
 * before they were committed (the review loop in `docs/graph-styles.md`). Run
 * by `make test-screenshots`, outside `make test` — see
 * `vitest.screenshots.config.mts` for why.
 */
import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import previewAnnotations from "../../../../../.storybook/preview";
import * as stories from "./GraphStyles.stories";

setProjectAnnotations([previewAnnotations]);
const composed = composeStories(stories);

let root: Root | null = null;
let container: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

/** Render a composed story and wait until its simple drawing has settled at fit view. */
async function renderStory(Story: () => React.ReactElement): Promise<HTMLElement> {
  container = document.createElement("div");
  container.style.cssText = "width: 1280px; height: 800px; position: relative;";
  document.body.style.margin = "0";
  document.body.appendChild(container);
  const target = container;
  act(() => {
    root = createRoot(target);
    root.render(<Story />);
  });
  await expect
    .poll(() => target.querySelectorAll(".react-flow__node-simpleStep").length, {
      timeout: 15000,
    })
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
  return target;
}

/** `CvScreeningLive` → `cv-screening-live`. */
function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

describe("the simple style, over the review set", () => {
  for (const [name, Story] of Object.entries(composed)) {
    it(`draws ${name}`, async () => {
      const target = await renderStory(Story);
      await expect.element(page.elementLocator(target)).toMatchScreenshot(`simple-${kebab(name)}`);
    });
  }
});
