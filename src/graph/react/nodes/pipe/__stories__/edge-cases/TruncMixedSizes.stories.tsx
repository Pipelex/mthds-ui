import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "@graph/react/viewer/GraphViewer";
import { toGraphSpec } from "../edgeCaseGraphSpecs";
import { truncMixedSizes } from "./edgeCaseData";

const meta: Meta<typeof GraphViewer> = {
  title: "Misc/PipeCard/EdgeCases/TruncMixedSizes",
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

const spec = toGraphSpec(truncMixedSizes);

export const LR: Story = {
  args: { graph: { graphSpec: spec }, initialDirection: "LR", initialShowControllers: false },
};

export const TB: Story = {
  args: { graph: { graphSpec: spec }, initialDirection: "TB", initialShowControllers: false },
};
