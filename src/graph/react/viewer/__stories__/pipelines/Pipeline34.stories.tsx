import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../../GraphViewer";
import { DRY_ALL_NATIVE_CONCEPTS } from "./specs/_generated/dry/pipeline_34";
import { LIVE_ALL_NATIVE_CONCEPTS } from "./specs/_generated/live/pipeline_34";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - from run/34 All Native Concepts",
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
  args: { graphspec: DRY_ALL_NATIVE_CONCEPTS, ...D },
};

export const LiveRun: Story = {
  args: { graphspec: LIVE_ALL_NATIVE_CONCEPTS, ...D },
};
