// What the simple style's detail panel says about the node or the arrow a
// reader opened, as data: the panel's view draws it, and nothing here is a
// sentence. The rule is the canvas's own: only what the method declares, in
// the words its author wrote, so every title comes from the helpers the
// projection titles its nodes with, and a value is named exactly as the canvas
// names it.
//
// Pure and React-free, like the projection it reads.

import type { Problem } from "mthds/errors";
import type {
  FoldToggleOptions,
  GraphEdge,
  GraphNode,
  GraphSpec,
  GraphSpecNode,
  GraphSpecNodeIoItem,
  PipeStatus,
  StepCategory,
} from "@graph/types";
import {
  NODE_TYPE_SIMPLE_DECISION,
  NODE_TYPE_SIMPLE_FRAME,
  NODE_TYPE_SIMPLE_STEP,
  NODE_TYPE_SIMPLE_TERMINAL,
  isDryGraphSpec,
  isPluralMultiplicity,
  isStaticGraphSpec,
} from "@graph/types";
import { getPipeBlueprint, resolveConceptRef, resolveNodeBlueprint } from "@graph/graphAnalysis";
import { makePipeRef, parsePipeRef } from "@graph/pipeRefs";
import { findStuffByDigest } from "@graph/stuffLookup";
import type { StuffLocation } from "@graph/stuffLookup";
import { humanizeIdentifier, outcomeLabel, pipeTitle, stripDomain } from "./humanize";
import { aggregateStatus, simpleValueTitle } from "./simpleStyle";
import type { SimpleValueFlow } from "./simpleStyle";

// ─── The model ──────────────────────────────────────────────────────────────

/** Which of the simple style's shapes a link points at. */
export type SimpleLinkKind = "step" | "decision" | "frame" | "input" | "output";

/** A drawn node the panel names and lets the reader go to. */
export interface SimpleNodeLink {
  nodeId: string;
  title: string;
  kind: SimpleLinkKind;
}

/** A value as the panel shows it: named as the canvas names it, with where it comes from and goes. */
export interface SimpleValue {
  digest: string;
  title: string;
  /** The concept's plain name, when it says something the title does not. */
  subtitle?: string;
  /** The concept's authored description. */
  description?: string;
  isList: boolean;
  /** The drawn nodes it comes from: the steps that wrote it, or the method input it is. */
  from: SimpleNodeLink[];
  /** The drawn nodes that read it, the method's final output included. */
  to: SimpleNodeLink[];
  /**
   * Where the spec holds it, for drawing the value itself: the richest copy and
   * the pipe that produced it, which the result panel's descriptors are keyed by.
   */
  location: StuffLocation | null;
}

/** How the runs of a node drawn once for several stand, by status. */
export interface SimpleRunTally {
  total: number;
  byStatus: Partial<Record<PipeStatus, number>>;
}

/** What the panel says of a node's run; absent in a static graph, which ran nothing. */
export interface SimpleRunSummary {
  /** The status the canvas shows, the worst of its runs for a node drawn once for several. */
  status: PipeStatus;
  /** Seconds, for a node drawn for one run that recorded its time. */
  durationSeconds?: number;
  /**
   * For a node drawn once for several runs, a step a batch ran once per item:
   * how many there were and how they stand.
   */
  tally?: SimpleRunTally;
}

/**
 * What a step is asked to do, in its author's words: an AI step's prompt, a
 * judge's question, an image step's description, a search's query. The view
 * heads it by `category`.
 */
export interface SimpleInstructions {
  category: StepCategory;
  text: string;
}

/**
 * An outcome that leads to no step: `fail` stops the method with a failure,
 * `continue` goes on past the decision without running a branch.
 */
export type SimpleOutcomeEnd = "fail" | "continue";

/** One way a decision can go. */
export interface SimpleOutcome {
  /** The outcome in plain words: "Needs review", "Yes", "Otherwise". */
  label: string;
  /** The step it leads to, by the registry's title, drawn or not; empty when `ends` is set. */
  leadsToTitle: string;
  /** Set when the outcome leads to no step, which the canvas draws no arrow for. */
  ends?: SimpleOutcomeEnd;
  /** The drawn node its arrow goes to, when it is drawn. */
  leadsTo?: SimpleNodeLink;
  /**
   * In a run: how many of the decision's runs took it, out of `runs`. Absent in
   * a static graph and in a dry run, which resolves no condition, and for an
   * outcome that `ends`, which leaves no branch to read it off.
   */
  taken?: number;
}

interface SimpleNodeDetailBase {
  nodeId: string;
  title: string;
  /** The spec node the panel's technical fold shows. */
  specNode: GraphSpecNode;
  run?: SimpleRunSummary;
  /**
   * Why it failed, first in the panel: for a node drawn once for several runs,
   * the problem of the first run that failed, which need not be the drawn one.
   */
  problem?: Problem;
}

export interface SimpleStepDetail extends SimpleNodeDetailBase {
  kind: "step";
  category: StepCategory;
  uses: SimpleValue[];
  produces: SimpleValue[];
  instructions?: SimpleInstructions;
  /** "For each page", when a batch runs the step once per item. */
  forEach?: string;
  /** For a folded sub-method: the titles of the steps it holds, and how to unfold it. */
  inner?: {
    count: number;
    steps: string[];
    onExpand?: (options?: FoldToggleOptions) => void;
  };
}

export interface SimpleDecisionDetail extends SimpleNodeDetailBase {
  kind: "decision";
  uses: SimpleValue[];
  outcomes: SimpleOutcome[];
  /** How many times the decision was made: more than one inside a batch. */
  runs: number;
}

export interface SimpleFrameDetail extends SimpleNodeDetailBase {
  kind: "frame";
  /** The list it repeats over. */
  over?: SimpleValue;
  /** The drawn nodes it repeats, in drawing order. */
  steps: SimpleNodeLink[];
  /** In a run: how the items stand. */
  items?: SimpleRunTally;
}

export interface SimpleValueDetail {
  kind: "value";
  nodeId: string;
  role: "input" | "output";
  value: SimpleValue;
  /** What the value's concept holds, field by field, in plain words. */
  fields: { title: string; description?: string }[];
}

export interface SimpleArrowDetail {
  kind: "arrow";
  edgeId: string;
  from: SimpleNodeLink;
  to: SimpleNodeLink;
  /** The outcome it stands for, when it leaves a decision. */
  outcome?: string;
  values: SimpleValue[];
}

/** What the simple style's panel shows, discriminated on `kind`. */
export type SimpleDetail =
  | SimpleStepDetail
  | SimpleDecisionDetail
  | SimpleFrameDetail
  | SimpleValueDetail
  | SimpleArrowDetail;

/**
 * What the panel was opened on: a node, by its id, or an arrow, by its two ends,
 * which name one arrow of a drawing however it was numbered.
 */
export type SimpleDetailTarget =
  | { kind: "node"; id: string }
  | { kind: "arrow"; source: string; target: string };

export interface SimpleDetailInput {
  graphspec: GraphSpec;
  /**
   * The nodes the simple style drew, as the canvas holds them: the payload's
   * status is the one the canvas shows, a host's `statusMap` included.
   */
  nodes: readonly Pick<GraphNode, "id" | "type" | "data">[];
  edges: readonly Pick<GraphEdge, "id" | "source" | "target" | "label" | "carries">[];
  /** The projection's value flows (`SimpleProjection.valueFlows`). */
  valueFlows: ReadonlyMap<string, SimpleValueFlow>;
  /** The projection's runs (`SimpleProjection.runs`). */
  runs: ReadonlyMap<string, readonly string[]>;
  /**
   * What each "for each" frame holds, by the frame's id: the projection's
   * `analysis.containmentTree`, whose only controllers are its frames.
   */
  frameContents: Readonly<Record<string, readonly string[]>>;
}

// ─── Building it ────────────────────────────────────────────────────────────

/**
 * What the panel says about a node or an arrow of the simple style, or null
 * when the target is not one the style drew.
 */
export function buildSimpleNodeDetail(
  input: SimpleDetailInput,
  target: SimpleDetailTarget,
): SimpleDetail | null {
  const { graphspec, nodes, edges, valueFlows, runs, frameContents } = input;
  const specById = new Map(graphspec.nodes.map((n) => [n.id, n]));
  const childrenOf = childrenIndex(graphspec);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const isStatic = isStaticGraphSpec(graphspec);
  const isDry = isDryGraphSpec(graphspec);
  const finalOutputs = new Set(
    nodes
      .filter((n) => n.type === NODE_TYPE_SIMPLE_TERMINAL && n.data.stuffRole === "output")
      .map((n) => n.data.stuffDigest)
      .filter((digest): digest is string => digest !== undefined),
  );

  function link(nodeId: string): SimpleNodeLink | null {
    const node = nodeById.get(nodeId);
    if (!node) return null;
    return { nodeId, title: node.data.simple?.title ?? node.data.labelText, kind: linkKind(node) };
  }
  const links = (ids: readonly string[]): SimpleNodeLink[] =>
    ids.map(link).filter((l): l is SimpleNodeLink => l !== null);

  /** A value as the panel shows it, opened from `selfId`, which its links leave out. */
  function value(
    item: Pick<GraphSpecNodeIoItem, "name" | "concept" | "multiplicity" | "digest">,
    selfId?: string,
  ) {
    const digest = item.digest ?? "";
    const others = (ids: readonly string[]) => links(ids.filter((id) => id !== selfId));
    const { title, subtitle } = simpleValueTitle(
      graphspec,
      item,
      finalOutputs.has(digest) ? "output" : "input",
    );
    const description = item.concept
      ? resolveConceptRef(graphspec, item.concept)?.description?.trim()
      : undefined;
    const flow = digest ? valueFlows.get(digest) : undefined;
    const result: SimpleValue = {
      digest,
      title,
      isList: isPluralMultiplicity(item.multiplicity),
      from: others(flow?.from ?? []),
      to: others(flow?.to ?? []),
      location: digest ? findStuffByDigest(graphspec, digest) : null,
    };
    if (subtitle) result.subtitle = subtitle;
    if (description) result.description = description;
    return result;
  }
  const valueOfDigest = (digest: string, selfId?: string): SimpleValue | null => {
    const location = findStuffByDigest(graphspec, digest);
    return location ? value(location.item, selfId) : null;
  };

  const runSpecs = (nodeId: string): GraphSpecNode[] =>
    (runs.get(nodeId) ?? [nodeId])
      .map((id) => specById.get(id))
      .filter((n): n is GraphSpecNode => n !== undefined);

  function runSummary(nodeId: string, status: PipeStatus): SimpleRunSummary | undefined {
    if (isStatic) return undefined;
    const ids = runs.get(nodeId) ?? [nodeId];
    const summary: SimpleRunSummary = { status };
    if (ids.length > 1) {
      const statuses = runSpecs(nodeId).map((n) => n.status);
      // A host's `statusMap` sets one status per pipe code, so once it says
      // something other than the runs do, a count of the runs would contradict
      // the status shown beside it, and it cannot be told how each run went.
      if (aggregateStatus(statuses) === status) summary.tally = tallyOf(statuses);
    } else {
      const duration = specById.get(nodeId)?.timing?.duration;
      if (typeof duration === "number") summary.durationSeconds = duration;
    }
    return summary;
  }

  function base(node: Pick<GraphNode, "id" | "data">, spec: GraphSpecNode, title: string) {
    const status = statusOf(node, spec);
    const detail: SimpleNodeDetailBase = { nodeId: node.id, title, specNode: spec };
    const run = runSummary(node.id, status);
    if (run) detail.run = run;
    // The drawn run first, then the others it stands for: a batch item that
    // failed is not necessarily the one drawn.
    const problem = spec.error ?? runSpecs(node.id).find((n) => n.error)?.error;
    if (problem) detail.problem = problem;
    return detail;
  }

  if (target.kind === "arrow") {
    const edge = edges.find((e) => e.source === target.source && e.target === target.target);
    if (!edge) return null;
    const from = link(edge.source);
    const to = link(edge.target);
    if (!from || !to) return null;
    const detail: SimpleArrowDetail = {
      kind: "arrow",
      edgeId: edge.id,
      from,
      to,
      values: (edge.carries ?? [])
        .map((digest) => valueOfDigest(digest))
        .filter((v): v is SimpleValue => v !== null),
    };
    if (edge.label) detail.outcome = edge.label;
    return detail;
  }

  const node = nodeById.get(target.id);
  if (!node) return null;
  const simple = node.data.simple;

  if (node.type === NODE_TYPE_SIMPLE_TERMINAL) {
    const digest = node.data.stuffDigest;
    const located = digest ? valueOfDigest(digest, node.id) : null;
    if (!located) return null;
    const role = node.data.stuffRole === "output" ? "output" : "input";
    const conceptRef = located.location?.item.concept;
    const concept = conceptRef ? resolveConceptRef(graphspec, conceptRef) : undefined;
    return {
      kind: "value",
      nodeId: node.id,
      role,
      value: located,
      fields: conceptFields(concept?.json_schema),
    };
  }

  const spec = specById.get(node.id);
  if (!spec) return null;

  if (node.type === NODE_TYPE_SIMPLE_STEP && simple?.kind === "step") {
    const detail: SimpleStepDetail = {
      ...base(node, spec, simple.title),
      kind: "step",
      category: simple.category,
      uses: spec.io.inputs.map((item) => value(item, node.id)),
      produces: spec.io.outputs.map((item) => value(item, node.id)),
    };
    // A folded sub-method is described by what it holds, not by a prompt.
    if (simple.innerStepCount !== undefined) {
      detail.inner = {
        count: simple.innerStepCount,
        steps: stepTitlesInside(specById, childrenOf, spec.id),
        ...(simple.onExpand ? { onExpand: simple.onExpand } : {}),
      };
    } else {
      const instructions = instructionsOf(graphspec, spec, simple.category);
      if (instructions) detail.instructions = instructions;
    }
    if (simple.forEach) detail.forEach = simple.forEach;
    return detail;
  }

  if (node.type === NODE_TYPE_SIMPLE_DECISION && simple?.kind === "decision") {
    const decisionRuns = runSpecs(node.id);
    return {
      ...base(node, spec, simple.title),
      kind: "decision",
      uses: spec.io.inputs.map((item) => value(item, node.id)),
      outcomes: decisionOutcomes(graphspec, spec, decisionRuns, {
        resolved: !isStatic && !isDry,
        edges: edges.filter((e) => e.source === node.id),
        link,
        specById,
        childrenOf,
      }),
      runs: decisionRuns.length,
    };
  }

  if (node.type === NODE_TYPE_SIMPLE_FRAME && simple?.kind === "frame") {
    const detail: SimpleFrameDetail = {
      ...base(node, spec, simple.title),
      kind: "frame",
      steps: links(frameContents[node.id] ?? []),
    };
    const listName = batchListName(graphspec, spec);
    const list = listName ? spec.io.inputs.find((item) => item.name === listName) : undefined;
    const over = list ?? spec.io.inputs[0];
    if (over) detail.over = value(over, node.id);
    if (!isStatic) {
      const items = (runs.get(node.id) ?? [node.id]).flatMap((id) =>
        childrenOf(id).map((child) => specById.get(child)?.status),
      );
      if (items.length > 0) detail.items = tallyOf(items);
    }
    return detail;
  }

  return null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function linkKind(node: Pick<GraphNode, "type" | "data">): SimpleLinkKind {
  switch (node.type) {
    case NODE_TYPE_SIMPLE_TERMINAL:
      return node.data.stuffRole === "output" ? "output" : "input";
    case NODE_TYPE_SIMPLE_DECISION:
      return "decision";
    case NODE_TYPE_SIMPLE_FRAME:
      return "frame";
    default:
      return "step";
  }
}

/** The status the canvas shows for a node: its payload's, else the spec's. */
function statusOf(node: Pick<GraphNode, "data">, spec: GraphSpecNode): PipeStatus {
  const simple = node.data.simple;
  return simple && "status" in simple ? simple.status : spec.status;
}

function tallyOf(statuses: readonly (PipeStatus | undefined)[]): SimpleRunTally {
  const byStatus: Partial<Record<PipeStatus, number>> = {};
  let total = 0;
  for (const status of statuses) {
    if (!status) continue;
    total += 1;
    byStatus[status] = (byStatus[status] ?? 0) + 1;
  }
  return { total, byStatus };
}

/** A node's direct children in the spec's containment, indexed once per build. */
type ChildrenOf = (id: string) => readonly string[];

function childrenIndex(graphspec: GraphSpec): ChildrenOf {
  const children = new Map<string, string[]>();
  for (const edge of graphspec.edges) {
    if (edge.kind !== "contains") continue;
    const list = children.get(edge.source);
    if (list) list.push(edge.target);
    else children.set(edge.source, [edge.target]);
  }
  return (id) => children.get(id) ?? [];
}

/**
 * The titles of the steps a folded sub-method holds, in order: its operators,
 * a batch's branch counted once, as the canvas counts them.
 */
function stepTitlesInside(
  specById: ReadonlyMap<string, GraphSpecNode>,
  childrenOf: ChildrenOf,
  id: string,
): string[] {
  const titles: string[] = [];
  const visit = (nodeId: string) => {
    const spec = specById.get(nodeId);
    const children = childrenOf(nodeId);
    if (children.length === 0) {
      if (spec?.kind === "operator") {
        titles.push(pipeTitle(spec.description, spec.pipe_code ?? "").title);
      }
      return;
    }
    for (const child of spec?.pipe_type === "PipeBatch" ? children.slice(0, 1) : children) {
      visit(child);
    }
  };
  visit(id);
  return titles;
}

/** What a step is asked, in the author's words, for the categories that ask anything. */
function instructionsOf(
  graphspec: GraphSpec,
  spec: GraphSpecNode,
  category: StepCategory,
): SimpleInstructions | undefined {
  const blueprint = resolveNodeBlueprint(graphspec, spec);
  if (!blueprint) return undefined;
  let text: string | null | undefined;
  switch (blueprint.type) {
    case "PipeLLM":
      text = blueprint.llm_prompt_spec.prompt_blueprint?.template;
      break;
    case "PipeJudge":
      text = blueprint.judgment_question.instructions;
      break;
    case "PipeImgGen":
      text = blueprint.img_gen_prompt_blueprint.prompt_blueprint?.template;
      break;
    case "PipeSearch":
      text = blueprint.prompt_blueprint.template;
      break;
    default:
      return undefined;
  }
  const trimmed = text?.trim();
  return trimmed ? { category, text: trimmed } : undefined;
}

/** The name of the list a batch repeats over, as its blueprint declares it. */
function batchListName(graphspec: GraphSpec, spec: GraphSpecNode): string | undefined {
  const blueprint = resolveNodeBlueprint(graphspec, spec);
  return blueprint?.type === "PipeBatch" ? blueprint.batch_params.input_list_stuff_name : undefined;
}

/**
 * Each way a decision can go, from its blueprint, one row per branch: the
 * outcomes that lead to the same pipe are one row, labelled as the canvas
 * labels its arrow ("No fit or otherwise"). In a resolved run, each row says how
 * many of the decision's runs took it, read off which branches ran.
 */
function decisionOutcomes(
  graphspec: GraphSpec,
  decision: GraphSpecNode,
  decisionRuns: readonly GraphSpecNode[],
  context: {
    resolved: boolean;
    edges: readonly Pick<GraphEdge, "target" | "label">[];
    link: (nodeId: string) => SimpleNodeLink | null;
    specById: ReadonlyMap<string, GraphSpecNode>;
    childrenOf: ChildrenOf;
  },
): SimpleOutcome[] {
  if (!decision.domain_code || !decision.pipe_code) return [];
  const blueprint = getPipeBlueprint(
    graphspec,
    makePipeRef(decision.domain_code, decision.pipe_code),
  );
  if (blueprint?.type !== "PipeCondition") return [];
  const domain = decision.domain_code;

  const { specById, childrenOf } = context;

  // The branch each outcome names, by its pipe's full reference; `fail` and
  // `continue` name no pipe, and keep their own key.
  const fullRef = (pipeRef: string): string => {
    if (isOutcomeEnd(pipeRef)) return pipeRef;
    const parsed = parsePipeRef(pipeRef);
    return parsed ? makePipeRef(parsed.domainPath ?? domain, parsed.pipeCode) : pipeRef;
  };
  const byBranch = new Map<string, string[]>();
  const named: [string, string][] = Object.entries(blueprint.outcome_map);
  if (blueprint.default_outcome) named.push(["default", blueprint.default_outcome]);
  for (const [outcome, pipeRef] of named) {
    if (!pipeRef) continue;
    const ref = fullRef(pipeRef);
    const outcomes = byBranch.get(ref);
    if (outcomes) outcomes.push(outcome);
    else byBranch.set(ref, [outcome]);
  }

  const ranIn = (ref: string, run: GraphSpecNode): boolean =>
    childrenOf(run.id).some((childId) => {
      const child = specById.get(childId);
      if (!child?.pipe_code) return false;
      const childRef = makePipeRef(child.domain_code ?? domain, child.pipe_code);
      return childRef === ref && child.status !== "skipped" && child.status !== "scheduled";
    });

  return [...byBranch.entries()].map(([ref, outcomes]) => {
    const label = outcomeLabel(outcomes.join("|"));
    if (isOutcomeEnd(ref)) return { label, leadsToTitle: "", ends: ref };
    const branch = getPipeBlueprint(graphspec, ref);
    const parsed = parsePipeRef(ref);
    const code = parsed?.pipeCode ?? stripDomain(ref);
    const row: SimpleOutcome = {
      label,
      leadsToTitle: pipeTitle(branch?.description, code).title,
    };
    const edge = context.edges.find((e) => e.label === label);
    const leadsTo = edge ? context.link(edge.target) : null;
    if (leadsTo) row.leadsTo = leadsTo;
    if (context.resolved) row.taken = decisionRuns.filter((run) => ranIn(ref, run)).length;
    return row;
  });
}

/** Whether a decision's outcome names no pipe: the method fails, or carries on past it. */
function isOutcomeEnd(pipeRef: string): pipeRef is SimpleOutcomeEnd {
  return pipeRef === "fail" || pipeRef === "continue";
}

/** A concept's fields in plain words, from its JSON schema. */
function conceptFields(
  schema: Record<string, unknown> | undefined,
): { title: string; description?: string }[] {
  const properties = schema?.properties as Record<string, Record<string, unknown>> | undefined;
  if (!properties) return [];
  return Object.entries(properties).map(([name, field]) => {
    const description =
      typeof field.description === "string" ? field.description.trim() : undefined;
    return description
      ? { title: humanizeIdentifier(name), description }
      : { title: humanizeIdentifier(name) };
  });
}
