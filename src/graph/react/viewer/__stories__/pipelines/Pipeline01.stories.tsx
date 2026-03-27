import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../../GraphViewer";
import { DRY_SINGLE_PIPE, LIVE_SINGLE_PIPE } from "../mockGraphSpec";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/GraphViewer/01 Single PipeLLM",
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
  args: { graphspec: DRY_SINGLE_PIPE, ...D },
};

export const LiveRun: Story = {
  args: { graphspec: LIVE_SINGLE_PIPE, ...D },
};
