// ─── Static method-graph module: domain types ───────────────────────────────
// Pure TypeScript, no React. This module parses raw `.mthds` TOML text into
// blueprint-shaped bundles, reusing the `Pipe*Blueprint` registry types from
// `@graph/types` so the parsed entries can feed a GraphSpec `pipe_registry`
// directly. Parsing is lenient: half-written bundles produce partial results
// plus non-fatal diagnostics, never exceptions.

import type { ConceptInfo, PipeBlueprintUnion } from "@graph/types";

// ─── Diagnostics ─────────────────────────────────────────────────────────────

export type DiagnosticSeverity = "error" | "warning";

export type DiagnosticCode =
  | "toml-parse-error"
  | "missing-domain"
  | "invalid-bundle-shape"
  | "invalid-concept-entry"
  | "invalid-pipe-entry"
  | "unknown-pipe-type"
  | "retired-signature-tag"
  | "invalid-concept-ref"
  | "missing-pipe-output"
  | "invalid-sub-pipe"
  | "incomplete-batch-spec"
  | "duplicate-concept"
  | "duplicate-pipe"
  | "signature-type-mismatch"
  | "unresolved-pipe-ref"
  | "cyclic-pipe-ref"
  | "missing-main-pipe"
  | "no-entry-pipe"
  | "conflicting-input-concept";

/**
 * A non-fatal note collected while parsing or merging. `error` means a whole
 * unit could not be interpreted (unparseable TOML, a skipped pipe); `warning`
 * means something was tolerated with a fallback (missing output, bad ref).
 */
export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: DiagnosticCode;
  message: string;
  /** TOML-style locator for the offending entry, e.g. `pipe.analyze_candidate.output`. */
  path?: string;
  /**
   * Domain of the bundle namespace the diagnostic belongs to — the declaring-file
   * identity a host needs to qualify a `pipe.<code>` locator into a full pipe ref
   * (`domain_code.pipe_code`). Stamped wherever the owning namespace is known:
   * per-file diagnostics get their bundle's domain ({@link UNKNOWN_DOMAIN} when
   * the bundle declares none), merge/walk diagnostics the namespace being
   * processed, and entry selection stamps the diagnostics it can attribute (a
   * missing or unresolvable `main_pipe` names its declaring domain). Absent only
   * when no owning bundle can be resolved: unparseable TOML, or entry selection
   * with no resolvable owner (no bundles, no pipes anywhere, or a host-supplied
   * entry ref that matches nothing).
   */
  domain_code?: string;
}

// ─── Parsed bundle ───────────────────────────────────────────────────────────

/**
 * One `.mthds` file, parsed and normalized. Pipes are narrowed to the same
 * `PipeBlueprintUnion` shapes the pipelex runtime serializes into GraphSpec
 * `pipe_registry`, and concepts to `ConceptInfo` — no parallel type universe.
 * Field names mirror the TOML bundle header keys.
 */
export interface ParsedBundle {
  domain: string | null;
  description: string | null;
  main_pipe: string | null;
  system_prompt: string | null;
  /** Concepts declared in this bundle, keyed by bare concept code. */
  concepts: Record<string, ConceptInfo>;
  /** Pipes declared in this bundle, keyed by bare pipe code. */
  pipes: Record<string, PipeBlueprintUnion>;
}

export interface ParseMthdsBundleResult {
  bundle: ParsedBundle;
  diagnostics: Diagnostic[];
}

// ─── Merged method set ───────────────────────────────────────────────────────

/** Namespace of one domain after merging bundles: concepts and pipes by bare code. */
export interface DomainNamespace {
  domain: string;
  concepts: Record<string, ConceptInfo>;
  pipes: Record<string, PipeBlueprintUnion>;
}

/**
 * The merged namespace of a method package: every parsed bundle grouped by
 * domain, with duplicate codes resolved keep-first (plus a diagnostic).
 * `mainDomain` / `mainPipe` come as a pair from the first bundle declaring
 * `main_pipe` (falling back to the first domained bundle when none does) —
 * the walk entry point for the static graph builder. `description` comes from
 * the first bundle that declares it.
 */
export interface MergedMethodSet {
  domains: Record<string, DomainNamespace>;
  mainDomain: string | null;
  mainPipe: string | null;
  description: string | null;
  diagnostics: Diagnostic[];
}

/** Namespace used for bundles that declare no `domain` (a legal WIP state). */
export const UNKNOWN_DOMAIN = "unknown";

// ─── Narrowing helpers (shared by the parsing modules) ───────────────────────

/**
 * True for plain tables only — rejects arrays, class instances and dates
 * (smol-toml emits `TomlDate` objects for TOML datetime values).
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function strOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function intOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export function boolOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}
