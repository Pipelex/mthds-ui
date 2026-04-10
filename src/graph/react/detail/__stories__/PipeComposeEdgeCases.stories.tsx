/**
 * PipeCompose edge cases for the detail panel.
 *
 * PipeCompose has two mutually exclusive modes (from pipelex/pipe_compose_blueprint.py):
 *
 * 1. TEMPLATE MODE — `blueprint.template` is a Jinja2 string, `construct_blueprint` is null.
 *    Output must be Text-compatible. The entire output is a single rendered string.
 *
 * 2. CONSTRUCT MODE — `blueprint.template` is null, `construct_blueprint` has a `fields` map.
 *    Output is a structured Pydantic model. Each field uses one of 4 methods:
 *      - `fixed`    → literal value (string, number, bool, list)
 *      - `from_var` → dotted path into working memory, optionally list→dict keyed by attribute
 *      - `template` → per-field Jinja2 template
 *      - `nested`   → recursive construct blueprint
 *
 * These stories exercise every mode + method combination, plus the runtime execution data
 * path (`execution_data.resolved_fields`) that the worker emits after a successful run.
 *
 * Paired with the pipelex-side test: tests/unit/pipelex/core/pipes/test_execution_data_coverage.py
 */

import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DetailPanel } from "../DetailPanel";
import { PipeDetailPanel } from "../PipeDetailPanel";
import type {
  GraphSpec,
  GraphSpecNode,
  PipeBlueprintUnion,
  PipeComposeConstructBlueprint,
} from "@graph/types";

const meta: Meta = {
  title: "Graph/Detail Panel/PipeCompose Edge Cases",
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 380, height: 700, position: "relative", background: "#0a0a0f" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

// ─── Fixture builders ──────────────────────────────────────────────────────

const DOMAIN = "cv_screener";
const PIPE_CODE = "write_refusal_email";
const PIPE_KEY = `${DOMAIN}.${PIPE_CODE}`;
const NODE_ID = "run_001:node_compose";

/** Minimal concept definition used by every story. */
function makeMatchAssessmentConcept() {
  return {
    code: "MatchAssessment",
    domain_code: DOMAIN,
    description: "Assessment of how well a CV matches a job offer",
    structure_class_name: `${DOMAIN}__MatchAssessment`,
    refines: null,
  };
}

function makeCandidateResultConcept() {
  return {
    code: "CandidateResult",
    domain_code: DOMAIN,
    description: "Final result for a candidate screening",
    structure_class_name: `${DOMAIN}__CandidateResult`,
    refines: null,
  };
}

/** Build a PipeCompose blueprint. Caller provides one of `template` or `construct_blueprint`. */
function makeComposeBlueprint(opts: {
  description?: string;
  template?: string | null;
  construct_blueprint?: PipeComposeConstructBlueprint | null;
  textOutput?: boolean;
}): PipeBlueprintUnion {
  return {
    pipe_category: "PipeOperator",
    type: "PipeCompose",
    code: PIPE_CODE,
    domain_code: DOMAIN,
    description: opts.description ?? "Compose a professional refusal email for a non-matching candidate",
    inputs: {
      match_assessment: {
        concept: makeMatchAssessmentConcept(),
        multiplicity: null,
      },
    },
    output: {
      concept: opts.textOutput
        ? {
            code: "Text",
            domain_code: "native",
            description: "Plain text",
            structure_class_name: "TextContent",
            refines: null,
          }
        : makeCandidateResultConcept(),
      multiplicity: null,
    },
    template: opts.template ?? null,
    templating_style: null,
    category: "basic",
    extra_context: null,
    construct_blueprint: opts.construct_blueprint ?? null,
    // Fields below are required by the discriminated union but unused for PipeCompose.
  } as unknown as PipeBlueprintUnion;
}

/** Build a minimal GraphSpecNode + GraphSpec pair wiring a blueprint to a node. */
function makeStoryProps(
  blueprint: PipeBlueprintUnion,
  execution_data?: Record<string, unknown>,
): { node: GraphSpecNode; spec: GraphSpec } {
  const node: GraphSpecNode = {
    id: NODE_ID,
    kind: "operator",
    pipe_code: PIPE_CODE,
    pipe_type: "PipeCompose",
    status: "succeeded",
    timing: {
      started_at: "2026-04-10T16:00:00.000000Z",
      ended_at: "2026-04-10T16:00:00.042000Z",
      duration: 0.042,
    },
    io: { inputs: [], outputs: [] },
    error: null,
    tags: {},
    metrics: {},
    ...(execution_data ? { execution_data } : {}),
  } as unknown as GraphSpecNode;

  const spec: GraphSpec = {
    graph_id: "run_001",
    created_at: "2026-04-10T16:00:00.000000Z",
    pipeline_ref: { domain: DOMAIN, main_pipe: PIPE_CODE },
    nodes: [node],
    edges: [],
    meta: {},
    pipe_registry: { [PIPE_KEY]: blueprint as unknown as Record<string, unknown> } as unknown as GraphSpec["pipe_registry"],
    concept_registry: {},
  } as GraphSpec;

  return { node, spec };
}

function PipeStory({ node, spec }: { node: GraphSpecNode; spec: GraphSpec }) {
  return (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <PipeDetailPanel node={node} spec={spec} />
    </DetailPanel>
  );
}

// ─── Sample data ───────────────────────────────────────────────────────────

const SHORT_TEMPLATE = "Candidate {{ match_assessment.candidate_name|format() }} did not match.";

const LONG_TEMPLATE = `Dear $match_assessment.candidate_name,

Thank you for taking the time to apply for this position. We appreciate your interest in joining our team and the effort you put into your application.

After careful consideration, we have decided to move forward with other candidates whose experience more closely aligns with the specific requirements of this role at this time.

We were impressed by your professional background and encourage you to keep an eye on our careers page for future opportunities that may be a better fit for your skills and experience.

We wish you all the best in your job search and future career endeavors.

Kind regards,

The Talent Acquisition Team`;

const RENDERED_LONG_TEMPLATE = LONG_TEMPLATE.replaceAll("$match_assessment.candidate_name", "John Doe");

const LONG_RATIONALE = `John Doe's CV shows no alignment with the Vice President, Enterprise Sales position at ACME. The candidate's background is entirely in retail sales and spa services at entry-level positions (Sales Associate, Spa Consultant, Fashion Representative), with experience from 2006-2011. The role requires 12+ years of progressive B2B sales experience with at least 5 years in VP-level leadership roles, managing $100M+ ARR quotas, and leading 50+ person enterprise sales teams. John Doe has no demonstrated experience in: (1) B2B or enterprise software sales, (2) any leadership or management roles, (3) SaaS or technology sales, (4) Fortune 500 client engagement, (5) team building or scaling, or (6) strategic revenue accountability.`;

// ─── 1. Template mode ──────────────────────────────────────────────────────

/** Template mode with a short one-line template. No runtime data. */
export const TemplateModeShort: Story = {
  name: "Template Mode / Short Template",
  render: () => {
    const blueprint = makeComposeBlueprint({
      description: "Compose a one-line status message for the candidate",
      template: SHORT_TEMPLATE,
      textOutput: true,
    });
    const { node, spec } = makeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};

/** Template mode with a long multi-line refusal-email-style template. No runtime data. */
export const TemplateModeLong: Story = {
  name: "Template Mode / Long Multi-line Template",
  render: () => {
    const blueprint = makeComposeBlueprint({
      template: LONG_TEMPLATE,
      textOutput: true,
    });
    const { node, spec } = makeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};

/** Template mode with runtime `rendered_text` so the PromptToggle can switch between
 *  template and rendered. Default view should show rendered. */
export const TemplateModeWithRendered: Story = {
  name: "Template Mode / With Rendered Text",
  render: () => {
    const blueprint = makeComposeBlueprint({
      template: LONG_TEMPLATE,
      textOutput: true,
    });
    const { node, spec } = makeStoryProps(blueprint, {
      compose_mode: "template",
      rendered_text: RENDERED_LONG_TEMPLATE,
    });
    return <PipeStory node={node} spec={spec} />;
  },
};

// ─── 2. Construct mode — single method ─────────────────────────────────────

/** Construct mode with only `fixed` fields (literal values of different types). */
export const ConstructFixedOnly: Story = {
  name: "Construct / Fixed Only",
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
    const { node, spec } = makeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};

/** Construct mode with only `from_var` fields (dotted paths into working memory). */
export const ConstructFromVarOnly: Story = {
  name: "Construct / FromVar Only",
  render: () => {
    const blueprint = makeComposeBlueprint({
      construct_blueprint: {
        fields: {
          candidate_name: { method: "from_var", from_path: "match_assessment.candidate_name" },
          rationale: { method: "from_var", from_path: "match_assessment.rationale" },
          strengths: {
            method: "from_var",
            from_path: "match_assessment.strengths",
            list_to_dict_keyed_by: "title",
          },
        },
      },
    });
    const { node, spec } = makeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};

/** Construct mode with only `template` fields. Each field has its own Jinja2 template. */
export const ConstructTemplateOnly: Story = {
  name: "Construct / Template Only",
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
            template: LONG_TEMPLATE,
          },
        },
      },
    });
    const { node, spec } = makeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};

/** Construct mode with a `nested` field that builds a sub-object. */
export const ConstructNested: Story = {
  name: "Construct / Nested",
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
                  template: "Consider roles closer to $match_assessment.candidate_name's background.",
                },
              },
            },
          },
        },
      },
    });
    const { node, spec } = makeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};

// ─── 3. Construct mode — mixed methods ─────────────────────────────────────

/** Construct mode with all 4 methods (fixed, from_var, template, nested). */
export const ConstructMixed: Story = {
  name: "Construct / All 4 Methods",
  render: () => {
    const blueprint = makeComposeBlueprint({
      construct_blueprint: {
        fields: {
          candidate_name: { method: "from_var", from_path: "match_assessment.candidate_name" },
          verdict: { method: "fixed", fixed_value: "no_match" },
          rationale: { method: "from_var", from_path: "match_assessment.rationale" },
          interview_questions: { method: "fixed", fixed_value: [] },
          refusal_email: { method: "template", template: LONG_TEMPLATE },
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
    const { node, spec } = makeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};

// ─── 4. Construct mode with runtime execution data ─────────────────────────

/** Construct mode + `resolved_fields` with short runtime values only.
 *  Each non-template field renders as a KV row with the resolved value. */
export const ConstructResolvedShort: Story = {
  name: "Construct / Resolved / Short Values",
  render: () => {
    const blueprint = makeComposeBlueprint({
      construct_blueprint: {
        fields: {
          candidate_name: { method: "from_var", from_path: "match_assessment.candidate_name" },
          verdict: { method: "fixed", fixed_value: "no_match" },
          score: { method: "from_var", from_path: "match_assessment.score" },
          interview_questions: { method: "fixed", fixed_value: [] },
        },
      },
    });
    const { node, spec } = makeStoryProps(blueprint, {
      compose_mode: "construct",
      resolved_fields: {
        candidate_name: "John Doe",
        verdict: "no_match",
        score: 2,
        interview_questions: [],
      },
    });
    return <PipeStory node={node} spec={spec} />;
  },
};

/** THE BUG CASE: Construct mode + `resolved_fields` with a long multi-line rationale.
 *
 *  Before the fix: the rationale overflowed the KV row and the label drifted to the
 *  middle of the wrapped block, producing a broken layout.
 *
 *  After the fix: long values render as a `FieldBlock` (labeled scrollable text box)
 *  instead of a KV row. Short values (candidate_name, verdict) still render as KV. */
export const ConstructResolvedLongRationale: Story = {
  name: "Construct / Resolved / Long Rationale (was broken)",
  render: () => {
    const blueprint = makeComposeBlueprint({
      construct_blueprint: {
        fields: {
          candidate_name: { method: "from_var", from_path: "match_assessment.candidate_name" },
          verdict: { method: "fixed", fixed_value: "no_match" },
          rationale: { method: "from_var", from_path: "match_assessment.rationale" },
          interview_questions: { method: "fixed", fixed_value: [] },
          refusal_email: { method: "template", template: LONG_TEMPLATE },
        },
      },
    });
    const { node, spec } = makeStoryProps(blueprint, {
      compose_mode: "construct",
      resolved_fields: {
        candidate_name: "John Doe",
        verdict: "no_match",
        rationale: LONG_RATIONALE,
        interview_questions: [],
        refusal_email: RENDERED_LONG_TEMPLATE,
      },
    });
    return <PipeStory node={node} spec={spec} />;
  },
};

/** Construct mode + template field with both template and rendered, via `resolved_fields`.
 *  PromptToggle should let the user switch between the raw template and the Jinja-rendered result. */
export const ConstructResolvedTemplateField: Story = {
  name: "Construct / Resolved / Template Field with Rendered",
  render: () => {
    const blueprint = makeComposeBlueprint({
      construct_blueprint: {
        fields: {
          candidate_name: { method: "from_var", from_path: "match_assessment.candidate_name" },
          body: { method: "template", template: LONG_TEMPLATE },
        },
      },
    });
    const { node, spec } = makeStoryProps(blueprint, {
      compose_mode: "construct",
      resolved_fields: {
        candidate_name: "John Doe",
        body: RENDERED_LONG_TEMPLATE,
      },
    });
    return <PipeStory node={node} spec={spec} />;
  },
};

// ─── 5. Degenerate cases ───────────────────────────────────────────────────

/** Edge case: a template field with an empty string. PromptToggle should render
 *  nothing (it returns null when both templateText and renderedText are falsy),
 *  and the field should NOT appear as a `(template)` KV fallback. Regression test
 *  for PR #23 review comment from greptile + cubic-dev-ai. */
export const ConstructEmptyTemplateField: Story = {
  name: "Construct / Empty Template Field (regression)",
  render: () => {
    const blueprint = makeComposeBlueprint({
      construct_blueprint: {
        fields: {
          candidate_name: { method: "from_var", from_path: "match_assessment.candidate_name" },
          body: { method: "template", template: "" },
        },
      },
    });
    const { node, spec } = makeStoryProps(blueprint);
    return <PipeStory node={node} spec={spec} />;
  },
};
