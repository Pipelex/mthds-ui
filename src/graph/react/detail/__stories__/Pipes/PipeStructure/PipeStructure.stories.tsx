/**
 * PipeStructure detail panel.
 *
 * PipeStructure is an LLM-backed operator that turns a single Text input into a
 * structured concept. These stories lock in the behaviour fixed in the detail
 * panel review:
 *   - an inline `llm_choice` object still yields a Model row (#2),
 *   - the always-constant `structuring_path: "structure"` row is gone (#3),
 *   - runtime data is not dropped when the blueprint fails to resolve (#1),
 *   - and a resolved blueprint shows the data once, with no duplicate dump (#4).
 */

import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { within, expect } from "storybook/test";
import {
  PipeStory,
  detailPanelDecorator,
  detailPanelParameters,
  makeStructureBlueprint,
  makeStructureStoryProps,
} from "../../_shared";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipes/PipeStructure",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

/** #2 — an inline LLMSetting object (no resolved_model) still surfaces a Model row. */
export const InlineLlmChoice: Story = {
  name: "Inline llm_choice object → Model row",
  render: () => {
    const blueprint = makeStructureBlueprint({
      llm_choice: { model: "gpt-4o", temperature: 0.5, max_tokens: null },
    });
    // No execution_data: a pre-execution / dry-run view, so the only model
    // source is the inline llm_choice object.
    const { node, spec } = makeStructureStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByText("Model")).toBeInTheDocument();
    expect(canvas.getByText("gpt-4o")).toBeInTheDocument();
  },
};

/** #3 — the hardcoded `structuring_path: "structure"` must not render a row. */
export const NoStructuringRow: Story = {
  name: "No constant Structuring row",
  render: () => {
    const blueprint = makeStructureBlueprint({ llm_choice: "base_claude_4_sonnet" });
    const { node, spec } = makeStructureStoryProps(blueprint, {
      resolved_model: "claude-sonnet-4",
      is_multiple_output: false,
      rendered_user_prompt: "Structure the following assessment text into a MatchAssessment.",
      structuring_path: "structure",
    });
    return <PipeStory node={node} spec={spec} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The other rows still render; resolved_model wins for Model.
    expect(await canvas.findByText("Model")).toBeInTheDocument();
    expect(canvas.getByText("claude-sonnet-4")).toBeInTheDocument();
    expect(canvas.queryByText("Structuring")).toBeNull();
  },
};

/** #1 — when the blueprint can't be resolved, runtime data falls back to the
 *  generic execution dump instead of vanishing. */
export const UnresolvedBlueprint: Story = {
  name: "Unresolved blueprint → generic Execution dump",
  render: () => {
    const blueprint = makeStructureBlueprint({ llm_choice: "base_claude" });
    const { node, spec } = makeStructureStoryProps(
      blueprint,
      {
        resolved_model: "claude-sonnet-4",
        is_multiple_output: false,
        rendered_user_prompt: "Structure the assessment text.",
        structuring_path: "structure",
      },
      { registerBlueprint: false },
    );
    return <PipeStory node={node} spec={spec} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Per-type section never mounts (no blueprint)...
    expect(await canvas.findByText("Blueprint not available")).toBeInTheDocument();
    // ...but the runtime values still surface via the generic dump.
    expect(canvas.getByText("Execution")).toBeInTheDocument();
    expect(canvas.getByText("resolved_model")).toBeInTheDocument();
  },
};

/** #4 — a resolved blueprint shows runtime data once (in the section); there is
 *  no duplicate generic Execution dump. */
export const Resolved: Story = {
  name: "Resolved blueprint → no duplicate Execution dump",
  render: () => {
    const blueprint = makeStructureBlueprint({
      llm_choice: "base_claude",
      output_multiplicity: true,
    });
    const { node, spec } = makeStructureStoryProps(blueprint, {
      resolved_model: "claude-sonnet-4",
      is_multiple_output: true,
      rendered_user_prompt: "Structure the assessment text.",
      structuring_path: "structure",
    });
    return <PipeStory node={node} spec={spec} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByText("Model")).toBeInTheDocument();
    // No separate generic dump: data is merged into the section.
    expect(canvas.queryByText("Execution")).toBeNull();
    expect(canvas.queryByText("resolved_model")).toBeNull();
  },
};
