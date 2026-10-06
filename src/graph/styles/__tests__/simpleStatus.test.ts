/**
 * Run status on the simple style's nodes: the same `applyStatusOverrides` the
 * detailed style's cards go through, writing the status into the simple
 * payload of steps, decisions and frames, and leaving inputs and outputs alone.
 */
import { describe, it, expect } from "vitest";
import type { PipeStatus } from "@graph/types";
import { applyStatusOverrides } from "@graph/react";
import { toAppNodes } from "@graph/react/rfTypes";
import { reviewSpec } from "@graph/react/viewer/__stories__/styleReviewFixtures";
import { projectStyle } from "./styleTestUtils";

function statusOf(simple: unknown): PipeStatus | undefined {
  return simple && typeof simple === "object" && "status" in simple
    ? (simple.status as PipeStatus)
    : undefined;
}

describe("status on the simple style", () => {
  it("writes a run's status into a step's payload, keyed by pipe code", () => {
    const { nodes } = projectStyle(reviewSpec("CV_SCREENING", "dry"), "simple");
    const appNodes = toAppNodes(nodes);
    const step = appNodes.find((n) => n.data.simple?.kind === "step" && n.data.pipeCode);
    const code = step?.data.pipeCode;
    if (!step || !code) throw new Error("no step with a pipe code");
    const updated = applyStatusOverrides(appNodes, { [code]: "failed" });
    expect(statusOf(updated.find((n) => n.id === step.id)?.data.simple)).toBe("failed");
  });

  it("writes a decision's status too", () => {
    const { nodes } = projectStyle(reviewSpec("EMAIL_TRIAGE", "dry"), "simple");
    const appNodes = toAppNodes(nodes);
    const decision = appNodes.find((n) => n.data.simple?.kind === "decision");
    const code = decision?.data.pipeCode;
    if (!decision || !code) throw new Error("no decision with a pipe code");
    const updated = applyStatusOverrides(appNodes, { [code]: "running" });
    expect(statusOf(updated.find((n) => n.id === decision.id)?.data.simple)).toBe("running");
  });

  it("leaves inputs and outputs without a status", () => {
    const { nodes } = projectStyle(reviewSpec("CV_SCREENING", "dry"), "simple");
    const appNodes = toAppNodes(nodes);
    const codes: Record<string, PipeStatus> = {};
    for (const node of appNodes) {
      if (node.data.pipeCode) codes[node.data.pipeCode] = "succeeded";
    }
    const updated = applyStatusOverrides(appNodes, codes);
    for (const node of updated.filter((n) => n.data.simple?.kind === "input")) {
      expect(statusOf(node.data.simple)).toBeUndefined();
    }
  });

  it("paints no status on a static graph", () => {
    const { nodes } = projectStyle(reviewSpec("CV_SCREENING", "static"), "simple");
    const appNodes = toAppNodes(nodes);
    const step = appNodes.find((n) => n.data.simple?.kind === "step" && n.data.pipeCode);
    const code = step?.data.pipeCode;
    if (!step || !code) throw new Error("no step with a pipe code");
    const updated = applyStatusOverrides(appNodes, { [code]: "failed" });
    expect(updated.find((n) => n.id === step.id)).toBe(step);
  });
});
