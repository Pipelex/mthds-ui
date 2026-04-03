import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DetailPanel } from "../DetailPanel";
import { PipeDetailPanel } from "../PipeDetailPanel";
import {
  ENRICHED_SPEC,
  NODE_LLM,
  NODE_IMG_GEN,
  NODE_SEQUENCE,
  NODE_CONDITION,
  NODE_FAILED,
} from "./enrichedMockData";

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

function PipeStory({ node }: { node: (typeof ENRICHED_SPEC.nodes)[0] }) {
  return (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <PipeDetailPanel node={node} spec={ENRICHED_SPEC} />
    </DetailPanel>
  );
}

export const PipeLLM: Story = {
  name: "PipeLLM",
  render: () => <PipeStory node={NODE_LLM} />,
};

export const PipeImgGen: Story = {
  name: "PipeImgGen",
  render: () => <PipeStory node={NODE_IMG_GEN} />,
};

export const PipeSequence: Story = {
  name: "PipeSequence",
  render: () => <PipeStory node={NODE_SEQUENCE} />,
};

export const PipeCondition: Story = {
  name: "PipeCondition",
  render: () => <PipeStory node={NODE_CONDITION} />,
};

export const FailedPipe: Story = {
  name: "Failed Pipe",
  render: () => <PipeStory node={NODE_FAILED} />,
};
