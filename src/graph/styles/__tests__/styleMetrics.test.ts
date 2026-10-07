import { describe, it, expect } from "vitest";
import type { GraphEdge, GraphNode } from "@graph/types";
import {
  boundingBox,
  countCrossings,
  countOverlaps,
  fitViewZoom,
  identifierTokens,
} from "../styleMetrics";

function box(id: string, x: number, y: number, width = 100, height = 50): GraphNode {
  return {
    id,
    type: "simpleStep",
    position: { x, y },
    data: { isPipe: true, isStuff: false, layoutSize: { width, height } },
  } as GraphNode;
}

function edge(source: string, target: string): GraphEdge {
  return { id: `${source}-${target}`, source, target, type: "routed" };
}

describe("identifierTokens", () => {
  it("finds the words that read as code", () => {
    expect(identifierTokens("extract_cv_pages")).toEqual(["extract_cv_pages"]);
    expect(identifierTokens("Build CandidateProfile")).toEqual(["CandidateProfile"]);
    expect(identifierTokens("from hiring.ScreeningReport")).toEqual(
      expect.arrayContaining(["hiring.ScreeningReport"]),
    );
    expect(identifierTokens("Runs a PipeLLM")).toEqual(["PipeLLM"]);
  });

  it("passes plain words, acronyms and sentence punctuation", () => {
    expect(identifierTokens("Analyze CV to build candidate profile")).toEqual([]);
    expect(identifierTokens("Needs review or otherwise")).toEqual([]);
    expect(identifierTokens("Go/no-go matrix, e.g. for RFPs.")).toEqual([]);
  });
});

describe("geometry", () => {
  it("counts overlapping boxes, ignoring a sliver", () => {
    expect(countOverlaps([box("a", 0, 0), box("b", 50, 25)])).toBe(1);
    expect(countOverlaps([box("a", 0, 0), box("b", 99, 0)])).toBe(0);
    expect(countOverlaps([box("a", 0, 0), box("b", 200, 0)])).toBe(0);
  });

  it("counts crossing edges between unrelated nodes", () => {
    // a → d and b → c cross when a sits above b and c above d.
    const nodes = [box("a", 0, 0), box("b", 0, 100), box("c", 300, 0), box("d", 300, 100)];
    expect(countCrossings(nodes, [edge("a", "d"), edge("b", "c")], "LR")).toBe(1);
    expect(countCrossings(nodes, [edge("a", "c"), edge("b", "d")], "LR")).toBe(0);
    // Edges sharing a node never count as crossing.
    expect(countCrossings(nodes, [edge("a", "d"), edge("a", "c")], "LR")).toBe(0);
  });

  it("bounds the nodes and the groups drawn around them", () => {
    expect(boundingBox([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(boundingBox([box("a", 10, 10)], [{ x: 0, y: 0, width: 50, height: 200 }])).toEqual({
      x: 0,
      y: 0,
      width: 110,
      height: 200,
    });
  });

  it("zooms to fit with the viewer's padding, within its limits", () => {
    expect(fitViewZoom({ width: 1280 / 1.1, height: 100 })).toBeCloseTo(1);
    expect(fitViewZoom({ width: 10, height: 10 })).toBe(2);
    expect(fitViewZoom({ width: 100000, height: 10 })).toBe(0.1);
    expect(fitViewZoom({ width: 0, height: 0 })).toBe(2);
  });
});
