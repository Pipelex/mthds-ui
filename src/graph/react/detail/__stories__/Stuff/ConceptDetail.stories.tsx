import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { DetailPanel } from "../../DetailPanel";
import { ConceptDetailPanel } from "../../ConceptDetailPanel";
import {
  CONCEPT_TEXT,
  CONCEPT_CANDIDATEPROFILE,
  CONCEPT_MATCHSCORE,
  CONCEPT_REPORT,
  CONCEPT_EVALUATION,
  CONCEPT_TECHNICAL_EVALUATION,
} from "../enrichedMockData";
import { detailPanelDecorator, detailPanelParameters } from "../_shared";

const meta: Meta = {
  title: "Misc/Detail Panel/Stuff/Concept Detail",
  parameters: detailPanelParameters,
  decorators: [detailPanelDecorator],
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
  name: "Dry Run (Schema Only)",
  render: () => (
    <DetailPanel isOpen={true} onClose={() => {}}>
      <ConceptDetailPanel concept={CONCEPT_CANDIDATEPROFILE} isDryRun={true} />
    </DetailPanel>
  ),
};

export const WithLiveData: Story = {
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
            reasoning:
              "Strong technical background with relevant experience in ML and distributed systems.",
          },
          data_text:
            "Score: 85\nReasoning: Strong technical background with relevant experience in ML and distributed systems.",
        }}
      />
    </DetailPanel>
  ),
};

/** Regression harness: two graph nodes share the same concept AND the same
 *  stuff name/digest (typical for batch branches). Switching nodes must reset
 *  the Data/Structure tab to Data — only `instanceKey` (the node id) can
 *  distinguish the two. */
const TAB_RESET_IO_DATA = {
  name: "match_score",
  concept: "MatchScore",
  digest: "score_001",
  data: { score: 85, reasoning: "Same stuff on two branch nodes." },
} as const;

function TabResetHarness() {
  const [nodeId, setNodeId] = React.useState("run_001:node_a");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
      <button type="button" onClick={() => setNodeId("run_001:node_b")}>
        Select node B
      </button>
      <div style={{ position: "relative", flex: 1 }}>
        <DetailPanel isOpen={true} onClose={() => {}}>
          <ConceptDetailPanel
            concept={CONCEPT_MATCHSCORE}
            ioData={TAB_RESET_IO_DATA}
            instanceKey={nodeId}
          />
        </DetailPanel>
      </div>
    </div>
  );
}

export const TabResetOnNodeSwitch: Story = {
  name: "Tab Resets On Node Switch (regression)",
  render: () => <TabResetHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Open the Structure tab on node A
    await userEvent.click(await canvas.findByRole("tab", { name: "Structure" }));
    await expect(canvas.getByRole("tab", { name: "Structure" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // Switch to node B (same concept, same stuff name + digest, different node)
    await userEvent.click(canvas.getByRole("button", { name: "Select node B" }));
    // The tab must reset to Data
    await waitFor(() =>
      expect(canvas.getByRole("tab", { name: "Data" })).toHaveAttribute("aria-selected", "true"),
    );
  },
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
