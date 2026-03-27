import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, userEvent } from "storybook/test";
import { GraphViewer } from "@graph/react/viewer/GraphViewer";
import { MOCK_PIPES } from "./mockData";
import { toGraphSpec } from "./edgeCaseGraphSpecs";
import { manyInputs, everythingAtOnce, minimal } from "./edge-cases/edgeCaseData";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/PipeCard/Rendering Tests",
  component: GraphViewer,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

const D = { direction: "LR" as const, showControllers: false };

// ─── Badge text matches pipe type ──────────────────────────────────────────

export const BadgeLLM: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeLLM), ...D },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText("LLM");
    await expect(badge).toBeVisible();
    await expect(badge.classList.contains("pipe-card-badge")).toBe(true);
  },
};

export const BadgeExtract: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeExtract), ...D },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Extract")).toBeVisible();
  },
};

export const BadgeCompose: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeCompose), ...D },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Compose")).toBeVisible();
  },
};

export const BadgeFunc: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeFunc), ...D },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Func")).toBeVisible();
  },
};

export const BadgeSearch: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeSearch), ...D },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Search")).toBeVisible();
  },
};

export const BadgeImgGen: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeImgGen), ...D },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("ImgGen")).toBeVisible();
  },
};

// ─── Pipe code is displayed ────────────────────────────────────────────────

export const PipeCodeDisplayed: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeLLM), ...D },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("analyze_match")).toBeVisible();
  },
};

// ─── INPUTS / OUTPUT labels ────────────────────────────────────────────────

export const IOLabels: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeLLM), ...D },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Labels exist in the DOM (may be clipped by ReactFlow viewport)
    await expect(canvas.getByText("INPUTS")).toBeInTheDocument();
    await expect(canvas.getByText("OUTPUT")).toBeInTheDocument();
  },
};

// ─── Expand/collapse many inputs ───────────────────────────────────────────

export const ManyInputsExpandCollapse: Story = {
  args: { graphspec: toGraphSpec(manyInputs), ...D },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Should show "+N more" button (50 inputs, MAX_VISIBLE=4, so +46 more)
    const moreBtn = canvas.getByText("+46 more");
    await expect(moreBtn).toBeVisible();

    // Only 4 input pills visible initially
    const card = canvasElement.querySelector(".pipe-card");
    const pillsBefore = card?.querySelectorAll(".pipe-card-io-pill") ?? [];
    // 4 inputs + 1 output = 5 pills
    await expect(pillsBefore.length).toBe(5);

    // Click to expand
    await userEvent.click(moreBtn);
    const showLess = canvas.getByText("show less");
    await expect(showLess).toBeVisible();

    // Now all 50 inputs + 1 output = 51 pills
    const pillsAfter = card?.querySelectorAll(".pipe-card-io-pill") ?? [];
    await expect(pillsAfter.length).toBe(51);

    // Click to collapse back
    await userEvent.click(showLess);
    await expect(canvas.getByText("+46 more")).toBeVisible();
  },
};

// ─── Minimal card renders without errors ───────────────────────────────────

export const MinimalCard: Story = {
  args: { graphspec: toGraphSpec(minimal), ...D },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Func")).toBeVisible();
    await expect(canvas.getByText("passthrough")).toBeVisible();
  },
};

// ─── Extreme card (many inputs + long names) renders ───────────────────────

export const EverythingAtOnceCard: Story = {
  args: { graphspec: toGraphSpec(everythingAtOnce), ...D },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("LLM")).toBeVisible();
    // Should have a "+N more" button (15 inputs, 4 visible → +11 more)
    await expect(canvas.getByText("+11 more")).toBeVisible();
  },
};
