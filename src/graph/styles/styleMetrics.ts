// Readability measurements for a drawn graph: what the graph styles' review
// rubric asserts on (R1 to R5, in `docs/graph-styles.md`). Pure and
// React-free: it reads laid-out nodes and edges, whatever the style.

import type { GraphDirection, GraphEdge, GraphNode } from "@graph/types";
import {
  KNOWN_PIPE_TYPES,
  BINDING_STEP_TYPE,
  NODE_TYPE_CONTROLLER,
  NODE_TYPE_PIPE_CARD,
  NODE_TYPE_SIMPLE_DECISION,
  NODE_TYPE_SIMPLE_FRAME,
  NODE_TYPE_SIMPLE_STEP,
  NODE_TYPE_SIMPLE_TERMINAL,
  NODE_TYPE_STUFF,
} from "@graph/types";
import { STEP_CATEGORY_WORDS, simpleTitleWrap } from "./simpleStyle";

// ─── R1: identifiers on the canvas ──────────────────────────────────────────

const SNAKE_CASE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;
const PASCAL_CASE = /\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]*)+\b/g;
const DOTTED_REF = /\b[a-z][a-z0-9_]*\.[A-Za-z][A-Za-z0-9_]+\b/g;
const PIPE_TYPE_NAMES: ReadonlySet<string> = new Set([...KNOWN_PIPE_TYPES, BINDING_STEP_TYPE]);

/**
 * The words of a text that read as code: a snake_case identifier, a PascalCase
 * concept code, a `domain.code` reference, or a pipe class name. Empty for
 * plain words. Deliberately strict: a brand written in camel case would be
 * flagged too, which the review then reads as a false positive.
 */
export function identifierTokens(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of [SNAKE_CASE, PASCAL_CASE, DOTTED_REF]) {
    for (const match of text.matchAll(pattern)) found.add(match[0]);
  }
  for (const word of text.split(/[^A-Za-z]+/)) {
    if (PIPE_TYPE_NAMES.has(word)) found.add(word);
  }
  return [...found];
}

/**
 * Every text a node of the simple style draws, and every edge label: titles,
 * subtitles, markers and category words. The detailed style draws identifiers
 * by design, so it is not asked this question.
 */
export function simpleCanvasTexts(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): string[] {
  const texts: string[] = [];
  for (const node of nodes) {
    const simple = node.data.simple;
    if (!simple) continue;
    texts.push(simple.title);
    if (simple.kind === "input" || simple.kind === "output") {
      if (simple.subtitle) texts.push(simple.subtitle);
    }
    if (simple.kind === "step") {
      texts.push(STEP_CATEGORY_WORDS[simple.category]);
      if (simple.forEach) texts.push(simple.forEach);
    }
  }
  for (const edge of edges) {
    if (edge.label) texts.push(edge.label);
  }
  return texts;
}

// ─── Geometry ───────────────────────────────────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function rectOf(node: GraphNode): Rect {
  const size = node.data.layoutSize;
  const styleWidth = parseFloat(String(node.style?.width ?? ""));
  const styleHeight = parseFloat(String(node.style?.height ?? ""));
  return {
    x: node.position.x,
    y: node.position.y,
    width: Number.isFinite(styleWidth) ? styleWidth : (size?.width ?? 0),
    height: Number.isFinite(styleHeight) ? styleHeight : (size?.height ?? 0),
  };
}

/** Whether a node is a group drawn around others (a frame or a controller group), not content. */
function isGroup(node: GraphNode): boolean {
  return node.type === NODE_TYPE_SIMPLE_FRAME || node.type === NODE_TYPE_CONTROLLER;
}

/** Pairs of content nodes whose boxes overlap by more than a sliver. */
export function countOverlaps(nodes: readonly GraphNode[]): number {
  const rects = nodes.filter((n) => !isGroup(n)).map(rectOf);
  let overlaps = 0;
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (w > 2 && h > 2) overlaps++;
    }
  }
  return overlaps;
}

type Point = { x: number; y: number };

function ports(rect: Rect, direction: GraphDirection): { out: Point; in: Point } {
  const midX = rect.x + rect.width / 2;
  const midY = rect.y + rect.height / 2;
  switch (direction) {
    case "LR":
      return { out: { x: rect.x + rect.width, y: midY }, in: { x: rect.x, y: midY } };
    case "RL":
      return { out: { x: rect.x, y: midY }, in: { x: rect.x + rect.width, y: midY } };
    case "BT":
      return { out: { x: midX, y: rect.y }, in: { x: midX, y: rect.y + rect.height } };
    default:
      return { out: { x: midX, y: rect.y + rect.height }, in: { x: midX, y: rect.y } };
  }
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function segmentsCross(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/**
 * Edge crossings, approximating each edge as the straight segment between its
 * source's out port and its target's in port. The same approximation for every
 * style, so the counts compare even though the drawn curves differ.
 */
export function countCrossings(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  direction: GraphDirection,
): number {
  const byId = new Map(nodes.map((n) => [n.id, rectOf(n)]));
  const segments: { source: string; target: string; a: Point; b: Point }[] = [];
  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) continue;
    segments.push({
      source: edge.source,
      target: edge.target,
      a: ports(source, direction).out,
      b: ports(target, direction).in,
    });
  }
  let crossings = 0;
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const s = segments[i];
      const t = segments[j];
      const shared =
        s.source === t.source ||
        s.source === t.target ||
        s.target === t.source ||
        s.target === t.target;
      if (!shared && segmentsCross(s.a, s.b, t.a, t.b)) crossings++;
    }
  }
  return crossings;
}

/**
 * The drawing's bounding box: the nodes', and the rectangles of the groups
 * drawn around them, which the layout returns apart from the nodes.
 */
export function boundingBox(nodes: readonly GraphNode[], groups: readonly Rect[] = []): Rect {
  const rects = [...nodes.map(rectOf), ...groups];
  if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** The viewer's fit-view zoom for a drawing in a viewport: its padding of 0.1, clamped to [0.1, 2]. */
export function fitViewZoom(
  box: { width: number; height: number },
  viewport: { width: number; height: number } = { width: 1280, height: 800 },
): number {
  if (box.width <= 0 || box.height <= 0) return 2;
  const zoom = Math.min(viewport.width / (1.1 * box.width), viewport.height / (1.1 * box.height));
  return Math.min(2, Math.max(0.1, zoom));
}

// ─── The whole measurement ──────────────────────────────────────────────────

/** How many nodes of each kind a drawing has. */
export interface NodeCounts {
  steps: number;
  inputs: number;
  outputs: number;
  decisions: number;
  frames: number;
  /** The detailed style's cards and data nodes. */
  cards: number;
  data: number;
  groups: number;
  /** Every node but the groups drawn around others. */
  content: number;
}

export function countNodes(nodes: readonly GraphNode[]): NodeCounts {
  const counts: NodeCounts = {
    steps: 0,
    inputs: 0,
    outputs: 0,
    decisions: 0,
    frames: 0,
    cards: 0,
    data: 0,
    groups: 0,
    content: 0,
  };
  for (const node of nodes) {
    if (isGroup(node)) counts.groups++;
    else counts.content++;
    switch (node.type) {
      case NODE_TYPE_SIMPLE_STEP:
        counts.steps++;
        break;
      case NODE_TYPE_SIMPLE_TERMINAL:
        if (node.data.simple?.kind === "output") counts.outputs++;
        else counts.inputs++;
        break;
      case NODE_TYPE_SIMPLE_DECISION:
        counts.decisions++;
        break;
      case NODE_TYPE_SIMPLE_FRAME:
        counts.frames++;
        break;
      case NODE_TYPE_PIPE_CARD:
        counts.cards++;
        break;
      case NODE_TYPE_STUFF:
        counts.data++;
        break;
      default:
        break;
    }
  }
  return counts;
}

/** A step title as drawn: the lines it needs at its fit, and the size and lines the fit gives it. */
export interface StepTitleMeasure {
  title: string;
  lines: number;
  maxLines: number;
  fontPx: number;
}

export interface StyleMetrics {
  counts: NodeCounts;
  /** Canvas texts that read as code (R1), each with its offending words. */
  identifierTexts: { text: string; tokens: string[] }[];
  /** The step titles estimated to need more lines than the fit they are drawn at gives them, so cut (R3). */
  cutTitles: StepTitleMeasure[];
  /** The longest step title, and the lines it is estimated to wrap to at its fit. */
  longestTitle: StepTitleMeasure | null;
  /** The smallest font a step title is drawn at (R4 multiplies it by the fit-view zoom); null with no step. */
  smallestTitlePx: number | null;
  overlaps: number;
  crossings: number;
  width: number;
  height: number;
  /** The fit-view zoom at 1280 by 800. */
  fitZoom: number;
}

/**
 * Measure a laid-out drawing (positions absolute, as the layout returns them,
 * before frames make children relative), with the rectangles of its groups
 * (the layout's `controllerPositions`). Text checks read the simple style's
 * payloads; geometry reads any style.
 */
export function styleMetrics(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  direction: GraphDirection,
  groups: readonly Rect[] = [],
): StyleMetrics {
  const identifierTexts = simpleCanvasTexts(nodes, edges)
    .map((text) => ({ text, tokens: identifierTokens(text) }))
    .filter((t) => t.tokens.length > 0);
  const titles: StepTitleMeasure[] = nodes.flatMap((n) => {
    const step = n.data.simple;
    if (step?.kind !== "step") return [];
    const { title, titleFit } = step;
    const { lines } = simpleTitleWrap(title, titleFit);
    return [{ title, lines, maxLines: titleFit.maxLines, fontPx: titleFit.fontPx }];
  });
  const longestTitle = titles.reduce<StepTitleMeasure | null>(
    (longest, t) => (!longest || t.title.length > longest.title.length ? t : longest),
    null,
  );
  const box = boundingBox(nodes, groups);
  return {
    counts: countNodes(nodes),
    identifierTexts,
    cutTitles: titles.filter((t) => t.lines > t.maxLines),
    longestTitle,
    smallestTitlePx: titles.length > 0 ? Math.min(...titles.map((t) => t.fontPx)) : null,
    overlaps: countOverlaps(nodes),
    crossings: countCrossings(nodes, edges, direction),
    width: box.width,
    height: box.height,
    fitZoom: fitViewZoom(box),
  };
}
