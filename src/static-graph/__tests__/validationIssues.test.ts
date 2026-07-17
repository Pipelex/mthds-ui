import { describe, it, expect } from "vitest";
import type { Diagnostic } from "../types";
import { staticDiagnosticsToValidationIssues } from "../validationIssues";

describe("staticDiagnosticsToValidationIssues", () => {
  it("projects severity, message, and path onto the presentation shape", () => {
    const diagnostics: Diagnostic[] = [
      {
        severity: "error",
        code: "unresolved-pipe-ref",
        message: 'Pipe "missing_step" is referenced but never declared.',
        path: "pipe.main_flow.steps",
      },
      {
        severity: "warning",
        code: "missing-pipe-output",
        message: "Pipe has no output.",
      },
    ];

    expect(staticDiagnosticsToValidationIssues(diagnostics)).toEqual([
      {
        severity: "error",
        message: 'Pipe "missing_step" is referenced but never declared.',
        context: "pipe.main_flow.steps",
        origin: "static",
      },
      {
        severity: "warning",
        message: "Pipe has no output.",
        context: undefined,
        origin: "static",
      },
    ]);
  });

  it("maps an empty diagnostic list to an empty issue list", () => {
    expect(staticDiagnosticsToValidationIssues([])).toEqual([]);
  });
});
