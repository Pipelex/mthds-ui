/**
 * Single boundary validator for GraphSpec JSON.
 *
 * `validateGraphSpec()` runs once when a spec is loaded from an untyped source
 * (embedded JSON, library consumer input). After it returns, internal code
 * trusts the data and uses the strict types in `types.ts` — no inline
 * defensive checks scattered across modules.
 *
 * The pipelex runtime guarantees specific fields are always present and
 * non-null. This validator enforces those guarantees and fails loudly when
 * they are violated, instead of hiding upstream bugs behind fabricated values.
 *
 * Note: `validateGraphSpec` normalizes the input **in place** — see its doc
 * comment.
 */
import type {
  GraphSpec,
  GraphSpecEdgeKind,
  GraphSpecMode,
  GraphSpecNode,
  PipeCallNode,
  PipeStatus,
} from "./types";
import { KNOWN_PIPE_TYPES } from "./types";

/**
 * Thrown by `validateGraphSpec` when a spec violates a pipelex runtime
 * guarantee. `path` points at the offending location (e.g.
 * `nodes[3].io.inputs[0].name`) and `name` is the stable, greppable
 * `"GraphSpecValidationError"`.
 */
export class GraphSpecValidationError extends Error {
  readonly path: string;

  constructor(path: string, detail: string) {
    const location = path === "" ? "<root>" : path;
    super(`GraphSpec validation failed at ${location}: ${detail}`);
    this.name = "GraphSpecValidationError";
    this.path = path;
  }
}

const PIPE_STATUSES: ReadonlySet<string> = new Set<PipeStatus>([
  "succeeded",
  "failed",
  "running",
  "scheduled",
  "skipped",
  "canceled",
]);

const GRAPH_SPEC_MODES: ReadonlySet<string> = new Set<GraphSpecMode>(["dry", "live", "static"]);

const EDGE_KINDS: ReadonlySet<string> = new Set<GraphSpecEdgeKind>([
  "contains",
  "data",
  "control",
  "selected_outcome",
  "batch_item",
  "batch_aggregate",
  "parallel_combine",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "an array";
  return `a ${typeof value}`;
}

function fail(path: string, detail: string): never {
  throw new GraphSpecValidationError(path, detail);
}

function requireNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    fail(path, `expected a non-empty string, got ${describe(value)}`);
  }
  return value;
}

function validateIoItem(item: unknown, path: string): void {
  if (!isPlainObject(item)) {
    fail(path, `expected an object, got ${describe(item)}`);
  }
  // `name` is guaranteed by pipelex; `concept` and `digest` stay tolerant.
  requireNonEmptyString(item.name, `${path}.name`);
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(path, `expected a finite number, got ${describe(value)}`);
  }
  return value;
}

function requireNullableNumber(value: unknown, path: string): void {
  if (value === null) return;
  requireNumber(value, path);
}

/**
 * A nullable number that may also be absent, normalized to `null`.
 *
 * For fields added after specs were already being produced. The validator's job is
 * to reject malformed data, not to insist the producer is the latest version: an
 * absent key is unambiguous (the producer predates the field), while a wrong-typed
 * one is not and still fails.
 */
function normalizeNullableNumber(value: unknown, path: string): number | null {
  if (value === undefined || value === null) return null;
  return requireNumber(value, path);
}

function requireNumberRecord(value: unknown, path: string): void {
  if (!isPlainObject(value)) {
    fail(path, `expected an object, got ${describe(value)}`);
  }
  for (const [key, entry] of Object.entries(value)) {
    requireNumber(entry, `${path}.${key}`);
  }
}

/**
 * Validate a usage object (node-level or graph-level).
 *
 * This is the whole point of the boundary: types alone are a compile-time
 * fiction, so a malformed `usage` from a stale or hostile spec would otherwise
 * flow through as trusted data and be rendered as a dollar figure. In
 * particular `cost` MUST be `number | null` and nothing else — an absent or
 * string cost silently becoming "unrated" would understate what a run spent.
 */
function validateUsage(usage: unknown, path: string): void {
  if (!isPlainObject(usage)) {
    fail(path, `expected an object, got ${describe(usage)}`);
  }
  requireNumber(usage.inference_calls, `${path}.inference_calls`);
  requireNumber(usage.rated_inference_calls, `${path}.rated_inference_calls`);
  requireNumberRecord(usage.nb_tokens_by_category, `${path}.nb_tokens_by_category`);
  requireNumber(usage.total_tokens, `${path}.total_tokens`);
  requireNullableNumber(usage.cost, `${path}.cost`);
  usage.cost_input = normalizeNullableNumber(usage.cost_input, `${path}.cost_input`);
  usage.cost_output = normalizeNullableNumber(usage.cost_output, `${path}.cost_output`);
  requireNumber(usage.subtree_inference_calls, `${path}.subtree_inference_calls`);
  requireNumber(usage.subtree_rated_inference_calls, `${path}.subtree_rated_inference_calls`);
  requireNumberRecord(usage.subtree_nb_tokens_by_category, `${path}.subtree_nb_tokens_by_category`);
  requireNumber(usage.subtree_total_tokens, `${path}.subtree_total_tokens`);
  requireNullableNumber(usage.subtree_cost, `${path}.subtree_cost`);
  usage.subtree_cost_input = normalizeNullableNumber(
    usage.subtree_cost_input,
    `${path}.subtree_cost_input`,
  );
  usage.subtree_cost_output = normalizeNullableNumber(
    usage.subtree_cost_output,
    `${path}.subtree_cost_output`,
  );
  // Absent is tolerated and normalized to `[]` (mirroring the `io` treatment
  // below): a spec produced before per-model attribution existed is legitimately
  // missing it, and an absent list is unambiguous — no per-model data — unlike a
  // malformed one, which is still rejected.
  usage.by_model = normalizeModelUsageList(usage.by_model, `${path}.by_model`);
  usage.subtree_by_model = normalizeModelUsageList(
    usage.subtree_by_model,
    `${path}.subtree_by_model`,
  );
}

/**
 * Validate a per-model usage list, normalizing an absent one to `[]`.
 *
 * The model names here are displayed as fact ("this is what ran"), so a malformed
 * entry must fail loudly rather than render as an empty or partial attribution.
 * Absence is not malformation, though: specs generated before per-model
 * attribution existed simply have no such key.
 */
function normalizeModelUsageList(value: unknown, path: string): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    fail(path, `expected an array when present, got ${describe(value)}`);
  }
  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isPlainObject(entry)) {
      fail(entryPath, `expected an object, got ${describe(entry)}`);
    }
    requireNonEmptyString(entry.inference_model_name, `${entryPath}.inference_model_name`);
    requireNonEmptyString(entry.inference_model_id, `${entryPath}.inference_model_id`);
    // Absent on specs predating the field. Normalized to a value that is not "llm",
    // so token counts stay hidden rather than being shown on unverified grounds.
    if (entry.model_type === undefined) {
      entry.model_type = "unknown";
    } else {
      requireNonEmptyString(entry.model_type, `${entryPath}.model_type`);
    }
    requireNumber(entry.inference_calls, `${entryPath}.inference_calls`);
    requireNumber(entry.rated_inference_calls, `${entryPath}.rated_inference_calls`);
    requireNullableNumber(entry.cost, `${entryPath}.cost`);
  });
  return value;
}

function validateNode(node: unknown, path: string): void {
  if (!isPlainObject(node)) {
    fail(path, `expected an object, got ${describe(node)}`);
  }

  requireNonEmptyString(node.id, `${path}.id`);

  // Every node a real pipelex run serializes is a pipe-call node
  // (`kind` is "controller" or "operator"). The other `NodeKind` values exist
  // in the enum only for the mermaid renderer and never reach a graphspec.json
  // — a spec carrying one is malformed or wrong-version, so reject it.
  if (node.kind !== "controller" && node.kind !== "operator") {
    fail(
      `${path}.kind`,
      `expected "controller" or "operator" — a real pipelex run emits only ` +
        `pipe-call nodes, got ${JSON.stringify(node.kind)}`,
    );
  }

  if (typeof node.status !== "string" || !PIPE_STATUSES.has(node.status)) {
    fail(
      `${path}.status`,
      `expected one of ${[...PIPE_STATUSES].join(", ")}, got ${JSON.stringify(node.status)}`,
    );
  }

  requireNonEmptyString(node.pipe_code, `${path}.pipe_code`);
  const pipeType = requireNonEmptyString(node.pipe_type, `${path}.pipe_type`);
  if (!KNOWN_PIPE_TYPES.has(pipeType)) {
    fail(
      `${path}.pipe_type`,
      `unrecognized pipe class "${pipeType}" — add it to PipeOperatorType ` +
        `or PipeControllerType in types.ts`,
    );
  }
  requireNonEmptyString(node.description, `${path}.description`);
  requireNonEmptyString(node.domain_code, `${path}.domain_code`);

  // `io` is always emitted by pipelex; tolerate an absent key (the pipelex
  // model defaults it) by normalizing to an empty shape.
  let io = node.io;
  if (io === undefined) {
    io = { inputs: [], outputs: [] };
    node.io = io;
  }
  if (!isPlainObject(io)) {
    fail(`${path}.io`, `expected an object, got ${describe(io)}`);
  }
  if (io.inputs === undefined) {
    io.inputs = [];
  } else if (!Array.isArray(io.inputs)) {
    fail(`${path}.io.inputs`, `expected an array, got ${describe(io.inputs)}`);
  }
  if (io.outputs === undefined) {
    io.outputs = [];
  } else if (!Array.isArray(io.outputs)) {
    fail(`${path}.io.outputs`, `expected an array, got ${describe(io.outputs)}`);
  }
  (io.inputs as unknown[]).forEach((item, j) => validateIoItem(item, `${path}.io.inputs[${j}]`));
  (io.outputs as unknown[]).forEach((item, j) => validateIoItem(item, `${path}.io.outputs[${j}]`));

  // `usage` is legitimately ABSENT OR NULL: pydantic serializes `usage=None` as an
  // explicit `"usage": null` rather than omitting the key, and that is the normal
  // shape for a run that collected no usage. Both mean the same thing, so null is
  // normalized away here and downstream code only ever sees an object or undefined.
  if (node.usage === null) {
    delete node.usage;
  } else if (node.usage !== undefined) {
    validateUsage(node.usage, `${path}.usage`);
  }
}

function validateEdge(edge: unknown, path: string): void {
  if (!isPlainObject(edge)) {
    fail(path, `expected an object, got ${describe(edge)}`);
  }
  requireNonEmptyString(edge.id, `${path}.id`);
  requireNonEmptyString(edge.source, `${path}.source`);
  requireNonEmptyString(edge.target, `${path}.target`);
  if (typeof edge.kind !== "string" || !EDGE_KINDS.has(edge.kind)) {
    fail(
      `${path}.kind`,
      `expected one of ${[...EDGE_KINDS].join(", ")}, got ${JSON.stringify(edge.kind)}`,
    );
  }
}

/**
 * Validate a raw, untyped value as a `GraphSpec`. Throws
 * `GraphSpecValidationError` on the first violation.
 *
 * **Mutates the input in place:** on success it returns the *same* object
 * (typed as `GraphSpec`), and where a node has no `io` key it writes
 * `io = { inputs: [], outputs: [] }` (and fills absent `io.inputs` /
 * `io.outputs` arrays) directly onto the passed-in object. Pass a fresh
 * parse result (e.g. straight from `JSON.parse`) — do not pass a frozen or
 * externally shared object.
 */
export function validateGraphSpec(raw: unknown): GraphSpec {
  if (!isPlainObject(raw)) {
    fail("", `expected a GraphSpec object, got ${describe(raw)}`);
  }

  if (!Array.isArray(raw.nodes)) {
    fail("nodes", `expected an array, got ${describe(raw.nodes)}`);
  }
  if (!Array.isArray(raw.edges)) {
    fail("edges", `expected an array, got ${describe(raw.edges)}`);
  }

  if (!isPlainObject(raw.meta)) {
    fail("meta", `expected an object, got ${describe(raw.meta)}`);
  }
  if (raw.meta.format !== "mthds") {
    fail(
      "meta.format",
      `expected "mthds" (this does not look like pipelex GraphSpec JSON), ` +
        `got ${JSON.stringify(raw.meta.format)}`,
    );
  }
  if (
    raw.meta.mode !== undefined &&
    (typeof raw.meta.mode !== "string" || !GRAPH_SPEC_MODES.has(raw.meta.mode))
  ) {
    fail(
      "meta.mode",
      `expected one of ${[...GRAPH_SPEC_MODES].join(", ")} when present, ` +
        `got ${JSON.stringify(raw.meta.mode)}`,
    );
  }

  // `pipe_registry` / `concept_registry` are gated by the pipelex
  // `data_inclusion` flag — legitimately absent, and minimally `{}`.
  if (raw.pipe_registry !== undefined && !isPlainObject(raw.pipe_registry)) {
    fail("pipe_registry", `expected an object when present, got ${describe(raw.pipe_registry)}`);
  }
  if (raw.concept_registry !== undefined && !isPlainObject(raw.concept_registry)) {
    fail(
      "concept_registry",
      `expected an object when present, got ${describe(raw.concept_registry)}`,
    );
  }

  // Same all-or-nothing rule as the node field, and the same null-vs-absent point:
  // pydantic emits `"usage": null` for a run that collected none.
  if (raw.usage === null) {
    delete raw.usage;
  } else if (raw.usage !== undefined) {
    if (!isPlainObject(raw.usage)) {
      fail("usage", `expected an object when present, got ${describe(raw.usage)}`);
    }
    validateUsage(raw.usage.total, "usage.total");
    validateUsage(raw.usage.unattributed, "usage.unattributed");
  }

  raw.nodes.forEach((node, i) => validateNode(node, `nodes[${i}]`));
  raw.edges.forEach((edge, i) => validateEdge(edge, `edges[${i}]`));

  return raw as unknown as GraphSpec;
}

/**
 * Narrow a `GraphSpecNode` to a `PipeCallNode` at an internal trust boundary,
 * throwing `GraphSpecValidationError` when the node is not a well-formed
 * pipe-call node.
 *
 * Graph-topology analysis (`buildGraph` and friends) identifies a node as a
 * pipe by its edges, not by re-checking `kind`/`pipe_code`. When the spec has
 * been through `validateGraphSpec` this always holds — but library consumers
 * may call `buildGraph` directly. This guard turns that gap into a loud,
 * greppable failure instead of a bare `TypeError` on a missing `pipe_code`.
 */
export function asPipeCallNode(node: GraphSpecNode, path = "node"): PipeCallNode {
  if (node.kind !== "controller" && node.kind !== "operator") {
    fail(
      `${path}.kind`,
      `expected a pipe-call node ("controller" or "operator"), ` +
        `got ${JSON.stringify(node.kind)}`,
    );
  }
  requireNonEmptyString(node.pipe_code, `${path}.pipe_code`);
  return node as PipeCallNode;
}
