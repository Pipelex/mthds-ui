import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { PipeControllerType } from "@graph/types";
import { ControllerGroupNode } from "../ControllerGroupNode";

const meta: Meta<typeof ControllerGroupNode> = {
  title: "Graph/ControllerGroupNode",
  component: ControllerGroupNode,
  decorators: [
    (Story) => (
      <div style={{ padding: 40, background: "#0a0a0a", minHeight: "100vh" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ControllerGroupNode>;

/** Shows just the container chrome at a representative size */
function ControllerShell({ pipeType, label }: { pipeType: PipeControllerType; label: string }) {
  return (
    <div style={{ position: "relative", width: 600, height: 180 }}>
      <ControllerGroupNode data={{ pipeType, label }} />
    </div>
  );
}

/** Interactive shell with collapse toggle wired up */
function CollapsibleShell({
  pipeType,
  label,
  childCount,
}: {
  pipeType: PipeControllerType;
  label: string;
  childCount: number;
}) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div style={{ position: "relative", width: 600, height: collapsed ? 120 : 400 }}>
      <ControllerGroupNode
        data={{
          pipeType,
          label,
          childCount,
          isCollapsed: collapsed,
          onToggleCollapse: () => setCollapsed((c) => !c),
        }}
      />
    </div>
  );
}

export const Sequence: Story = {
  render: () => <ControllerShell pipeType="PipeSequence" label="process_cv" />,
};

export const Parallel: Story = {
  render: () => <ControllerShell pipeType="PipeParallel" label="enrich_candidate" />,
};

export const Condition: Story = {
  render: () => <ControllerShell pipeType="PipeCondition" label="route_by_score" />,
};

export const Batch: Story = {
  render: () => <ControllerShell pipeType="PipeBatch" label="process_all_cvs" />,
};

// ─── Extreme cases: collapse/expand with many children ───────────────────────

export const Parallel100: Story = {
  render: () => (
    <CollapsibleShell pipeType="PipeParallel" label="enrich_all_candidates" childCount={100} />
  ),
};

export const Batch100: Story = {
  render: () => (
    <CollapsibleShell pipeType="PipeBatch" label="process_all_documents" childCount={100} />
  ),
};
