// ─── mergeBundles: ParsedBundle[] → MergedMethodSet ──────────────────────────
// A method package may span several `.mthds` files; files sharing a domain
// merge into one namespace. Duplicate codes keep the first declaration and
// record a diagnostic — except when a pipe signature meets its concrete
// definition, which is the multi-file idiom rather than a duplication: the
// concrete wins whichever file it came from, and nothing is reported. After
// merging, io concept stubs are re-pointed at the declarations that other files
// contributed (a pipe in file A can reference a concept declared in file B).

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
 * duplicate codes the first bundle wins. `mainDomain` and `mainPipe` are taken
 * together from the first bundle declaring `main_pipe`, so a bare entry ref
 * always resolves in its declaring bundle's namespace; when no bundle declares
 * one, `mainDomain` falls back to the first domained bundle. `description`
 * comes from the first bundle that declares it.
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
    if (mainPipe === null && bundle.main_pipe !== null) {
      mainPipe = bundle.main_pipe;
      // A bare main_pipe must resolve in the namespace of the bundle declaring
      // it, not whichever bundle happened to come first.
      mainDomain = domain;
    }
    if (description === null && bundle.description !== null) description = bundle.description;

    for (const [code, concept] of Object.entries(bundle.concepts)) {
      if (code in namespace.concepts) {
        diagnostics.push({
          severity: "warning",
          code: "duplicate-concept",
          message: `concept "${domain}.${code}" declared more than once — keeping the first declaration`,
          path: `concept.${code}`,
          domain_code: domain,
        });
        continue;
      }
      namespace.concepts[code] = concept;
    }
    for (const [code, pipe] of Object.entries(bundle.pipes)) {
      const existing = namespace.pipes[code];
      if (existing === undefined) {
        namespace.pipes[code] = pipe;
        continue;
      }
      // A signature is a forward declaration; the concrete pipe of the same code
      // is its definition, not a duplicate of it. Which file each landed in — and
      // therefore which one the merge sees first — is an authoring choice, so the
      // concrete always wins and the collision is silent.
      const existingIsSignature = existing.type === "PipeSignature";
      const incomingIsSignature = pipe.type === "PipeSignature";
      if (existingIsSignature !== incomingIsSignature) {
        if (existingIsSignature) namespace.pipes[code] = pipe;
        continue;
      }
      diagnostics.push({
        severity: "warning",
        code: "duplicate-pipe",
        message: `pipe "${domain}.${code}" declared more than once — keeping the first declaration`,
        path: `pipe.${code}`,
        domain_code: domain,
      });
    }
  }

  for (const namespace of Object.values(domains)) {
    for (const [code, pipe] of Object.entries(namespace.pipes)) {
      namespace.pipes[code] = enrichPipeConcepts(pipe, domains);
    }
  }

  return { domains, mainDomain, mainPipe, description, diagnostics };
}
