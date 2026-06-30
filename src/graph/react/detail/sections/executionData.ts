/**
 * Pipe types whose runtime `execution_data` is merged into their blueprint
 * section (`Pipe*Section`). When the blueprint resolves, the section already
 * renders the runtime values, so the dedicated execution-data dump is
 * suppressed to avoid duplication. Every type with a `Pipe*Section` renderer is
 * listed here; `PipeFunc` (no section) and `PipeSignature` (stub) are not.
 */
export const MERGED_EXECUTION_DATA_TYPES = new Set<string>([
  "PipeLLM",
  "PipeImgGen",
  "PipeExtract",
  "PipeSearch",
  "PipeStructure",
  "PipeCompose",
  "PipeSequence",
  "PipeParallel",
  "PipeCondition",
  "PipeBatch",
]);

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
