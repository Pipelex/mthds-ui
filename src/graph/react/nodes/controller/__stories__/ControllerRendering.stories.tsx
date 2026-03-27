import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, userEvent } from "storybook/test";
import type { PipeControllerType } from "@graph/types";
import { ControllerGroupNode } from "../ControllerGroupNode";

const meta: Meta<typeof ControllerGroupNode> = {
  title: "Graph/ControllerGroupNode/Rendering Tests",
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

// ─── Badge text for all 4 controller types ─────────────────────────────────

function BadgeShell({ pipeType }: { pipeType: PipeControllerType }) {
  return (
    <div style={{ position: "relative", width: 600, height: 120 }}>
      <ControllerGroupNode data={{ pipeType, label: "test_badge" }} />
    </div>
  );
}

export const SequenceBadge: Story = {
  render: () => <BadgeShell pipeType="PipeSequence" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Sequence")).toBeVisible();
    await expect(canvas.getByText("→")).toBeVisible();
  },
};

export const ParallelBadge: Story = {
  render: () => <BadgeShell pipeType="PipeParallel" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Parallel")).toBeVisible();
    await expect(canvas.getByText("//")).toBeVisible();
  },
};

export const ConditionBadge: Story = {
  render: () => <BadgeShell pipeType="PipeCondition" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Condition")).toBeVisible();
    await expect(canvas.getByText("◇")).toBeVisible();
  },
};

export const BatchBadge: Story = {
  render: () => <BadgeShell pipeType="PipeBatch" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Batch")).toBeVisible();
    await expect(canvas.getByText("≡")).toBeVisible();
  },
};

// ─── Collapse button for Parallel/Batch with >5 children ───────────────────

function CollapsibleShell({
  pipeType,
  childCount,
}: {
  pipeType: PipeControllerType;
  childCount: number;
}) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div style={{ position: "relative", width: 600, height: collapsed ? 120 : 300 }}>
      <ControllerGroupNode
        data={{
          pipeType,
          label: "collapsible_test",
          childCount,
          isCollapsed: collapsed,
          onToggleCollapse: () => setCollapsed((c) => !c),
        }}
      />
    </div>
  );
}

export const ParallelCollapseToggle: Story = {
  render: () => <CollapsibleShell pipeType="PipeParallel" childCount={10} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Initially collapsed: shows "+5 hidden" (10 - 5 = 5)
    const collapseBtn = canvas.getByText("+5 hidden");
    await expect(collapseBtn).toBeVisible();

    // Click to expand
    await userEvent.click(collapseBtn);
    await expect(canvas.getByText("collapse")).toBeVisible();

    // Click to collapse again
    await userEvent.click(canvas.getByText("collapse"));
    await expect(canvas.getByText("+5 hidden")).toBeVisible();
  },
};

// ─── No collapse button when <= 5 children ─────────────────────────────────

export const ParallelNoCollapse: Story = {
  render: () => (
    <div style={{ position: "relative", width: 600, height: 120 }}>
      <ControllerGroupNode
        data={{ pipeType: "PipeParallel", label: "small_parallel", childCount: 3 }}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // No collapse button should exist
    const collapseBtn = canvasElement.querySelector(".controller-group-collapse");
    await expect(collapseBtn).toBeNull();
  },
};

// ─── Sequence never shows collapse ─────────────────────────────────────────

export const SequenceNoCollapse: Story = {
  render: () => (
    <div style={{ position: "relative", width: 600, height: 120 }}>
      <ControllerGroupNode
        data={{ pipeType: "PipeSequence", label: "big_sequence", childCount: 20 }}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const collapseBtn = canvasElement.querySelector(".controller-group-collapse");
    await expect(collapseBtn).toBeNull();
  },
};
