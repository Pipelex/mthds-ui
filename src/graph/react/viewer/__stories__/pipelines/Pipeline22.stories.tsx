import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../../GraphViewer";
import { DRY_MULTI_OUTPUT_FANOUT, LIVE_MULTI_OUTPUT_FANOUT } from "../mockGraphSpec";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/GraphViewer/22 Multi-Output Fan-out",
  component: GraphViewer,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    direction: { control: { type: "inline-radio" }, options: ["LR", "TB"] },
    showControllers: { control: { type: "boolean" } },
  },
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

const D = { direction: "LR" as const, showControllers: true };

export const DryRun: Story = {
  args: { graphspec: DRY_MULTI_OUTPUT_FANOUT, ...D },
};

export const LiveRun: Story = {
  args: { graphspec: LIVE_MULTI_OUTPUT_FANOUT, ...D },
};
