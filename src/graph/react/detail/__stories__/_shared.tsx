/**
 * Shared decorator + helpers for Detail Panel stories.
 *
 * Every detail panel story renders the same way: a fixed-size dark surface that
 * mimics the side panel position in pipelex-app, with `DetailPanel` (the
 * resizable container) wrapping a per-pipe-type detail component.
 *
 * The PipeCompose builders here also serve as the canonical TypeScript
 * representation of the `pipe_registry["domain.code"]` shape pipelex emits —
 * if pipelex changes that shape, these helpers fail to typecheck.
 */

import React from "react";
import type { Decorator } from "@storybook/react-vite";
import { DetailPanel } from "../DetailPanel";
import { PipeDetailPanel } from "../PipeDetailPanel";
import type {
  GraphSpec,
  GraphSpecNode,
  PipeBlueprintUnion,
  PipeComposeConstructBlueprint,
} from "@graph/types";

// ─── Story decorator ───────────────────────────────────────────────────────

/** Fixed-size panel surface, dark background, centered layout. Use for every
 *  story under "Graph/Detail Panel/...". */
export const detailPanelDecorator: Decorator = (Story) => (
  <div style={{ width: 380, height: 700, position: "relative", background: "#0a0a0f" }}>
    <Story />
  </div>
);

/** Common Storybook `parameters` for detail panel stories. */
export const detailPanelParameters = { layout: "centered" as const };

// ─── Pipe story wrapper ────────────────────────────────────────────────────

/** Render a single GraphSpecNode + GraphSpec inside the resizable DetailPanel. */
export function PipeStory({ node, spec }: { node: GraphSpecNode; spec: GraphSpec }) {
  return (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <PipeDetailPanel node={node} spec={spec} />
    </DetailPanel>
  );
}

// ─── PipeCompose blueprint builders ────────────────────────────────────────
// These helpers exist so each PipeCompose edge-case story stays focused on the
// case it's exercising, not on plumbing concept refs and pipe_registry keys.

const COMPOSE_DOMAIN = "cv_screener";
const COMPOSE_PIPE_CODE = "write_refusal_email";
const COMPOSE_PIPE_KEY = `${COMPOSE_DOMAIN}.${COMPOSE_PIPE_CODE}`;
const COMPOSE_NODE_ID = "run_001:node_compose";

function makeMatchAssessmentConcept() {
  return {
    code: "MatchAssessment",
    domain_code: COMPOSE_DOMAIN,
    description: "Assessment of how well a CV matches a job offer",
    structure_class_name: `${COMPOSE_DOMAIN}__MatchAssessment`,
    refines: null,
  };
}

function makeCandidateResultConcept() {
  return {
    code: "CandidateResult",
    domain_code: COMPOSE_DOMAIN,
    description: "Final result for a candidate screening",
    structure_class_name: `${COMPOSE_DOMAIN}__CandidateResult`,
    refines: null,
  };
}

/** Build a PipeCompose blueprint. Caller provides one of `template` or `construct_blueprint`. */
export function makeComposeBlueprint(opts: {
  description?: string;
  template?: string | null;
  construct_blueprint?: PipeComposeConstructBlueprint | null;
  textOutput?: boolean;
}): PipeBlueprintUnion {
  return {
    pipe_category: "PipeOperator",
    type: "PipeCompose",
    code: COMPOSE_PIPE_CODE,
    domain_code: COMPOSE_DOMAIN,
    description:
      opts.description ?? "Compose a professional refusal email for a non-matching candidate",
    inputs: {
      match_assessment: { concept: makeMatchAssessmentConcept(), multiplicity: null },
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
  } as unknown as PipeBlueprintUnion;
}

/** Build a minimal GraphSpecNode + GraphSpec pair wiring a PipeCompose blueprint
 *  to a node. The optional `execution_data` argument is set on the node so the
 *  detail panel renders runtime values (fields, rendered_text, etc.). */
export function makeComposeStoryProps(
  blueprint: PipeBlueprintUnion,
  execution_data?: Record<string, unknown>,
): { node: GraphSpecNode; spec: GraphSpec } {
  const node: GraphSpecNode = {
    id: COMPOSE_NODE_ID,
    kind: "operator",
    pipe_code: COMPOSE_PIPE_CODE,
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
    pipeline_ref: { domain: COMPOSE_DOMAIN, main_pipe: COMPOSE_PIPE_CODE },
    nodes: [node],
    edges: [],
    meta: {},
    pipe_registry: {
      [COMPOSE_PIPE_KEY]: blueprint as unknown as Record<string, unknown>,
    } as unknown as GraphSpec["pipe_registry"],
    concept_registry: {},
  } as GraphSpec;

  return { node, spec };
}

// ─── Sample text fixtures ──────────────────────────────────────────────────

export const SHORT_COMPOSE_TEMPLATE =
  "Candidate {{ match_assessment.candidate_name|format() }} did not match.";

export const LONG_COMPOSE_TEMPLATE = `Dear $match_assessment.candidate_name,

Thank you for taking the time to apply for this position. We appreciate your interest in joining our team and the effort you put into your application.

After careful consideration, we have decided to move forward with other candidates whose experience more closely aligns with the specific requirements of this role at this time.

We were impressed by your professional background and encourage you to keep an eye on our careers page for future opportunities that may be a better fit for your skills and experience.

We wish you all the best in your job search and future career endeavors.

Kind regards,

The Talent Acquisition Team`;

export const RENDERED_LONG_COMPOSE_TEMPLATE = LONG_COMPOSE_TEMPLATE.replaceAll(
  "$match_assessment.candidate_name",
  "John Doe",
);

export const LONG_RATIONALE = `John Doe's CV shows no alignment with the Vice President, Enterprise Sales position at ACME. The candidate's background is entirely in retail sales and spa services at entry-level positions (Sales Associate, Spa Consultant, Fashion Representative), with experience from 2006-2011. The role requires 12+ years of progressive B2B sales experience with at least 5 years in VP-level leadership roles, managing $100M+ ARR quotas, and leading 50+ person enterprise sales teams. John Doe has no demonstrated experience in: (1) B2B or enterprise software sales, (2) any leadership or management roles, (3) SaaS or technology sales, (4) Fortune 500 client engagement, (5) team building or scaling, or (6) strategic revenue accountability.`;

// ─── HUGE / very long fixtures for stress-testing the renderer ─────────────
// These exist so we can verify that very long strings, very large lists, deeply
// nested objects, and very long Jinja2 templates render correctly without
// breaking the layout, overflowing the panel, or clipping content.

/** ~3000 character free-form rationale paragraph. */
export const HUGE_RATIONALE = `After conducting a multi-pass evaluation of the candidate's submitted application, professional history, written references, and the supporting addenda attached to the cover letter, the screening pipeline arrived at a unanimous "no_match" verdict for the Vice President, Enterprise Sales role at ACME Industries. The role profile is unambiguous: it asks for a senior operator with at least twelve years of progressive business-to-business sales experience, of which a minimum of five must be at the Vice President level or above, with demonstrable accountability for an annual recurring revenue quota of one hundred million dollars or more, the management of a distributed sales organization of fifty or more individual contributors and front-line managers, formal experience presenting to and negotiating with Fortune 500 procurement committees, and a measurable track record of building, scaling, and retiring multi-year enterprise contracts that include security review, data residency negotiation, and complex master service agreement amendments. The candidate's background, by contrast, consists entirely of retail-floor and spa-services positions at the individual contributor tier, with employment dates clustered between 2006 and 2011 and no formal employment history thereafter that is verifiable through standard reference checks. None of the listed positions involved business-to-business sales, enterprise software, technology, or any product category that would map even loosely onto the ACME catalog. There is no evidence of leadership responsibility, no team-management experience at any scale, no procurement-cycle exposure, no negotiation history with strategic accounts, no quota-carrying responsibility above the floor-target tier, and no hands-on familiarity with the modern enterprise sales motion (MEDDPICC, Command of the Message, Force Management, Challenger, or any equivalent methodology). The cover letter, while well-written and professionally structured, did not address any of the role's stated technical or operational requirements; it instead emphasized soft skills (communication, empathy, customer service) which, while genuinely valuable, are nowhere near sufficient to compensate for the absence of the hard prerequisites the hiring manager has explicitly enumerated. As a final consideration, the screening pipeline weighed whether the candidate's profile might justify a referral to an adjacent role (sales development representative, customer success associate, retail account manager) but concluded that the gap between the candidate's most recent verifiable activity and the present day, combined with the absence of any technology-sector experience whatsoever, makes such a referral inappropriate without the candidate first taking concrete intermediate steps (foundational coursework, an entry-level technology role, or a structured retraining program). The recommendation is therefore a polite, encouraging refusal that thanks the candidate for their interest, declines without prejudice, and signals openness to future applications should the candidate's circumstances and background materially change.`;

/** ~4000 character multi-paragraph email template, much longer than LONG_COMPOSE_TEMPLATE. */
export const HUGE_COMPOSE_TEMPLATE = `Dear $match_assessment.candidate_name,

Thank you very sincerely for taking the time to apply for the Vice President, Enterprise Sales position at ACME Industries. We received your application on $match_assessment.application_date and have spent the intervening period reviewing it carefully against the role profile, the requirements provided to us by the hiring manager, and the broader needs of the team at this stage of its growth. We want to begin by acknowledging the effort that goes into a senior-level application: the time spent tailoring a cover letter, the energy spent reflecting on prior accomplishments, the willingness to be vulnerable in a competitive process, and the trust you place in our hiring team to give your candidacy a fair and considered review. None of that is taken for granted on our side, and the rest of this letter should be read in the context of that genuine appreciation.

After completing our internal evaluation, we have made the difficult decision not to move forward with your candidacy for this particular role at this particular time. We want to be transparent about what informed that decision so that you can take the feedback forward in whatever way is most useful to you. The role as scoped requires a candidate with a substantial track record of progressive responsibility within enterprise software or an analogous business-to-business technology environment, demonstrable experience leading large distributed sales organizations, multi-year ownership of significant annual recurring revenue quotas, and a working familiarity with the procurement and security review processes that characterize Fortune 500 buying cycles. While your background reflects strong customer service instincts, professionalism, and a clearly demonstrated work ethic across multiple positions, the specific operational and technical experience profile that this role demands was not present in the materials you submitted, and the team felt that the gap was too large to bridge through onboarding alone within the timeframe required.

We want to be very clear that this decision is in no way a comment on your capability, your character, or your potential to thrive in a career in sales. Hiring is a deeply imperfect art, and any individual decision is the product of a particular moment, a particular set of organizational priorities, and a particular comparison against a particular pool of other candidates. None of those things are fixed. People who are not a fit for one role at one company at one moment in time are very often exactly the right fit for a different role, or the same role at a different stage, or the same company in a different season. We have seen candidates we declined return to us months or years later, having added a specific experience or credential, and become excellent hires. We mention this because we genuinely mean it: a "no" today should not be read as a "no forever."

If you are interested in continuing to explore opportunities at ACME, we would warmly encourage you to keep an eye on our careers page, which is updated regularly as new openings come online across the organization. We post roles at every seniority level and across many functions, including roles that may align more naturally with the strengths your application demonstrated. We would also encourage you, if it is helpful, to consider whether building specific experience in the enterprise technology sales motion (through targeted courses, mentorship, or transitional roles in adjacent companies) might be a useful step in your broader career development. There are now many high-quality structured programs designed exactly for professionals making this kind of transition, and we have seen candidates use them successfully.

We wish you every possible success in your job search and in the next chapter of your professional life. Thank you again for considering ACME, for the time you invested in this application, and for the trust you placed in us by sharing your story.

With warm regards and sincere best wishes,

The Talent Acquisition Team
ACME Industries`;

export const RENDERED_HUGE_COMPOSE_TEMPLATE = HUGE_COMPOSE_TEMPLATE.replaceAll(
  "$match_assessment.candidate_name",
  "John Doe",
).replaceAll("$match_assessment.application_date", "April 2, 2026");

/** A list of 25 "follow-up question" strings, each ~150 chars — exercises long-list rendering. */
export const HUGE_INTERVIEW_QUESTIONS: string[] = [
  "Walk me through a specific deal in the last 18 months where you carried personal quota above $5M ARR and explain exactly how you sourced, qualified, and closed it.",
  "Describe the largest enterprise contract you have personally negotiated end-to-end, including the procurement cycle, security review, and any MSA amendments you led.",
  "Tell me about a time when you inherited an underperforming sales team of more than 25 people and had to rebuild it; what specifically did you change in the first 90 days?",
  "How do you structure compensation plans for a distributed enterprise sales org when you need to balance new logo acquisition against expansion within the existing book?",
  "Give me an example of a technical objection from a Fortune 500 prospect that derailed a deal in late stage, and walk me through how you recovered (or did not recover) the cycle.",
  "What is your operating cadence with a regional VP and their first-line managers when forecast confidence is below 60% three weeks out from end of quarter?",
  "Describe the most difficult cross-functional partnership you have had to build with a CTO or product organization to win a strategic account, and what you learned from it.",
  "Walk me through your forecasting methodology in detail; what specific MEDDPICC fields do you require for a deal to be in commit, and how do you enforce that discipline?",
  "Tell me about a time you had to terminate a high-performing rep for cause and how you managed both the legal exposure and the morale impact on the rest of the team.",
  "What is your point of view on hiring sellers from competitors versus from adjacent industries, and how does that change at different stages of company maturity?",
  "Describe a board-level commitment you personally made on a number that you then missed, and walk me through exactly how you communicated and recovered from the miss.",
  "How do you operationalize a transition from a single-product motion to a multi-product platform motion across a 50+ person sales organization without losing focus?",
  "Tell me about the most sophisticated competitive displacement you have ever orchestrated against a well-entrenched incumbent, and what specifically made it succeed.",
  "What is your framework for deciding when to invest in a dedicated overlay specialist team versus pushing the same product through the core sales organization?",
  "Walk me through a time you had to make a major territory redesign mid-year and how you managed both the rep-level disruption and the customer-facing continuity risk.",
  "How do you think about the relationship between marketing-sourced pipeline and sales-sourced pipeline at different stages of a company's growth, and why?",
  "Describe a situation where your CFO challenged the unit economics of a strategic enterprise deal and you had to defend or modify the structure under significant pressure.",
  "Tell me about the most operationally complex international expansion you have led from a sales perspective, including hiring, comp, partner channel, and tax considerations.",
  "What is your perspective on usage-based pricing versus traditional seat-based pricing for enterprise software, and how does it change the enterprise sales motion in practice?",
  "Walk me through the toughest customer escalation you have personally managed at the executive sponsor level, and what the long-term outcome of that relationship was.",
  "Describe how you have used a dedicated deal-desk function to enforce pricing discipline without creating friction that slows down high-velocity strategic opportunities.",
  "Tell me about a time you publicly disagreed with your CEO on a go-to-market strategy decision, and how you navigated the disagreement before, during, and after.",
  "How do you assess the readiness of a first-line sales manager who wants to be promoted to a regional VP role, and what specific signals do you look for or avoid?",
  "Walk me through how you would build a 24-month enterprise sales plan from scratch for a company at $40M ARR that is targeting $200M ARR by the end of that horizon.",
  "Describe the worst deal you have ever lost in your career and walk me through everything you would do differently if you could run that exact cycle again today.",
];

/** A wide, deeply structured object as a fixed_value — exercises object rendering. */
export const HUGE_FIXED_OBJECT: Record<string, unknown> = {
  schema_version: "2026-04-01",
  pipeline_id: "cv_screener.v3.production",
  region: "us-west-2",
  retention_days: 90,
  feature_flags: {
    structured_output: true,
    parallel_eval: true,
    skip_secondary_review: false,
    auto_email_on_decline: true,
    use_cached_embeddings: true,
  },
  thresholds: {
    minimum_score: 0.62,
    auto_advance: 0.85,
    auto_decline: 0.35,
    requires_human_review_band: [0.35, 0.62],
  },
  notification_targets: [
    "talent-ops@acme.example",
    "vp-sales-hiring@acme.example",
    "compliance-pii-audit@acme.example",
  ],
  audit_log_destinations: {
    primary: "s3://acme-audit-prod/cv-screener/",
    secondary: "s3://acme-audit-prod-replica/cv-screener/",
    cold_archive: "glacier://acme-audit-cold/cv-screener-2026/",
  },
};
