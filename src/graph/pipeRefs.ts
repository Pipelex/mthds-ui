// Pipe-ref helpers — the presentation-side mirror of pipelex's `QualifiedRef`
// (`pipelex/core/qualified_ref.py`). A pipe ref is `domain_code.pipe_code`
// (the domain path may be multi-segment: `legal.contracts.compute_score`);
// parsing splits on the LAST dot. Hosts must use these helpers instead of
// re-implementing the split, so every consumer agrees with the runtime on
// what a ref means.

/** A parsed pipe ref: the (possibly multi-segment) domain path and the bare code. */
export interface ParsedPipeRef {
  /** Dotted domain path (`scoring`, `legal.contracts`), or null for a bare ref. */
  domainPath: string | null;
  /** The bare pipe code (`compute_score`). */
  pipeCode: string;
}

/**
 * Parse a pipe ref with `QualifiedRef.parse` semantics: split on the last dot,
 * reject malformed forms (empty, leading/trailing dot, consecutive dots) by
 * returning `null` instead of throwing. Cross-package refs (`alias->…`) are
 * opaque in the presentation chain for now and also return `null` — an issue
 * about one stays untargetable rather than mis-resolved.
 */
export function parsePipeRef(raw: string): ParsedPipeRef | null {
  if (raw.includes("->")) return null;
  if (raw === "" || raw.startsWith(".") || raw.endsWith(".") || raw.includes("..")) return null;
  const dot = raw.lastIndexOf(".");
  if (dot === -1) return { domainPath: null, pipeCode: raw };
  return { domainPath: raw.slice(0, dot), pipeCode: raw.slice(dot + 1) };
}

/** Render a fully-qualified pipe ref (`QualifiedRef.full_ref`): `domain_code.pipe_code`. */
export function makePipeRef(domainCode: string, pipeCode: string): string {
  return `${domainCode}.${pipeCode}`;
}
