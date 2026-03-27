import { describe, it, expect } from "vitest";
import { toAppNodes, toAppEdges } from "@graph/react/rfTypes";
import { makeGraphNode, makeStuffNode, makePipeCardNode, makeGraphEdge } from "./testUtils";

describe("toAppNodes", () => {
  it("preserves id, type, data, position for basic node", () => {
    const node = makeGraphNode("n1");
    const [appNode] = toAppNodes([node]);
    expect(appNode.id).toBe("n1");
    expect(appNode.type).toBe("default");
    expect(appNode.data.labelText).toBe("n1");
    expect(appNode.position).toEqual({ x: 0, y: 0 });
  });

  it("converts style Record to CSSProperties-compatible object", () => {
    const node = makeGraphNode("n1", { style: { width: 200, background: "red" } });
    const [appNode] = toAppNodes([node]);
    expect(appNode.style).toEqual({ width: 200, background: "red" });
  });

  it("preserves sourcePosition and targetPosition", () => {
    const node = makeGraphNode("n1", { sourcePosition: "right", targetPosition: "left" });
    const [appNode] = toAppNodes([node]);
    expect(appNode.sourcePosition).toBe("right");
    expect(appNode.targetPosition).toBe("left");
  });

  it("preserves parentId and extent", () => {
    const node = makeGraphNode("n1", { parentId: "parent1", extent: "parent" });
    const [appNode] = toAppNodes([node]);
    expect(appNode.parentId).toBe("parent1");
    expect(appNode.extent).toBe("parent");
  });

  it("handles nodes without optional fields", () => {
    const node = makeGraphNode("n1");
    const [appNode] = toAppNodes([node]);
    expect(appNode.style).toBeUndefined();
    expect(appNode.sourcePosition).toBeUndefined();
    expect(appNode.parentId).toBeUndefined();
  });

  it("preserves selected field", () => {
    const node = makeGraphNode("n1", { selected: true });
    const [appNode] = toAppNodes([node]);
    expect(appNode.selected).toBe(true);
  });

  it("returns empty array for empty input", () => {
    expect(toAppNodes([])).toEqual([]);
  });

  it("handles multiple nodes preserving order", () => {
    const nodes = [
      makePipeCardNode("pipe1", "PipeLLM"),
      makeStuffNode("d1", "data", "Text"),
      makePipeCardNode("pipe2", "PipeExtract"),
    ];
    const appNodes = toAppNodes(nodes);
    expect(appNodes).toHaveLength(3);
    expect(appNodes[0].id).toBe("pipe1");
    expect(appNodes[1].id).toBe("stuff_d1");
    expect(appNodes[2].id).toBe("pipe2");
  });
});

describe("toAppEdges", () => {
  it("preserves id, source, target, type", () => {
    const edge = makeGraphEdge("e1", "a", "b");
    const [appEdge] = toAppEdges([edge]);
    expect(appEdge.id).toBe("e1");
    expect(appEdge.source).toBe("a");
    expect(appEdge.target).toBe("b");
    expect(appEdge.type).toBe("bezier");
  });

  it("preserves animated and label", () => {
    const edge = makeGraphEdge("e1", "a", "b", { animated: true, label: "test" });
    const [appEdge] = toAppEdges([edge]);
    expect(appEdge.animated).toBe(true);
    expect(appEdge.label).toBe("test");
  });

  it("preserves style", () => {
    const edge = makeGraphEdge("e1", "a", "b", {
      style: { stroke: "red", strokeWidth: 2 },
    });
    const [appEdge] = toAppEdges([edge]);
    expect(appEdge.style).toEqual({ stroke: "red", strokeWidth: 2 });
  });

  it("preserves markerEnd", () => {
    const edge = makeGraphEdge("e1", "a", "b", {
      markerEnd: { type: "arrowclosed", color: "#fff" },
    });
    const [appEdge] = toAppEdges([edge]);
    expect(appEdge.markerEnd).toBeDefined();
  });

  it("preserves labelBgStyle and labelBgPadding", () => {
    const edge = makeGraphEdge("e1", "a", "b", {
      labelBgStyle: { fill: "black" },
      labelBgPadding: [4, 8],
    });
    const [appEdge] = toAppEdges([edge]);
    expect(appEdge.labelBgStyle).toEqual({ fill: "black" });
    expect(appEdge.labelBgPadding).toEqual([4, 8]);
  });

  it("drops _batchEdge field", () => {
    const edge = makeGraphEdge("e1", "a", "b", { _batchEdge: true });
    const [appEdge] = toAppEdges([edge]);
    expect("_batchEdge" in appEdge).toBe(false);
  });

  it("drops _crossGroup field", () => {
    const edge = makeGraphEdge("e1", "a", "b", { _crossGroup: true });
    const [appEdge] = toAppEdges([edge]);
    expect("_crossGroup" in appEdge).toBe(false);
  });

  it("returns empty array for empty input", () => {
    expect(toAppEdges([])).toEqual([]);
  });

  it("handles edge with no optional fields", () => {
    const edge = makeGraphEdge("e1", "a", "b");
    const [appEdge] = toAppEdges([edge]);
    expect(appEdge.animated).toBeUndefined();
    expect(appEdge.label).toBeUndefined();
    expect(appEdge.style).toBeUndefined();
  });
});
