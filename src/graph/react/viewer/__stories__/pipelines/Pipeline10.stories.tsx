import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../../GraphViewer";
import { DRY_NESTED_SEQ_PAR_SEQ } from "./specs/_generated/dry/pipeline_10";
import { LIVE_NESTED_SEQ_PAR_SEQ } from "./specs/_generated/live/pipeline_10";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - from run/10 Nested Seq > Parallel > Seq",
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
  args: { graphspec: DRY_NESTED_SEQ_PAR_SEQ, ...D },
};

export const LiveRun: Story = {
  args: { graphspec: LIVE_NESTED_SEQ_PAR_SEQ, ...D },
};
