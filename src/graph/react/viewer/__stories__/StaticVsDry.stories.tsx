import type { Meta, StoryObj } from "@storybook/react-vite";
import type React from "react";
import type { GraphSpec } from "@graph/types";

import { GraphViewer } from "../GraphViewer";
import { DRY_RUN_CATALOG } from "./mockGraphSpec";
import { STATIC_RUN_CATALOG } from "./staticGraphSpec";

const meta: Meta = {
  title: "Graph - static/Compare/Static vs Dry",
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<{ staticSpec: GraphSpec; drySpec: GraphSpec }>;

function SideBySide({ staticSpec, drySpec }: { staticSpec: GraphSpec; drySpec: GraphSpec }) {
  return (
    <div
      style={{
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))",
        gridAutoRows: "minmax(360px, 1fr)",
        gap: 1,
        background: "#1f2937",
      }}
    >
      <div style={{ position: "relative", minWidth: 0, minHeight: 0, background: "#0a0a0a" }}>
        <div style={labelStyle}>Static</div>
        <GraphViewer graphspec={staticSpec} initialDirection="LR" initialShowControllers />
      </div>
      <div style={{ position: "relative", minWidth: 0, minHeight: 0, background: "#0a0a0a" }}>
        <div style={labelStyle}>Dry</div>
        <GraphViewer graphspec={drySpec} initialDirection="LR" initialShowControllers />
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  zIndex: 20,
  padding: "4px 8px",
  borderRadius: 4,
  background: "rgba(17, 24, 39, 0.88)",
  color: "#e5e7eb",
  font: "12px ui-monospace, SFMono-Regular, Menlo, monospace",
};

function compare(staticKey: string, dryKey: string): Story {
  return {
    render: (args) => <SideBySide {...args} />,
    args: {
      staticSpec: STATIC_RUN_CATALOG[staticKey].spec,
      drySpec: DRY_RUN_CATALOG[dryKey].spec,
    },
  };
}

export const SimpleSequence = compare("STATIC_SIMPLE_SEQUENCE", "DRY_SIMPLE_SEQUENCE");
export const SimpleCondition = compare("STATIC_SIMPLE_CONDITION", "DRY_SIMPLE_CONDITION");
export const SimpleBatch = compare("STATIC_SIMPLE_BATCH", "DRY_SIMPLE_BATCH");
export const CvScreening = compare("STATIC_CV_SCREENING", "DRY_CV_SCREENING");
export const DeepNesting = compare("STATIC_DEEP_NESTING", "DRY_DEEP_NESTING");
export const WideParallel = compare("STATIC_WIDE_PARALLEL", "DRY_WIDE_PARALLEL");
