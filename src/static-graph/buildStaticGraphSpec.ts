// ─── Static graph builder: MergedMethodSet → GraphSpec ──────────────────────
// The static walk: walk pipe *invocations* starting at the entry pipe,
// maintaining a scope (the static mirror of working memory), and emit a
// GraphSpec with `meta.mode: "static"` that the existing GraphViewer renders
// unchanged.
//
// Identity is deterministic: node ids are invocation paths
// (`screening.process_cv/step_2/...`) and stuff digests are the raw strings
// `<producer_node_id>:<name>` (external inputs: `input:<name>`). The UI treats
// digests as opaque unique keys, so the raw string — collision-free by
// construction and readable in snapshots — is preferred over a hash.
//
// A sequence's binding step (`{ from = "invoice.total", result = "total" }`)
// is a node of its own, of kind `binding`, as in a run graph: it reads the
// root's stuff and produces the bound one, whose concept the binding walk
// derives from declared structures (`bindingWalk.ts`).
//
// Everything is best-effort: unresolvable refs skip the child, cycles render
// as leaves, dependency-alias refs (`alias->pipe`) render as opaque leaf
// cards, and a path the walk cannot follow binds `native.Anything` with a
// diagnostic. This module never throws on content.

import type {
  BindingStepSpec,
  ConceptInfo,
  GraphSpec,
  GraphSpecEdge,
  GraphSpecEdgeKind,
  GraphSpecNode,
  GraphSpecNodeIoItem,
  NodePipeType,
  PipeBatchBlueprint,
  PipeBlueprintUnion,
  PipeConditionBlueprint,
  PipeParallelBlueprint,
  PipeSequenceBlueprint,
  StuffMultiplicity,
  StuffSpecInfo,
  SubPipeSpec,
} from "@graph/types";
import { BINDING_STEP_TYPE, isBindingStepSpec, isPluralMultiplicity } from "@graph/types";

import { deriveBinding } from "./bindingWalk";
import { nativeConceptInfo } from "./conceptRefs";
import { mergeBundles } from "./mergeBundles";
import { parseMthdsBundle } from "./parseMthdsBundle";
import type { Diagnostic, DomainNamespace, MergedMethodSet } from "./types";

// ─── Public API ──────────────────────────────────────────────────────────────

export interface StaticGraphOptions {
  /**
   * Pipe ref to walk from (`code` or `domain.code`). Defaults to the merged
   * set's `main_pipe`, falling back to a root heuristic (first pipe no other
   * pipe references) when none is declared.
   */
  entryPipe?: string;
}

export interface StaticGraphResult {
  spec: GraphSpec;
  diagnostics: Diagnostic[];
}

/** Build a static GraphSpec from an already-parsed, merged method set. */
export function buildStaticGraphSpec(
  set: MergedMethodSet,
  options: StaticGraphOptions = {},
): StaticGraphResult {
  const diagnostics: Diagnostic[] = [];
  const ctx: WalkCtx = {
    set,
    nodes: [],
    edges: [],
    pipeRegistry: {},
    conceptRegistry: {},
    stuffByDigest: new Map(),
    diagnostics,
    stack: [],
    edgeSeq: 0,
  };

  // Registries carry every parsed entry (the dry-run path often ships them
  // empty — populating them is what makes detail panels rich). Registered
  // before the walk so synthetic entries minted during it never clobber a
  // declared one.
  for (const namespace of Object.values(set.domains)) {
    for (const concept of Object.values(namespace.concepts)) registerConcept(ctx, concept);
    for (const pipe of Object.values(namespace.pipes)) {
      ctx.pipeRegistry[`${pipe.domain_code}.${pipe.code}`] = pipe;
      for (const spec of Object.values(pipe.inputs)) registerConcept(ctx, spec.concept);
      registerConcept(ctx, pipe.output.concept);
    }
  }

  const entry = pickEntryPipe(set, options.entryPipe ?? null, diagnostics);
  if (entry !== null) {
    walkPipe(ctx, entry.code, entry.domain, `${entry.domain}.${entry.code}`, null, new Map(), {
      resultName: null,
      outputMultiplicity: null,
    });
  }

  const spec: GraphSpec = {
    nodes: ctx.nodes,
    edges: ctx.edges,
    meta: { format: "mthds", mode: "static" },
    pipe_registry: ctx.pipeRegistry,
    concept_registry: ctx.conceptRegistry,
  };
  if (entry !== null) {
    spec.pipeline_ref = { domain: entry.domain, main_pipe: entry.code };
  }
  return { spec, diagnostics };
}

/**
 * Convenience wrapper: parse one or more `.mthds` TOML strings, merge them,
 * and build the static GraphSpec. Diagnostics from all three stages are
 * concatenated in order (parse, merge, build).
 */
export function buildStaticGraphSpecFromToml(
  tomlTexts: string | string[],
  options: StaticGraphOptions = {},
): StaticGraphResult {
  const texts = Array.isArray(tomlTexts) ? tomlTexts : [tomlTexts];
  const parsed = texts.map((text) => parseMthdsBundle(text));
  const merged = mergeBundles(parsed.map((result) => result.bundle));
  const built = buildStaticGraphSpec(merged, options);
  return {
    spec: built.spec,
    diagnostics: [
      ...parsed.flatMap((result) => result.diagnostics),
      ...merged.diagnostics,
      ...built.diagnostics,
    ],
  };
}

// ─── Walk state ──────────────────────────────────────────────────────────────

/** A scope entry — the static mirror of a working-memory stuff. */
interface StuffRecord {
  digest: string;
  name: string;
  concept: ConceptInfo;
  multiplicity: StuffMultiplicity;
}

type Scope = Map<string, StuffRecord>;

interface WalkCtx {
  set: MergedMethodSet;
  nodes: GraphSpecNode[];
  edges: GraphSpecEdge[];
  pipeRegistry: Record<string, PipeBlueprintUnion>;
  conceptRegistry: Record<string, ConceptInfo>;
  stuffByDigest: Map<string, StuffRecord>;
  diagnostics: Diagnostic[];
  /** Qualified refs (`domain.code`) on the recursion stack — the cycle guard. */
  stack: string[];
  edgeSeq: number;
}

/** How a pipe is being invoked — the step/branch/outcome context. */
interface Invocation {
  /** The enclosing step's `result` name — names the operator's output stuff. */
  resultName: string | null;
  /** The enclosing step's `nb_output`/`multiple_output` override. */
  outputMultiplicity: SubPipeSpec["output_multiplicity"];
  /** Set on condition children: the outcome value that routes here. */
  outcomeValue?: string;
}

interface WalkResult {
  nodeId: string;
  /** Primary output stuff — what a sequence step's `result` binds to. */
  output: StuffRecord | null;
  /** Extra bindings a parallel with `add_each_output` exposes to the enclosing scope. */
  eachOutputs: [string, StuffRecord][];
}

// ─── Entry pipe selection ────────────────────────────────────────────────────

type PipeResolution =
  | { kind: "resolved"; blueprint: PipeBlueprintUnion; domain: string; code: string }
  | { kind: "opaque" }
  | { kind: "unresolved" };

/**
 * Resolve a pipe ref against the merged set: bare refs in the current domain
 * (same-domain files are already merged into one namespace), `domain.code`
 * refs in the named domain. `alias->…` dependency refs are opaque in phase 1.
 */
function resolvePipeRef(set: MergedMethodSet, ref: string, currentDomain: string): PipeResolution {
  if (ref.includes("->")) return { kind: "opaque" };
  const dot = ref.lastIndexOf(".");
  const domain = dot === -1 ? currentDomain : ref.slice(0, dot);
  const code = dot === -1 ? ref : ref.slice(dot + 1);
  const blueprint = set.domains[domain]?.pipes[code];
  if (blueprint === undefined) return { kind: "unresolved" };
  return { kind: "resolved", blueprint, domain, code };
}

/** Sub-pipe refs appearing anywhere in a namespace — used by the root heuristic. */
function referencedPipeCodes(namespace: DomainNamespace): Set<string> {
  const refs = new Set<string>();
  // Refs are authored strings: bare (`helper`) or qualified (`domain.helper`).
  // Reduce them to bare codes in this namespace, mirroring resolvePipeRef —
  // cross-domain and `alias->` refs can't name a pipe here, so they're dropped.
  const add = (ref: string): void => {
    if (ref === "" || ref.includes("->")) return;
    const dot = ref.lastIndexOf(".");
    if (dot === -1) refs.add(ref);
    else if (ref.slice(0, dot) === namespace.domain) refs.add(ref.slice(dot + 1));
  };
  for (const pipe of Object.values(namespace.pipes)) {
    switch (pipe.type) {
      case "PipeSequence":
        for (const step of pipe.sequential_sub_pipes) {
          // A binding step runs no pipe, so it references none.
          if (!isBindingStepSpec(step)) add(step.pipe_code);
        }
        break;
      case "PipeParallel":
        for (const sub of pipe.parallel_sub_pipes) add(sub.pipe_code);
        break;
      case "PipeCondition":
        for (const target of Object.values(pipe.outcome_map)) add(target);
        add(pipe.default_outcome);
        break;
      case "PipeBatch":
        add(pipe.branch_pipe_code);
        break;
      default:
        break;
    }
  }
  return refs;
}

function pickEntryPipe(
  set: MergedMethodSet,
  explicitRef: string | null,
  diagnostics: Diagnostic[],
): { domain: string; code: string } | null {
  const domainsInOrder = Object.keys(set.domains);
  const fallbackDomain = set.mainDomain ?? domainsInOrder[0];
  if (fallbackDomain === undefined) {
    diagnostics.push({
      severity: "error",
      code: "no-entry-pipe",
      message: "no bundles to build a graph from",
    });
    return null;
  }

  const resolveEntry = (ref: string): { domain: string; code: string } | null => {
    const resolution = resolvePipeRef(set, ref, fallbackDomain);
    return resolution.kind === "resolved"
      ? { domain: resolution.domain, code: resolution.code }
      : null;
  };

  if (explicitRef !== null) {
    const entry = resolveEntry(explicitRef);
    if (entry === null) {
      diagnostics.push({
        severity: "error",
        code: "unresolved-pipe-ref",
        message: `entry pipe "${explicitRef}" not found in the method set`,
      });
    }
    return entry;
  }

  if (set.mainPipe !== null) {
    const entry = resolveEntry(set.mainPipe);
    if (entry !== null) return entry;
    diagnostics.push({
      severity: "warning",
      code: "unresolved-pipe-ref",
      message: `main_pipe "${set.mainPipe}" not found — falling back to a root heuristic`,
      // The owning bundle is known (the namespace that declares this main_pipe),
      // so stamp it — this is not an ownerless diagnostic.
      domain_code: fallbackDomain,
    });
  } else {
    diagnostics.push({
      severity: "warning",
      code: "missing-main-pipe",
      message: "no main_pipe declared — falling back to a root heuristic",
      domain_code: fallbackDomain,
    });
  }

  // Root heuristic: the first pipe (declaration order) that no other pipe in
  // its domain references; else the first pipe. Keeps half-written bundles
  // rendering something sensible.
  const domainWithPipes = [fallbackDomain, ...domainsInOrder].find(
    (domain) => Object.keys(set.domains[domain]?.pipes ?? {}).length > 0,
  );
  if (domainWithPipes === undefined) {
    diagnostics.push({
      severity: "error",
      code: "no-entry-pipe",
      message: "no pipes found in any bundle",
    });
    return null;
  }
  const namespace = set.domains[domainWithPipes];
  const referenced = referencedPipeCodes(namespace);
  const codes = Object.keys(namespace.pipes);
  const root = codes.find((code) => !referenced.has(code)) ?? codes[0];
  return { domain: domainWithPipes, code: root };
}

// ─── Small helpers ───────────────────────────────────────────────────────────

/** `CamelCase` concept code → `snake_case` stuff name (the runtime's fallback naming). */
function snakeCase(code: string): string {
  return code
    .replace(/([A-Z]+)([A-Z][a-z0-9])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

function registerConcept(ctx: WalkCtx, concept: ConceptInfo): void {
  ctx.conceptRegistry[`${concept.domain_code}.${concept.code}`] ??= concept;
}

/**
 * Mint (or return the already-minted) stuff for a digest. First mint wins —
 * matching how the UI's stuff registry keeps the first occurrence per digest.
 */
function mintStuff(
  ctx: WalkCtx,
  digest: string,
  name: string,
  concept: ConceptInfo,
  multiplicity: StuffSpecInfo["multiplicity"],
): StuffRecord {
  const existing = ctx.stuffByDigest.get(digest);
  if (existing !== undefined) return existing;
  const record: StuffRecord = { digest, name, concept, multiplicity: multiplicity ?? null };
  ctx.stuffByDigest.set(digest, record);
  registerConcept(ctx, concept);
  return record;
}

/**
 * An io item for `stuff`, optionally exposed under a *slot name* — the name
 * the invoking step binds it to (`result = "x"`). The runtime names a
 * controller's transparent output by its slot, while the producing operator
 * keeps the local name; the UI's stuff registry is first-occurrence-wins and
 * controllers are emitted before their children, so the slot name is what
 * renders (verified against the dry fixtures).
 */
function ioItem(stuff: StuffRecord, slotName?: string | null): GraphSpecNodeIoItem {
  const item: GraphSpecNodeIoItem = {
    name: slotName ?? stuff.name,
    digest: stuff.digest,
    concept: stuff.concept.code,
  };
  // Carried only on a plural stuff, so a single-valued io item stays exactly as it was.
  if (isPluralMultiplicity(stuff.multiplicity)) item.multiplicity = stuff.multiplicity;
  return item;
}

function addEdge(
  ctx: WalkCtx,
  kind: GraphSpecEdgeKind,
  source: string,
  target: string,
  extras?: { label?: string; sourceStuff?: string; targetStuff?: string },
): void {
  // Namespaced ids: the rendering pipeline synthesizes its own dataflow edges
  // named `edge_<n>` (graphBuilders.ts), so bare `edge_<n>` here would collide
  // in the ReactFlow key space.
  const edge: GraphSpecEdge = { id: `static:edge_${ctx.edgeSeq++}`, source, target, kind };
  if (extras?.label !== undefined) edge.label = extras.label;
  if (extras?.sourceStuff !== undefined) edge.source_stuff_digest = extras.sourceStuff;
  if (extras?.targetStuff !== undefined) edge.target_stuff_digest = extras.targetStuff;
  ctx.edges.push(edge);
}

function addNodeTag(node: GraphSpecNode, key: string, value: string): void {
  node.tags = { ...(node.tags ?? {}), [key]: value };
}

function formatBatchMultiplicity(multiplicity: number | boolean | null | undefined): string {
  if (typeof multiplicity === "number") return `x${multiplicity}`;
  if (multiplicity === true) return "xmany";
  return "x?";
}

function conceptKey(concept: ConceptInfo): string {
  return `${concept.domain_code}.${concept.code}`;
}

/**
 * Bind the invoked pipe's declared inputs from the caller's scope. A name the
 * scope cannot satisfy is a *dangling* input: mint an input stuff
 * (`input:<name>`) with the declared concept — at the method root these are
 * exactly the method's external inputs, and the UI classifies producer-less
 * stuff as role `input`. The `input:` digest namespace is method-global on
 * purpose: an unbound name means the same missing working-memory entry
 * wherever it is read, so all its consumers share one stuff. When two
 * consumers declare *different* concepts for that shared name, the first
 * mint wins and a diagnostic surfaces the authoring inconsistency.
 *
 * Minted dangling inputs are written into `scope`: working memory is one flat
 * namespace shared down the walk (see the scope model note on `walkPipe`), so
 * later readers of the same name bind the same record.
 */
function bindInputs(
  ctx: WalkCtx,
  blueprint: PipeBlueprintUnion,
  scope: Scope,
): GraphSpecNodeIoItem[] {
  const ioInputs: GraphSpecNodeIoItem[] = [];
  for (const [name, spec] of Object.entries(blueprint.inputs)) {
    let bound = scope.get(name);
    if (bound === undefined) {
      bound = mintStuff(ctx, `input:${name}`, name, spec.concept, spec.multiplicity);
      scope.set(name, bound);
      if (conceptKey(bound.concept) !== conceptKey(spec.concept)) {
        ctx.diagnostics.push({
          severity: "warning",
          code: "conflicting-input-concept",
          message:
            `pipe "${blueprint.code}": dangling input "${name}" is declared as ` +
            `${conceptKey(spec.concept)} here but was first seen as ` +
            `${conceptKey(bound.concept)} — keeping the first`,
          path: `pipe.${blueprint.code}.inputs.${name}`,
          domain_code: blueprint.domain_code,
        });
      }
    }
    ioInputs.push(ioItem(bound));
  }
  return ioInputs;
}

function emitNode(
  ctx: WalkCtx,
  args: {
    id: string;
    kind: "controller" | "operator" | "binding";
    pipeCode: string;
    pipeType: NodePipeType;
    description: string;
    domainCode: string;
    ioInputs: GraphSpecNodeIoItem[];
    parentId: string | null;
    inv: Invocation;
  },
): GraphSpecNode {
  const node: GraphSpecNode = {
    id: args.id,
    kind: args.kind,
    pipe_code: args.pipeCode,
    pipe_type: args.pipeType,
    // validateGraphSpec requires a non-empty description; WIP pipes may lack one.
    description: args.description.length > 0 ? args.description : args.pipeCode,
    domain_code: args.domainCode,
    status: "scheduled",
    io: { inputs: args.ioInputs, outputs: [] },
  };
  if (args.inv.outcomeValue !== undefined) node.tags = { outcome: args.inv.outcomeValue };
  ctx.nodes.push(node);
  if (args.parentId !== null) {
    addEdge(
      ctx,
      "contains",
      args.parentId,
      args.id,
      args.inv.outcomeValue !== undefined ? { label: args.inv.outcomeValue } : undefined,
    );
  }
  return node;
}

// ─── The walk ────────────────────────────────────────────────────────────────

/**
 * Walk one pipe *invocation*: resolve the ref, emit the node (and its
 * `contains` edge), bind inputs from the caller's scope, recurse per
 * controller type, and report the invocation's output stuff.
 *
 * Scope model — the static mirror of the runtime's working memory, which is
 * ONE flat namespace shared across the whole run (verified against the dry
 * fixtures: a result produced inside a nested sub-sequence is consumed by a
 * later step of an ancestor sequence). So: sequence steps see and mutate the
 * caller's scope *object*; parallel/batch branches and condition outcome
 * children each get a *copy* — branches because the runtime forks memory per
 * branch and merges back only the declared outputs, condition outcomes
 * because they are mutually exclusive alternatives (only one runs, so no
 * branch's writes may be visible to its siblings or, beyond the condition's
 * one shared output, to the caller).
 */
function walkPipe(
  ctx: WalkCtx,
  ref: string,
  currentDomain: string,
  nodeId: string,
  parentId: string | null,
  scope: Scope,
  inv: Invocation,
): WalkResult | null {
  const resolution = resolvePipeRef(ctx.set, ref, currentDomain);
  if (resolution.kind === "unresolved") {
    ctx.diagnostics.push({
      severity: "warning",
      code: "unresolved-pipe-ref",
      message: `pipe ref "${ref}" cannot be resolved — node skipped`,
      path: nodeId,
      // The uttering file's domain: a bare ref belongs to the namespace that
      // wrote it, mirroring the runtime's `_qualify_pipe_ref` inference.
      domain_code: currentDomain,
    });
    return null;
  }
  if (resolution.kind === "opaque") {
    return emitOpaqueLeaf(ctx, ref, currentDomain, nodeId, parentId, inv);
  }

  const { blueprint, domain, code } = resolution;
  const qualified = `${domain}.${code}`;
  const ioInputs = bindInputs(ctx, blueprint, scope);
  const node = emitNode(ctx, {
    id: nodeId,
    kind: blueprint.pipe_category === "PipeController" ? "controller" : "operator",
    pipeCode: code,
    pipeType: blueprint.type,
    description: blueprint.description,
    domainCode: blueprint.domain_code,
    ioInputs,
    parentId,
    inv,
  });

  if (ctx.stack.includes(qualified)) {
    ctx.diagnostics.push({
      severity: "warning",
      code: "cyclic-pipe-ref",
      message: `pipe "${qualified}" is invoked recursively — rendered as a leaf`,
      path: nodeId,
      domain_code: domain,
    });
    return finishLeaf(ctx, node, blueprint, nodeId, inv);
  }

  ctx.stack.push(qualified);
  try {
    switch (blueprint.type) {
      case "PipeSequence":
        return finishSequence(ctx, node, blueprint, nodeId, scope, inv);
      case "PipeParallel":
        return finishParallel(ctx, node, blueprint, nodeId, scope, inv);
      case "PipeCondition":
        return finishCondition(ctx, node, blueprint, nodeId, scope, inv);
      case "PipeBatch":
        return finishBatch(ctx, node, blueprint, nodeId, scope, inv);
      default:
        return finishLeaf(ctx, node, blueprint, nodeId, inv);
    }
  } finally {
    ctx.stack.pop();
  }
}

/**
 * A step (or branch) invocation: a step carrying inline `batch_over`/`batch_as`
 * becomes a synthetic PipeBatch node wrapping the invoked pipe — mirroring the
 * runtime, which materializes `<pipe>_batch` controllers for inline batching.
 */
function walkSubPipe(
  ctx: WalkCtx,
  sub: SubPipeSpec,
  domain: string,
  nodeId: string,
  parentId: string,
  scope: Scope,
  inheritedMultiplicity: Invocation["outputMultiplicity"] = null,
): WalkResult | null {
  if (sub.batch_params != null) {
    return walkInlineBatch(ctx, sub, domain, nodeId, parentId, scope);
  }
  return walkPipe(ctx, sub.pipe_code, domain, nodeId, parentId, scope, {
    resultName: sub.output_name ?? null,
    // A step with no `nb_output`/`multiple_output` of its own runs under the one
    // its controller was invoked with, as the runtime copies the run params down.
    outputMultiplicity: sub.output_multiplicity ?? inheritedMultiplicity,
  });
}

// ─── Leaf (operators, signatures, cyclic refs) ───────────────────────────────

function finishLeaf(
  ctx: WalkCtx,
  node: GraphSpecNode,
  blueprint: PipeBlueprintUnion,
  nodeId: string,
  inv: Invocation,
): WalkResult {
  const name = inv.resultName ?? snakeCase(blueprint.output.concept.code);
  const multiplicity =
    typeof inv.outputMultiplicity === "number" || inv.outputMultiplicity === true
      ? inv.outputMultiplicity
      : blueprint.output.multiplicity;
  const output = mintStuff(ctx, `${nodeId}:${name}`, name, blueprint.output.concept, multiplicity);
  node.io.outputs = [ioItem(output)];
  return { nodeId, output, eachOutputs: [] };
}

/** Phase-1 policy for `alias->…` dependency refs: an opaque leaf card. */
function emitOpaqueLeaf(
  ctx: WalkCtx,
  ref: string,
  currentDomain: string,
  nodeId: string,
  parentId: string | null,
  inv: Invocation,
): WalkResult {
  const alias = ref.slice(0, ref.indexOf("->"));
  const tail = ref.slice(ref.lastIndexOf("->") + 2);
  const codeTail = tail.slice(tail.lastIndexOf(".") + 1);
  const node = emitNode(ctx, {
    id: nodeId,
    kind: "operator",
    pipeCode: codeTail.length > 0 ? codeTail : ref,
    pipeType: "PipeSignature",
    description: `External pipe from dependency "${alias}"`,
    domainCode: alias.length > 0 ? alias : currentDomain,
    ioInputs: [],
    parentId,
    inv,
  });
  const name = inv.resultName ?? "output";
  const output = mintStuff(ctx, `${nodeId}:${name}`, name, nativeConceptInfo("Anything"), null);
  node.io.outputs = [ioItem(output)];
  return { nodeId, output, eachOutputs: [] };
}

// ─── Controllers ─────────────────────────────────────────────────────────────

function finishSequence(
  ctx: WalkCtx,
  node: GraphSpecNode,
  blueprint: PipeSequenceBlueprint,
  nodeId: string,
  scope: Scope,
  inv: Invocation,
): WalkResult {
  let lastOutput: StuffRecord | null = null;
  // Steps are numbered as the runtime holds them, so a dotted `batch_over`,
  // held as a binding then the batch, takes two numbers.
  blueprint.sequential_sub_pipes.forEach((sub, index) => {
    const stepId = `${nodeId}/step_${index + 1}`;
    if (isBindingStepSpec(sub)) {
      // A binding stores its result as the main stuff, so a sequence ending
      // with one outputs what it binds.
      const bound = walkBindingStep(ctx, sub, blueprint, stepId, nodeId, scope);
      scope.set(sub.output_name, bound);
      lastOutput = bound;
      return;
    }
    const result = walkSubPipe(
      ctx,
      sub,
      blueprint.domain_code,
      stepId,
      nodeId,
      scope,
      inv.outputMultiplicity,
    );
    if (result === null) return;
    if (result.output !== null) {
      if (sub.output_name != null) scope.set(sub.output_name, result.output);
      lastOutput = result.output;
    }
    for (const [name, stuff] of result.eachOutputs) scope.set(name, stuff);
  });
  // Controller transparency: the sequence's output IS its last producing
  // step's stuff — same digest, so downstream consumers wire to the real
  // producer (the UI only takes producers from non-controller nodes).
  node.io.outputs = lastOutput === null ? [] : [ioItem(lastOutput, inv.resultName)];
  return { nodeId, output: lastOutput, eachOutputs: [] };
}

/**
 * Emit a binding step's node: it reads its root's stuff and produces the
 * bound one, named by the step's `result` and typed by the binding walk —
 * the shape a run graph gives a binding (`kind: "binding"`, `pipe_type:
 * "BindingStep"`, the `from` path as its `pipe_code`, `{ from, result }` as its
 * execution data). A root nothing in scope holds is a dangling input, as for
 * any unbound name; a path the walk cannot follow binds `native.Anything` and
 * is reported.
 */
function walkBindingStep(
  ctx: WalkCtx,
  step: BindingStepSpec,
  sequence: PipeSequenceBlueprint,
  nodeId: string,
  parentId: string,
  scope: Scope,
): StuffRecord {
  const rootName = step.from_path.split(".")[0];
  let root = scope.get(rootName);
  if (root === undefined) {
    root = mintStuff(ctx, `input:${rootName}`, rootName, nativeConceptInfo("Anything"), null);
    scope.set(rootName, root);
  }
  const node = emitNode(ctx, {
    id: nodeId,
    kind: "binding",
    pipeCode: step.from_path,
    pipeType: BINDING_STEP_TYPE,
    description: `Binds '${step.from_path}' to '${step.output_name}'`,
    domainCode: sequence.domain_code,
    ioInputs: [ioItem(root, rootName)],
    parentId,
    inv: { resultName: step.output_name, outputMultiplicity: null },
  });
  node.execution_data = { from: step.from_path, result: step.output_name };

  const derivation = deriveBinding(ctx.set, step.from_path, {
    concept: root.concept,
    multiplicity: root.multiplicity,
  });
  let concept: ConceptInfo;
  let multiplicity: StuffMultiplicity;
  if (derivation.kind === "derived") {
    ({ concept, multiplicity } = derivation);
  } else {
    ctx.diagnostics.push({
      severity: "warning",
      code: "binding-path-unresolved",
      message: `pipe "${sequence.code}": ${derivation.reason} — bound as native.Anything`,
      path: nodeId,
      domain_code: sequence.domain_code,
    });
    concept = nativeConceptInfo("Anything");
    multiplicity = isPluralMultiplicity(root.multiplicity) ? true : null;
  }
  const output = mintStuff(
    ctx,
    `${nodeId}:${step.output_name}`,
    step.output_name,
    concept,
    multiplicity,
  );
  node.io.outputs = [ioItem(output)];
  return output;
}

function finishParallel(
  ctx: WalkCtx,
  node: GraphSpecNode,
  blueprint: PipeParallelBlueprint,
  nodeId: string,
  scope: Scope,
  inv: Invocation,
): WalkResult {
  const branchResults: { sub: SubPipeSpec; result: WalkResult }[] = [];
  blueprint.parallel_sub_pipes.forEach((sub, index) => {
    // Branches are independent: each gets its own copy of the inherited scope.
    const result = walkSubPipe(
      ctx,
      sub,
      blueprint.domain_code,
      `${nodeId}/branch_${index + 1}`,
      nodeId,
      new Map(scope),
    );
    if (result !== null) branchResults.push({ sub, result });
  });

  const eachOutputs: [string, StuffRecord][] = [];
  if (blueprint.add_each_output) {
    for (const { sub, result } of branchResults) {
      if (sub.output_name != null && result.output !== null) {
        eachOutputs.push([sub.output_name, result.output]);
      }
    }
  }

  const combinedName =
    blueprint.combined_output ?? inv.resultName ?? snakeCase(blueprint.output.concept.code);
  const combined = mintStuff(
    ctx,
    `${nodeId}:${combinedName}`,
    combinedName,
    blueprint.output.concept,
    blueprint.output.multiplicity,
  );
  for (const { result } of branchResults) {
    if (result.output !== null) {
      addEdge(ctx, "parallel_combine", result.nodeId, nodeId, {
        sourceStuff: result.output.digest,
        targetStuff: combined.digest,
      });
    }
  }
  node.io.outputs = [ioItem(combined, inv.resultName)];
  return { nodeId, output: combined, eachOutputs };
}

function finishCondition(
  ctx: WalkCtx,
  node: GraphSpecNode,
  blueprint: PipeConditionBlueprint,
  nodeId: string,
  scope: Scope,
  inv: Invocation,
): WalkResult {
  const conditionScope: Scope = new Map(scope);
  if (blueprint.add_alias_from_expression_to != null) {
    const alias = blueprint.add_alias_from_expression_to;
    // The alias points at whatever the expression evaluates to at run time —
    // statically typed as native.Dynamic. Its digest has its own namespace: the
    // condition's shared output is `${nodeId}:<slot>`, and an alias named like
    // the slot must stay a separate stuff rather than become that output.
    conditionScope.set(
      alias,
      mintStuff(ctx, `${nodeId}:alias:${alias}`, alias, nativeConceptInfo("Dynamic"), null),
    );
  }

  // One child node per distinct *target pipe*, not per outcome value —
  // mirroring the runtime tracer. Outcomes routing to the same pipe (often
  // one value plus `default_outcome`) merge into a single child carrying all
  // its routing values. `fail` / `continue` are outcome actions, not refs.
  // The default route is tracked as a flag, never as a value string — an
  // *authored* outcome value literally named "default" must not collide with
  // the synthetic default sentinel (node ids and primary selection key on it).
  interface RouteEntry {
    values: string[];
    ref: string;
    viaDefault: boolean;
  }
  const targets: RouteEntry[] = [];
  const byRef = new Map<string, RouteEntry>();
  const addRoute = (value: string, ref: string, isDefault: boolean): void => {
    if (ref === "" || ref === "fail" || ref === "continue") return;
    const existing = byRef.get(ref);
    if (existing !== undefined) {
      existing.values.push(value);
      existing.viaDefault ||= isDefault;
      return;
    }
    const entry = { values: [value], ref, viaDefault: isDefault };
    byRef.set(ref, entry);
    targets.push(entry);
  };
  for (const [value, target] of Object.entries(blueprint.outcome_map)) {
    addRoute(value, target, false);
  }
  addRoute("default", blueprint.default_outcome, true);

  const results: { entry: RouteEntry; result: WalkResult }[] = [];
  for (const entry of targets) {
    const idSegment =
      entry.viaDefault && entry.values.length === 1 ? "default" : `outcome_${entry.values[0]}`;
    const result = walkPipe(
      ctx,
      entry.ref,
      blueprint.domain_code,
      `${nodeId}/${idSegment}`,
      nodeId,
      new Map(conditionScope),
      {
        // The runtime stores whichever branch runs under the condition's own
        // slot name, so every branch's output carries it (dry-run parity).
        resultName: inv.resultName,
        // The chosen outcome runs under the condition's own run params, its
        // invocation's `nb_output`/`multiple_output` included.
        outputMultiplicity: inv.outputMultiplicity,
        outcomeValue: entry.values.join(" | "),
      },
    );
    if (result !== null) results.push({ entry, result });
  }

  // Statically all outcomes exist, and each writes the condition's one slot: a
  // step after the condition reads that slot without knowing which outcome
  // filled it. So the condition's output is ONE stuff with a producer per
  // outcome — every outcome's output is renamed onto it, and whatever reads the
  // slot is wired to all of them.
  const outputs = results.flatMap(({ result }) => (result.output === null ? [] : [result.output]));
  // Named like the default route's output when there is one (the runtime names
  // the slot after whichever outcome wrote it), else the first producing one.
  const representative =
    results.find(({ entry, result }) => entry.viaDefault && result.output !== null)?.result
      .output ?? outputs[0];
  if (representative === undefined) {
    node.io.outputs = [];
    return { nodeId, output: null, eachOutputs: [] };
  }
  // Typed by the outcomes when they all agree, which is the most precise true
  // answer; by the condition's own declaration when they differ, since the slot
  // then holds either and only the declaration covers both.
  const outcomesAgree = outputs.every(
    (output) =>
      conceptKey(output.concept) === conceptKey(representative.concept) &&
      output.multiplicity === representative.multiplicity,
  );
  const declaredMultiplicity =
    typeof inv.outputMultiplicity === "number" || inv.outputMultiplicity === true
      ? inv.outputMultiplicity
      : blueprint.output.multiplicity;
  const shared = mintStuff(
    ctx,
    `${nodeId}:${representative.name}`,
    representative.name,
    outcomesAgree ? representative.concept : blueprint.output.concept,
    outcomesAgree ? representative.multiplicity : declaredMultiplicity,
  );
  for (const output of outputs) {
    // Only a stuff minted inside this condition is renamed: its digest names
    // its producer, so nothing outside the outcome's subtree can refer to it.
    if (output.digest.startsWith(`${nodeId}/`)) renameStuff(ctx, output.digest, shared);
  }
  node.io.outputs = [ioItem(shared, inv.resultName)];
  return { nodeId, output: shared, eachOutputs: [] };
}

/**
 * Re-point every io item and stuff-to-stuff edge already emitted from one stuff
 * to another. Only the digest moves: each io item keeps the concept its own
 * pipe declared, so an outcome's card still shows what that outcome produces.
 */
function renameStuff(ctx: WalkCtx, from: string, to: StuffRecord): void {
  for (const node of ctx.nodes) {
    for (const item of [...node.io.inputs, ...node.io.outputs]) {
      if (item.digest === from) item.digest = to.digest;
    }
  }
  for (const edge of ctx.edges) {
    if (edge.source_stuff_digest === from) edge.source_stuff_digest = to.digest;
    if (edge.target_stuff_digest === from) edge.target_stuff_digest = to.digest;
  }
  ctx.stuffByDigest.delete(from);
}

function finishBatch(
  ctx: WalkCtx,
  node: GraphSpecNode,
  blueprint: PipeBatchBlueprint,
  nodeId: string,
  scope: Scope,
  inv: Invocation,
): WalkResult {
  const params = blueprint.batch_params;

  let listStuff: StuffRecord | null = null;
  if (params.input_list_stuff_name !== "") {
    const bound = scope.get(params.input_list_stuff_name);
    if (bound !== undefined) {
      listStuff = bound;
    } else {
      // The list name is not among the declared inputs (sloppy but legal WIP
      // state): mint it as a dangling input and surface it on the node's io.
      listStuff = mintStuff(
        ctx,
        `input:${params.input_list_stuff_name}`,
        params.input_list_stuff_name,
        nativeConceptInfo("Anything"),
        true,
      );
      node.io.inputs.push(ioItem(listStuff));
    }
  }

  let itemStuff: StuffRecord | null = null;
  const branchScope: Scope = new Map(scope);
  if (params.input_item_stuff_name !== "" && listStuff !== null) {
    // The item is one element of the list: same concept, single multiplicity.
    itemStuff = mintStuff(
      ctx,
      `${nodeId}:${params.input_item_stuff_name}`,
      params.input_item_stuff_name,
      listStuff.concept,
      null,
    );
    branchScope.set(params.input_item_stuff_name, itemStuff);
  }

  const batchMultiplicity = formatBatchMultiplicity(listStuff?.multiplicity);
  addNodeTag(node, "batch_multiplicity", batchMultiplicity);

  // One representative branch, not N — this is a method view, not a run trace.
  let branchResult: WalkResult | null = null;
  if (blueprint.branch_pipe_code !== "") {
    branchResult = walkPipe(
      ctx,
      blueprint.branch_pipe_code,
      blueprint.domain_code,
      `${nodeId}/batch_branch`,
      nodeId,
      branchScope,
      { resultName: null, outputMultiplicity: null },
    );
    const branchNode = ctx.nodes.find((candidate) => candidate.id === branchResult?.nodeId);
    if (branchNode !== undefined) {
      addNodeTag(branchNode, "batch_multiplicity", batchMultiplicity);
    }
  }

  const aggConcept = branchResult?.output?.concept ?? blueprint.output.concept;
  const aggName = inv.resultName ?? snakeCase(aggConcept.code);
  const aggregate = mintStuff(ctx, `${nodeId}:${aggName}`, aggName, aggConcept, true);

  if (branchResult !== null && listStuff !== null && itemStuff !== null) {
    addEdge(ctx, "batch_item", nodeId, branchResult.nodeId, {
      sourceStuff: listStuff.digest,
      targetStuff: itemStuff.digest,
    });
  }
  if (branchResult?.output != null) {
    addEdge(ctx, "batch_aggregate", branchResult.nodeId, nodeId, {
      sourceStuff: branchResult.output.digest,
      targetStuff: aggregate.digest,
    });
  }

  node.io.outputs = [ioItem(aggregate)];
  return { nodeId, output: aggregate, eachOutputs: [] };
}

/** Synthesize the PipeBatch node the runtime materializes for an inline `batch_over` step. */
function walkInlineBatch(
  ctx: WalkCtx,
  sub: SubPipeSpec,
  domain: string,
  nodeId: string,
  parentId: string,
  scope: Scope,
): WalkResult {
  const params = sub.batch_params as NonNullable<SubPipeSpec["batch_params"]>;
  // Bare code of the branch ref: strip a dependency alias (`helpers->clean`)
  // and a domain qualifier (`lib.clean`) so the synthetic code reads cleanly.
  const aliasIdx = sub.pipe_code.lastIndexOf("->");
  const refTail = aliasIdx === -1 ? sub.pipe_code : sub.pipe_code.slice(aliasIdx + 2);
  const branchTail = refTail.slice(refTail.lastIndexOf(".") + 1);
  const branchResolution = resolvePipeRef(ctx.set, sub.pipe_code, domain);
  const branchBlueprint = branchResolution.kind === "resolved" ? branchResolution.blueprint : null;

  const listBinding = scope.get(params.input_list_stuff_name);
  const listConcept =
    listBinding?.concept ??
    branchBlueprint?.inputs[params.input_item_stuff_name]?.concept ??
    nativeConceptInfo("Anything");
  const outputSpec = branchBlueprint?.output ?? {
    concept: nativeConceptInfo("Anything"),
    multiplicity: null,
  };

  // Registry key: the detail panel resolves blueprints by `domain.pipe_code`,
  // so every distinct inline batch needs its own entry. Reuse the code only
  // when it already points at this exact batch (same branch, same params);
  // otherwise disambiguate with a numeric suffix (`x_batch`, `x_batch_2`, …).
  const baseCode = `${branchTail}_batch`;
  let code = baseCode;
  for (let suffix = 2; ; suffix++) {
    const existing = ctx.pipeRegistry[`${domain}.${code}`];
    if (
      existing === undefined ||
      (existing.type === "PipeBatch" &&
        existing.branch_pipe_code === sub.pipe_code &&
        existing.batch_params.input_list_stuff_name === params.input_list_stuff_name &&
        existing.batch_params.input_item_stuff_name === params.input_item_stuff_name)
    ) {
      break;
    }
    code = `${baseCode}_${suffix}`;
  }
  const blueprint: PipeBatchBlueprint = {
    type: "PipeBatch",
    pipe_category: "PipeController",
    code,
    domain_code: domain,
    description: `Batch processing for ${branchTail}`,
    inputs: {
      [params.input_list_stuff_name]: {
        concept: listConcept,
        multiplicity: null,
        presence: "plain",
      },
    },
    output: { concept: outputSpec.concept, multiplicity: null, presence: "plain" },
    branch_pipe_code: sub.pipe_code,
    batch_params: params,
  };
  ctx.pipeRegistry[`${domain}.${code}`] ??= blueprint;

  const ioInputs = bindInputs(ctx, blueprint, scope);
  const inv: Invocation = {
    resultName: sub.output_name ?? null,
    outputMultiplicity: sub.output_multiplicity,
  };
  const node = emitNode(ctx, {
    id: nodeId,
    kind: "controller",
    pipeCode: code,
    pipeType: "PipeBatch",
    description: blueprint.description,
    domainCode: domain,
    ioInputs,
    parentId,
    inv,
  });
  return finishBatch(ctx, node, blueprint, nodeId, scope, inv);
}
