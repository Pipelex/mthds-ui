import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../../GraphViewer";
import { DRY_AVAILABILITY_ROUTING } from "./specs/_generated/dry/pipeline_33";
import { LIVE_AVAILABILITY_ROUTING } from "./specs/_generated/live/pipeline_33";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - from run/33 Availability Routing (natives in controllers)",
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
  args: { graphspec: DRY_AVAILABILITY_ROUTING, ...D },
};

/**
 * Placeholder LIVE spec (the DRY spec re-tagged), for the same reason as
 * pipeline_32: `read_dates` outputs `Date[]`, which pipelex cannot produce from
 * a live model. See pipelex/wip/native-date-time-live-run.md.
 */
export const LiveRun: Story = {
  args: { graphspec: LIVE_AVAILABILITY_ROUTING, ...D },
};
