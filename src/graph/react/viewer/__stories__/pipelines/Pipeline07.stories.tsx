import type { Meta, StoryObj } from "@storybook/react-vite";
import { stuffRendererFor } from "@form/react/__stories__/pipelineStuffRenderer";
import { GraphViewer } from "../../GraphViewer";
import { DRY_SIMPLE_CONDITION } from "./specs/_generated/dry/pipeline_07";
import { LIVE_SIMPLE_CONDITION } from "./specs/_generated/live/pipeline_07";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - from run/07 Simple Condition",
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

// Clicking a data node shows what this run actually produced, laid out from
// the method's own `output_form` and `pipe_io_contracts`. Passed the way a
// host passes it — the graph entry cannot import the kernel itself.
const D = {
  initialDirection: "LR" as const,
  initialShowControllers: true,
  renderStuffData: stuffRendererFor("SIMPLE_CONDITION"),
};

export const DryRun: Story = {
  args: { graphspec: DRY_SIMPLE_CONDITION, ...D },
};

export const LiveRun: Story = {
  args: { graphspec: LIVE_SIMPLE_CONDITION, ...D },
};
