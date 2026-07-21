// Bridge from static-analysis diagnostics to the viewer's validation panel.

import type { ValidationIssue } from "@graph/types";
import { makePipeRef } from "@graph/pipeRefs";
import type { Diagnostic } from "./types";

/**
 * Derive the viewer targeting fields from a diagnostic's TOML-style `path`
 * plus its declaring-namespace `domain_code`.
 *
 * - A walk-phase path is a GraphSpec node id and contains `/` (e.g.
 *   `demo.main_flow/step_2`) → `nodeId`. Checked first: node ids embed the
 *   domain, so a prefix test alone could misread them.
 * - A declaration path `pipe.<code>[...]` qualified by the diagnostic's
 *   `domain_code` → `pipeRef` (`domain_code.pipe_code`). A diagnostic without
 *   `domain_code` cannot be qualified and stays panel-only — decorating on a
 *   bare code would ring every same-code node across domains.
 * - Everything else (concept paths, bare section paths like `pipe`, root
 *   entry-pipe ids without `/`, missing paths) has no graph target — those
 *   issues stay panel-only.
 */
function targetFromPath(
  path: string | undefined,
  domainCode: string | undefined,
): Pick<ValidationIssue, "pipeRef" | "nodeId"> {
  if (!path) return {};
  if (path.includes("/")) return { nodeId: path };
  if (path.startsWith("pipe.")) {
    const code = path.split(".")[1];
    if (code && domainCode) return { pipeRef: makePipeRef(domainCode, code) };
  }
  return {};
}

/**
 * Project static-graph {@link Diagnostic}s onto the viewer's presentation shape
 * so a host can feed them straight into `GraphViewer`'s `validationIssues`.
 * The TOML-style `path` becomes the locator chip; `origin: "static"` lets the
 * panel (and the host's issue policy) distinguish them from validator verdicts.
 * When the path identifies a pipe declaration or a precise invocation, the
 * targeting fields (`pipeRef` / `nodeId`) are filled so the viewer can
 * decorate the affected graph nodes.
 */
export function staticDiagnosticsToValidationIssues(diagnostics: Diagnostic[]): ValidationIssue[] {
  return diagnostics.map((diagnostic) => ({
    severity: diagnostic.severity,
    message: diagnostic.message,
    context: diagnostic.path,
    origin: "static",
    ...targetFromPath(diagnostic.path, diagnostic.domain_code),
  }));
}
