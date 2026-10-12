import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { GraphViewer } from "../GraphViewer";
import { STILL_PLACEHOLDER_HEIGHT_PX } from "../stillViewport";
import { waitForGraphRender } from "./storyTestUtils";
import { reviewSpec } from "./styleReviewFixtures";

/**
 * The still presentation (`interactive={false}`): a method's flowchart laid in
 * a page like a picture, between two paragraphs, in a column with no height of
 * its own. The container takes the height the drawing needs, shows the page's
 * surface through it, and draws no background, toolbar or detail panel.
 */
const meta: Meta<typeof GraphViewer> = {
  title: "Misc/StillPresentation",
  component: GraphViewer,
  decorators: [
    // The page draws its own surface, a chat host's, so the story shows the
    // drawing over it whatever Storybook's background is.
    (Story, { args }) => {
      const dark = args.theme === "dark";
      return (
        <div
          style={{
            maxWidth: 760,
            padding: 16,
            background: dark ? "#212121" : "#ffffff",
            fontFamily: "sans-serif",
            fontSize: 14,
            color: dark ? "#e5e7eb" : "#111827",
          }}
        >
          <p>The method, at a glance:</p>
          <Story />
          <p>Explore it to switch to the detailed style, zoom and open each step.</p>
        </div>
      );
    },
  ],
  args: {
    interactive: false,
    graphStyle: "simple",
    initialDirection: "LR",
    theme: "light",
  },
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

/** The zoom `StillFit` set on the flow's viewport, read off its transform. */
function viewportZoom(container: HTMLElement): number {
  const transform =
    container.querySelector<HTMLElement>(".react-flow__viewport")?.style.transform ?? "";
  const match = /scale\(([\d.]+)\)/.exec(transform);
  return match ? Number.parseFloat(match[1]) : Number.NaN;
}

/**
 * Assert the still presentation: its furniture absent, the drawing fitted (the
 * container has left its placeholder height, at a zoom never above 1), and the
 * whole drawing inert, so no button inside a node takes the focus or a click.
 * Returns the container and the zoom for a story's own assertions.
 */
async function expectStill(
  canvasElement: HTMLElement,
): Promise<{ container: HTMLElement; zoom: number }> {
  await waitForGraphRender(canvasElement);
  const container = canvasElement.querySelector<HTMLElement>(".react-flow-container--still");
  if (!container) throw new Error("no still container");
  await expect(canvasElement.querySelector(".react-flow__background")).toBeNull();
  await expect(canvasElement.querySelector(".graph-toolbar-panel")).toBeNull();
  await expect(canvasElement.querySelector(".detail-panel")).toBeNull();
  await waitFor(() => expect(container.style.height).not.toBe(`${STILL_PLACEHOLDER_HEIGHT_PX}px`));
  const zoom = viewportZoom(container);
  await expect(zoom).toBeGreaterThan(0);
  await expect(zoom).toBeLessThanOrEqual(1);
  for (const button of Array.from(container.querySelectorAll<HTMLButtonElement>("button"))) {
    button.focus();
    await expect(document.activeElement).not.toBe(button);
    const box = button.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    await expect(container.contains(hit)).toBe(false);
  }
  await expect(container.inert).toBe(true);
  return { container, zoom };
}

/** Every controller folded, as a host showing a method before anyone explores it. */
export const Folded: Story = {
  args: { graph: { graphSpec: reviewSpec("CV_SCREENING", "static") }, initialFoldMode: "folded" },
  play: async ({ canvasElement }) => {
    const { container } = await expectStill(canvasElement);
    // The folded step's "N steps inside" is drawn, and inert like the rest.
    await expect(container.querySelector(".simple-step-open")).not.toBeNull();
  },
};

/** The simple style's own folds: decisions and their outcomes drawn out. */
export const Unfolded: Story = {
  args: { graph: { graphSpec: reviewSpec("EMAIL_TRIAGE", "static") } },
  play: async ({ canvasElement }) => {
    await expectStill(canvasElement);
  },
};

/** A drawing wider than the column, scaled down to fit it. */
export const ScaledDown: Story = {
  args: { graph: { graphSpec: reviewSpec("CV_SCREENING", "static") } },
  play: async ({ canvasElement }) => {
    const { zoom } = await expectStill(canvasElement);
    await expect(zoom).toBeLessThan(1);
  },
};

/** On a dark page, the page's own surface through the drawing. */
export const Dark: Story = {
  args: {
    graph: { graphSpec: reviewSpec("CV_SCREENING", "static") },
    initialFoldMode: "folded",
    theme: "dark",
  },
  play: async ({ canvasElement }) => {
    await expectStill(canvasElement);
  },
};
