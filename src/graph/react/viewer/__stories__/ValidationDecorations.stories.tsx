// Node decorations for targeted validation issues: severity ring + count badge
// on the affected pipe cards / controller groups, tooltip with messages and
// suggested fixes, fold roll-up. Driven the way a host drives the widget — the
// decorations derive from the same `validationIssues` prop.
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import type { ValidationIssue } from "@graph/types";
import { buildStaticGraphSpecFromToml } from "@static-graph/buildStaticGraphSpec";
import { staticDiagnosticsToValidationIssues } from "@static-graph/validationIssues";
import { GraphViewer } from "../GraphViewer";

// Asset path, not a module import — the `@graph/*` alias rule does not apply.
import bundleGarments from "../../../../../data/static/garments_from_moodboard/bundle_with_error.mthds?raw";

const garments = buildStaticGraphSpecFromToml(bundleGarments);

/** Validator-style issues with explicit targets on real garments pipes. */
const validatorIssues: ValidationIssue[] = [
  {
    severity: "error",
    message:
      'Output concept "MoodboardAnalysis" of pipe "analyze_moodboard" does not match the declared output "GarmentSpec".',
    context: "pipe.analyze_moodboard",
    suggestedFix: 'Change the pipe output to "GarmentSpec" to match the sequence output.',
    origin: "validator",
    pipeRef: "garments_from_moodboard.analyze_moodboard",
  },
  {
    severity: "error",
    message: 'Pipe "render_with_nano_banana" references an unknown model alias.',
    context: "pipe.render_with_nano_banana.model",
    origin: "validator",
    pipeRef: "garments_from_moodboard.render_with_nano_banana",
  },
  {
    severity: "warning",
    message: "Pipe declares an input that no step consumes.",
    context: "pipe.compose_report.inputs",
    origin: "validator",
    pipeRef: "garments_from_moodboard.compose_report",
  },
];

/**
 * Small authored bundle whose STATIC diagnostics carry auto-filled targets:
 * `pipe.summarize.output` decorates the summarize node (auto-qualified `pipeRef`), while the
 * unresolved third step's diagnostic points at a node that was skipped during
 * the walk — it stays panel-only, by design.
 */
const brokenBundle = `
domain = "storydemo"
main_pipe = "main_flow"

[pipe.main_flow]
type = "PipeSequence"
description = "Analyze then summarize the input text"
inputs = { text = "Text" }
output = "Text"
steps = [
  { pipe = "analyze", result = "analysis" },
  { pipe = "summarize", result = "summary" },
  { pipe = "publish_report", result = "report" },
]

[pipe.analyze]
type = "PipeLLM"
description = "Analyze the text"
inputs = { text = "Text" }
output = "Text"
prompt = "p"

[pipe.summarize]
type = "PipeLLM"
description = "Summarize the analysis"
inputs = { analysis = "Text" }
prompt = "p"
`;

const brokenStatic = buildStaticGraphSpecFromToml(brokenBundle);
const staticIssues = staticDiagnosticsToValidationIssues(brokenStatic.diagnostics);

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - static/Validation decorations",
  component: GraphViewer,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    initialDirection: "LR",
    initialShowControllers: true,
    validationState: "invalid",
    onValidationIssueClick: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

/** Explicitly-targeted validator issues: rings + badges on three pipes. */
export const ValidatorTargeted: Story = {
  args: { graphspec: garments.spec, validationIssues: validatorIssues },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // One badge per targeted pipe; layout is async, so wait for the nodes.
    await waitFor(async () => {
      const badges = canvas.getAllByLabelText(/validation issue/);
      await expect(badges).toHaveLength(3);
    });
    // Worst severity drives the ring: analyze_moodboard errors, compose_report warns.
    const analyzeCode = await canvas.findByTitle("analyze_moodboard");
    const analyzeCard = analyzeCode.closest(".pipe-card") as HTMLElement;
    await expect(analyzeCard).toHaveClass("node-validation-ring--error");
    const composeCode = await canvas.findByTitle("compose_report");
    await expect(composeCode.closest(".pipe-card")).toHaveClass("node-validation-ring--warning");
    // The analyze_moodboard badge's tooltip carries the message and the fix
    // (query scoped to that card — badge DOM order is layout-dependent).
    const badge = within(analyzeCard).getByLabelText(/validation issue/);
    await expect(badge.title).toContain("Fix: ");

    // Graph → panel: a badge click opens the validation panel.
    await userEvent.click(badge);
    const panel = await canvas.findByRole("region", { name: "Validation issues" });

    // Panel → graph: clicking the analyze_moodboard row flashes its node.
    const rows = within(panel).getAllByRole("button");
    await userEvent.click(rows[0]);
    await waitFor(async () => {
      const flashed = canvasElement.querySelector(".react-flow__node.node-validation-flash");
      await expect(flashed?.textContent).toContain("analyze_moodboard");
    });
  },
};

/** Static diagnostics auto-targeted by the mapper; skipped-node issues stay panel-only. */
export const StaticAutoTargeted: Story = {
  args: { graphspec: brokenStatic.spec, validationIssues: staticIssues },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      // Only the summarize diagnostic decorates a node — the unresolved-step
      // diagnostic targets a skipped node and must not render a badge.
      const badges = canvas.getAllByLabelText(/validation issue/);
      await expect(badges).toHaveLength(1);
    });
    const summarizeCode = await canvas.findByTitle("summarize");
    await expect(summarizeCode.closest(".pipe-card")).toHaveClass("node-validation-ring--warning");
  },
};

/** Folding rolls hidden descendants' issues up onto the folded card's badge. */
export const FoldedRollUp: Story = {
  args: {
    graphspec: garments.spec,
    validationIssues: validatorIssues,
    initialFoldMode: "folded",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      // Everything folds into the root controller card: one badge, count 3.
      const badges = canvas.getAllByLabelText(/validation issue/);
      await expect(badges).toHaveLength(1);
      await expect(badges[0]).toHaveTextContent("3");
    });
    const rootCode = await canvas.findByTitle("design_garments_from_moodboard");
    await expect(rootCode.closest(".pipe-card")).toHaveClass("node-validation-ring--error");
  },
};
