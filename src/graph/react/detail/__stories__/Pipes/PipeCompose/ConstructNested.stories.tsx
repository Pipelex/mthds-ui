/**
 * PipeCompose / Construct mode / Nested
 *
 * One field uses `method: "nested"` with a recursive `PipeComposeConstructBlueprint`,
 * mirroring the recursive ConstructFieldBlueprint.nested in pipelex. The nested
 * sub-construct can itself contain any of the 4 methods.
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
  HUGE_COMPOSE_TEMPLATE,
} from "../../_shared";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipes/PipeCompose/Construct - Nested",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

export const Nested: Story = {
  name: "Nested Sub-construct",
  render: () => {
    const blueprint = makeComposeBlueprint({
      construct_blueprint: {
        fields: {
          candidate_name: { method: "from_var", from_path: "match_assessment.candidate_name" },
          verdict: { method: "fixed", fixed_value: "no_match" },
          summary: {
            method: "nested",
            nested: {
              fields: {
                headline: { method: "fixed", fixed_value: "No match" },
                rationale: { method: "from_var", from_path: "match_assessment.rationale" },
                suggestion: {
                  method: "template",
                  template:
                    "Consider roles closer to $match_assessment.candidate_name's background.",
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

export const HugeNested: Story = {
  name: "HUGE Deeply Nested (4 levels deep, all methods)",
  render: () => {
    const blueprint = makeComposeBlueprint({
      description:
        "Compose a candidate dossier with a 4-level deeply-nested structure: candidate → assessment → recommendation → metadata, exercising all 4 construct methods at every level",
      construct_blueprint: {
        fields: {
          schema_version: { method: "fixed", fixed_value: "candidate_dossier.v3.production" },
          generated_at_iso: {
            method: "from_var",
            from_path: "match_assessment.generated_at_iso_8601",
          },
          candidate: {
            method: "nested",
            nested: {
              fields: {
                full_name: {
                  method: "from_var",
                  from_path: "match_assessment.candidate.personal.full_legal_name",
                },
                primary_email: {
                  method: "from_var",
                  from_path: "match_assessment.candidate.personal.contact.primary_email_address",
                },
                personal_summary_long_form: { method: "fixed", fixed_value: HUGE_RATIONALE },
                contact_card: {
                  method: "nested",
                  nested: {
                    fields: {
                      preferred_communication_channel: {
                        method: "fixed",
                        fixed_value: "email",
                      },
                      preferred_pronouns: {
                        method: "from_var",
                        from_path: "match_assessment.candidate.personal.preferred_pronouns",
                      },
                      city: {
                        method: "from_var",
                        from_path: "match_assessment.candidate.personal.contact.location.city_name",
                      },
                      country_iso_alpha_2: {
                        method: "from_var",
                        from_path:
                          "match_assessment.candidate.personal.contact.location.country_iso_alpha_2",
                      },
                      mailing_label: {
                        method: "template",
                        template: `$match_assessment.candidate.personal.full_legal_name
$match_assessment.candidate.personal.contact.location.street_line_1
$match_assessment.candidate.personal.contact.location.street_line_2
$match_assessment.candidate.personal.contact.location.city_name, $match_assessment.candidate.personal.contact.location.region_or_state $match_assessment.candidate.personal.contact.location.postal_code
$match_assessment.candidate.personal.contact.location.country_official_name`,
                      },
                    },
                  },
                },
              },
            },
          },
          assessment: {
            method: "nested",
            nested: {
              fields: {
                verdict: { method: "fixed", fixed_value: "no_match" },
                confidence: { method: "fixed", fixed_value: 0.07 },
                long_form_rationale: { method: "fixed", fixed_value: HUGE_RATIONALE },
                evidence: {
                  method: "nested",
                  nested: {
                    fields: {
                      requirements_satisfied_count: { method: "fixed", fixed_value: 0 },
                      requirements_total_count: { method: "fixed", fixed_value: 11 },
                      requirements_missing_list: {
                        method: "from_var",
                        from_path:
                          "match_assessment.evaluation.requirements_missing_canonical_list",
                        list_to_dict_keyed_by: "requirement_canonical_id",
                      },
                      reviewer_notes_long_form: {
                        method: "template",
                        template: `Reviewer cohort: $match_assessment.reviewer_cohort_label

The candidate's profile was evaluated against the role rubric for $match_assessment.role_canonical_title. Of the $match_assessment.evaluation.requirements_total_count enumerated requirements, $match_assessment.evaluation.requirements_satisfied_count were satisfied. The verdict $match_assessment.evaluation.final.decision.verdict_code_normalized falls within the auto-decline confidence band defined in the screening configuration for this role family. Recommended next action: send the polite refusal email below and tag the candidate record with do_not_re_engage_for_role_family=$match_assessment.role_family_canonical_id with a re_engage_after_iso of $match_assessment.re_engage_after_iso.`,
                      },
                    },
                  },
                },
              },
            },
          },
          recommendation: {
            method: "nested",
            nested: {
              fields: {
                action: { method: "fixed", fixed_value: "send_decline_email" },
                template_to_use: { method: "fixed", fixed_value: "decline.long_form.v3" },
                email_body_template: {
                  method: "template",
                  template: HUGE_COMPOSE_TEMPLATE,
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
