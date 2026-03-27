import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../../../viewer/GraphViewer";
import { MOCK_PIPES, withStatus } from "./mockData";
import { toGraphSpec } from "./edgeCaseGraphSpecs";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/PipeCard/ByStatus",
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

const D = { direction: "LR" as const, showControllers: false };

export const Completed: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeLLM), ...D },
};

export const Failed: Story = {
  args: { graphspec: toGraphSpec(withStatus(MOCK_PIPES.PipeLLM, "failed")), ...D },
};

export const Running: Story = {
  args: { graphspec: toGraphSpec(withStatus(MOCK_PIPES.PipeLLM, "running")), ...D },
};
