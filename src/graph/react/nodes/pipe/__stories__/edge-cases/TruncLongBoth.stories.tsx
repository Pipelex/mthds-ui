import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../../../../viewer/GraphViewer";
import { toGraphSpec } from "../edgeCaseGraphSpecs";
import { truncLongBoth } from "./edgeCaseData";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/PipeCard/EdgeCases/TruncLongBoth",
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

const spec = toGraphSpec(truncLongBoth);

export const LR: Story = {
  args: { graphspec: spec, direction: "LR", showControllers: false },
};

export const TB: Story = {
  args: { graphspec: spec, direction: "TB", showControllers: false },
};
