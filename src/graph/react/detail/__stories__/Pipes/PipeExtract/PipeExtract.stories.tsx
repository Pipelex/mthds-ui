import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ENRICHED_SPEC, NODE_EXTRACT_CV } from "../../enrichedMockData";
import { PipeStory, detailPanelDecorator, detailPanelParameters } from "../../_shared";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipes/PipeExtract",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

export const ExtractCV: Story = {
  render: () => <PipeStory node={NODE_EXTRACT_CV} spec={ENRICHED_SPEC} />,
};
