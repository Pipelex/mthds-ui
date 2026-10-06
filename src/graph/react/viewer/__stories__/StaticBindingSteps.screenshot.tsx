/**
 * Visual regression for the binding node: each story of
 * `StaticBindingSteps.stories.tsx`, rendered as Storybook renders it (its
 * project annotations, so its stylesheets), compared with a committed
 * reference image. Run by `make test-screenshots`, outside `make test` — see
 * `vitest.screenshots.config.mts` for why.
 */
import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import previewAnnotations from "../../../../../.storybook/preview";
import * as stories from "./StaticBindingSteps.stories";

setProjectAnnotations([previewAnnotations]);
const { CatalogReview, DottedBatchOver } = composeStories(stories);

let root: Root | null = null;
let container: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

/** Render a composed story into a viewport-sized box and wait until it draws `bindings` binding cards. */
async function renderStory(
  Story: () => React.ReactElement,
  bindings: number,
): Promise<HTMLElement> {
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
    .poll(() => target.querySelectorAll(".pipe-card--binding").length, { timeout: 15000 })
    .toBe(bindings);
  return target;
}

describe("binding steps, as the static graph draws them", () => {
  it("draws the catalog review composite", async () => {
    const target = await renderStory(CatalogReview, 4);
    await expect.element(page.elementLocator(target)).toMatchScreenshot("catalog-review");
  });

  it("draws a dotted batch_over as a binding then the batch", async () => {
    const target = await renderStory(DottedBatchOver, 1);
    await expect.element(page.elementLocator(target)).toMatchScreenshot("dotted-batch-over");
  });
});
