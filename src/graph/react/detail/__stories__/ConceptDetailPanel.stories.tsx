import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DetailPanel } from "../DetailPanel";
import { ConceptDetailPanel } from "../ConceptDetailPanel";
import {
  CONCEPT_TEXT,
  CONCEPT_CANDIDATEPROFILE,
  CONCEPT_MATCHSCORE,
  CONCEPT_REPORT,
  CONCEPT_EVALUATION,
  CONCEPT_TECHNICAL_EVALUATION,
} from "./enrichedMockData";

const meta: Meta = {
  title: "Graph/Detail Panel/Concept Detail",
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

export const SimpleText: Story = {
  render: () => (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <ConceptDetailPanel concept={CONCEPT_TEXT} />
    </DetailPanel>
  ),
};

export const StructuredConcept: Story = {
  name: "Structured (CandidateProfile)",
  render: () => (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <ConceptDetailPanel concept={CONCEPT_CANDIDATEPROFILE} />
    </DetailPanel>
  ),
};

export const WithRefinement: Story = {
  name: "With Refinement (Report)",
  render: () => (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <ConceptDetailPanel concept={CONCEPT_REPORT} />
    </DetailPanel>
  ),
};

export const DryRunSchemaOnly: Story = {
  name: "Dry Run (Required Fields Only)",
  render: () => (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <ConceptDetailPanel concept={CONCEPT_CANDIDATEPROFILE} isDryRun={true} />
    </DetailPanel>
  ),
};

export const WithLiveData: Story = {
  name: "With Live Data",
  render: () => (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <ConceptDetailPanel
        concept={CONCEPT_MATCHSCORE}
        ioData={{
          name: "match_score",
          concept: "MatchScore",
          digest: "score_001",
          data: {
            score: 85,
            reasoning: "Strong technical background with relevant experience in ML and distributed systems.",
          },
          data_text: "Score: 85\nReasoning: Strong technical background with relevant experience in ML and distributed systems.",
        }}
      />
    </DetailPanel>
  ),
};

export const ParentConcept: Story = {
  name: "Parent (Evaluation)",
  render: () => (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <ConceptDetailPanel concept={CONCEPT_EVALUATION} />
    </DetailPanel>
  ),
};

export const RefinedConcept: Story = {
  name: "Refined (TechnicalEvaluation → Evaluation)",
  render: () => (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <ConceptDetailPanel concept={CONCEPT_TECHNICAL_EVALUATION} />
    </DetailPanel>
  ),
};
