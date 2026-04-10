import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ENRICHED_SPEC, NODE_CV_SCREENING } from "../../enrichedMockData";
import { PipeStory, detailPanelDecorator, detailPanelParameters } from "../../_shared";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipes/PipeSequence",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

export const CVScreening: Story = {
  render: () => <PipeStory node={NODE_CV_SCREENING} spec={ENRICHED_SPEC} />,
};
