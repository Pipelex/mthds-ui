/**
 * PipeCompose / Construct mode / With rendered template fields
 *
 * `template` is the only construct method where the pipe actually computes
 * something new at runtime — it Jinja2-renders the template against working
 * memory and the rendered string becomes the field's value. The pipelex worker
 * emits the rendered text in `execution_data.resolved_fields[fieldName]`, and
 * each template field gets its own `PromptToggle` so the user can switch
 * between the template and its rendered output.
 *
 * The other 3 methods (`fixed`, `from_var`, `nested`) intentionally do NOT
 * surface runtime data on the pipe — `fixed` values live in the blueprint and
 * `from_var` values live in the input stuff node. The pipe detail panel shows
 * the field contract (`= literal`, `← path`, `(nested construct)`), not the
 * data flowing through.
 */

import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  PipeStory,
  detailPanelDecorator,
  detailPanelParameters,
  makeComposeBlueprint,
  makeComposeStoryProps,
  LONG_COMPOSE_TEMPLATE,
  RENDERED_LONG_COMPOSE_TEMPLATE,
  HUGE_COMPOSE_TEMPLATE,
  RENDERED_HUGE_COMPOSE_TEMPLATE,
} from "../../_shared";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipes/PipeCompose/Construct - Rendered Templates",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

export const SingleTemplateField: Story = {
  name: "One template field with rendered output",
  render: () => {
    const blueprint = makeComposeBlueprint({
      construct_blueprint: {
        fields: {
          candidate_name: { method: "from_var", from_path: "match_assessment.candidate_name" },
          verdict: { method: "fixed", fixed_value: "no_match" },
          body: { method: "template", template: LONG_COMPOSE_TEMPLATE },
        },
      },
    });
    const { node, spec } = makeComposeStoryProps(blueprint, {
      compose_mode: "construct",
      resolved_fields: {
        body: RENDERED_LONG_COMPOSE_TEMPLATE,
      },
    });
    return <PipeStory node={node} spec={spec} />;
  },
};

export const MultipleTemplateFieldsRendered: Story = {
  name: "Multiple template fields, all rendered",
  render: () => {
    const subjectTemplate = "Update on your application — $match_assessment.candidate_name";
    const headerTemplate = `Reference: $match_assessment.reference_id
Verdict: $match_assessment.evaluation.final.decision.verdict_code_normalized
Confidence: $match_assessment.evaluation.final.decision.confidence_score_zero_to_one`;

    const blueprint = makeComposeBlueprint({
      description:
        "Compose a multi-section refusal email with several template fields, each rendered against working memory",
      construct_blueprint: {
        fields: {
          candidate_name: { method: "from_var", from_path: "match_assessment.candidate_name" },
          verdict: { method: "fixed", fixed_value: "no_match" },
          subject_line: { method: "template", template: subjectTemplate },
          header_block: { method: "template", template: headerTemplate },
          body: { method: "template", template: LONG_COMPOSE_TEMPLATE },
        },
      },
    });
    const { node, spec } = makeComposeStoryProps(blueprint, {
      compose_mode: "construct",
      resolved_fields: {
        subject_line: "Update on your application — John Doe",
        header_block: `Reference: ACME-2026-Q2-04877
Verdict: no_match
Confidence: 0.07`,
        body: RENDERED_LONG_COMPOSE_TEMPLATE,
      },
    });
    return <PipeStory node={node} spec={spec} />;
  },
};

export const HugeTemplateRendered: Story = {
  name: "HUGE template field with rendered (long-form refusal email)",
  render: () => {
    const blueprint = makeComposeBlueprint({
      description:
        "Compose a long-form refusal email with multi-paragraph template rendered against working memory",
      construct_blueprint: {
        fields: {
          candidate_name: {
            method: "from_var",
            from_path: "match_assessment.candidate.personal.full_legal_name",
          },
          verdict: { method: "fixed", fixed_value: "no_match" },
          body: { method: "template", template: HUGE_COMPOSE_TEMPLATE },
        },
      },
    });
    const { node, spec } = makeComposeStoryProps(blueprint, {
      compose_mode: "construct",
      resolved_fields: {
        body: RENDERED_HUGE_COMPOSE_TEMPLATE,
      },
    });
    return <PipeStory node={node} spec={spec} />;
  },
};
