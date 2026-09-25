// The toolbar validation widget across its states, driven the way a host
// (e.g. the VS Code extension) drives it: static graph rendered immediately,
// `validationState` flowing validating → valid | invalid | error, plus the
// `unvalidated` state of a host that has no validator at all.
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import type { ValidationIssue } from "@graph/types";
import { buildStaticGraphSpecFromToml } from "@static-graph/buildStaticGraphSpec";
import { staticDiagnosticsToValidationIssues } from "@static-graph/validationIssues";
import { GraphViewer } from "../GraphViewer";

// Asset path, not a module import — the `@graph/*` alias rule does not apply.
import bundleGarments from "../../../../../data/static/garments_from_moodboard/bundle_with_error.mthds?raw";

const staticResult = buildStaticGraphSpecFromToml(bundleGarments);
const staticIssues = staticDiagnosticsToValidationIssues(staticResult.diagnostics);

// A method the static builder has notes about, of both kinds: one pinned to a
// drawn pipe (`summarize` declares no output, so its node is ringed) and some it
// cannot pin to any node (no `main_pipe`, and a step naming a pipe that does not exist).
const annotatedResult = buildStaticGraphSpecFromToml(`
domain = "demo"

[pipe.flow]
type = "PipeSequence"
description = "Summarize, then run a step nobody declared"
inputs = { text = "Text" }
output = "Text"
steps = [
  { pipe = "summarize", result = "summary" },
  { pipe = "missing_step", result = "out" },
]

[pipe.summarize]
type = "PipeLLM"
description = "Summarize the text"
inputs = { text = "Text" }
prompt = "Summarize: @text"
`);
const annotatedIssues = staticDiagnosticsToValidationIssues(annotatedResult.diagnostics);

const validatorIssues: ValidationIssue[] = [
  {
    severity: "error",
    message:
      'Output concept "MoodboardAnalysis" of pipe "analyze_moodboard" does not match the declared output "GarmentSpec".',
    context: "pipe.analyze_moodboard",
    file: "bundle_with_error.mthds",
    suggestedFix: 'Change the pipe output to "GarmentSpec" to match the sequence output.',
    origin: "validator",
  },
  {
    severity: "error",
    message: 'Concept "FabricSwatch" is referenced but never declared.',
    context: "concept.FabricSwatch",
    suggestedFix: "Declare [concept.FabricSwatch] or refine an existing concept.",
    origin: "validator",
  },
  {
    severity: "warning",
    message: "Pipe declares an input that no step consumes.",
    context: "pipe.compose_lookbook.inputs",
    origin: "validator",
  },
];

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - static/Validation widget",
  component: GraphViewer,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    validationState: {
      control: { type: "inline-radio" },
      options: [undefined, "validating", "valid", "invalid", "error", "unvalidated"],
    },
    toolbarPosition: {
      control: { type: "select" },
      options: [
        "top-left",
        "top-center",
        "top-right",
        "bottom-left",
        "bottom-center",
        "bottom-right",
        "center-left",
        "center-right",
      ],
    },
  },
  args: {
    graphspec: staticResult.spec,
    initialDirection: "LR",
    initialShowControllers: true,
    // No-op: in a real host this navigates to the issue's source location.
    onValidationIssueClick: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

/** Verdict pending — the widget spins; static diagnostics already listed. */
export const Validating: Story = {
  args: { validationState: "validating", validationIssues: staticIssues },
};

/** Clean verdict — green check, empty dropdown. */
export const Valid: Story = {
  args: { validationState: "valid", validationIssues: [] },
};

/** Invalid verdict — count badge; dropdown rows carry suggested fixes. */
export const Invalid: Story = {
  args: { validationState: "invalid", validationIssues: validatorIssues },
  // Locks the dropdown's assistive-tech contract: the toggle points at the panel
  // via aria-controls, issues stay a list of listitems, and each clickable row
  // exposes button semantics on an inner element (not the <li> itself).
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = await canvas.findByRole("button", { name: /method is invalid/i });
    await userEvent.click(toggle);

    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const panel = canvas.getByRole("region", { name: "Validation issues" });
    await expect(toggle).toHaveAttribute("aria-controls", panel.id);

    const list = within(panel).getByRole("list");
    await expect(within(list).getAllByRole("listitem")).toHaveLength(validatorIssues.length);
    await expect(within(list).getAllByRole("button")).toHaveLength(validatorIssues.length);
  },
};

/** No verdict could be produced — the host explains why in the first issue. */
export const ErrorState: Story = {
  name: "Error",
  args: {
    validationState: "error",
    validationIssues: [
      {
        severity: "error",
        message: "Could not find pipelex-agent. Install it or set the CLI path in settings.",
        origin: "validator",
      },
      ...staticIssues,
    ],
  },
};

/**
 * No validator anywhere — the standalone page drawing a method from its source.
 * The static notes are the whole list, and the label says no verdict exists.
 */
export const Unvalidated: Story = {
  args: {
    graphspec: annotatedResult.spec,
    validationState: "unvalidated",
    validationIssues: annotatedIssues,
  },
  play: async ({ canvasElement }) => {
    await expect(annotatedIssues.length).toBeGreaterThan(1);
    const canvas = within(canvasElement);
    const toggle = await canvas.findByRole("button", { name: /not validated — \d+ issues/i });
    await userEvent.click(toggle);
    const panel = canvas.getByRole("region", { name: "Validation issues" });
    await expect(within(panel).getAllByRole("listitem")).toHaveLength(annotatedIssues.length);
  },
};

/** Default: no `validationState` → the widget does not render at all. */
export const Hidden: Story = {
  args: { validationState: undefined },
};
