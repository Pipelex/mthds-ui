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
export type { StaticGraphOptions, StaticGraphResult } from "./buildStaticGraphSpec";
export { buildStaticGraphSpec, buildStaticGraphSpecFromToml } from "./buildStaticGraphSpec";
export { staticDiagnosticsToValidationIssues } from "./validationIssues";
// Re-exported here so React-free hosts (e.g. the VS Code extension host) can
// consume the canonical pipe-ref parsing without importing the graph module.
export type { ParsedPipeRef } from "@graph/pipeRefs";
export { makePipeRef, parsePipeRef } from "@graph/pipeRefs";
