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
 * Placeholder LIVE spec (the DRY spec re-tagged). pipelex cannot run this
 * bundle live: `DateContent.date` and `TimeContent.time` are strict pydantic
 * date/time fields, so a structured LLM response — where a date can only be a
 * JSON string — fails validation. See pipelex/wip/native-date-time-live-run.md.
 */
export const LiveRun: Story = {
  args: { graphspec: LIVE_MEETING_TRIAGE, ...D },
};
