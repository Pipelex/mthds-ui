import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ENRICHED_SPEC, NODE_GENERATE_CARD } from "../../enrichedMockData";
import { PipeStory, detailPanelDecorator, detailPanelParameters } from "../../_shared";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipes/PipeImgGen",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

export const GenerateCard: Story = {
  render: () => <PipeStory node={NODE_GENERATE_CARD} spec={ENRICHED_SPEC} />,
};
