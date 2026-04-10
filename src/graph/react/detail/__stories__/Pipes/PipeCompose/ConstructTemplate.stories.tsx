/**
 * PipeCompose / Construct mode / Template only
 *
 * Every field uses `method: "template"` with its own per-field Jinja2 template.
 * Each field renders as its own `PromptToggle` labeled `Template — <field>`.
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
  HUGE_COMPOSE_TEMPLATE,
} from "../../_shared";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipes/PipeCompose/Construct - Template Only",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

export const TemplateOnly: Story = {
  name: "Per-field Templates",
  render: () => {
    const blueprint = makeComposeBlueprint({
      construct_blueprint: {
        fields: {
          subject: {
            method: "template",
            template: "Application update for $match_assessment.candidate_name",
          },
          body: {
            method: "template",
            template: LONG_COMPOSE_TEMPLATE,
          },
        },
      },
    });
    const { node, spec } = makeComposeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};

export const HugeTemplateFields: Story = {
  name: "HUGE Per-field Templates (multiple long-form templates)",
  render: () => {
    const subjectLineTemplate =
      "Update on your application for the Vice President, Enterprise Sales position at ACME Industries — submitted by $match_assessment.candidate_name on $match_assessment.application_date";
    const headerTemplate = `Internal screening reference: $match_assessment.reference_id
Pipeline run: $match_assessment.pipeline_run_id
Reviewer cohort: $match_assessment.reviewer_cohort_label
Decision verdict: $match_assessment.evaluation.final.decision.verdict_code_normalized
Confidence: $match_assessment.evaluation.final.decision.confidence_score_zero_to_one`;
    const internalNotesTemplate = `Hiring manager: please note the following before sending the candidate-facing email below.

This decision was reached after a multi-pass evaluation against the role rubric for $match_assessment.role_canonical_title. The model assigned a confidence of $match_assessment.evaluation.final.decision.confidence_score_zero_to_one to the verdict, which is well within the auto-decline band defined in our screening configuration. The candidate's most relevant prior experience was as $match_assessment.candidate.history.most_recent_role_title at $match_assessment.candidate.history.most_recent_employer, which does not meet the seniority floor for this opening.

If you would like to override the auto-decline and route this candidate to a human reviewer, please reply in-thread before $match_assessment.deadline_iso. Otherwise the email below will be sent automatically at $match_assessment.scheduled_send_iso.

— ACME Talent Operations`;
    const body = HUGE_COMPOSE_TEMPLATE;
    const blueprint = makeComposeBlueprint({
      description:
        "Compose a multi-section refusal email with separate subject, header, internal-notes, and body templates",
      construct_blueprint: {
        fields: {
          subject_line: { method: "template", template: subjectLineTemplate },
          header_block: { method: "template", template: headerTemplate },
          internal_notes_for_hiring_manager: {
            method: "template",
            template: internalNotesTemplate,
          },
          body: { method: "template", template: body },
        },
      },
    });
    const { node, spec } = makeComposeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};
