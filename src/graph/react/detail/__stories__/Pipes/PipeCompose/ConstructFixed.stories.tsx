/**
 * PipeCompose / Construct mode / Fixed only
 *
 * Every field uses `method: "fixed"` with a literal `fixed_value`. Covers all
 * primitive types pipelex's `ConstructFieldBlueprint.make_from_raw` accepts:
 * string, number, boolean, list. The detail panel should render each as a KV row.
 */

import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  PipeStory,
  detailPanelDecorator,
  detailPanelParameters,
  makeComposeBlueprint,
  makeComposeStoryProps,
  HUGE_RATIONALE,
  HUGE_INTERVIEW_QUESTIONS,
  HUGE_FIXED_OBJECT,
} from "../../_shared";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipes/PipeCompose/Construct - Fixed Only",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

export const FixedOnly: Story = {
  name: "All Primitive Types",
  render: () => {
    const blueprint = makeComposeBlueprint({
      construct_blueprint: {
        fields: {
          verdict: { method: "fixed", fixed_value: "no_match" },
          score: { method: "fixed", fixed_value: 0 },
          reviewed: { method: "fixed", fixed_value: true },
          interview_questions: { method: "fixed", fixed_value: [] },
        },
      },
    });
    const { node, spec } = makeComposeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};

export const HugeFixed: Story = {
  name: "HUGE Fixed Values (long string, big list, deep object)",
  render: () => {
    const blueprint = makeComposeBlueprint({
      description:
        "Compose a candidate result with hardcoded long-form rationale, a 25-question interview bank, and a deeply structured pipeline configuration",
      construct_blueprint: {
        fields: {
          verdict: { method: "fixed", fixed_value: "no_match" },
          score: { method: "fixed", fixed_value: 0.07 },
          reviewed: { method: "fixed", fixed_value: true },
          revision_count: { method: "fixed", fixed_value: 17 },
          rationale: { method: "fixed", fixed_value: HUGE_RATIONALE },
          interview_questions: { method: "fixed", fixed_value: HUGE_INTERVIEW_QUESTIONS },
          pipeline_config: { method: "fixed", fixed_value: HUGE_FIXED_OBJECT },
        },
      },
    });
    const { node, spec } = makeComposeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};
