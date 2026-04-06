import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DetailPanel } from "../DetailPanel";
import { PipeDetailPanel } from "../PipeDetailPanel";
import {
  ENRICHED_SPEC,
  NODE_ANALYZE_CANDIDATE,
  NODE_GENERATE_CARD,
  NODE_CV_SCREENING,
  NODE_SEARCH_CANDIDATE,
  NODE_COMPOSE_REPORT,
  NODE_EXTRACT_CV,
  NODE_ENRICH_CANDIDATE,
  NODE_SCORE_MATCH,
  NODE_FAILED,
} from "./enrichedMockData";
import type { GraphSpecNode } from "@graph/types";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipe Detail",
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 380, height: 700, position: "relative", background: "#0a0a0f" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

function PipeStory({ node }: { node: GraphSpecNode }) {
  return (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <PipeDetailPanel node={node} spec={ENRICHED_SPEC} />
    </DetailPanel>
  );
}

export const PipeLLMAnalyze: Story = {
  name: "PipeLLM (Analyze)",
  render: () => <PipeStory node={NODE_ANALYZE_CANDIDATE} />,
};

export const PipeLLMScore: Story = {
  name: "PipeLLM (Score)",
  render: () => <PipeStory node={NODE_SCORE_MATCH} />,
};

export const PipeExtract: Story = {
  name: "PipeExtract",
  render: () => <PipeStory node={NODE_EXTRACT_CV} />,
};

export const PipeImgGen: Story = {
  name: "PipeImgGen",
  render: () => <PipeStory node={NODE_GENERATE_CARD} />,
};

export const PipeSearch: Story = {
  name: "PipeSearch",
  render: () => <PipeStory node={NODE_SEARCH_CANDIDATE} />,
};

export const PipeCompose: Story = {
  name: "PipeCompose",
  render: () => <PipeStory node={NODE_COMPOSE_REPORT} />,
};

export const PipeSequence: Story = {
  name: "PipeSequence",
  render: () => <PipeStory node={NODE_CV_SCREENING} />,
};

export const PipeParallel: Story = {
  name: "PipeParallel",
  render: () => <PipeStory node={NODE_ENRICH_CANDIDATE} />,
};

export const FailedPipe: Story = {
  name: "Failed Pipe",
  render: () => <PipeStory node={NODE_FAILED} />,
};
