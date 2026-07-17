// Bridge from static-analysis diagnostics to the viewer's validation panel.

import type { ValidationIssue } from "@graph/types";
import type { Diagnostic } from "./types";

/**
 * Project static-graph {@link Diagnostic}s onto the viewer's presentation shape
 * so a host can feed them straight into `GraphViewer`'s `validationIssues`.
 * The TOML-style `path` becomes the locator chip; `origin: "static"` lets the
 * panel (and the host's issue policy) distinguish them from validator verdicts.
 */
export function staticDiagnosticsToValidationIssues(diagnostics: Diagnostic[]): ValidationIssue[] {
  return diagnostics.map((diagnostic) => ({
    severity: diagnostic.severity,
    message: diagnostic.message,
    context: diagnostic.path,
    origin: "static",
  }));
}
