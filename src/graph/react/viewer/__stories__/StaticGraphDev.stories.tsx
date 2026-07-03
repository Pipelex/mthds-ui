// Phase-1b dev smoke story: feed `.mthds` TOML straight into the static graph
// builder and render the result with the unchanged GraphViewer. No CLI, no
// gateway key — the bundles are imported as raw text (`?raw`). The proper
// STATIC_* fixture catalog lands in Phase 2; this story exists to eyeball the
// walk's output next to the dry-run stories.
import type { Meta, StoryObj } from "@storybook/react-vite";

import { buildStaticGraphSpecFromToml } from "@static/buildStaticGraphSpec";
import { GraphViewer } from "../GraphViewer";

// Asset paths, not module imports — the `@graph/*` alias rule does not apply.
import bundleCvScreening from "../../../../../data/pipelines/pipeline_09/bundle.mthds?raw";
import bundleSimpleBatch from "../../../../../data/pipelines/pipeline_08/bundle.mthds?raw";
import bundleSimpleCondition from "../../../../../data/pipelines/pipeline_07/bundle.mthds?raw";
import bundleDeepNesting from "../../../../../data/pipelines/pipeline_24/bundle.mthds?raw";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/GraphViewer/Static Graph (dev)",
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

export const CvScreening: Story = {
  args: { graphspec: buildStaticGraphSpecFromToml(bundleCvScreening).spec, ...D },
};

export const SimpleBatch: Story = {
  args: { graphspec: buildStaticGraphSpecFromToml(bundleSimpleBatch).spec, ...D },
};

export const SimpleCondition: Story = {
  args: { graphspec: buildStaticGraphSpecFromToml(bundleSimpleCondition).spec, ...D },
};

export const DeepNesting: Story = {
  args: { graphspec: buildStaticGraphSpecFromToml(bundleDeepNesting).spec, ...D },
};

/** Best-effort path: unresolved step skipped, opaque dependency leaf, inline batch. */
export const WipBrokenBundle: Story = {
  args: { graphspec: buildStaticGraphSpecFromToml(WIP_BROKEN_BUNDLE).spec, ...D },
};
