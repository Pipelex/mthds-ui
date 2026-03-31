import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { GraphViewer } from "../GraphViewer";
import { DRY_RUN_CATALOG } from "./mockGraphSpec";
import type { GraphSpec } from "@graph/types";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/Smoke Tests/Pipeline Smoke",
  component: GraphViewer,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

const D = { direction: "LR" as const, showControllers: true };

/** Shared play function: verify ReactFlow renders nodes without errors */
async function assertRendersNodes({ canvasElement }: { canvasElement: HTMLElement }) {
  // ReactFlow viewport should exist
  const viewport = canvasElement.querySelector(".react-flow__viewport");
  await expect(viewport).not.toBeNull();

  // Wait for at least one node to render (layout is async via ELK)
  await waitFor(
    () => {
      const nodes = canvasElement.querySelectorAll(".react-flow__node");
      expect(nodes.length).toBeGreaterThan(0);
    },
    { timeout: 5000 },
  );
}

// ─── Generate one story per DRY_RUN_CATALOG entry ──────────────────────────

function makeStory(spec: GraphSpec): Story {
  return {
    args: { graphspec: spec, ...D },
    play: assertRendersNodes,
  };
}

export const SinglePipe: Story = makeStory(DRY_RUN_CATALOG.DRY_SINGLE_PIPE.spec);
export const TwoPipeChain: Story = makeStory(DRY_RUN_CATALOG.DRY_TWO_PIPE_CHAIN.spec);
export const SimpleSequence: Story = makeStory(DRY_RUN_CATALOG.DRY_SIMPLE_SEQUENCE.spec);
export const LongSequence: Story = makeStory(DRY_RUN_CATALOG.DRY_LONG_SEQUENCE.spec);
export const SimpleParallel: Story = makeStory(DRY_RUN_CATALOG.DRY_SIMPLE_PARALLEL.spec);
export const ThreeWayParallel: Story = makeStory(DRY_RUN_CATALOG.DRY_THREE_WAY_PARALLEL.spec);
export const SimpleCondition: Story = makeStory(DRY_RUN_CATALOG.DRY_SIMPLE_CONDITION.spec);
export const SimpleBatch: Story = makeStory(DRY_RUN_CATALOG.DRY_SIMPLE_BATCH.spec);
export const CvScreening: Story = makeStory(DRY_RUN_CATALOG.DRY_CV_SCREENING.spec);
export const NestedSeqParSeq: Story = makeStory(DRY_RUN_CATALOG.DRY_NESTED_SEQ_PAR_SEQ.spec);
export const NestedSeqCondSeq: Story = makeStory(DRY_RUN_CATALOG.DRY_NESTED_SEQ_COND_SEQ.spec);
export const BatchWithInnerSeq: Story = makeStory(DRY_RUN_CATALOG.DRY_BATCH_WITH_INNER_SEQ.spec);
export const DiamondPattern: Story = makeStory(DRY_RUN_CATALOG.DRY_DIAMOND_PATTERN.spec);
export const AllPipeTypes: Story = makeStory(DRY_RUN_CATALOG.DRY_ALL_PIPE_TYPES.spec);
export const RagPipeline: Story = makeStory(DRY_RUN_CATALOG.DRY_RAG_PIPELINE.spec);
export const ImageProcessing: Story = makeStory(DRY_RUN_CATALOG.DRY_IMAGE_PIPELINE.spec);
export const EmailTriage: Story = makeStory(DRY_RUN_CATALOG.DRY_EMAIL_TRIAGE.spec);
export const CodeReview: Story = makeStory(DRY_RUN_CATALOG.DRY_CODE_REVIEW.spec);
export const ContentModeration: Story = makeStory(DRY_RUN_CATALOG.DRY_CONTENT_MODERATION.spec);
export const WideParallel: Story = makeStory(DRY_RUN_CATALOG.DRY_WIDE_PARALLEL.spec);
export const MultiInputConverge: Story = makeStory(DRY_RUN_CATALOG.DRY_MULTI_INPUT_CONVERGE.spec);
export const MultiOutputFanout: Story = makeStory(DRY_RUN_CATALOG.DRY_MULTI_OUTPUT_FANOUT.spec);
export const SiblingParallels: Story = makeStory(DRY_RUN_CATALOG.DRY_SIBLING_PARALLELS.spec);
export const DeepNesting: Story = makeStory(DRY_RUN_CATALOG.DRY_DEEP_NESTING.spec);
export const AllControllerTypes: Story = makeStory(DRY_RUN_CATALOG.DRY_ALL_CONTROLLER_TYPES.spec);
