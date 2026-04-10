/**
 * PipeCompose / Template Mode
 *
 * In template mode, `blueprint.template` holds a single Jinja2 string that
 * produces the entire output (which must be Text-compatible). `construct_blueprint`
 * is null. Mirrors `[pipe.X] template = "..."` in MTHDS.
 *
 * Three stories:
 *   - Short: a one-line template, no runtime data
 *   - Long: a multi-line refusal-email-style template, no runtime data
 *   - With Rendered: long template + `execution_data.rendered_text` so the
 *     PromptToggle can switch between template and rendered
 */

import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  PipeStory,
  detailPanelDecorator,
  detailPanelParameters,
  makeComposeBlueprint,
  makeComposeStoryProps,
  SHORT_COMPOSE_TEMPLATE,
  LONG_COMPOSE_TEMPLATE,
  RENDERED_LONG_COMPOSE_TEMPLATE,
  HUGE_COMPOSE_TEMPLATE,
  RENDERED_HUGE_COMPOSE_TEMPLATE,
} from "../../_shared";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipes/PipeCompose/Template Mode",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

export const ShortTemplate: Story = {
  render: () => {
    const blueprint = makeComposeBlueprint({
      description: "Compose a one-line status message for the candidate",
      template: SHORT_COMPOSE_TEMPLATE,
      textOutput: true,
    });
    const { node, spec } = makeComposeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};

export const LongTemplate: Story = {
  name: "Long Multi-line Template",
  render: () => {
    const blueprint = makeComposeBlueprint({
      template: LONG_COMPOSE_TEMPLATE,
      textOutput: true,
    });
    const { node, spec } = makeComposeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};

export const WithRendered: Story = {
  name: "Long Template + Rendered",
  render: () => {
    const blueprint = makeComposeBlueprint({
      template: LONG_COMPOSE_TEMPLATE,
      textOutput: true,
    });
    const { node, spec } = makeComposeStoryProps(blueprint, {
      compose_mode: "template",
      rendered_text: RENDERED_LONG_COMPOSE_TEMPLATE,
    });
    return <PipeStory node={node} spec={spec} />;
  },
};

export const HugeTemplate: Story = {
  name: "HUGE Multi-paragraph Template",
  render: () => {
    const blueprint = makeComposeBlueprint({
      description:
        "Compose a long-form refusal email with multiple paragraphs of context, encouragement, and forward-looking guidance",
      template: HUGE_COMPOSE_TEMPLATE,
      textOutput: true,
    });
    const { node, spec } = makeComposeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};

export const HugeWithRendered: Story = {
  name: "HUGE Template + Rendered",
  render: () => {
    const blueprint = makeComposeBlueprint({
      description:
        "Compose a long-form refusal email with multiple paragraphs of context, encouragement, and forward-looking guidance",
      template: HUGE_COMPOSE_TEMPLATE,
      textOutput: true,
    });
    const { node, spec } = makeComposeStoryProps(blueprint, {
      compose_mode: "template",
      rendered_text: RENDERED_HUGE_COMPOSE_TEMPLATE,
    });
    return <PipeStory node={node} spec={spec} />;
  },
};
