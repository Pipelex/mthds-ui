/**
 * Tests for the statusMap mechanism (Layer 2 execution state).
 *
 * The core logic is `applyStatusOverrides()` in GraphViewer.tsx, which maps
 * pipe_code → PipeStatus onto rendered AppNode[]. These tests exercise that
 * logic directly on pipeline output — the same data the component operates on.
 */
import { describe, it, expect } from "vitest";
import type { PipeStatus } from "../types";
import type { AppNode } from "@graph/react/rfTypes";
import { makeMinimalSpec, runFullPipeline } from "./testUtils";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Mirrors `applyStatusOverrides()` from GraphViewer.tsx.
 * Applies a statusMap to AppNode[], returning updated nodes.
 */
function applyStatusOverrides(
  nodes: AppNode[],
  statusMap: Record<string, PipeStatus> | undefined,
): AppNode[] {
  if (!statusMap || Object.keys(statusMap).length === 0) return nodes;
  return nodes.map((node) => {
    const pipeCode = node.data.pipeCode;
    if (!pipeCode || !(pipeCode in statusMap)) return node;
    const newStatus = statusMap[pipeCode];
    if (node.data.pipeCardData?.status === newStatus) return node;
    return {
      ...node,
      data: {
        ...node.data,
        nodeData: node.data.nodeData
          ? { ...node.data.nodeData, status: newStatus }
          : node.data.nodeData,
        pipeCardData: node.data.pipeCardData
          ? { ...node.data.pipeCardData, status: newStatus }
          : node.data.pipeCardData,
      },
    };
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("statusMap apply", () => {
  it("updates pipe node status via pipeCode lookup", async () => {
    const spec = makeMinimalSpec(3); // step_0, step_1, step_2
    const result = await runFullPipeline(spec);
    const nodes = result.appNodes;

    const pipeNodes = nodes.filter((n) => n.data.isPipe);
    expect(pipeNodes.length).toBe(3);

    const updated = applyStatusOverrides(nodes, { step_1: "running" });

    const step1 = updated.find((n) => n.data.pipeCode === "step_1");
    expect(step1?.data.pipeCardData?.status).toBe("running");
    expect(step1?.data.nodeData?.status).toBe("running");

    // Other nodes unchanged
    const step0 = updated.find((n) => n.data.pipeCode === "step_0");
    expect(step0?.data.pipeCardData?.status).toBe("scheduled");
  });

  it("updates multiple pipe statuses at once", async () => {
    const spec = makeMinimalSpec(3);
    const result = await runFullPipeline(spec);

    const updated = applyStatusOverrides(result.appNodes, {
      step_0: "succeeded",
      step_1: "running",
      step_2: "scheduled",
    });

    expect(updated.find((n) => n.data.pipeCode === "step_0")?.data.pipeCardData?.status).toBe(
      "succeeded",
    );
    expect(updated.find((n) => n.data.pipeCode === "step_1")?.data.pipeCardData?.status).toBe(
      "running",
    );
    expect(updated.find((n) => n.data.pipeCode === "step_2")?.data.pipeCardData?.status).toBe(
      "scheduled",
    );
  });

  it("ignores unknown pipe_codes", async () => {
    const spec = makeMinimalSpec(2);
    const result = await runFullPipeline(spec);
    const nodes = result.appNodes;

    const updated = applyStatusOverrides(nodes, { nonexistent_pipe: "running" });

    // All nodes should be the same reference (no update applied)
    for (let i = 0; i < nodes.length; i++) {
      expect(updated[i]).toBe(nodes[i]);
    }
  });

  it("skips unchanged statuses (same reference returned)", async () => {
    const spec = makeMinimalSpec(2);
    const result = await runFullPipeline(spec);
    const nodes = result.appNodes;

    // Apply "scheduled" which is already the default
    const updated = applyStatusOverrides(nodes, { step_0: "scheduled" });

    const step0Original = nodes.find((n) => n.data.pipeCode === "step_0");
    const step0Updated = updated.find((n) => n.data.pipeCode === "step_0");
    expect(step0Updated).toBe(step0Original); // Same reference — no unnecessary copy
  });

  it("leaves non-pipe nodes untouched", async () => {
    const spec = makeMinimalSpec(2);
    const result = await runFullPipeline(spec);
    const nodes = result.appNodes;

    const stuffNodes = nodes.filter((n) => n.data.isStuff);
    expect(stuffNodes.length).toBeGreaterThan(0);

    const updated = applyStatusOverrides(nodes, { step_0: "succeeded" });

    for (const stuffNode of stuffNodes) {
      const updatedVersion = updated.find((n) => n.id === stuffNode.id);
      expect(updatedVersion).toBe(stuffNode); // Same reference
    }
  });
});

describe("statusMap with undefined/empty", () => {
  it("returns nodes unchanged when statusMap is undefined", async () => {
    const spec = makeMinimalSpec(2);
    const result = await runFullPipeline(spec);
    const nodes = result.appNodes;

    const updated = applyStatusOverrides(nodes, undefined);
    expect(updated).toBe(nodes); // Same reference — early return
  });

  it("returns nodes unchanged when statusMap is empty", async () => {
    const spec = makeMinimalSpec(2);
    const result = await runFullPipeline(spec);
    const nodes = result.appNodes;

    const updated = applyStatusOverrides(nodes, {});
    expect(updated).toBe(nodes); // Same reference — early return
  });
});

describe("statusMap reset via rebuild", () => {
  it("rebuilding without statusMap restores original statuses", async () => {
    const spec = makeMinimalSpec(3);
    const result = await runFullPipeline(spec);
    const originalNodes = result.appNodes;

    // Apply status changes
    const modified = applyStatusOverrides(originalNodes, {
      step_0: "succeeded",
      step_1: "running",
    });

    const step0Modified = modified.find((n) => n.data.pipeCode === "step_0");
    expect(step0Modified?.data.pipeCardData?.status).toBe("succeeded");

    // "Reset" by rebuilding from original pipeline (same as what GraphViewer does
    // when statusMap becomes undefined — it rebuilds from layoutCacheRef)
    const reset = applyStatusOverrides(originalNodes, undefined);

    const step0Reset = reset.find((n) => n.data.pipeCode === "step_0");
    expect(step0Reset?.data.pipeCardData?.status).toBe("scheduled"); // Original status

    const step1Reset = reset.find((n) => n.data.pipeCode === "step_1");
    expect(step1Reset?.data.pipeCardData?.status).toBe("scheduled"); // Original status
  });
});
