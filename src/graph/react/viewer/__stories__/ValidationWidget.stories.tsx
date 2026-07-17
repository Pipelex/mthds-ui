// The toolbar validation widget across its states, driven the way a host
// (e.g. the VS Code extension) drives it: static graph rendered immediately,
// `validationState` flowing validating → valid | invalid | error.
import type { Meta, StoryObj } from "@storybook/react-vite";

import type { ValidationIssue } from "@graph/types";
import { buildStaticGraphSpecFromToml } from "@static-graph/buildStaticGraphSpec";
import { staticDiagnosticsToValidationIssues } from "@static-graph/validationIssues";
import { GraphViewer } from "../GraphViewer";

// Asset path, not a module import — the `@graph/*` alias rule does not apply.
import bundleGarments from "../../../../../data/static/garments_from_moodboard/bundle_with_error.mthds?raw";

const staticResult = buildStaticGraphSpecFromToml(bundleGarments);
const staticIssues = staticDiagnosticsToValidationIssues(staticResult.diagnostics);

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
      options: [undefined, "validating", "valid", "invalid", "error"],
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

/** Default: no `validationState` → the widget does not render at all. */
export const Hidden: Story = {
  args: { validationState: undefined },
};
