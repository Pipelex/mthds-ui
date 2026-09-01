import type { Meta, StoryObj } from "@storybook/react-vite";
import { artifactsFor } from "../pipelineArtifacts";
import { GraphViewer } from "../../GraphViewer";
import { DRY_ALL_PIPE_TYPES } from "./specs/_generated/dry/pipeline_14";
import { LIVE_ALL_PIPE_TYPES } from "./specs/_generated/live/pipeline_14";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - from run/14 All Pipe Types",
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
// the method's own `output_form` and `pipe_io_contracts` — the artifacts a
// host holds beside the spec.
const D = {
  initialDirection: "LR" as const,
  initialShowControllers: true,
  ...artifactsFor("ALL_PIPE_TYPES"),
};

export const DryRun: Story = {
  args: { graphspec: DRY_ALL_PIPE_TYPES, ...D },
};

export const LiveRun: Story = {
  args: { graphspec: LIVE_ALL_PIPE_TYPES, ...D },
};
