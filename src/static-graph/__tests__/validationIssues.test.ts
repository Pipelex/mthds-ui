import { describe, it, expect } from "vitest";
import { buildStaticGraphSpecFromToml } from "../buildStaticGraphSpec";
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
        domain_code: "demo",
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
        pipeRef: "demo.main_flow",
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
    function mapOne(path?: string, domainCode?: string) {
      const [issue] = staticDiagnosticsToValidationIssues([
        {
          severity: "error",
          code: "invalid-pipe-entry",
          message: "m",
          path,
          domain_code: domainCode,
        },
      ]);
      return { pipeRef: issue.pipeRef, nodeId: issue.nodeId };
    }

    it("qualifies a bare pipe declaration path with the diagnostic's domain", () => {
      expect(mapOne("pipe.analyze_candidate", "screening")).toEqual({
        pipeRef: "screening.analyze_candidate",
        nodeId: undefined,
      });
    });

    it("qualifies a pipe field path with the diagnostic's domain", () => {
      expect(mapOne("pipe.analyze_candidate.inputs.cv", "screening")).toEqual({
        pipeRef: "screening.analyze_candidate",
        nodeId: undefined,
      });
    });

    it("leaves a pipe declaration path untargeted when the domain is unknown", () => {
      // Decorating on the bare code would ring every same-code node across
      // domains — an unqualifiable diagnostic must stay panel-only.
      expect(mapOne("pipe.analyze_candidate", undefined)).toEqual({
        pipeRef: undefined,
        nodeId: undefined,
      });
    });

    it("fills nodeId from a walk-phase node-id path", () => {
      expect(mapOne("demo.main_flow/step_2", "demo")).toEqual({
        pipeRef: undefined,
        nodeId: "demo.main_flow/step_2",
      });
    });

    it("prefers nodeId when a node id lives under a domain named pipe", () => {
      expect(mapOne("pipe.main_flow/branch_1", "pipe")).toEqual({
        pipeRef: undefined,
        nodeId: "pipe.main_flow/branch_1",
      });
    });

    it("leaves concept paths untargeted", () => {
      expect(mapOne("concept.Candidate", "demo")).toEqual({
        pipeRef: undefined,
        nodeId: undefined,
      });
    });

    it("leaves bare section paths untargeted", () => {
      expect(mapOne("pipe", "demo")).toEqual({ pipeRef: undefined, nodeId: undefined });
      expect(mapOne("concept", "demo")).toEqual({ pipeRef: undefined, nodeId: undefined });
      expect(mapOne("domain", "demo")).toEqual({ pipeRef: undefined, nodeId: undefined });
    });

    it("leaves a root entry-pipe node id (no slash) untargeted", () => {
      // The root id `domain.code` only appears on diagnostics about pipes that
      // never became nodes (unresolved entry pipe), so there is nothing to
      // decorate — the issue stays panel-only.
      expect(mapOne("demo.main_flow", "demo")).toEqual({
        pipeRef: undefined,
        nodeId: undefined,
      });
    });

    it("leaves pathless diagnostics (e.g. toml-parse-error) untargeted", () => {
      expect(mapOne(undefined, undefined)).toEqual({ pipeRef: undefined, nodeId: undefined });
    });
  });

  describe("end-to-end domain stamping", () => {
    it("qualifies each file's diagnostics with that file's domain, even on colliding codes", () => {
      // Both files declare a pipe `analyze`; only the qualified ref separates
      // the helpers one (missing output) from the screening one (fine).
      const screeningFile = `
domain = "screening"
main_pipe = "main"

[pipe.main]
type = "PipeSequence"
description = "d"
output = "Text"
steps = [ { pipe = "analyze", result = "a" } ]

[pipe.analyze]
type = "PipeLLM"
description = "d"
output = "Text"
prompt = "p"
`;
      const helpersFile = `
domain = "helpers"

[pipe.analyze]
type = "PipeLLM"
description = "d"
prompt = "p"
`;
      const built = buildStaticGraphSpecFromToml([screeningFile, helpersFile]);
      const issues = staticDiagnosticsToValidationIssues(built.diagnostics);
      const targeted = issues
        .filter((issue) => issue.pipeRef !== undefined)
        .map((issue) => ({ context: issue.context, pipeRef: issue.pipeRef }));
      expect(targeted).toContainEqual({
        context: "pipe.analyze.output",
        pipeRef: "helpers.analyze",
      });
      expect(targeted).not.toContainEqual(
        expect.objectContaining({ pipeRef: "screening.analyze" }),
      );
    });
  });
});
