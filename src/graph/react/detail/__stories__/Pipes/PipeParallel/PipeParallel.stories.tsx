import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ENRICHED_SPEC, NODE_ENRICH_CANDIDATE } from "../../enrichedMockData";
import { PipeStory, detailPanelDecorator, detailPanelParameters } from "../../_shared";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipes/PipeParallel",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

export const EnrichCandidate: Story = {
  render: () => <PipeStory node={NODE_ENRICH_CANDIDATE} spec={ENRICHED_SPEC} />,
};
