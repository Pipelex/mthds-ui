/**
 * The layout's routes: with `routeEdges`, every edge comes back with the route
 * ELK computed for it, in absolute coordinates from its source's port to its
 * target's, and a labelled edge with its label's box; without it, nothing is added.
 */
import { describe, it, expect } from "vitest";
import { getLayoutedElements } from "@graph/graphLayout";
import { toAppEdges } from "@graph/react/rfTypes";
import { reviewSpec } from "@graph/react/viewer/__stories__/styleReviewFixtures";
import { projectStyle } from "@graph/styles/__tests__/styleTestUtils";
import { GRAPH_STYLES } from "@graph/styles/graphStyles";

const spec = reviewSpec("SIMPLE_CONDITION", "static");

async function layout(routeEdges: boolean, direction: "LR" | "TB" = "LR") {
  const projected = projectStyle(spec, "simple");
  const config = { ...GRAPH_STYLES.simple.layout, routeEdges };
  return getLayoutedElements(
    projected.nodes,
    projected.edges,
    direction,
    config,
    spec,
    projected.analysis,
  );
}

describe("routed layout", () => {
  it("returns a route for every edge, from port to port", async () => {
    const { nodes, edges } = await layout(true);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) {
      const points = edge.route?.points ?? [];
      expect(points.length).toBeGreaterThanOrEqual(2);
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) throw new Error("edge to a missing node");
      const sourceRight = source.position.x + (source.data.layoutSize?.width ?? 0);
      expect(Math.abs(points[0].x - sourceRight)).toBeLessThanOrEqual(2);
      expect(Math.abs(points[points.length - 1].x - target.position.x)).toBeLessThanOrEqual(2);
    }
  });

  it("places every outcome label in a box beside its route", async () => {
    const { edges } = await layout(true);
    const labelled = edges.filter((e) => e.label);
    expect(labelled.length).toBe(3);
    for (const edge of labelled) {
      const box = edge.route?.label;
      expect(box?.width).toBe(edge.labelSize?.width);
      expect(box?.height).toBe(edge.labelSize?.height);
    }
  });

  it("routes top to bottom as well", async () => {
    const { edges } = await layout(true, "TB");
    for (const edge of edges) {
      const points = edge.route?.points ?? [];
      expect(points[points.length - 1].y).toBeGreaterThan(points[0].y);
    }
  });

  it("adds no route when it is not asked to", async () => {
    const { edges } = await layout(false);
    for (const edge of edges) expect(edge.route).toBeUndefined();
  });

  it("hands a route to ReactFlow in the edge's data, and nothing otherwise", async () => {
    const routed = toAppEdges((await layout(true)).edges);
    expect(routed.every((e) => e.data?.route !== undefined)).toBe(true);
    const free = toAppEdges((await layout(false)).edges);
    expect(free.every((e) => !("data" in e))).toBe(true);
  });
});
