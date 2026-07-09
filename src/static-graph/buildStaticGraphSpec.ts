// ─── Static graph builder: MergedMethodSet → GraphSpec ──────────────────────
// The static walk from the design doc (wip/static-graph-design.md): walk pipe
// *invocations* starting at the entry pipe, maintaining a scope (the static
// mirror of working memory), and emit a GraphSpec with `meta.mode: "static"`
// that the existing GraphViewer renders unchanged.
//
// Identity is deterministic: node ids are invocation paths
// (`screening.process_cv/step_2/...`) and stuff digests are the raw strings
// `<producer_node_id>:<name>` (external inputs: `input:<name>`). The UI treats
// digests as opaque unique keys, so the raw string — collision-free by
// construction and readable in snapshots — is preferred over a hash.
//
// Everything is best-effort: unresolvable refs skip the child, cycles render
// as leaves, dependency-alias refs (`alias->pipe`) render as opaque leaf
// cards. This module never throws on content.

import type {
  ConceptInfo,
  GraphSpec,
  GraphSpecEdge,
  GraphSpecEdgeKind,
  GraphSpecNode,
  GraphSpecNodeIoItem,
  PipeBatchBlueprint,
  PipeBlueprintUnion,
  PipeConditionBlueprint,
  PipeParallelBlueprint,
  PipeSequenceBlueprint,
  PipeType,
  SubPipeSpec,
} from "@graph/types";

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
  multiplicity: number | boolean | null;
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
  for (const pipe of Object.values(namespace.pipes)) {
    switch (pipe.type) {
      case "PipeSequence":
        for (const sub of pipe.sequential_sub_pipes) refs.add(sub.pipe_code);
        break;
      case "PipeParallel":
        for (const sub of pipe.parallel_sub_pipes) refs.add(sub.pipe_code);
        break;
      case "PipeCondition":
        for (const target of Object.values(pipe.outcome_map)) refs.add(target);
        if (pipe.default_outcome !== "") refs.add(pipe.default_outcome);
        break;
      case "PipeBatch":
        refs.add(pipe.branch_pipe_code);
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
    });
  } else {
    diagnostics.push({
      severity: "warning",
      code: "missing-main-pipe",
      message: "no main_pipe declared — falling back to a root heuristic",
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
  multiplicity: number | boolean | null,
): StuffRecord {
  const existing = ctx.stuffByDigest.get(digest);
  if (existing !== undefined) return existing;
  const record: StuffRecord = { digest, name, concept, multiplicity };
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
  return { name: slotName ?? stuff.name, digest: stuff.digest, concept: stuff.concept.code };
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

/**
 * Working-memory name matching: exact name first, then dotted-prefix — an
 * input `a.b` is satisfied by a binding for `a`.
 */
function lookupScope(scope: Scope, name: string): StuffRecord | undefined {
  let candidate = name;
  for (;;) {
    const found = scope.get(candidate);
    if (found !== undefined) return found;
    const dot = candidate.lastIndexOf(".");
    if (dot <= 0) return undefined;
    candidate = candidate.slice(0, dot);
  }
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
    let bound = lookupScope(scope, name);
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
    kind: "controller" | "operator";
    pipeCode: string;
    pipeType: PipeType;
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
 * representative output, to the caller).
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
): WalkResult | null {
  if (sub.batch_params !== null) {
    return walkInlineBatch(ctx, sub, domain, nodeId, parentId, scope);
  }
  return walkPipe(ctx, sub.pipe_code, domain, nodeId, parentId, scope, {
    resultName: sub.output_name,
    outputMultiplicity: sub.output_multiplicity,
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
  blueprint.sequential_sub_pipes.forEach((sub, index) => {
    const result = walkSubPipe(
      ctx,
      sub,
      blueprint.domain_code,
      `${nodeId}/step_${index + 1}`,
      nodeId,
      scope,
    );
    if (result === null) return;
    if (result.output !== null) {
      if (sub.output_name !== null) scope.set(sub.output_name, result.output);
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
      if (sub.output_name !== null && result.output !== null) {
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
  if (blueprint.add_alias_from_expression_to !== null) {
    const alias = blueprint.add_alias_from_expression_to;
    // The alias points at whatever the expression evaluates to at run time —
    // statically typed as native.Dynamic.
    conditionScope.set(
      alias,
      mintStuff(ctx, `${nodeId}:${alias}`, alias, nativeConceptInfo("Dynamic"), null),
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
        outputMultiplicity: null,
        outcomeValue: entry.values.join(" | "),
      },
    );
    if (result !== null) results.push({ entry, result });
  }

  // Statically all outcomes exist; pick one representative output for the
  // controller (the default route when present, else the first producing
  // outcome) so downstream consumers wire to a real producer.
  const primary =
    results.find(({ entry, result }) => entry.viaDefault && result.output !== null)?.result
      .output ??
    results.find(({ result }) => result.output !== null)?.result.output ??
    null;
  node.io.outputs = primary === null ? [] : [ioItem(primary, inv.resultName)];
  return { nodeId, output: primary, eachOutputs: [] };
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
    const bound = lookupScope(scope, params.input_list_stuff_name);
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

  const listBinding = lookupScope(scope, params.input_list_stuff_name);
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
    inputs: { [params.input_list_stuff_name]: { concept: listConcept, multiplicity: null } },
    output: { concept: outputSpec.concept, multiplicity: null },
    branch_pipe_code: sub.pipe_code,
    batch_params: params,
  };
  ctx.pipeRegistry[`${domain}.${code}`] ??= blueprint;

  const ioInputs = bindInputs(ctx, blueprint, scope);
  const inv: Invocation = {
    resultName: sub.output_name,
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
