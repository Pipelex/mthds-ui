import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "@graph/react/viewer/GraphViewer";
import { MOCK_PIPES } from "./mockData";
import { toGraphSpec } from "./edgeCaseGraphSpecs";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/PipeCard/ByType",
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

const D = { initialDirection: "LR" as const, initialShowControllers: false };

export const LLM: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeLLM), ...D },
};

export const Extract: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeExtract), ...D },
};

export const Compose: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeCompose), ...D },
};

export const ImgGen: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeImgGen), ...D },
};

export const Search: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeSearch), ...D },
};

export const Func: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeFunc), ...D },
};
