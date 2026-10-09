import type { NodePipeType, PipeType } from "@graph/types";

/**
 * Pipe types whose runtime `execution_data` is merged into their blueprint
 * section (`Pipe*Section`). When the blueprint resolves, the section already
 * renders the runtime values, so the dedicated execution-data dump is
 * suppressed to avoid duplication. Every type with a `Pipe*Section` renderer is
 * listed here; `PipeFunc` (no section) and `PipeSignature` (stub) are not.
 */
export const MERGED_EXECUTION_DATA_TYPES: ReadonlySet<string> = new Set<PipeType>([
  "PipeLLM",
  "PipeImgGen",
  "PipeExtract",
  "PipeSearch",
  "PipeStructure",
  "PipeCompose",
  "PipeDocGen",
  "PipeSequence",
  "PipeParallel",
  "PipeCondition",
  "PipeBatch",
]);

/**
 * Execution-data keys the raw dump never shows, per pipe type, even when the
 * blueprint failed to resolve. A `PipeDocGen`'s `url` is the stored document
 * itself, which is the step's output and shown as one: with an inlined
 * document it is a `data:` URL carrying the whole file in base64.
 */
const UNDUMPED_EXECUTION_DATA_KEYS: Readonly<Partial<Record<NodePipeType, ReadonlySet<string>>>> = {
  PipeDocGen: new Set(["url"]),
};

/**
 * Decide whether to render the raw execution-data dump (`GenericExecutionData`).
 *
 * For a merged type we only dump when the blueprint failed to resolve — otherwise
 * its runtime values would be silently dropped, since the per-type section never
 * mounts (it is gated on the blueprint). For any other type (`PipeFunc`,
 * `PipeSignature`, or a future/unknown type) there is no merged section, so the
 * dump is always shown.
 */
export function shouldDumpExecutionData(pipeType: string, hasBlueprint: boolean): boolean {
  if (MERGED_EXECUTION_DATA_TYPES.has(pipeType)) return !hasBlueprint;
  return true;
}

/** The execution-data entries the raw dump shows for a pipe type, in their order. */
export function dumpableExecutionData(
  pipeType: NodePipeType,
  executionData: Record<string, unknown>,
): [string, unknown][] {
  const undumped = UNDUMPED_EXECUTION_DATA_KEYS[pipeType];
  const entries = Object.entries(executionData);
  return undumped ? entries.filter(([key]) => !undumped.has(key)) : entries;
}
