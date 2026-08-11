import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../../GraphViewer";
import { DRY_MEETING_TRIAGE } from "./specs/_generated/dry/pipeline_32";
import { LIVE_MEETING_TRIAGE } from "./specs/_generated/live/pipeline_32";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - from run/32 Meeting Triage (Date / Time / YesNo)",
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
  args: { graphspec: DRY_MEETING_TRIAGE, ...D },
};

/**
 * Real LIVE data, and the end-to-end check for the temporal natives: this
 * bundle produces `Date[]` and `Time` from a live model, which failed
 * validation until pipelex#1089 (a `mode="before"` validator forfeited
 * pydantic's strict-JSON acceptance of ISO strings). Regenerate with
 * `make fixtures-live ONLY=pipeline_32`.
 */
export const LiveRun: Story = {
  args: { graphspec: LIVE_MEETING_TRIAGE, ...D },
};
