import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import {
  ENRICHED_SPEC,
  NODE_ANALYZE_CANDIDATE,
  NODE_SCORE_MATCH,
  NODE_FAILED,
} from "../../enrichedMockData";
import { PipeStory, detailPanelDecorator, detailPanelParameters } from "../../_shared";

const meta: Meta = {
  title: "Misc/Detail Panel/Pipes/PipeLLM",
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

/**
 * A pipe the run failed in: its problem document, read by its core members
 * alone, first in the panel, and nothing of the runtime's own members.
 */
export const Failed: Story = {
  render: () => <PipeStory node={NODE_FAILED} spec={ENRICHED_SPEC} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByText("The provider is rate limiting this deployment")).toBeVisible();
    expect(canvas.getByText("provider.rate_limited")).toBeVisible();
    expect(canvas.getByText(/is rate limiting this deployment's calls/)).toBeVisible();
    expect(canvas.getByText("Failed in")).toBeVisible();
    expect(canvas.getByText("broken_pipe (this pipe)")).toBeVisible();
    expect(canvas.getByText("cv_screening › broken_pipe")).toBeVisible();
    expect(canvas.getByText("Next step")).toBeVisible();
    expect(canvas.getByText("Wait, then run the method again.")).toBeVisible();
    expect(canvas.queryByText(/Traceback/)).toBeNull();
  },
};
