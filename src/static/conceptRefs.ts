// ─── Concept reference parsing and resolution ────────────────────────────────
// A concept ref in MTHDS TOML is `Code`, `domain.Code`, optionally suffixed
// with a multiplicity marker: `Code[]` (many) or `Code[N]` (exactly N).
// Resolution follows the spec's namespace rules: bare refs resolve in the
// current bundle first, then the native domain; qualified refs name their
// domain explicitly. Anything unresolved becomes a best-effort stub — this
// module never throws on content.

import type { ConceptInfo, StuffSpecInfo } from "@graph/types";

export const NATIVE_DOMAIN = "native";

/**
 * The native concept catalog (mirrors pipelex `NativeConceptCode`). Descriptions
 * are display-only stand-ins — the runtime's exact wording is not part of the
 * contract. Structure class names follow the runtime's `<Code>Content` rule.
 */
const NATIVE_CONCEPT_DESCRIPTIONS: Record<string, string> = {
  Dynamic: "Dynamically typed content",
  Text: "A text",
  Image: "An image",
  Document: "A document",
  Html: "HTML content",
  TextAndImages: "A text with images",
  Number: "A number",
  Page: "The content of a page of a document",
  JSON: "JSON content",
  SearchResult: "A search result",
  Anything: "Anything",
  Composite: "A named composition of multiple contents",
};

export const NATIVE_CONCEPT_CODES: ReadonlySet<string> = new Set(
  Object.keys(NATIVE_CONCEPT_DESCRIPTIONS),
);

// ─── Ref parsing ─────────────────────────────────────────────────────────────

export interface ConceptRefParts {
  /** Explicit domain qualifier (`recruitment` in `recruitment.Profile`), or null for bare refs. */
  domain: string | null;
  code: string;
  /** `[]` → true (many), `[N]` → N, no suffix → null (single). */
  multiplicity: number | boolean | null;
}

const CONCEPT_REF_RE = /^(?:([A-Za-z0-9_][A-Za-z0-9_.]*)\.)?([A-Za-z0-9_]+)(?:\[(\d*)\])?$/;

/** Parse a concept ref string into its parts. Returns null when the ref is not interpretable. */
export function parseConceptRef(raw: unknown): ConceptRefParts | null {
  if (typeof raw !== "string") return null;
  const match = CONCEPT_REF_RE.exec(raw.trim());
  if (!match) return null;
  const [, domain, code, multiplicity] = match;
  return {
    domain: domain ?? null,
    code,
    multiplicity:
      multiplicity === undefined
        ? null
        : multiplicity === ""
          ? true
          : Number.parseInt(multiplicity, 10),
  };
}

// ─── Resolution to ConceptInfo ───────────────────────────────────────────────

/**
 * Synthetic structure class name for a non-native concept, mirroring the
 * runtime's `make_qualified_structure_class_name`: dots in hierarchical
 * domain codes are replaced with interpuncts (·) to keep the name a valid,
 * collision-free identifier (`a.b` → `a·b`, distinct from `a_b`).
 */
export function qualifiedStructureClassName(domain: string, code: string): string {
  return `${domain.replaceAll(".", "·")}__${code}`;
}

export function nativeConceptInfo(code: string): ConceptInfo {
  return {
    code,
    domain_code: NATIVE_DOMAIN,
    description: NATIVE_CONCEPT_DESCRIPTIONS[code] ?? code,
    structure_class_name: `${code}Content`,
    refines: null,
  };
}

/**
 * Best-effort info for a concept that is referenced but not declared in the
 * material at hand — an implicit concept, a WIP ref, or a cross-bundle ref
 * that `mergeBundles` may still enrich later.
 */
function stubConceptInfo(code: string, domain: string): ConceptInfo {
  return {
    code,
    domain_code: domain,
    description: "",
    structure_class_name: qualifiedStructureClassName(domain, code),
    refines: null,
  };
}

/**
 * Resolve parsed ref parts against the current bundle. `localConcepts` holds
 * the bundle's declared concepts keyed by bare code.
 */
export function resolveConceptInfo(
  parts: ConceptRefParts,
  currentDomain: string,
  localConcepts: Record<string, ConceptInfo>,
): ConceptInfo {
  if (parts.domain === NATIVE_DOMAIN) {
    return NATIVE_CONCEPT_CODES.has(parts.code)
      ? nativeConceptInfo(parts.code)
      : stubConceptInfo(parts.code, NATIVE_DOMAIN);
  }
  if (parts.domain !== null && parts.domain !== currentDomain) {
    return stubConceptInfo(parts.code, parts.domain);
  }
  const local = localConcepts[parts.code];
  if (local) return local;
  if (parts.domain === null && NATIVE_CONCEPT_CODES.has(parts.code)) {
    return nativeConceptInfo(parts.code);
  }
  return stubConceptInfo(parts.code, currentDomain);
}

/** Resolve a raw concept ref string straight to a `StuffSpecInfo`, or null when unparseable. */
export function resolveStuffSpec(
  raw: unknown,
  currentDomain: string,
  localConcepts: Record<string, ConceptInfo>,
): StuffSpecInfo | null {
  const parts = parseConceptRef(raw);
  if (parts === null) return null;
  return {
    concept: resolveConceptInfo(parts, currentDomain, localConcepts),
    multiplicity: parts.multiplicity,
  };
}
