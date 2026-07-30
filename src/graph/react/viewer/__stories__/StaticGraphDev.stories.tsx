import type { Meta, StoryObj } from "@storybook/react-vite";

import { buildStaticGraphSpecFromToml } from "@static-graph/buildStaticGraphSpec";
import { GraphViewer } from "../GraphViewer";
import {
  STATIC_CV_SCREENING,
  STATIC_DEEP_NESTING,
  STATIC_SIMPLE_BATCH,
  STATIC_SIMPLE_CONDITION,
} from "./staticGraphSpec";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - static/Valid/Examples",
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

const WIP_BROKEN_BUNDLE = `
domain = "wip_demo"
main_pipe = "process"

[concept.Finding]
description = "A finding"

[pipe.process]
type = "PipeSequence"
description = "Half-written method: one step missing, one external"
inputs = { document = "Document" }
output = "Finding[]"
steps = [
  { pipe = "extract_text", result = "text" },
  { pipe = "not_written_yet", result = "cleaned" },
  { pipe = "helpers->normalize", result = "normalized" },
  { pipe = "find_issues", batch_over = "normalized", batch_as = "chunk", result = "findings" },
]

[pipe.extract_text]
type = "PipeExtract"
description = "Extract text from the document"
inputs = { document = "Document" }
output = "Page[]"

[pipe.find_issues]
type = "PipeLLM"
description = "Find issues in one chunk"
inputs = { chunk = "Text" }
output = "Finding"
prompt = "Find issues in @chunk"
`;

const SIGNATURE_BUNDLE = `
domain = "signature_demo"
main_pipe = "run_all"

[concept.Scorecard]
description = "A candidate scorecard"

[pipe.run_all]
type = "PipeSequence"
description = "Run a method with a declared-but-unimplemented step"
inputs = { job_offer = "Text" }
output = "Scorecard"
steps = [{ pipe = "build_scorecard", result = "scorecard" }]

[pipe.build_scorecard]
description = "Build a scorecard from the job offer"
inputs = { job_offer = "Text" }
output = "Scorecard"
signature_for = "PipeLLM"
`;

export const CvScreening: Story = {
  args: { graphspec: STATIC_CV_SCREENING, ...D },
};

export const SimpleBatch: Story = {
  args: { graphspec: STATIC_SIMPLE_BATCH, ...D },
};

export const SimpleCondition: Story = {
  args: { graphspec: STATIC_SIMPLE_CONDITION, ...D },
};

export const DeepNesting: Story = {
  args: { graphspec: STATIC_DEEP_NESTING, ...D },
};

/** Best-effort path: unresolved step skipped, opaque dependency leaf, inline batch. */
export const WipBrokenBundle: Story = {
  args: { graphspec: buildStaticGraphSpecFromToml(WIP_BROKEN_BUNDLE).spec, ...D },
};

/** Contract-only pipe: distinct signature badge/card and detail copy. */
export const Signature: Story = {
  args: { graphspec: buildStaticGraphSpecFromToml(SIGNATURE_BUNDLE).spec, ...D },
};
