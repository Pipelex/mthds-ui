import type { Meta, StoryObj } from "@storybook/react-vite";
import { graphFor } from "../pipelineArtifacts";
import { GraphViewer } from "../../GraphViewer";
import { DRY_MULTI_INPUT_CONVERGE } from "./specs/_generated/dry/pipeline_21";
import { LIVE_MULTI_INPUT_CONVERGE } from "./specs/_generated/live/pipeline_21";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - from run/21 Multi-Input Converge",
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
// the method's own `output_form` and `pipe_io_contracts`, carried with the
// spec in the one `graph` object `graphFor` builds.
const D = {
  initialDirection: "LR" as const,
  initialShowControllers: true,
};

export const DryRun: Story = {
  args: { graph: graphFor("MULTI_INPUT_CONVERGE", DRY_MULTI_INPUT_CONVERGE), ...D },
};

export const LiveRun: Story = {
  args: { graph: graphFor("MULTI_INPUT_CONVERGE", LIVE_MULTI_INPUT_CONVERGE), ...D },
};
