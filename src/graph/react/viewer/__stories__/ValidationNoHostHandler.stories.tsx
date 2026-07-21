// Regression: the validation panel's built-in pan/flash must work even when the
// host wires no `onValidationIssueClick`. The wrapped row handler is passed to
// the panel unconditionally, so rows stay interactive and a targeted row flashes
// its node — with NO host handler in scope (this meta deliberately omits it).
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import type { ValidationIssue } from "@graph/types";
import { buildStaticGraphSpecFromToml } from "@static-graph/buildStaticGraphSpec";
import { GraphViewer } from "../GraphViewer";

// Asset path, not a module import — the `@graph/*` alias rule does not apply.
import bundleGarments from "../../../../../data/static/garments_from_moodboard/bundle_with_error.mthds?raw";

const garments = buildStaticGraphSpecFromToml(bundleGarments);

const targetedIssues: ValidationIssue[] = [
  {
    severity: "error",
    message:
      'Output concept "MoodboardAnalysis" of pipe "analyze_moodboard" does not match the declared output "GarmentSpec".',
    context: "pipe.analyze_moodboard",
    origin: "validator",
    pipeRef: "garments_from_moodboard.analyze_moodboard",
  },
];

// Deliberately NO `onValidationIssueClick` in args: the host wires no source-jump,
// yet the viewer's own pan/flash must still make the rows interactive.
const meta: Meta<typeof GraphViewer> = {
  title: "Graph - static/Validation without host handler",
  component: GraphViewer,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    graphspec: garments.spec,
    initialDirection: "LR",
    initialShowControllers: true,
    validationState: "invalid",
    validationIssues: targetedIssues,
  },
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

/** A targeted row stays interactive and flashes its node without a host handler. */
export const TargetedRowFlashesWithoutHostHandler: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Graph → panel: open the panel via the node's badge (independent of the
    // missing host handler).
    const badge = await waitFor(async () => {
      const found = canvas.getAllByLabelText(/validation issue/);
      await expect(found.length).toBeGreaterThan(0);
      return found[0];
    });
    await userEvent.click(badge);
    const panel = await canvas.findByRole("region", { name: "Validation issues" });

    // The regression: with no host handler the rows must still be interactive,
    // because the wrapped handler always pans/flashes to the target node.
    const rows = within(panel).getAllByRole("button");
    await expect(rows).toHaveLength(targetedIssues.length);

    // Clicking the targeted row flashes its node.
    await userEvent.click(rows[0]);
    await waitFor(async () => {
      const flashed = canvasElement.querySelector(".react-flow__node.node-validation-flash");
      await expect(flashed?.textContent).toContain("analyze_moodboard");
    });
  },
};
