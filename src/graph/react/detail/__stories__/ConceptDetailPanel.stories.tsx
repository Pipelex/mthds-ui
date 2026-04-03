import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DetailPanel } from "../DetailPanel";
import { ConceptDetailPanel } from "../ConceptDetailPanel";
import { CONCEPT_TEXT, CONCEPT_SUMMARY } from "./enrichedMockData";

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
  name: "Simple Text",
  render: () => (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <ConceptDetailPanel concept={CONCEPT_TEXT} />
    </DetailPanel>
  ),
};

export const StructuredConcept: Story = {
  name: "Structured (Summary)",
  render: () => (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <ConceptDetailPanel concept={CONCEPT_SUMMARY} />
    </DetailPanel>
  ),
};

export const WithRefinement: Story = {
  name: "With Refinement",
  render: () => (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <ConceptDetailPanel concept={CONCEPT_SUMMARY} />
    </DetailPanel>
  ),
};

export const DryRunSchemaOnly: Story = {
  name: "Dry Run (Schema Only)",
  render: () => (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <ConceptDetailPanel concept={CONCEPT_SUMMARY} isDryRun={true} />
    </DetailPanel>
  ),
};

export const WithLiveData: Story = {
  name: "With Live Data",
  render: () => (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <ConceptDetailPanel
        concept={CONCEPT_SUMMARY}
        ioData={{
          name: "summary",
          concept: "Summary",
          digest: "def456",
          data: {
            text: "The candidate has strong experience in machine learning and distributed systems.",
            key_points: [
              "5 years ML experience",
              "Led team of 8 engineers",
              "Published 3 papers on NLP",
            ],
            confidence: 0.87,
          },
          data_text:
            "The candidate has strong experience in machine learning and distributed systems.\n\nKey points:\n- 5 years ML experience\n- Led team of 8 engineers\n- Published 3 papers on NLP\n\nConfidence: 0.87",
        }}
      />
    </DetailPanel>
  ),
};
