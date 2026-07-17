// Invalid authored bundles that the static graph path can still render.
import type { Meta, StoryObj } from "@storybook/react-vite";

import { buildStaticGraphSpecFromToml } from "@static-graph/buildStaticGraphSpec";
import { GraphViewer } from "../GraphViewer";

// Asset path, not a module import — the `@graph/*` alias rule does not apply.
import bundleGarments from "../../../../../data/static/garments_from_moodboard/bundle_with_error.mthds?raw";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - static/Invalid/Examples",
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

/**
 * Real-world WIP bundle (from pipelex-demos) that does not pass pipelex
 * semantic validation — the static walk still renders it, which is the whole
 * point of the static path. Bundles like this live in `data/static/` because
 * the fixture generator can't run them through the pipelex CLI.
 */
export const GarmentsFromMoodboard: Story = {
  args: { graphspec: buildStaticGraphSpecFromToml(bundleGarments).spec, ...D },
};
