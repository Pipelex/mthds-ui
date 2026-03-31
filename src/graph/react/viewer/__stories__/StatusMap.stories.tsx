import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { GraphViewer } from "../GraphViewer";
import { DRY_RUN_CATALOG } from "./mockGraphSpec";
import type { PipeStatus } from "@graph/types";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/StatusMap",
  component: GraphViewer,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

// ─── Live Status Cycling ────────────────────────────────────────────────────

const PIPE_CODES = [
  "extract_analyze_report",
  "extract_pages",
  "analyze_content",
  "compose_report",
];

const STATUS_SEQUENCE: PipeStatus[] = ["scheduled", "running", "succeeded"];

function StatusCyclingWrapper() {
  const [statusMap, setStatusMap] = React.useState<Record<string, PipeStatus>>({});

  React.useEffect(() => {
    let step = 0;
    const totalSteps = PIPE_CODES.length * STATUS_SEQUENCE.length;

    const interval = setInterval(() => {
      if (step >= totalSteps) {
        clearInterval(interval);
        return;
      }

      const pipeIndex = Math.floor(step / STATUS_SEQUENCE.length);
      const statusIndex = step % STATUS_SEQUENCE.length;

      setStatusMap((prev) => ({
        ...prev,
        [PIPE_CODES[pipeIndex]]: STATUS_SEQUENCE[statusIndex],
      }));

      step++;
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <GraphViewer
      graphspec={DRY_RUN_CATALOG.DRY_SIMPLE_SEQUENCE.spec}
      direction="LR"
      showControllers={true}
      statusMap={statusMap}
    />
  );
}

export const LiveStatusCycling: Story = {
  render: () => <StatusCyclingWrapper />,
  play: async ({ canvasElement }) => {
    // Wait for nodes to render
    await waitFor(
      () => {
        const nodes = canvasElement.querySelectorAll(".react-flow__node");
        expect(nodes.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  },
};

// ─── Static statusMap ───────────────────────────────────────────────────────

export const MixedStatuses: Story = {
  args: {
    graphspec: DRY_RUN_CATALOG.DRY_SIMPLE_SEQUENCE.spec,
    direction: "LR",
    showControllers: true,
    statusMap: {
      extract_pages: "succeeded",
      analyze_content: "running",
      compose_report: "scheduled",
    },
  },
  play: async ({ canvasElement }) => {
    await waitFor(
      () => {
        const nodes = canvasElement.querySelectorAll(".react-flow__node");
        expect(nodes.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  },
};

// ─── No statusMap (baseline) ────────────────────────────────────────────────

export const NoStatusMap: Story = {
  args: {
    graphspec: DRY_RUN_CATALOG.DRY_SIMPLE_SEQUENCE.spec,
    direction: "LR",
    showControllers: true,
  },
  play: async ({ canvasElement }) => {
    await waitFor(
      () => {
        const nodes = canvasElement.querySelectorAll(".react-flow__node");
        expect(nodes.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  },
};
