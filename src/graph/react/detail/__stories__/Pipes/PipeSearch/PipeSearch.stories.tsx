import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ENRICHED_SPEC, NODE_SEARCH_CANDIDATE } from "../../enrichedMockData";
import { PipeStory, detailPanelDecorator, detailPanelParameters } from "../../_shared";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipes/PipeSearch",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

export const SearchCandidate: Story = {
  render: () => <PipeStory node={NODE_SEARCH_CANDIDATE} spec={ENRICHED_SPEC} />,
};
