import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../../GraphViewer";
import { DRY_SINGLE_PIPE } from "./specs/_generated/dry/pipeline_01";
import { LIVE_SINGLE_PIPE } from "./specs/_generated/live/pipeline_01";

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
    initialDirection: { control: { type: "inline-radio" }, options: ["LR", "TB"] },
    initialShowControllers: { control: { type: "boolean" } },
  },
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

const D = { initialDirection: "LR" as const, initialShowControllers: true };

export const DryRun: Story = {
  args: { graphspec: DRY_SINGLE_PIPE, ...D },
};

export const LiveRun: Story = {
  args: { graphspec: LIVE_SINGLE_PIPE, ...D },
};
