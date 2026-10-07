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
// - a binding step is plumbing: the arrow passes through it, unless it failed,
//   when it is a step, so a run that stopped there shows where;
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
  NodePipeType,
  PipeStatus,
  SimpleNodePayload,
  StepCategory,
} from "@graph/types";
import {
  ARROW_CLOSED_MARKER,
  BINDING_STEP_TYPE,
  EDGE_TYPE_ROUTED,
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
import { getPipeBlueprint, resolveConceptRef } from "@graph/graphAnalysis";
import { makePipeRef, parsePipeRef } from "@graph/pipeRefs";
import { buildControllerNodes, sortParentsFirst } from "@graph/graphControllers";
import type { ControllerRect } from "@graph/graphControllers";
import {
  conceptPlainName,
  humanizeIdentifier,
  isGenericConcept,
  outcomeLabel,
  sentenceCase,
  stripDomain,
} from "./humanize";
import { estimateWrap, textWidthPx } from "./textMetrics";

/** The domain of the concepts the standard defines, as a spec's concept registry records them. */
const NATIVE_DOMAIN = "native";

// ─── Metrics (keep in sync with SimpleStyle.css) ────────────────────────────
// The layout sizes every node before the DOM exists, so these mirror the
// stylesheet: box widths, paddings, font sizes and line heights.

export const SIMPLE_STEP_WIDTH = 160;
/**
 * The wider box a step takes when its title would need more lines than
 * `SIMPLE_TITLE_MAX_LINES` at `SIMPLE_STEP_WIDTH` and fits them at this one:
 * one step of width, not a box per title, so a column of steps keeps its rhythm.
 */
export const SIMPLE_STEP_WIDE_WIDTH = 200;
const STEP_PADDING_X = 12;
const STEP_PADDING_Y = 10;
const STEP_BORDER = 1.5;
const STEP_HEADER_HEIGHT = 16;
const STEP_GAP = 6;
export const SIMPLE_STEP_TITLE_FONT_PX = 15;
const STEP_TITLE_LINE_HEIGHT = 20;
export const SIMPLE_TITLE_MAX_LINES = 3;
const STEP_MARKER_HEIGHT = 18;
const STEP_INNER_HEIGHT = 22;

// An arrow's label: an outcome of a decision.
const EDGE_LABEL_FONT_PX = 11;
const EDGE_LABEL_LINE_HEIGHT = 13;
const EDGE_LABEL_PADDING: readonly [number, number] = [5, 3];

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

/**
 * The widths a decision diamond may take, narrowest first: it takes the first
 * at which its text fits in `SIMPLE_TITLE_MAX_LINES`, so a long question
 * widens the diamond rather than losing its end.
 */
export const SIMPLE_DECISION_WIDTHS: readonly number[] = [188, 220, 252, 284];
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
 * Room kept free at the end of every line the layout wraps text for: the
 * browser breaks a line the moment it overflows, and a fraction of a pixel of
 * rounding must not cost a title its last line.
 */
const WRAP_SLACK_PX = 2;

/** The width a step's title wraps at in a box of a width: inside its border and padding. */
function stepTitleWidth(boxWidth: number): number {
  return boxWidth - 2 * (STEP_PADDING_X + STEP_BORDER) - WRAP_SLACK_PX;
}
const TERMINAL_TITLE_WIDTH = SIMPLE_TERMINAL_WIDTH - 2 * TERMINAL_PADDING_X - WRAP_SLACK_PX;

function decisionTextWidth(diamondWidth: number): number {
  return Math.floor(diamondWidth * DECISION_TEXT_WIDTH_SHARE) - WRAP_SLACK_PX;
}

/**
 * The controller depth from which the simple style folds a sub-method by
 * default (the method's own controller is depth 0). Deep nesting is where a
 * flowchart stops reading as one; a folded sub-method is one step a reader
 * can open. Only sequences fold this way: a decision, a loop or a parallel is
 * structure the reader came to see, however deep it sits.
 */
export const SIMPLE_FOLD_DEPTH = 3;

// ─── Step categories ────────────────────────────────────────────────────────

/**
 * The category each card class reads as. Exhaustive over `NodePipeType`, so a
 * new pipe class must say what it is. A binding step is drawn only when it
 * failed, as the field it was picking.
 */
export const STEP_CATEGORY_BY_PIPE_TYPE: Record<NodePipeType, StepCategory> = {
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
  BindingStep: STEP_CATEGORY.PICK,
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
  pick: "Pick",
};

// ─── Sizes ──────────────────────────────────────────────────────────────────

/** The size of a step box for its title and markers. */
export function simpleStepSize(
  title: string,
  options: { forEach?: boolean; innerSteps?: boolean } = {},
): { width: number; height: number } {
  let width = SIMPLE_STEP_WIDTH;
  let wrap = simpleTitleWrap(title);
  if (wrap.clamped) {
    const wide = simpleTitleWrap(title, SIMPLE_STEP_WIDE_WIDTH);
    // Only a title the wider box saves takes it: one cut either way is cut
    // at the narrow width, which keeps the drawing compact.
    if (!wide.clamped) {
      width = SIMPLE_STEP_WIDE_WIDTH;
      wrap = wide;
    }
  }
  let height =
    2 * STEP_PADDING_Y +
    STEP_HEADER_HEIGHT +
    STEP_GAP +
    Math.max(1, wrap.drawnLines) * STEP_TITLE_LINE_HEIGHT;
  if (options.forEach) height += STEP_GAP + STEP_MARKER_HEIGHT;
  if (options.innerSteps) height += STEP_GAP + STEP_INNER_HEIGHT;
  return { width, height: Math.ceil(height + 2 * STEP_BORDER) };
}

/** The size of an input or output's document shape. */
export function simpleTerminalSize(
  title: string,
  hasSubtitle: boolean,
): { width: number; height: number } {
  const wrap = estimateWrap(
    title,
    TERMINAL_TITLE_WIDTH,
    TERMINAL_TITLE_FONT_PX,
    TERMINAL_TITLE_MAX_LINES,
  );
  const height =
    TERMINAL_PADDING_TOP +
    Math.max(1, wrap.drawnLines) * TERMINAL_TITLE_LINE_HEIGHT +
    (hasSubtitle ? TERMINAL_SUBTITLE_HEIGHT : 0) +
    TERMINAL_PADDING_BOTTOM;
  return { width: SIMPLE_TERMINAL_WIDTH, height: Math.max(TERMINAL_MIN_HEIGHT, height) };
}

/**
 * The size of a decision diamond for its text: the narrowest of
 * `SIMPLE_DECISION_WIDTHS` its text fits in, and the height that keeps the
 * text block inside the rhombus.
 */
export function simpleDecisionSize(title: string): { width: number; height: number } {
  let width = SIMPLE_DECISION_WIDTHS[0];
  let wrap = estimateWrap(
    title,
    decisionTextWidth(width),
    DECISION_TITLE_FONT_PX,
    SIMPLE_TITLE_MAX_LINES,
  );
  for (const candidate of SIMPLE_DECISION_WIDTHS.slice(1)) {
    if (!wrap.clamped) break;
    width = candidate;
    wrap = estimateWrap(
      title,
      decisionTextWidth(width),
      DECISION_TITLE_FONT_PX,
      SIMPLE_TITLE_MAX_LINES,
    );
  }
  const textHeight = Math.max(1, wrap.drawnLines) * DECISION_TITLE_LINE_HEIGHT;
  const height = Math.max(DECISION_MIN_HEIGHT, Math.ceil(textHeight / DECISION_TEXT_HEIGHT_SHARE));
  return { width, height };
}

/**
 * How a step title wraps in a box of a width (the default box unless given):
 * what the readability rubric checks, at the width the step is drawn at.
 */
export function simpleTitleWrap(title: string, boxWidth: number = SIMPLE_STEP_WIDTH) {
  return estimateWrap(
    title,
    stepTitleWidth(boxWidth),
    SIMPLE_STEP_TITLE_FONT_PX,
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
  /** Each spec node the style does not draw, mapped to the drawn node that stands for it. */
  standIns: ReadonlyMap<string, string>;
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

/**
 * Which node of a run stands in for which: a batch runs its branch once per
 * item, and the flowchart draws each step of it once. Two runs are the same
 * step when the same pipes lead to them from the top of the method, a pipe
 * known by its full reference so that two domains' pipes of one code stay two
 * steps, siblings outside a batch told apart by their order among calls to the
 * same pipe and the items of a batch not told apart at all. The run that shows
 * the step best stands in for the others, the first in containment order among
 * equals, so a first item that skipped a step, leaving it nothing to show, or
 * whose loop ran over an empty list, does not hide the items that ran it. A
 * static spec draws each batch's branch once, so nothing in it stands in for
 * anything.
 *
 * `drawability` ranks a run: 0 when it cannot be drawn, higher the more of the
 * step it shows. `representativeOf` holds only the runs another stands in for;
 * `order` is every node in containment order, parents first.
 */
function batchRepresentatives(
  graphspec: GraphSpec,
  analysis: DataflowAnalysis,
  drawability: (id: string) => number,
): { representativeOf: Map<string, string>; order: string[] } {
  const specById = new Map(graphspec.nodes.map((n) => [n.id, n]));
  const runsWithPath = new Map<string, string[]>();
  const representativeOf = new Map<string, string>();
  const order: string[] = [];

  function visit(ids: readonly string[], parentPath: string, inBatch: boolean): void {
    const seen = new Map<string, number>();
    for (const id of ids) {
      const spec = specById.get(id);
      const pipe = spec ? stepIdentity(spec) : id;
      const occurrence = seen.get(pipe) ?? 0;
      seen.set(pipe, occurrence + 1);
      const path = `${parentPath}/${pipe}#${inBatch ? "*" : occurrence}`;
      const runs = runsWithPath.get(path);
      if (runs) runs.push(id);
      else runsWithPath.set(path, [id]);
      order.push(id);
      visit(analysis.containmentTree[id] ?? [], path, spec?.pipe_type === "PipeBatch");
    }
  }
  visit(
    graphspec.nodes.filter((n) => !analysis.childNodeIds.has(n.id)).map((n) => n.id),
    "",
    false,
  );
  for (const runs of runsWithPath.values()) {
    if (runs.length < 2) continue;
    const best = Math.max(...runs.map(drawability));
    const representative = runs.find((id) => drawability(id) === best) ?? runs[0];
    for (const id of runs) if (id !== representative) representativeOf.set(id, representative);
  }
  return { representativeOf, order };
}

/**
 * What makes two runs the same step: the node's kind and the pipe it calls, by
 * its full reference where the spec gives a domain, or a binding's path.
 */
function stepIdentity(spec: GraphSpecNode): string {
  const ref =
    spec.domain_code && spec.pipe_code
      ? makePipeRef(spec.domain_code, spec.pipe_code)
      : (spec.pipe_code ?? spec.pipe_type);
  return `${spec.kind}:${ref}`;
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
  const { graphspec, nodes, analysis, rawAnalysis } = input;
  const graphMode = graphSpecMode(graphspec);
  const specById = new Map<string, GraphSpecNode>(graphspec.nodes.map((n) => [n.id, n]));

  const cards = new Map<string, GraphNode>();
  for (const node of nodes) {
    if (node.type === NODE_TYPE_PIPE_CARD) cards.set(node.id, node);
  }
  const liveControllers = analysis.controllerNodeIds;
  const pipeTypeOf = (id: string): string | undefined => specById.get(id)?.pipe_type;

  // ── A run draws a batch's branch once per item; the flowchart draws it once.
  // Every run of a step stands in for the run of the same step that shows it
  // best, and only that run is drawn. A step only a later item reached, such as
  // the branch of a decision the first item did not take, is drawn too, where
  // its first run sits. A run shows its step fully when it is drawn with what
  // it holds: an operator, a folded step, or a controller the folds left open.
  // A controller run that held nothing, such as a loop over an empty list, is
  // drawn empty, so it stands in only where no run held anything. A controller
  // hidden inside a fold cannot be drawn at all.
  const { representativeOf, order } = batchRepresentatives(graphspec, rawAnalysis, (id) => {
    if (liveControllers.has(id)) return 2;
    const card = cards.get(id);
    if (!card) return 0;
    return card.data.isController !== true && specById.get(id)?.kind === "controller" ? 1 : 2;
  });
  const repOf = (id: string): string => representativeOf.get(id) ?? id;
  // The containment the flowchart draws: a later run's own steps hang from the
  // run drawn for what holds them.
  const parentOf: Record<string, string> = {};
  for (const [id, parent] of Object.entries(parentMap(rawAnalysis.containmentTree))) {
    parentOf[id] = repOf(parent);
  }
  // A fold hides what it holds in every item. Where the run drawn for a step is
  // folded and a later item's run of it is not, as after a fold of that run
  // alone, the later run's steps hang from the folded step and are drawn as it.
  const foldedAbove = new Map<string, string>();
  for (const id of order) {
    for (let current = parentOf[id]; current; current = parentOf[current]) {
      if (cards.get(current)?.data.isController === true) {
        foldedAbove.set(id, current);
        break;
      }
    }
  }
  /** The drawn node a run of the spec is drawn as. */
  const drawnAs = (id: string): string => foldedAbove.get(id) ?? repOf(id);
  const hidden = new Set([...representativeOf.keys(), ...foldedAbove.keys()]);
  const childrenOf: Record<string, string[]> = {};
  for (const id of order) {
    const parent = parentOf[id];
    if (parent && !hidden.has(id)) (childrenOf[parent] ??= []).push(id);
  }

  function isInside(id: string, ancestorId: string): boolean {
    let current = parentOf[id];
    while (current) {
      if (current === ancestorId) return true;
      current = parentOf[current];
    }
    return false;
  }

  // A batch's branch is the run drawn for its first item's: a later item's
  // when the first one's has nothing to show.
  const batchBranch: Record<string, string> = {};
  for (const ctrlId of liveControllers) {
    if (hidden.has(ctrlId) || pipeTypeOf(ctrlId) !== "PipeBatch") continue;
    const first = analysis.containmentTree[ctrlId]?.[0];
    if (first) batchBranch[ctrlId] = repOf(first);
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

  const runStatuses = new Map<string, PipeStatus[]>();
  for (const spec of graphspec.nodes) {
    const rep = repOf(spec.id);
    const statuses = runStatuses.get(rep);
    if (statuses) statuses.push(spec.status);
    else runStatuses.set(rep, [spec.status]);
  }

  /** A node's status; one drawn once for every batch item stands for all of its runs. */
  function stepStatus(spec: GraphSpecNode): PipeStatus {
    return aggregateStatus(runStatuses.get(spec.id) ?? []) ?? spec.status;
  }

  // A binding step is plumbing, drawn only when it failed: the run stopped
  // there, and the step is where a reader finds the error.
  const drawnSteps = [...cards.values()].filter(
    (card) =>
      !hidden.has(card.id) &&
      (card.data.pipeType !== BINDING_STEP_TYPE ||
        aggregateStatus(runStatuses.get(card.id) ?? []) === "failed"),
  );
  const drawnStepIds = new Set(drawnSteps.map((card) => card.id));

  // ── The method's inputs and final outputs: the root pipes' io. Where a spec
  // has several roots, a value one root writes and another reads passes
  // between them, and is neither.
  const roots = graphspec.nodes.filter(
    (n) =>
      !rawAnalysis.childNodeIds.has(n.id) && (n.kind === "controller" || n.kind === "operator"),
  );
  const rootReads = new Set(roots.flatMap((r) => r.io.inputs.map((item) => item.digest)));
  const rootWrites = new Set(roots.flatMap((r) => r.io.outputs.map((item) => item.digest)));
  const inputItems = new Map<string, GraphSpecNodeIoItem>();
  const outputItems = new Map<string, GraphSpecNodeIoItem>();
  for (const root of roots) {
    for (const item of root.io.inputs) {
      if (!item.digest || inputItems.has(item.digest) || rootWrites.has(item.digest)) continue;
      inputItems.set(item.digest, item);
    }
  }
  for (const root of roots) {
    for (const item of root.io.outputs) {
      if (!item.digest || inputItems.has(item.digest) || outputItems.has(item.digest)) continue;
      if (rootReads.has(item.digest)) continue;
      outputItems.set(item.digest, item);
    }
  }

  // ── Where each value comes from, among the nodes drawn.
  // A value no step writes is combined from others: a parallel's combined
  // output, a batch's list of results, or the item a batch hands one branch.
  // Indexed once, since a batch run has one such value per item.
  const combinedFrom = new Map<string, string[]>();
  for (const edge of graphspec.edges) {
    const from = edge.source_stuff_digest;
    const into = edge.target_stuff_digest;
    if (!from || !into || from === into) continue;
    if (
      edge.kind !== "parallel_combine" &&
      edge.kind !== "batch_aggregate" &&
      edge.kind !== "batch_item"
    ) {
      continue;
    }
    const list = combinedFrom.get(into);
    if (list) list.push(from);
    else combinedFrom.set(into, [from]);
  }
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
      const card = cards.get(drawnAs(producerId));
      if (!card) continue;
      if (card.data.pipeType === BINDING_STEP_TYPE && !drawnStepIds.has(card.id)) {
        // A binding passes its root through under a new name.
        for (const item of specById.get(producerId)?.io.inputs ?? []) {
          if (item.digest) found.push(...sourcesOf(item.digest, visiting));
        }
      } else {
        found.push(card.id);
      }
    }
    if (producers.length === 0) {
      for (const from of combinedFrom.get(digest) ?? []) found.push(...sourcesOf(from, visiting));
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
      (e) =>
        e.kind === "contains" && repOf(e.source) === decisionId && e.target === branchId && e.label,
    );
    if (contains?.label) return outcomeLabel(contains.label);
    const decision = specById.get(decisionId);
    if (!decision?.domain_code || !decision.pipe_code || !branch?.pipe_code) return undefined;
    const blueprint = getPipeBlueprint(
      graphspec,
      makePipeRef(decision.domain_code, decision.pipe_code),
    );
    if (blueprint?.type !== "PipeCondition") return undefined;
    // An outcome is the branch's when it names the branch's pipe: its code, and
    // its domain, which a bare reference takes from the condition's own.
    const conditionDomain = decision.domain_code;
    const branchCode = branch.pipe_code;
    function namesBranch(pipeRef: string): boolean {
      const parsed = parsePipeRef(pipeRef);
      if (!parsed) return stripDomain(pipeRef) === branchCode;
      if (parsed.pipeCode !== branchCode) return false;
      const domain = parsed.domainPath ?? conditionDomain;
      return branch?.domain_code === undefined || branch.domain_code === domain;
    }
    const outcomes = Object.entries(blueprint.outcome_map)
      .filter(([, pipeRef]) => namesBranch(pipeRef))
      .map(([outcome]) => outcome);
    if (blueprint.default_outcome && namesBranch(blueprint.default_outcome)) {
      outcomes.push("default");
    }
    return outcomes.length > 0 ? outcomeLabel(outcomes.join("|")) : undefined;
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
  let edgeCount = 0;
  function addEdge(source: string, target: string): void {
    if (source === target) return;
    const key = `${source}->${target}`;
    if (edges.has(key)) return;
    const label = decisionSet.has(source)
      ? outcomeFor(source, branchOf(source, target))
      : undefined;
    edges.set(key, simpleEdge(`simple_edge_${edgeCount++}`, source, target, label));
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

  // A later run reads its own item's values, which come from the same steps as
  // the first run's, so it only adds an arrow where its item went another way.
  // A value with nothing drawn behind it is shown once, for the first run.
  function routeRead(digest: string, readerId: string): void {
    const target = drawnAs(readerId);
    if (target === readerId) route(sourcesOrDangling(digest), target);
    else route(sourcesOf(digest), target);
  }
  for (const [digest, consumers] of Object.entries(analysis.stuffConsumers)) {
    for (const consumerId of consumers) {
      if (drawnStepIds.has(drawnAs(consumerId))) routeRead(digest, consumerId);
    }
  }
  for (const conditionId of liveControllers) {
    if (!decisionSet.has(drawnAs(conditionId))) continue;
    for (const item of specById.get(conditionId)?.io.inputs ?? []) {
      if (item.digest) routeRead(item.digest, conditionId);
    }
  }
  for (const digest of outputItems.keys()) {
    for (const source of sourcesOf(digest)) addEdge(source, stuffNodeId(digest));
  }

  // A decision's arrow goes to the first steps of a branch only. A later step
  // of the branch that also reads a value from before the decision is reached
  // through the steps before it, so a second arrow with the same outcome would
  // say the branch is taken twice.
  for (const [key, edge] of [...edges]) {
    if (!decisionSet.has(edge.source)) continue;
    const branchId = branchOf(edge.source, edge.target);
    const followsInBranch = [...edges.values()].some(
      (other) =>
        other.target === edge.target &&
        other.source !== edge.source &&
        isInside(other.source, branchId),
    );
    if (followsInBranch) edges.delete(key);
  }

  // Every branch a decision can take gets its arrow, even one that reads
  // nothing from before the decision.
  function firstDrawnIn(id: string): string | undefined {
    if (drawnStepIds.has(id) || decisionSet.has(id)) return id;
    for (const child of childrenOf[id] ?? []) {
      const found = firstDrawnIn(child);
      if (found) return found;
    }
    return undefined;
  }
  for (const decisionId of decisions) {
    for (const branchId of childrenOf[decisionId] ?? []) {
      const reached = [...edges.values()].some(
        (e) => e.source === decisionId && (e.target === branchId || isInside(e.target, branchId)),
      );
      const entry = reached ? undefined : firstDrawnIn(branchId);
      if (entry) addEdge(decisionId, entry);
    }
  }

  // ── Nodes, in the spec's order: inputs, then steps and decisions, then outputs.
  const simpleNodes: GraphNode[] = [];

  /**
   * Whether a concept is one the standard defines (`Text`, `Image`, …), as the
   * spec's concept registry records it, which says what kind of value
   * something is without saying what it is.
   */
  function isBuiltInConcept(conceptRef: string): boolean {
    const info = resolveConceptRef(graphspec, conceptRef);
    if (info) return info.domain_code === NATIVE_DOMAIN;
    return conceptRef.startsWith(`${NATIVE_DOMAIN}.`) || isGenericConcept(conceptRef);
  }

  /**
   * A method input is named by its variable, with its concept's plain name
   * beneath when that says more. The final output is named by its concept when
   * the author defined it ("Bid summary"), and like an input when the concept
   * is built in, since a shape reading "Text" says nothing.
   */
  function terminalNode(item: GraphSpecNodeIoItem, kind: "input" | "output"): GraphNode {
    const digest = item.digest as string;
    const concept = item.concept;
    const isList = isPluralMultiplicity(item.multiplicity);
    let title: string;
    let subtitle: string | undefined;
    if (kind === "output" && concept && !isBuiltInConcept(concept)) {
      title = conceptPlainName(concept);
    } else {
      title = humanizeIdentifier(item.name);
      const plain = concept ? conceptPlainName(concept) : undefined;
      subtitle = plain && plain.toLowerCase() !== title.toLowerCase() ? plain : undefined;
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

  /**
   * The name of the item a batch hands its branch: the blueprint's, unless it
   * is unwritten yet, else the name the branch reads its item under, else the
   * item's own.
   */
  function itemName(batchId: string): string | undefined {
    const batch = specById.get(batchId);
    if (batch?.domain_code && batch.pipe_code) {
      const blueprint = getPipeBlueprint(
        graphspec,
        makePipeRef(batch.domain_code, batch.pipe_code),
      );
      if (blueprint?.type === "PipeBatch" && blueprint.batch_params.input_item_stuff_name) {
        return blueprint.batch_params.input_item_stuff_name;
      }
    }
    // The branch drawn may be a later item's run, so the items of every run of
    // the batch are looked for, not only the first run's.
    const runsOfBatch = new Set([batchId]);
    for (const [id, representative] of representativeOf) {
      if (representative === batchId) runsOfBatch.add(id);
    }
    const itemEdges = graphspec.edges.filter(
      (e) => e.kind === "batch_item" && runsOfBatch.has(e.source) && e.target_stuff_digest,
    );
    const itemDigests = new Set(itemEdges.map((e) => e.target_stuff_digest));
    const branchId = batchBranch[batchId] ?? rawAnalysis.containmentTree[batchId]?.[0];
    const branch = branchId ? specById.get(branchId) : undefined;
    const read = branch?.io.inputs.find((i) => itemDigests.has(i.digest));
    if (read?.name) return read.name;
    const firstItem = itemEdges.find((e) => e.source === batchId) ?? itemEdges[0];
    return firstItem?.target_stuff_digest
      ? analysis.stuffRegistry[firstItem.target_stuff_digest]?.name || undefined
      : undefined;
  }

  function stepsInside(id: string): number {
    const spec = specById.get(id);
    const children = rawAnalysis.containmentTree[id] ?? [];
    if (children.length === 0) return spec && spec.kind === "operator" ? 1 : 0;
    const counted = spec?.pipe_type === "PipeBatch" ? children.slice(0, 1) : children;
    return counted.reduce((sum, child) => sum + stepsInside(child), 0);
  }

  /**
   * What a step box says: its description, or for a folded batch, its
   * branch's. A binding step, drawn only when it failed, names the field it was
   * picking, the last segment of its path, since its description is the
   * runtime's own sentence about names.
   */
  function stepTitle(spec: GraphSpecNode, folded: boolean): string {
    if (spec.pipe_type === BINDING_STEP_TYPE) {
      return humanizeIdentifier(spec.pipe_code?.split(".").pop() ?? "");
    }
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
      const pipeType: NodePipeType = spec.pipe_type;
      const title = stepTitle(spec, folded);
      const markerBatch =
        markedSteps[spec.id] ?? (folded && pipeType === "PipeBatch" ? spec.id : undefined);
      const markerItem = markerBatch ? itemName(markerBatch) : undefined;
      const forEach = markerBatch ? forEachLabel(markerItem || "item") : undefined;
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
            status: stepStatus(spec),
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
    const title = forEachLabel(itemName(frameId) || "item");
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

  // ── What stands for a node the flowchart does not draw, so that a validation
  // issue pinned to it still badges a drawn node: a later item's run stands for
  // the run drawn, or for the folded step it is drawn as, a batch of one step
  // for its marked step, a binding step for
  // the first drawn node that reads its result (or, when nothing does, for what
  // stands for the sub-method holding it), and a sub-method drawn as its steps
  // for the first of them.
  const drawnIds = new Set(simpleNodes.map((n) => n.id));
  const standIns = new Map<string, string>();
  const resolving = new Set<string>();
  function standIn(id: string): string | undefined {
    if (drawnIds.has(id)) return id;
    if (standIns.has(id)) return standIns.get(id);
    if (resolving.has(id)) return undefined;
    resolving.add(id);
    let found: string | undefined;
    const representative = foldedAbove.get(id) ?? representativeOf.get(id);
    const branch = batchBranch[id];
    if (representative) {
      found = standIn(representative);
    } else if (branch && markedSteps[branch] === id) {
      found = standIn(branch);
    } else if (pipeTypeOf(id) === BINDING_STEP_TYPE) {
      for (const item of specById.get(id)?.io.outputs ?? []) {
        if (!item.digest) continue;
        for (const reader of rawAnalysis.stuffConsumers[item.digest] ?? []) {
          found ??= standIn(reader);
        }
        if (!found && drawnIds.has(stuffNodeId(item.digest))) found = stuffNodeId(item.digest);
        if (found) break;
      }
      // A result nothing reads: what stands for the sub-method holding it.
      const parent = parentOf[id];
      if (!found && parent) found = standIn(parent);
    } else {
      for (const child of childrenOf[id] ?? []) {
        found = standIn(child);
        if (found) break;
      }
    }
    resolving.delete(id);
    if (found) standIns.set(id, found);
    return found;
  }
  for (const spec of graphspec.nodes) standIn(spec.id);

  return {
    nodes: simpleNodes,
    edges: [...edges.values()],
    standIns,
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

/**
 * The size an arrow label is drawn at, background included, so the layout
 * reserves room for it: the text at `EDGE_LABEL_FONT_PX`, padded by
 * `EDGE_LABEL_PADDING`.
 */
export function simpleEdgeLabelSize(label: string): { width: number; height: number } {
  const [padX, padY] = EDGE_LABEL_PADDING;
  return {
    width: Math.ceil(textWidthPx(label, EDGE_LABEL_FONT_PX)) + 2 * padX,
    height: EDGE_LABEL_LINE_HEIGHT + 2 * padY,
  };
}

// The simple style draws every arrow along the layout's route (`EDGE_TYPE_ROUTED`),
// whatever curve the host picked for the detailed style: a flowchart's arrows
// go around the steps between their ends, never through them.
function simpleEdge(
  id: string,
  source: string,
  target: string,
  label: string | undefined,
): GraphEdge {
  const edge: GraphEdge = {
    id,
    source,
    target,
    type: EDGE_TYPE_ROUTED,
    animated: false,
    style: { stroke: "var(--color-edge)", strokeWidth: 1.5 },
    markerEnd: { type: ARROW_CLOSED_MARKER, color: "var(--color-edge)" },
  };
  if (label) {
    edge.label = label;
    edge.labelStyle = {
      fontSize: `${EDGE_LABEL_FONT_PX}px`,
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fill: "var(--ctrl-condition-text)",
    };
    edge.labelBgStyle = { fill: "var(--color-bg)", fillOpacity: 0.92 };
    edge.labelBgPadding = [...EDGE_LABEL_PADDING];
    edge.labelBgBorderRadius = 4;
    edge.labelSize = simpleEdgeLabelSize(label);
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
