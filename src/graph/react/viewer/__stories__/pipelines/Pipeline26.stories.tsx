import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../../GraphViewer";
import { makeWideParallel } from "../extremeGraphSpecs";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/GraphViewer/26 Wide Parallel (15 branches)",
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

export const FifteenBranches: Story = {
  args: { graphspec: makeWideParallel(15), ...D },
};

export const ThirtyBranches: Story = {
  args: { graphspec: makeWideParallel(30), ...D },
};
