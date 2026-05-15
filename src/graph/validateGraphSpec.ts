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
 */
import type { GraphSpec, GraphSpecEdgeKind, NodeKind, PipeStatus } from "./types";
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

const NODE_KINDS: ReadonlySet<string> = new Set<NodeKind>([
  "pipe_call",
  "controller",
  "operator",
  "input",
  "output",
  "artifact",
  "error",
]);

const PIPE_STATUSES: ReadonlySet<string> = new Set<PipeStatus>([
  "succeeded",
  "failed",
  "running",
  "scheduled",
  "skipped",
  "canceled",
]);

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

function validateNode(node: unknown, path: string): void {
  if (!isPlainObject(node)) {
    fail(path, `expected an object, got ${describe(node)}`);
  }

  requireNonEmptyString(node.id, `${path}.id`);

  if (typeof node.kind !== "string" || !NODE_KINDS.has(node.kind)) {
    fail(
      `${path}.kind`,
      `expected one of ${[...NODE_KINDS].join(", ")}, got ${JSON.stringify(node.kind)}`,
    );
  }

  if (typeof node.status !== "string" || !PIPE_STATUSES.has(node.status)) {
    fail(
      `${path}.status`,
      `expected one of ${[...PIPE_STATUSES].join(", ")}, got ${JSON.stringify(node.status)}`,
    );
  }

  // In practice every node a real run emits is a pipe-call node
  // (kind controller | operator). Those carry the full required field set.
  const isPipeCall = node.kind === "controller" || node.kind === "operator";
  if (isPipeCall) {
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
  }

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
 * `GraphSpecValidationError` on the first violation; on success returns the
 * same object typed as `GraphSpec`, with any absent `io` shapes normalized to
 * `{ inputs: [], outputs: [] }`.
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

  raw.nodes.forEach((node, i) => validateNode(node, `nodes[${i}]`));
  raw.edges.forEach((edge, i) => validateEdge(edge, `edges[${i}]`));

  return raw as unknown as GraphSpec;
}
