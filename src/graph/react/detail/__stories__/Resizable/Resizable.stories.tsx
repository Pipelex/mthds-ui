import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { DetailPanel } from "../../DetailPanel";
import { useResizable } from "../../useResizable";
import { PipeDetailPanel } from "../../PipeDetailPanel";
import { ENRICHED_SPEC, NODE_ANALYZE_CANDIDATE } from "../enrichedMockData";

// ─── Wrapper component that wires up useResizable ─────────────────────────

function ResizablePanelDemo({ children }: { children: React.ReactNode }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { width, isDragging, handleMouseDown } = useResizable({
    defaultWidth: 380,
    minWidth: 280,
    maxWidth: 800,
    containerRef,
  });

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <div style={{ position: "absolute", inset: 0, background: "#0a0a0a" }} />
      <DetailPanel
        isOpen
        onClose={() => {}}
        width={width}
        isDragging={isDragging}
        onResizeHandleMouseDown={handleMouseDown}
      >
        {children}
      </DetailPanel>
    </div>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Graph/Detail Panel/Resizable",
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "90vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

// ─── Stories ──────────────────────────────────────────────────────────────

export const DefaultWidth: Story = {
  render: () => (
    <ResizablePanelDemo>
      <PipeDetailPanel node={NODE_ANALYZE_CANDIDATE} spec={ENRICHED_SPEC} />
    </ResizablePanelDemo>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const handle = canvas.getByRole("separator");
    await expect(handle).toBeInTheDocument();
    await expect(canvas.getByText("analyze_candidate")).toBeInTheDocument();
  },
};

export const WithoutResizeHandle: Story = {
  render: () => (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div style={{ position: "absolute", inset: 0, background: "#0a0a0a" }} />
      <DetailPanel isOpen onClose={() => {}}>
        <PipeDetailPanel node={NODE_ANALYZE_CANDIDATE} spec={ENRICHED_SPEC} />
      </DetailPanel>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const handle = canvas.queryByRole("separator");
    await expect(handle).toBeNull();
  },
};

export const AtMinWidth: Story = {
  render: () => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    return (
      <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
        <div style={{ position: "absolute", inset: 0, background: "#0a0a0a" }} />
        <DetailPanel isOpen onClose={() => {}} width={280} onResizeHandleMouseDown={() => {}}>
          <PipeDetailPanel node={NODE_ANALYZE_CANDIDATE} spec={ENRICHED_SPEC} />
        </DetailPanel>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("analyze_candidate")).toBeInTheDocument();
  },
};

export const AtMaxWidth: Story = {
  render: () => (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div style={{ position: "absolute", inset: 0, background: "#0a0a0a" }} />
      <DetailPanel isOpen onClose={() => {}} width={800} onResizeHandleMouseDown={() => {}}>
        <PipeDetailPanel node={NODE_ANALYZE_CANDIDATE} spec={ENRICHED_SPEC} />
      </DetailPanel>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("analyze_candidate")).toBeInTheDocument();
  },
};
