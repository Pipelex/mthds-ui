import type { Meta, StoryObj } from "@storybook/react-vite";
import { GraphViewer } from "../../GraphViewer";
import { DRY_EMAIL_TRIAGE, LIVE_EMAIL_TRIAGE } from "../mockGraphSpec";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/GraphViewer/17 Email Triage",
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
  args: { graphspec: DRY_EMAIL_TRIAGE, ...D },
};

export const LiveRun: Story = {
  args: { graphspec: LIVE_EMAIL_TRIAGE, ...D },
};
