import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { graphFor } from "../pipelineArtifacts";
import { GraphViewer } from "../../GraphViewer";
import { DRY_DOOR_NOTICE } from "./specs/_generated/dry/pipeline_35";
import { LIVE_DOOR_NOTICE } from "./specs/_generated/live/pipeline_35";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - from run/35 Door Notice",
  component: GraphViewer,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    initialDirection: { control: { type: "inline-radio" }, options: ["LR", "TB"] },
    initialShowControllers: { control: { type: "boolean" } },
  },
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

// A PipeLLM writes the shop's hours up as a structured notice, and a PipeDocGen
// prints it as a pdf from the auto-layout, on the engine open pipelex ships.
const D = {
  initialDirection: "LR" as const,
  initialShowControllers: true,
};

/** The key/value rows of the open detail panel, and the panel itself. */
async function openRenderStep(canvasElement: HTMLElement) {
  const card = await waitFor(
    () => {
      const el = Array.from(canvasElement.querySelectorAll<HTMLElement>(".pipe-card")).find(
        (candidate) => candidate.textContent?.includes("print_notice"),
      );
      if (!el) throw new Error("no print_notice card");
      return el;
    },
    { timeout: 10000 },
  );
  await expect(within(card).getByText("PDF")).toHaveClass("pipe-card-format");

  await userEvent.click(card);
  const panel = await waitFor(() => {
    const el = canvasElement.querySelector<HTMLElement>(".detail-panel-content");
    if (!el?.textContent?.includes("print_notice")) throw new Error("no print_notice panel");
    return el;
  });
  const rows = Array.from(panel.querySelectorAll(".detail-kv-row")).map((row) => [
    row.querySelector(".detail-kv-key")?.textContent,
    row.querySelector(".detail-kv-value")?.textContent,
  ]);
  return { panel, rows };
}

export const DryRun: Story = {
  args: { graph: graphFor("DOOR_NOTICE", DRY_DOOR_NOTICE), ...D },
  play: async ({ canvasElement }) => {
    const { panel, rows } = await openRenderStep(canvasElement);
    await expect(rows).toContainEqual(["Format", "PDF"]);
    await expect(rows).toContainEqual(["Engine", "reportlab-pdf"]);
    await expect(rows).toContainEqual(["Source", "auto-layout"]);
    await expect(rows).toContainEqual(["File Name", "notice-{{ notice.shop_name }}"]);
    // A dry run's file name is rendered from mock inputs, so it is not shown.
    await expect(rows.map(([key]) => key)).not.toContain("Stored As");
    // The dry run inlines the document it printed as a data: URL, never shown.
    await expect(panel.textContent).not.toContain("data:");
  },
};

export const LiveRun: Story = {
  args: { graph: graphFor("DOOR_NOTICE", LIVE_DOOR_NOTICE), ...D },
  play: async ({ canvasElement }) => {
    const { panel, rows } = await openRenderStep(canvasElement);
    await expect(rows).toContainEqual(["Engine", "reportlab-pdf"]);
    await expect(rows).toContainEqual(["Stored As", "notice-The-Corner-Bakery.pdf"]);
    await expect(panel.textContent).not.toContain("pipelex-storage://");
    await expect(within(panel).queryByText("Execution")).toBeNull();
  },
};

export const LiveRunTopToBottom: Story = {
  args: {
    graph: graphFor("DOOR_NOTICE", LIVE_DOOR_NOTICE),
    ...D,
    initialDirection: "TB",
  },
};
