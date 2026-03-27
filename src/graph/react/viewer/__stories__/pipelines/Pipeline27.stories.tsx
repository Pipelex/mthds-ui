import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../../GraphViewer";
import { makeWideBatch } from "../extremeGraphSpecs";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/GraphViewer/27 Wide Batch (many iterations)",
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

export const FifteenIterations: Story = {
  args: { graphspec: makeWideBatch(15), ...D },
};

export const ThirtyIterations: Story = {
  args: { graphspec: makeWideBatch(30), ...D },
};
