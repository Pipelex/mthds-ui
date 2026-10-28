/**
 * Visual regression for the run timeline's simple style: the key states of
 * `SimpleProgress.stories.tsx`, rendered as Storybook renders them (its
 * project annotations, so its stylesheets), compared with committed reference
 * images. Run by `make test-screenshots`, outside `make test` — see
 * `vitest.screenshots.config.mts` for why.
 */
import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import previewAnnotations from "../../../../.storybook/preview";
import * as stories from "./SimpleProgress.stories";

setProjectAnnotations([previewAnnotations]);
const { WorkedExample, WideBatchFailed, WaitingToStart, NoRegistry } = composeStories(stories);

let root: Root | null = null;
let container: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

/** Render a story into a box of the stories' width and wait until its checklist is drawn. */
async function renderStory(story: React.ReactElement, lines: number): Promise<HTMLElement> {
  container = document.createElement("div");
  container.style.cssText = "width: 760px; padding: 0; background: #ffffff;";
  document.body.style.margin = "0";
  document.body.appendChild(container);
  const target = container;
  act(() => {
    root = createRoot(target);
    root.render(story);
  });
  await expect
    .poll(() => target.querySelectorAll(".mthds-simple-progress-line").length, { timeout: 15000 })
    .toBeGreaterThanOrEqual(lines);
  return target;
}

/** Open a line by its toggle's accessible name, and wait until its children are drawn. */
async function open(target: HTMLElement, name: string, lines: number): Promise<void> {
  const toggle = target.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
  if (!toggle) throw new Error(`no toggle named ${name}`);
  act(() => toggle.click());
  await expect
    .poll(() => target.querySelectorAll(".mthds-simple-progress-line").length)
    .toBeGreaterThanOrEqual(lines);
  // The opened toggle keeps no focus ring in the picture.
  toggle.blur();
}

describe("the simple style, as the stories draw it", () => {
  for (const theme of ["dark", "light"] as const) {
    it(`draws the worked example, ${theme}`, async () => {
      const target = await renderStory(<WorkedExample theme={theme} />, 4);
      await expect
        .element(page.elementLocator(target))
        .toMatchScreenshot(`worked-example-${theme}`);
    });

    it(`draws the failed wide batch collapsed and opened, ${theme}`, async () => {
      const target = await renderStory(<WideBatchFailed theme={theme} />, 3);
      await expect
        .element(page.elementLocator(target))
        .toMatchScreenshot(`wide-batch-failed-${theme}`);
      await open(target, "Show the steps of Summarize a filing", 5);
      await expect
        .element(page.elementLocator(target))
        .toMatchScreenshot(`wide-batch-failed-opened-${theme}`);
    });

    it(`draws a run waiting to start, ${theme}`, async () => {
      const target = await renderStory(<WaitingToStart theme={theme} />, 4);
      await expect.element(page.elementLocator(target)).toMatchScreenshot(`waiting-${theme}`);
    });

    it(`draws the worked example without a registry, ${theme}`, async () => {
      const target = await renderStory(<NoRegistry theme={theme} />, 3);
      await expect.element(page.elementLocator(target)).toMatchScreenshot(`no-registry-${theme}`);
    });
  }
});
