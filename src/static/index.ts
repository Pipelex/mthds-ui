// Barrel export for the static method-graph module: pure TypeScript parsing
// of `.mthds` TOML into blueprint-shaped bundles. No React, no file system —
// callers pass TOML strings.

export type {
  Diagnostic,
  DiagnosticCode,
  DiagnosticSeverity,
  DomainNamespace,
  MergedMethodSet,
  ParsedBundle,
  ParseMthdsBundleResult,
} from "./types";
export { UNKNOWN_DOMAIN } from "./types";
export type { ConceptRefParts } from "./conceptRefs";
export { NATIVE_CONCEPT_CODES, NATIVE_DOMAIN, parseConceptRef } from "./conceptRefs";
export { parseMthdsBundle } from "./parseMthdsBundle";
export { mergeBundles } from "./mergeBundles";
