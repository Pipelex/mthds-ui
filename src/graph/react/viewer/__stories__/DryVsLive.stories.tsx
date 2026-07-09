import type { Meta, StoryObj } from "@storybook/react-vite";
import type React from "react";
import type { GraphSpec } from "@graph/types";

import { GraphViewer } from "../GraphViewer";
import { LIVE_RUN_CATALOG } from "./liveGraphSpec";
import { DRY_RUN_CATALOG } from "./mockGraphSpec";

const meta: Meta = {
  title: "Graph - from run/Compare/Dry vs Live",
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<{ drySpec: GraphSpec; liveSpec: GraphSpec }>;

function SideBySide({ drySpec, liveSpec }: { drySpec: GraphSpec; liveSpec: GraphSpec }) {
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
      <div style={paneStyle}>
        <div style={labelStyle}>Dry</div>
        <GraphViewer graphspec={drySpec} initialDirection="LR" initialShowControllers />
      </div>
      <div style={paneStyle}>
        <div style={labelStyle}>Live</div>
        <GraphViewer graphspec={liveSpec} initialDirection="LR" initialShowControllers />
      </div>
    </div>
  );
}

const paneStyle: React.CSSProperties = {
  position: "relative",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  isolation: "isolate",
  background: "#0a0a0a",
};

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

function compare(dryKey: string, liveKey: string): Story {
  return {
    render: (args) => <SideBySide {...args} />,
    args: {
      drySpec: DRY_RUN_CATALOG[dryKey].spec,
      liveSpec: LIVE_RUN_CATALOG[liveKey].spec,
    },
  };
}

export const SimpleSequence = compare("DRY_SIMPLE_SEQUENCE", "LIVE_SIMPLE_SEQUENCE");
export const SimpleCondition = compare("DRY_SIMPLE_CONDITION", "LIVE_SIMPLE_CONDITION");
export const SimpleBatch = compare("DRY_SIMPLE_BATCH", "LIVE_SIMPLE_BATCH");
export const CvScreening = compare("DRY_CV_SCREENING", "LIVE_CV_SCREENING");
export const DeepNesting = compare("DRY_DEEP_NESTING", "LIVE_DEEP_NESTING");
export const WideParallel = compare("DRY_WIDE_PARALLEL", "LIVE_WIDE_PARALLEL");
