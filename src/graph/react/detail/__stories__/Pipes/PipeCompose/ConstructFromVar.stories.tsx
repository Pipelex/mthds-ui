/**
 * PipeCompose / Construct mode / FromVar only
 *
 * Every field uses `method: "from_var"` with a dotted path into working memory.
 * One field demonstrates the `list_to_dict_keyed_by` modifier that converts
 * a ListContent to a dict keyed by the named attribute.
 */

import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  PipeStory,
  detailPanelDecorator,
  detailPanelParameters,
  makeComposeBlueprint,
  makeComposeStoryProps,
} from "../../_shared";

const meta: Meta = {
  title: "Graph/Detail Panel/Pipes/PipeCompose/Construct - FromVar Only",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
};

export default meta;
type Story = StoryObj;

export const FromVarOnly: Story = {
  name: "FromVar + list_to_dict_keyed_by",
  render: () => {
    const blueprint = makeComposeBlueprint({
      construct_blueprint: {
        fields: {
          candidate_name: {
            method: "from_var",
            from_path: "match_assessment.candidate_name",
          },
          rationale: {
            method: "from_var",
            from_path: "match_assessment.rationale",
          },
          strengths: {
            method: "from_var",
            from_path: "match_assessment.strengths",
            list_to_dict_keyed_by: "title",
          },
        },
      },
    });
    const { node, spec } = makeComposeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};

export const HugeFromVar: Story = {
  name: "HUGE FromVar (deep paths, long list_to_dict keys, many fields)",
  render: () => {
    const blueprint = makeComposeBlueprint({
      description:
        "Compose a candidate dossier by pulling 14+ fields from working memory, including deeply-nested paths and several list_to_dict_keyed_by collections",
      construct_blueprint: {
        fields: {
          candidate_full_name: {
            method: "from_var",
            from_path: "match_assessment.candidate.personal.full_legal_name",
          },
          candidate_email: {
            method: "from_var",
            from_path: "match_assessment.candidate.personal.contact.primary_email_address",
          },
          candidate_phone_normalized_e164: {
            method: "from_var",
            from_path:
              "match_assessment.candidate.personal.contact.phone_numbers.primary_e164_normalized",
          },
          candidate_linkedin_handle: {
            method: "from_var",
            from_path: "match_assessment.candidate.personal.online_presence.linkedin_handle",
          },
          rationale_long_form_paragraph: {
            method: "from_var",
            from_path: "match_assessment.evaluation.long_form_rationale_paragraph_v2",
          },
          requirements_satisfied: {
            method: "from_var",
            from_path: "match_assessment.evaluation.requirements_satisfied",
            list_to_dict_keyed_by: "requirement_canonical_identifier",
          },
          requirements_missing: {
            method: "from_var",
            from_path: "match_assessment.evaluation.requirements_missing",
            list_to_dict_keyed_by: "requirement_canonical_identifier",
          },
          prior_employers: {
            method: "from_var",
            from_path: "match_assessment.candidate.history.prior_employers_in_chronological_order",
            list_to_dict_keyed_by: "employer_legal_entity_name",
          },
          notable_certifications: {
            method: "from_var",
            from_path: "match_assessment.candidate.credentials.notable_certifications_held",
            list_to_dict_keyed_by: "certification_canonical_id",
          },
          publications_first_author: {
            method: "from_var",
            from_path: "match_assessment.candidate.scholarly.publications_where_first_author",
            list_to_dict_keyed_by: "publication_doi_or_url",
          },
          screening_decision_verdict_code: {
            method: "from_var",
            from_path: "match_assessment.evaluation.final.decision.verdict_code_normalized",
          },
          screening_decision_confidence_score_zero_to_one: {
            method: "from_var",
            from_path: "match_assessment.evaluation.final.decision.confidence_score_zero_to_one",
          },
          screening_secondary_review_required_flag: {
            method: "from_var",
            from_path:
              "match_assessment.evaluation.final.decision.secondary_human_review_is_required",
          },
          downstream_routing_destination_team_slug: {
            method: "from_var",
            from_path:
              "match_assessment.routing.downstream.destination_team_internal_slug_identifier",
          },
        },
      },
    });
    const { node, spec } = makeComposeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};
