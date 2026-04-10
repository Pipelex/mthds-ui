import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ENRICHED_SPEC,
  NODE_ANALYZE_CANDIDATE,
  NODE_SCORE_MATCH,
  NODE_FAILED,
} from "../../enrichedMockData";
import { PipeStory, detailPanelDecorator, detailPanelParameters } from "../../_shared";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipes/PipeLLM",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

export const Analyze: Story = {
  name: "Analyze (happy path)",
  render: () => <PipeStory node={NODE_ANALYZE_CANDIDATE} spec={ENRICHED_SPEC} />,
};

export const Score: Story = {
  render: () => <PipeStory node={NODE_SCORE_MATCH} spec={ENRICHED_SPEC} />,
};

export const Failed: Story = {
  render: () => <PipeStory node={NODE_FAILED} spec={ENRICHED_SPEC} />,
};
