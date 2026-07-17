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
        pipeCode: "main_flow",
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

  describe("targeting fields", () => {
    function mapOne(path?: string) {
      const [issue] = staticDiagnosticsToValidationIssues([
        { severity: "error", code: "invalid-pipe-entry", message: "m", path },
      ]);
      return { pipeCode: issue.pipeCode, nodeId: issue.nodeId };
    }

    it("fills pipeCode from a bare pipe declaration path", () => {
      expect(mapOne("pipe.analyze_candidate")).toEqual({
        pipeCode: "analyze_candidate",
        nodeId: undefined,
      });
    });

    it("fills pipeCode from a pipe field path", () => {
      expect(mapOne("pipe.analyze_candidate.inputs.cv")).toEqual({
        pipeCode: "analyze_candidate",
        nodeId: undefined,
      });
    });

    it("fills nodeId from a walk-phase node-id path", () => {
      expect(mapOne("demo.main_flow/step_2")).toEqual({
        pipeCode: undefined,
        nodeId: "demo.main_flow/step_2",
      });
    });

    it("prefers nodeId when a node id lives under a domain named pipe", () => {
      expect(mapOne("pipe.main_flow/branch_1")).toEqual({
        pipeCode: undefined,
        nodeId: "pipe.main_flow/branch_1",
      });
    });

    it("leaves concept paths untargeted", () => {
      expect(mapOne("concept.Candidate")).toEqual({ pipeCode: undefined, nodeId: undefined });
    });

    it("leaves bare section paths untargeted", () => {
      expect(mapOne("pipe")).toEqual({ pipeCode: undefined, nodeId: undefined });
      expect(mapOne("concept")).toEqual({ pipeCode: undefined, nodeId: undefined });
      expect(mapOne("domain")).toEqual({ pipeCode: undefined, nodeId: undefined });
    });

    it("leaves a root entry-pipe node id (no slash) untargeted", () => {
      // The root id `domain.code` only appears on diagnostics about pipes that
      // never became nodes (unresolved entry pipe), so there is nothing to
      // decorate — the issue stays panel-only.
      expect(mapOne("demo.main_flow")).toEqual({ pipeCode: undefined, nodeId: undefined });
    });

    it("leaves pathless diagnostics (e.g. toml-parse-error) untargeted", () => {
      expect(mapOne(undefined)).toEqual({ pipeCode: undefined, nodeId: undefined });
    });
  });
});
