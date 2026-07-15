// ─── mergeBundles: ParsedBundle[] → MergedMethodSet ──────────────────────────
// A method package may span several `.mthds` files; files sharing a domain
// merge into one namespace. Duplicate codes keep the first declaration and
// record a diagnostic. After merging, io concept stubs are re-pointed at the
// declarations that other files contributed (a pipe in file A can reference a
// concept declared in file B).

import type { PipeBlueprintUnion, StuffSpecInfo } from "@graph/types";

import type { Diagnostic, DomainNamespace, MergedMethodSet, ParsedBundle } from "./types";
import { UNKNOWN_DOMAIN } from "./types";

function enrichPipeConcepts(
  pipe: PipeBlueprintUnion,
  domains: Record<string, DomainNamespace>,
): PipeBlueprintUnion {
  const enrichSpec = (spec: StuffSpecInfo): StuffSpecInfo => {
    const declared = domains[spec.concept.domain_code]?.concepts[spec.concept.code];
    return declared !== undefined && declared !== spec.concept
      ? { ...spec, concept: declared }
      : spec;
  };
  const inputs: Record<string, StuffSpecInfo> = {};
  for (const [name, spec] of Object.entries(pipe.inputs)) {
    inputs[name] = enrichSpec(spec);
  }
  return { ...pipe, inputs, output: enrichSpec(pipe.output) };
}

/**
 * Merge parsed bundles into one namespace per domain. Order matters: on
 * duplicate codes the first bundle wins, and `mainDomain` / `mainPipe` /
 * `description` come from the first bundle that declares each.
 */
export function mergeBundles(bundles: ParsedBundle[]): MergedMethodSet {
  const diagnostics: Diagnostic[] = [];
  const domains: Record<string, DomainNamespace> = {};
  let mainDomain: string | null = null;
  let mainPipe: string | null = null;
  let description: string | null = null;

  for (const bundle of bundles) {
    const domain = bundle.domain ?? UNKNOWN_DOMAIN;
    const namespace = (domains[domain] ??= { domain, concepts: {}, pipes: {} });
    if (mainDomain === null && bundle.domain !== null) mainDomain = bundle.domain;
    if (mainPipe === null && bundle.main_pipe !== null) mainPipe = bundle.main_pipe;
    if (description === null && bundle.description !== null) description = bundle.description;

    for (const [code, concept] of Object.entries(bundle.concepts)) {
      if (code in namespace.concepts) {
        diagnostics.push({
          severity: "warning",
          code: "duplicate-concept",
          message: `concept "${domain}.${code}" declared more than once — keeping the first declaration`,
          path: `concept.${code}`,
        });
        continue;
      }
      namespace.concepts[code] = concept;
    }
    for (const [code, pipe] of Object.entries(bundle.pipes)) {
      if (code in namespace.pipes) {
        diagnostics.push({
          severity: "warning",
          code: "duplicate-pipe",
          message: `pipe "${domain}.${code}" declared more than once — keeping the first declaration`,
          path: `pipe.${code}`,
        });
        continue;
      }
      namespace.pipes[code] = pipe;
    }
  }

  for (const namespace of Object.values(domains)) {
    for (const [code, pipe] of Object.entries(namespace.pipes)) {
      namespace.pipes[code] = enrichPipeConcepts(pipe, domains);
    }
  }

  return { domains, mainDomain, mainPipe, description, diagnostics };
}
