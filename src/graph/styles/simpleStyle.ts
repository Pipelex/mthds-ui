// The simple style: a flowchart of the method's steps in the words its author
// declared. A projection of the same GraphSpec the detailed style draws — no
// new facts, and nothing guessed:
//
// - every operator is a step, titled by its pipe's description;
// - the method's inputs and its final outputs are the only data drawn as nodes;
//   every other value becomes the arrows from the step that produced it to each
//   step that reads it;
// - a condition is a decision whose arrows carry its outcomes;
// - a batch runs "for each" item: its branch is drawn once, in a frame when it
//   has several steps, as one marked step when it has one;
// - sequences and parallels have no frame: the arrows are the order, and
//   parallel branches are side by side because nothing joins them until a step
//   reads both;
// - a binding step is plumbing: the arrow passes through it;
// - a folded controller is one step, saying how many it holds.
//
// Pure and React-free. It runs on the dataflow graph after the folds, so the
// fold machinery stays the detailed style's, and its output feeds the same
// ELK layout through each node's fixed `layoutSize`.

import type {
  DataflowAnalysis,
  FoldToggleOptions,
  GraphEdge,
  GraphNode,
  GraphSpec,
  GraphSpecNode,
  GraphSpecNodeIoItem,
  PipeStatus,
  PipeType,
  SimpleNodePayload,
  StepCategory,
} from "@graph/types";
import {
  ARROW_CLOSED_MARKER,
  BINDING_STEP_TYPE,
  NODE_TYPE_PIPE_CARD,
  NODE_TYPE_SIMPLE_DECISION,
  NODE_TYPE_SIMPLE_FRAME,
  NODE_TYPE_SIMPLE_STEP,
  NODE_TYPE_SIMPLE_TERMINAL,
  STEP_CATEGORY,
  graphSpecMode,
  isPluralMultiplicity,
  stuffNodeId,
} from "@graph/types";
import { getPipeBlueprint } from "@graph/graphAnalysis";
import { makePipeRef } from "@graph/pipeRefs";
import { buildControllerNodes, sortParentsFirst } from "@graph/graphControllers";
import type { ControllerRect } from "@graph/graphControllers";
import {
  conceptPlainName,
  estimateWrap,
  humanizeIdentifier,
  isGenericConcept,
  outcomeLabel,
  sentenceCase,
  stripDomain,
} from "./humanize";

// ─── Metrics (keep in sync with SimpleStyle.css) ────────────────────────────
// The layout sizes every node before the DOM exists, so these mirror the
// stylesheet: box widths, paddings, font sizes and line heights.

/** Average advance of a character, as a fraction of the font size, for the sans stack. */
const CHAR_EM = 0.5;

export const SIMPLE_STEP_WIDTH = 160;
const STEP_PADDING_X = 12;
const STEP_PADDING_Y = 10;
const STEP_HEADER_HEIGHT = 16;
const STEP_GAP = 6;
export const SIMPLE_STEP_TITLE_FONT_PX = 15;
const STEP_TITLE_LINE_HEIGHT = 20;
export const SIMPLE_TITLE_MAX_LINES = 3;
const STEP_MARKER_HEIGHT = 18;
const STEP_INNER_HEIGHT = 22;

export const SIMPLE_TERMINAL_WIDTH = 124;
const TERMINAL_PADDING_X = 12;
const TERMINAL_PADDING_TOP = 10;
/** The wave at the foot of the document shape. */
const TERMINAL_PADDING_BOTTOM = 16;
const TERMINAL_TITLE_FONT_PX = 13;
const TERMINAL_TITLE_LINE_HEIGHT = 17;
const TERMINAL_TITLE_MAX_LINES = 2;
const TERMINAL_SUBTITLE_HEIGHT = 17;
const TERMINAL_MIN_HEIGHT = 52;

export const SIMPLE_DECISION_WIDTH = 188;
const DECISION_TITLE_FONT_PX = 13;
const DECISION_TITLE_LINE_HEIGHT = 16;
/**
 * The share of a diamond's width its text may use. A centered rectangle fits
 * in a rhombus when its width and height shares sum to at most one, so the
 * text block's height share is what remains, minus a margin.
 */
const DECISION_TEXT_WIDTH_SHARE = 0.56;
const DECISION_TEXT_HEIGHT_SHARE = 0.4;
const DECISION_MIN_HEIGHT = 84;

/**
 * The controller depth from which the simple style folds a sub-method by
 * default (the method's own controller is depth 0). Deep nesting is where a
 * flowchart stops reading as one; a folded sub-method is one step a reader
 * can open. Only sequences fold this way: a decision, a loop or a parallel is
 * structure the reader came to see, however deep it sits.
 */
export const SIMPLE_FOLD_DEPTH = 3;

// ─── Step categories ────────────────────────────────────────────────────────

/** The category each pipe class reads as. Exhaustive over `PipeType`, so a new pipe class must say what it is. */
export const STEP_CATEGORY_BY_PIPE_TYPE: Record<PipeType, StepCategory> = {
  PipeLLM: STEP_CATEGORY.AI,
  PipeStructure: STEP_CATEGORY.AI,
  PipeJudge: STEP_CATEGORY.JUDGE,
  PipeExtract: STEP_CATEGORY.EXTRACT,
  PipeImgGen: STEP_CATEGORY.IMAGE,
  PipeSearch: STEP_CATEGORY.SEARCH,
  PipeFunc: STEP_CATEGORY.CODE,
  PipeCompose: STEP_CATEGORY.TEMPLATE,
  PipeDocGen: STEP_CATEGORY.DOCUMENT,
  PipeSignature: STEP_CATEGORY.PLANNED,
  PipeSequence: STEP_CATEGORY.STEPS,
  PipeParallel: STEP_CATEGORY.PARALLEL,
  PipeCondition: STEP_CATEGORY.DECISION,
  PipeBatch: STEP_CATEGORY.REPEAT,
};

/** The plain word each category is shown with. */
export const STEP_CATEGORY_WORDS: Record<StepCategory, string> = {
  ai: "AI",
  extract: "Extract",
  image: "Image",
  search: "Search",
  code: "Code",
  template: "Template",
  document: "Document",
  judge: "Judge",
  planned: "To build",
  steps: "Steps",
  parallel: "Side by side",
  decision: "Decision",
  repeat: "For each",
};

// ─── Sizes ──────────────────────────────────────────────────────────────────

function charWidth(fontPx: number): number {
  return fontPx * CHAR_EM;
}

/** The size of a step box for its title and markers. */
export function simpleStepSize(
  title: string,
  options: { forEach?: boolean; innerSteps?: boolean } = {},
): { width: number; height: number } {
  const wrap = estimateWrap(
    title,
    SIMPLE_STEP_WIDTH - 2 * STEP_PADDING_X,
    charWidth(SIMPLE_STEP_TITLE_FONT_PX),
    SIMPLE_TITLE_MAX_LINES,
  );
  let height =
    2 * STEP_PADDING_Y +
    STEP_HEADER_HEIGHT +
    STEP_GAP +
    Math.max(1, wrap.drawnLines) * STEP_TITLE_LINE_HEIGHT;
  if (options.forEach) height += STEP_GAP + STEP_MARKER_HEIGHT;
  if (options.innerSteps) height += STEP_GAP + STEP_INNER_HEIGHT;
  return { width: SIMPLE_STEP_WIDTH, height };
}

/** The size of an input or output's document shape. */
export function simpleTerminalSize(
  title: string,
  hasSubtitle: boolean,
): { width: number; height: number } {
  const wrap = estimateWrap(
    title,
    SIMPLE_TERMINAL_WIDTH - 2 * TERMINAL_PADDING_X,
    charWidth(TERMINAL_TITLE_FONT_PX),
    TERMINAL_TITLE_MAX_LINES,
  );
  const height =
    TERMINAL_PADDING_TOP +
    Math.max(1, wrap.drawnLines) * TERMINAL_TITLE_LINE_HEIGHT +
    (hasSubtitle ? TERMINAL_SUBTITLE_HEIGHT : 0) +
    TERMINAL_PADDING_BOTTOM;
  return { width: SIMPLE_TERMINAL_WIDTH, height: Math.max(TERMINAL_MIN_HEIGHT, height) };
}

/** The size of a decision diamond for its text. */
export function simpleDecisionSize(title: string): { width: number; height: number } {
  const wrap = estimateWrap(
    title,
    SIMPLE_DECISION_WIDTH * DECISION_TEXT_WIDTH_SHARE,
    charWidth(DECISION_TITLE_FONT_PX),
    SIMPLE_TITLE_MAX_LINES,
  );
  const textHeight = Math.max(1, wrap.drawnLines) * DECISION_TITLE_LINE_HEIGHT;
  const height = Math.max(DECISION_MIN_HEIGHT, Math.ceil(textHeight / DECISION_TEXT_HEIGHT_SHARE));
  return { width: SIMPLE_DECISION_WIDTH, height };
}

/** How a step title wraps at the default box width: what the readability rubric checks. */
export function simpleTitleWrap(title: string) {
  return estimateWrap(
    title,
    SIMPLE_STEP_WIDTH - 2 * STEP_PADDING_X,
    charWidth(SIMPLE_STEP_TITLE_FONT_PX),
    SIMPLE_TITLE_MAX_LINES,
  );
}

// ─── Status ─────────────────────────────────────────────────────────────────

/** Worst first: the status a set of runs of one step shows. */
const STATUS_PRECEDENCE: readonly PipeStatus[] = [
  "failed",
  "running",
  "scheduled",
  "canceled",
  "skipped",
  "succeeded",
];

/** The status a step drawn once stands for when it ran several times (once per batch item). */
export function aggregateStatus(statuses: readonly PipeStatus[]): PipeStatus | undefined {
  for (const status of STATUS_PRECEDENCE) {
    if (statuses.includes(status)) return status;
  }
  return undefined;
}

// ─── The projection ─────────────────────────────────────────────────────────

export interface SimpleProjectionInput {
  graphspec: GraphSpec;
  /** The dataflow graph after the folds: what the detailed style would lay out. */
  nodes: GraphNode[];
  /** The analysis after the folds (a folded controller is one producer and consumer). */
  analysis: DataflowAnalysis;
  /** The analysis before the folds: the full containment, which a fold hides. */
  rawAnalysis: DataflowAnalysis;
  edgeType: string;
}

export interface SimpleProjection {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /**
   * The analysis the layout and the frames read: the "for each" frames are its
   * only controllers, holding the nodes drawn inside them, and it names no
   * producer or consumer, since every value the style draws is a method input
   * or a final output and sits outside every frame.
   */
  analysis: DataflowAnalysis;
}

function parentMap(
  containmentTree: Readonly<Record<string, readonly string[]>>,
): Record<string, string> {
  const parentOf: Record<string, string> = {};
  for (const [ctrlId, children] of Object.entries(containmentTree)) {
    for (const child of children) parentOf[child] = ctrlId;
  }
  return parentOf;
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

/** "For each page": an item name inside a sentence, keeping an acronym's capitals. */
function forEachLabel(itemName: string): string {
  const words = humanizeIdentifier(itemName);
  const first = words.split(" ")[0] ?? "";
  const inSentence =
    first.length >= 2 && first === first.toUpperCase()
      ? words
      : words.charAt(0).toLowerCase() + words.slice(1);
  return `For each ${inSentence}`;
}

/**
 * Project the folded dataflow graph into the simple style's nodes and edges.
 * Node ids stay the GraphSpec's — a step keeps its pipe node's id and a method
 * input or final output keeps its stuff node's — so selection, the detail
 * panel, run status and validation decorations find them as in any style.
 */
export function projectSimpleGraph(input: SimpleProjectionInput): SimpleProjection {
  const { graphspec, nodes, analysis, rawAnalysis, edgeType } = input;
  const graphMode = graphSpecMode(graphspec);
  const specById = new Map<string, GraphSpecNode>(graphspec.nodes.map((n) => [n.id, n]));
  const parentOf = parentMap(rawAnalysis.containmentTree);

  const cards = new Map<string, GraphNode>();
  for (const node of nodes) {
    if (node.type === NODE_TYPE_PIPE_CARD) cards.set(node.id, node);
  }
  const liveControllers = analysis.controllerNodeIds;
  const pipeTypeOf = (id: string): string | undefined => specById.get(id)?.pipe_type;

  function descendants(id: string): string[] {
    const out: string[] = [];
    const stack = [...(rawAnalysis.containmentTree[id] ?? [])];
    while (stack.length > 0) {
      const next = stack.pop() as string;
      out.push(next);
      stack.push(...(rawAnalysis.containmentTree[next] ?? []));
    }
    return out;
  }

  function isInside(id: string, ancestorId: string): boolean {
    let current = parentOf[id];
    while (current) {
      if (current === ancestorId) return true;
      current = parentOf[current];
    }
    return false;
  }

  // ── A run draws a batch's branch once per item; the flowchart draws it once.
  const hidden = new Set<string>();
  const batchBranch: Record<string, string> = {};
  for (const ctrlId of liveControllers) {
    if (pipeTypeOf(ctrlId) !== "PipeBatch") continue;
    const branches = analysis.containmentTree[ctrlId] ?? [];
    if (branches.length === 0) continue;
    batchBranch[ctrlId] = branches[0];
    for (const other of branches.slice(1)) {
      hidden.add(other);
      for (const d of descendants(other)) hidden.add(d);
    }
  }

  const decisions = [...liveControllers].filter(
    (id) => !hidden.has(id) && pipeTypeOf(id) === "PipeCondition",
  );
  const decisionSet = new Set(decisions);
  // A batch whose branch is a sub-method gets a frame; one whose branch is a
  // single step marks that step instead.
  const frameSet = new Set(
    Object.entries(batchBranch)
      .filter(([batchId, branchId]) => !hidden.has(batchId) && liveControllers.has(branchId))
      .map(([batchId]) => batchId),
  );
  const markedSteps: Record<string, string> = {};
  for (const [batchId, branchId] of Object.entries(batchBranch)) {
    if (!hidden.has(batchId) && cards.has(branchId)) markedSteps[branchId] = batchId;
  }

  const drawnSteps = [...cards.values()].filter(
    (card) => !hidden.has(card.id) && card.data.pipeType !== BINDING_STEP_TYPE,
  );
  const drawnStepIds = new Set(drawnSteps.map((card) => card.id));

  // ── The method's inputs and final outputs: the root pipes' io.
  const roots = graphspec.nodes.filter(
    (n) =>
      !rawAnalysis.childNodeIds.has(n.id) && (n.kind === "controller" || n.kind === "operator"),
  );
  const inputItems = new Map<string, GraphSpecNodeIoItem>();
  const outputItems = new Map<string, GraphSpecNodeIoItem>();
  for (const root of roots) {
    for (const item of root.io.inputs) {
      if (item.digest && !inputItems.has(item.digest)) inputItems.set(item.digest, item);
    }
  }
  for (const root of roots) {
    for (const item of root.io.outputs) {
      if (item.digest && !inputItems.has(item.digest) && !outputItems.has(item.digest)) {
        outputItems.set(item.digest, item);
      }
    }
  }

  // ── Where each value comes from, among the nodes drawn.
  const sourceMemo = new Map<string, string[]>();
  function sourcesOf(digest: string, visiting: Set<string> = new Set()): string[] {
    const memo = sourceMemo.get(digest);
    if (memo) return memo;
    if (inputItems.has(digest)) return [stuffNodeId(digest)];
    if (visiting.has(digest)) return [];
    visiting.add(digest);
    const found: string[] = [];
    const producers = analysis.stuffProducers[digest] ?? [];
    for (const producerId of producers) {
      if (hidden.has(producerId)) continue;
      const card = cards.get(producerId);
      if (!card) continue;
      if (card.data.pipeType === BINDING_STEP_TYPE) {
        // A binding passes its root through under a new name.
        for (const item of specById.get(producerId)?.io.inputs ?? []) {
          if (item.digest) found.push(...sourcesOf(item.digest, visiting));
        }
      } else {
        found.push(producerId);
      }
    }
    if (producers.length === 0) {
      // A value no step writes is combined from others: a parallel's combined
      // output, a batch's list of results, or the item a batch hands one branch.
      for (const edge of graphspec.edges) {
        if (edge.target_stuff_digest !== digest || !edge.source_stuff_digest) continue;
        if (edge.source_stuff_digest === digest) continue;
        if (
          edge.kind === "parallel_combine" ||
          edge.kind === "batch_aggregate" ||
          edge.kind === "batch_item"
        ) {
          found.push(...sourcesOf(edge.source_stuff_digest, visiting));
        }
      }
    }
    visiting.delete(digest);
    const result = unique(found);
    sourceMemo.set(digest, result);
    return result;
  }

  // ── Decisions: the outcome each of their branches is taken on.
  function branchOf(decisionId: string, nodeId: string): string {
    let current = nodeId;
    while (parentOf[current] && parentOf[current] !== decisionId) current = parentOf[current];
    return current;
  }

  function outcomeFor(decisionId: string, branchId: string): string | undefined {
    const branch = specById.get(branchId);
    const tagged = branch?.tags?.outcome;
    if (tagged) return outcomeLabel(tagged);
    const contains = graphspec.edges.find(
      (e) => e.kind === "contains" && e.source === decisionId && e.target === branchId && e.label,
    );
    if (contains?.label) return outcomeLabel(contains.label);
    const decision = specById.get(decisionId);
    if (!decision?.domain_code || !decision.pipe_code || !branch?.pipe_code) return undefined;
    const blueprint = getPipeBlueprint(
      graphspec,
      makePipeRef(decision.domain_code, decision.pipe_code),
    );
    if (blueprint?.type !== "PipeCondition") return undefined;
    const outcomes = Object.entries(blueprint.outcome_map)
      .filter(([, pipeRef]) => stripDomain(pipeRef) === branch.pipe_code)
      .map(([outcome]) => outcomeLabel(outcome));
    if (blueprint.default_outcome && stripDomain(blueprint.default_outcome) === branch.pipe_code) {
      outcomes.push(outcomeLabel("default"));
    }
    return outcomes.length > 0 ? outcomes.join(" or ") : undefined;
  }

  function decisionsAbove(nodeId: string): string[] {
    const chain: string[] = [];
    let current = parentOf[nodeId];
    while (current) {
      if (decisionSet.has(current)) chain.unshift(current);
      current = parentOf[current];
    }
    return chain;
  }

  // ── Edges.
  const edges = new Map<string, GraphEdge>();
  function addEdge(source: string, target: string): void {
    if (source === target) return;
    const key = `${source}->${target}`;
    if (edges.has(key)) return;
    const label = decisionSet.has(source)
      ? outcomeFor(source, branchOf(source, target))
      : undefined;
    edges.set(key, simpleEdge(`simple_edge_${edges.size}`, source, target, edgeType, label));
  }

  /**
   * Draw the arrows that bring a value from its sources to a node. Where the
   * node sits in a decision's branch and the value comes from outside that
   * decision, the value goes to the decision, and the decision's arrow, labelled
   * with the branch's outcome, goes on — decision by decision, outermost first.
   */
  function route(sources: readonly string[], target: string): void {
    let froms = [...sources];
    for (const decisionId of decisionsAbove(target)) {
      const outside = froms.filter((s) => !isInside(s, decisionId));
      if (outside.length === 0) continue;
      for (const source of outside) addEdge(source, decisionId);
      froms = [decisionId, ...froms.filter((s) => isInside(s, decisionId))];
    }
    for (const source of froms) addEdge(source, target);
  }

  const danglingInputs = new Map<string, GraphSpecNodeIoItem>();
  function sourcesOrDangling(digest: string): string[] {
    const sources = sourcesOf(digest);
    if (sources.length > 0) return sources;
    // A value read with no step drawn behind it is shown as an input of its
    // own rather than left hanging.
    const entry = analysis.stuffRegistry[digest];
    if (!entry) return [];
    danglingInputs.set(digest, {
      name: entry.name,
      digest,
      ...(entry.concept !== undefined ? { concept: entry.concept } : {}),
      ...(entry.multiplicity !== undefined ? { multiplicity: entry.multiplicity } : {}),
    });
    return [stuffNodeId(digest)];
  }

  for (const [digest, consumers] of Object.entries(analysis.stuffConsumers)) {
    for (const consumerId of consumers) {
      if (!drawnStepIds.has(consumerId)) continue;
      route(sourcesOrDangling(digest), consumerId);
    }
  }
  for (const decisionId of decisions) {
    for (const item of specById.get(decisionId)?.io.inputs ?? []) {
      if (item.digest) route(sourcesOrDangling(item.digest), decisionId);
    }
  }
  for (const digest of outputItems.keys()) {
    for (const source of sourcesOf(digest)) addEdge(source, stuffNodeId(digest));
  }

  // Every branch a decision can take gets its arrow, even one that reads
  // nothing from before the decision.
  function firstDrawnIn(id: string): string | undefined {
    if (drawnStepIds.has(id) || decisionSet.has(id)) return id;
    for (const child of rawAnalysis.containmentTree[id] ?? []) {
      if (hidden.has(child)) continue;
      const found = firstDrawnIn(child);
      if (found) return found;
    }
    return undefined;
  }
  for (const decisionId of decisions) {
    for (const branchId of rawAnalysis.containmentTree[decisionId] ?? []) {
      if (hidden.has(branchId)) continue;
      const reached = [...edges.values()].some(
        (e) => e.source === decisionId && (e.target === branchId || isInside(e.target, branchId)),
      );
      const entry = reached ? undefined : firstDrawnIn(branchId);
      if (entry) addEdge(decisionId, entry);
    }
  }

  // ── Nodes, in the spec's order: inputs, then steps and decisions, then outputs.
  const simpleNodes: GraphNode[] = [];

  function terminalNode(item: GraphSpecNodeIoItem, kind: "input" | "output"): GraphNode {
    const digest = item.digest as string;
    const concept = item.concept;
    const isList = isPluralMultiplicity(item.multiplicity);
    let title: string;
    let subtitle: string | undefined;
    if (kind === "input") {
      title = humanizeIdentifier(item.name);
      const plain = concept ? conceptPlainName(concept) : undefined;
      subtitle = plain && plain.toLowerCase() !== title.toLowerCase() ? plain : undefined;
    } else {
      title =
        concept && !isGenericConcept(concept)
          ? conceptPlainName(concept)
          : humanizeIdentifier(item.name);
    }
    const simple: SimpleNodePayload = { kind, title, isList, ...(subtitle ? { subtitle } : {}) };
    return {
      id: stuffNodeId(digest),
      type: NODE_TYPE_SIMPLE_TERMINAL,
      data: {
        isPipe: false,
        isStuff: true,
        labelText: title,
        stuffRole: kind,
        stuffDigest: digest,
        graphMode,
        simple,
        layoutSize: simpleTerminalSize(title, subtitle !== undefined),
      },
      position: { x: 0, y: 0 },
    };
  }

  for (const item of [...inputItems.values(), ...danglingInputs.values()]) {
    simpleNodes.push(terminalNode(item, "input"));
  }

  const nearestBatch = (id: string): string | undefined => {
    let current = parentOf[id];
    while (current) {
      if (batchBranch[current] !== undefined) return current;
      current = parentOf[current];
    }
    return undefined;
  };

  /** A step's status; a step drawn once for every batch item stands for all of its runs. */
  function stepStatus(spec: GraphSpecNode): PipeStatus {
    const batchId = nearestBatch(spec.id);
    if (!batchId || spec.pipe_code === undefined) return spec.status;
    const runs = descendants(batchId)
      .map((id) => specById.get(id))
      .filter((n): n is GraphSpecNode => n !== undefined && n.pipe_code === spec.pipe_code)
      .map((n) => n.status);
    return aggregateStatus(runs) ?? spec.status;
  }

  function itemName(batchId: string): string | undefined {
    const batch = specById.get(batchId);
    if (batch?.domain_code && batch.pipe_code) {
      const blueprint = getPipeBlueprint(
        graphspec,
        makePipeRef(batch.domain_code, batch.pipe_code),
      );
      if (blueprint?.type === "PipeBatch") return blueprint.batch_params.input_item_stuff_name;
    }
    const branchId = batchBranch[batchId] ?? rawAnalysis.containmentTree[batchId]?.[0];
    const itemEdge = graphspec.edges.find(
      (e) => e.kind === "batch_item" && e.source === batchId && e.target_stuff_digest,
    );
    const branch = branchId ? specById.get(branchId) : undefined;
    const read = branch?.io.inputs.find((i) => i.digest === itemEdge?.target_stuff_digest);
    if (read) return read.name;
    return itemEdge?.target_stuff_digest
      ? analysis.stuffRegistry[itemEdge.target_stuff_digest]?.name
      : undefined;
  }

  function stepsInside(id: string): number {
    const spec = specById.get(id);
    const children = rawAnalysis.containmentTree[id] ?? [];
    if (children.length === 0) return spec && spec.kind === "operator" ? 1 : 0;
    const counted = spec?.pipe_type === "PipeBatch" ? children.slice(0, 1) : children;
    return counted.reduce((sum, child) => sum + stepsInside(child), 0);
  }

  /** What a step box says: its description, or for a folded batch, its branch's. */
  function stepTitle(spec: GraphSpecNode, folded: boolean): string {
    let source = spec;
    if (folded && spec.pipe_type === "PipeBatch") {
      const branch = specById.get(rawAnalysis.containmentTree[spec.id]?.[0] ?? "");
      if (branch) source = branch;
    }
    const described = sentenceCase(source.description ?? "");
    return described || humanizeIdentifier(source.pipe_code ?? "");
  }

  const stepById = new Map(drawnSteps.map((card) => [card.id, card]));
  for (const spec of graphspec.nodes) {
    const card = stepById.get(spec.id);
    if (card) {
      const folded = card.data.isController === true;
      const pipeType = spec.pipe_type as PipeType;
      const title = stepTitle(spec, folded);
      const markerBatch =
        markedSteps[spec.id] ?? (folded && pipeType === "PipeBatch" ? spec.id : undefined);
      const markerItem = markerBatch ? itemName(markerBatch) : undefined;
      const forEach = markerBatch ? forEachLabel(markerItem ?? "item") : undefined;
      const innerStepCount = folded ? stepsInside(spec.id) : undefined;
      const onExpand = card.data.pipeCardData?.onExpand;
      const simple: SimpleNodePayload = {
        kind: "step",
        title,
        category: STEP_CATEGORY_BY_PIPE_TYPE[pipeType],
        status: stepStatus(spec),
        ...(graphMode !== undefined ? { graphMode } : {}),
        ...(forEach ? { forEach } : {}),
        ...(innerStepCount !== undefined ? { innerStepCount } : {}),
        ...(onExpand ? { onExpand } : {}),
      };
      simpleNodes.push({
        id: spec.id,
        type: NODE_TYPE_SIMPLE_STEP,
        data: {
          nodeData: spec,
          isPipe: !folded,
          isStuff: false,
          isController: folded,
          labelText: title,
          pipeCode: spec.pipe_code,
          pipeType: spec.pipe_type,
          graphMode,
          simple,
          layoutSize: simpleStepSize(title, {
            forEach: forEach !== undefined,
            innerSteps: innerStepCount !== undefined,
          }),
        },
        position: { x: 0, y: 0 },
      });
      continue;
    }
    if (decisionSet.has(spec.id)) {
      const title =
        sentenceCase(spec.description ?? "") || humanizeIdentifier(spec.pipe_code ?? "");
      simpleNodes.push({
        id: spec.id,
        type: NODE_TYPE_SIMPLE_DECISION,
        data: {
          nodeData: spec,
          isPipe: false,
          isStuff: false,
          isController: true,
          labelText: title,
          pipeCode: spec.pipe_code,
          pipeType: spec.pipe_type,
          graphMode,
          simple: {
            kind: "decision",
            title,
            status: spec.status,
            ...(graphMode !== undefined ? { graphMode } : {}),
          },
          layoutSize: simpleDecisionSize(title),
        },
        position: { x: 0, y: 0 },
      });
    }
  }

  for (const item of outputItems.values()) {
    simpleNodes.push(terminalNode(item, "output"));
  }

  // ── The frames: each "for each" batch holds the nodes drawn in its branch.
  const nearestFrame = (id: string): string | undefined => {
    let current = parentOf[id];
    while (current) {
      if (frameSet.has(current)) return current;
      current = parentOf[current];
    }
    return undefined;
  };
  const containmentTree: Record<string, string[]> = {};
  for (const frameId of frameSet) containmentTree[frameId] = [];
  for (const node of simpleNodes) {
    const frameId = node.data.isStuff ? undefined : nearestFrame(node.id);
    if (frameId) containmentTree[frameId].push(node.id);
  }
  for (const frameId of frameSet) {
    const outer = nearestFrame(frameId);
    if (outer) containmentTree[outer].push(frameId);
  }
  const childNodeIds = new Set(Object.values(containmentTree).flat());

  // Each frame is carried as a placeholder holding what it says, which the
  // frame pass turns into the positioned group once the layout has sized it.
  for (const frameId of frameSet) {
    const spec = specById.get(frameId);
    if (!spec) continue;
    const title = forEachLabel(itemName(frameId) ?? "item");
    simpleNodes.push({
      id: frameId,
      type: NODE_TYPE_SIMPLE_FRAME,
      data: {
        nodeData: spec,
        isPipe: false,
        isStuff: false,
        isController: true,
        labelText: title,
        pipeCode: spec.pipe_code,
        pipeType: spec.pipe_type,
        graphMode,
        simple: {
          kind: "frame",
          title,
          status: stepStatus(spec),
          ...(graphMode !== undefined ? { graphMode } : {}),
        },
      },
      position: { x: 0, y: 0 },
    });
  }

  return {
    nodes: simpleNodes,
    edges: [...edges.values()],
    analysis: {
      stuffRegistry: analysis.stuffRegistry,
      stuffProducers: {},
      stuffConsumers: {},
      controllerNodeIds: frameSet,
      childNodeIds,
      containmentTree,
    },
  };
}

function simpleEdge(
  id: string,
  source: string,
  target: string,
  edgeType: string,
  label: string | undefined,
): GraphEdge {
  const edge: GraphEdge = {
    id,
    source,
    target,
    type: edgeType,
    animated: false,
    style: { stroke: "var(--color-edge)", strokeWidth: 1.5 },
    markerEnd: { type: ARROW_CLOSED_MARKER, color: "var(--color-edge)" },
  };
  if (label) {
    edge.label = label;
    edge.labelStyle = {
      fontSize: "11px",
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fill: "var(--ctrl-condition-text)",
    };
    edge.labelBgStyle = { fill: "var(--color-bg)", fillOpacity: 0.92 };
    edge.labelBgPadding = [5, 3];
    edge.labelBgBorderRadius = 4;
  }
  return edge;
}

/**
 * The controllers the simple style folds when a graph is first drawn: every
 * sub-method (a sequence) from `SIMPLE_FOLD_DEPTH` levels down. The host's own fold mode
 * still applies on top.
 */
export function simpleDefaultFolds(
  graphspec: GraphSpec,
  rawAnalysis: DataflowAnalysis,
): Set<string> {
  const parentOf = parentMap(rawAnalysis.containmentTree);
  const sequenceIds = new Set(
    graphspec.nodes.filter((n) => n.pipe_type === "PipeSequence").map((n) => n.id),
  );
  const folded = new Set<string>();
  for (const ctrlId of rawAnalysis.controllerNodeIds) {
    let depth = 0;
    let current = parentOf[ctrlId];
    while (current) {
      depth += 1;
      current = parentOf[current];
    }
    if (depth >= SIMPLE_FOLD_DEPTH && sequenceIds.has(ctrlId)) folded.add(ctrlId);
  }
  return folded;
}

/**
 * Wrap the laid-out nodes in the simple style's "for each" frames: the group
 * nodes are built by the same pass that builds the detailed style's controller
 * groups, at the positions and sizes the layout gave them, and take what they
 * say from the projection's placeholders. Mutates the content nodes' `parentId`
 * and positions as that pass does, so callers pass a copy of the layout.
 */
export function applySimpleFrames(args: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  graphspec: GraphSpec;
  analysis: DataflowAnalysis;
  controllerPositions?: Record<string, ControllerRect>;
  onToggleFold?: (controllerId: string, options?: FoldToggleOptions) => void;
}): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const { nodes, edges, graphspec, analysis, controllerPositions, onToggleFold } = args;
  const placeholders = new Map<string, GraphNode>();
  const content: GraphNode[] = [];
  for (const node of nodes) {
    if (node.type === NODE_TYPE_SIMPLE_FRAME) placeholders.set(node.id, node);
    else content.push(node);
  }
  if (analysis.controllerNodeIds.size === 0) return { nodes: content, edges };
  const groups = buildControllerNodes(graphspec, analysis, content, controllerPositions);
  const frames = groups.map((group): GraphNode => {
    const placeholder = placeholders.get(group.id);
    const id = group.id;
    const simple = placeholder?.data.simple;
    const withFold =
      simple?.kind === "frame" && onToggleFold
        ? { ...simple, onFold: (options?: FoldToggleOptions) => onToggleFold(id, options) }
        : simple;
    return {
      ...group,
      type: NODE_TYPE_SIMPLE_FRAME,
      data: { ...(placeholder?.data ?? group.data), simple: withFold },
    };
  });
  return { nodes: sortParentsFirst([...frames, ...content]), edges };
}
