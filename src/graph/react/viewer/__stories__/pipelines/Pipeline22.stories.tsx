import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../../GraphViewer";
import { DRY_MULTI_OUTPUT_FANOUT } from "./specs/_generated/dry/pipeline_22";
import { LIVE_MULTI_OUTPUT_FANOUT } from "./specs/_generated/live/pipeline_22";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - from run/22 Multi-Output Fan-out",
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
  args: { graphspec: DRY_MULTI_OUTPUT_FANOUT, ...D },
};

export const LiveRun: Story = {
  args: { graphspec: LIVE_MULTI_OUTPUT_FANOUT, ...D },
};
