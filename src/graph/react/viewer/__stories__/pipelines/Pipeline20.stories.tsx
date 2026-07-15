import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../../GraphViewer";
import { DRY_WIDE_PARALLEL } from "./specs/_generated/dry/pipeline_20";
import { LIVE_WIDE_PARALLEL } from "./specs/_generated/live/pipeline_20";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - from run/20 Wide Parallel (5 branches)",
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

const D = { initialDirection: "LR" as const, initialShowControllers: true };

export const DryRun: Story = {
  args: { graphspec: DRY_WIDE_PARALLEL, ...D },
};

export const LiveRun: Story = {
  args: { graphspec: LIVE_WIDE_PARALLEL, ...D },
};
