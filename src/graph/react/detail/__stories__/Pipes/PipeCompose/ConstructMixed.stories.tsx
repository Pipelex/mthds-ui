/**
 * PipeCompose / Construct mode / All 4 methods mixed
 *
 * One blueprint exercising all 4 ConstructFieldMethod variants in a single
 * field map: fixed, from_var, template, nested. Closest analog to a real-world
 * `[pipe.X.construct]` block in MTHDS.
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
  HUGE_RATIONALE,
  HUGE_INTERVIEW_QUESTIONS,
  HUGE_FIXED_OBJECT,
} from "../../_shared";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipes/PipeCompose/Construct - Mixed (all 4)",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

export const Mixed: Story = {
  name: "All 4 methods",
  render: () => {
    const blueprint = makeComposeBlueprint({
      construct_blueprint: {
        fields: {
          candidate_name: { method: "from_var", from_path: "match_assessment.candidate_name" },
          verdict: { method: "fixed", fixed_value: "no_match" },
          rationale: { method: "from_var", from_path: "match_assessment.rationale" },
          interview_questions: { method: "fixed", fixed_value: [] },
          refusal_email: { method: "template", template: LONG_COMPOSE_TEMPLATE },
          metadata: {
            method: "nested",
            nested: {
              fields: {
                source: { method: "fixed", fixed_value: "auto_screening" },
                score: { method: "fixed", fixed_value: 0 },
              },
            },
          },
        },
      },
    });
    const { node, spec } = makeComposeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};

export const HugeMixed: Story = {
  name: "HUGE Mix (long fixed values, deep paths, big template, nested)",
  render: () => {
    const blueprint = makeComposeBlueprint({
      description:
        "Compose a candidate dossier exercising all 4 construct methods at scale: long-form fixed values, deeply-nested from_var paths, multi-paragraph templates, and a nested sub-construct with all methods inside",
      construct_blueprint: {
        fields: {
          schema_version: { method: "fixed", fixed_value: "candidate_dossier.v3.production" },
          pipeline_config: { method: "fixed", fixed_value: HUGE_FIXED_OBJECT },
          long_form_rationale_paragraph: { method: "fixed", fixed_value: HUGE_RATIONALE },
          interview_question_bank: { method: "fixed", fixed_value: HUGE_INTERVIEW_QUESTIONS },
          candidate_full_legal_name: {
            method: "from_var",
            from_path: "match_assessment.candidate.personal.full_legal_name",
          },
          candidate_primary_email: {
            method: "from_var",
            from_path: "match_assessment.candidate.personal.contact.primary_email_address",
          },
          requirements_satisfied: {
            method: "from_var",
            from_path: "match_assessment.evaluation.requirements_satisfied_canonical_list",
            list_to_dict_keyed_by: "requirement_canonical_id",
          },
          requirements_missing: {
            method: "from_var",
            from_path: "match_assessment.evaluation.requirements_missing_canonical_list",
            list_to_dict_keyed_by: "requirement_canonical_id",
          },
          decline_email_body: { method: "template", template: HUGE_COMPOSE_TEMPLATE },
          internal_notes_for_hiring_manager: {
            method: "template",
            template: `Hiring manager: this candidate was auto-declined for $match_assessment.role_canonical_title. Confidence $match_assessment.evaluation.final.decision.confidence_score_zero_to_one. Reviewer cohort $match_assessment.reviewer_cohort_label. Reply in-thread before $match_assessment.deadline_iso to override; otherwise the email below sends at $match_assessment.scheduled_send_iso.`,
          },
          downstream_routing: {
            method: "nested",
            nested: {
              fields: {
                action: { method: "fixed", fixed_value: "send_decline_email" },
                template_to_use: { method: "fixed", fixed_value: "decline.long_form.v3" },
                target_team_slug: {
                  method: "from_var",
                  from_path:
                    "match_assessment.routing.downstream.destination_team_internal_slug_identifier",
                },
                followup: {
                  method: "nested",
                  nested: {
                    fields: {
                      schedule_in_days: { method: "fixed", fixed_value: 180 },
                      followup_role_family_canonical_id: {
                        method: "from_var",
                        from_path: "match_assessment.routing.followup.role_family_canonical_id",
                      },
                      followup_owner_team_slug: {
                        method: "from_var",
                        from_path: "match_assessment.routing.followup.owner_team_internal_slug",
                      },
                      followup_email_template: {
                        method: "template",
                        template: `Hi $match_assessment.candidate.personal.preferred_first_name,

It has been about six months since we last connected about a role at ACME, and we are reaching out to see whether your circumstances have evolved in a direction that might align more closely with the openings we have available now. We have new positions live across $match_assessment.routing.followup.role_family_canonical_id that may be of interest. If you would like to revisit, simply reply to this message and we will pick up the conversation from there.

Warm regards,
The ACME Talent Acquisition Team`,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const { node, spec } = makeComposeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};
