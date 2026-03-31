import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../../GraphViewer";
import { DRY_NESTED_SEQ_PAR_SEQ, LIVE_NESTED_SEQ_PAR_SEQ } from "../mockGraphSpec";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/GraphViewer/10 Nested Seq > Parallel > Seq",
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
  args: { graphspec: DRY_NESTED_SEQ_PAR_SEQ, ...D },
};

export const LiveRun: Story = {
  args: { graphspec: LIVE_NESTED_SEQ_PAR_SEQ, ...D },
};
