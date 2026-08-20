// ─── Concept reference parsing and resolution ────────────────────────────────
// A concept ref in MTHDS TOML is `Code` or `domain.Code`, optionally suffixed
// with a multiplicity marker — `Code[]` (many) or `Code[N]` (exactly N) — and
// then a presence marker — `Code?` (optional) or `Code!` (force). The suffix
// order is fixed, multiplicity before presence, mirroring the runtime's
// `MULTIPLICITY_PATTERN` in `pipelex/core/pipes/variable_multiplicity.py`.
// Resolution follows the spec's namespace rules: bare refs resolve in the
// current bundle first, then the native domain; qualified refs name their
// domain explicitly. Anything unresolved becomes a best-effort stub — this
// module never throws on content.

import type { ConceptInfo, PresenceMarker, StuffSpecInfo } from "@graph/types";

export const NATIVE_DOMAIN = "native";

/**
 * The native concept catalog. Codes and descriptions are copied from the MTHDS
 * standard's pinned set — `docs/spec/native-concepts.md` in the sibling `mthds/`
 * repo — which pipelex mirrors in `pipelex/core/concepts/native/concept_native.py`
 * and `native/pinned_blueprints.py`. Structure class names follow the runtime's
 * `<Code>Content` rule. Keep this table in the spec's canonical order; a code
 * missing here silently degrades to a stub. See `docs/static-graph.md`.
 */
const NATIVE_CONCEPT_DESCRIPTIONS = {
  Dynamic: "A dynamic concept",
  Text: "A text",
  Image: "An image",
  Document: "A document",
  Html: "HTML content",
  TextAndImages: "A text and an image",
  Number: "A number",
  YesNo: "The answer to a yes/no question",
  Date: "A calendar date, optionally with a time of day — as precise as its source states.",
  Time: "A time of day, optionally with a UTC offset — as precise as its source states.",
  Page: "The content of a page of a document, comprising text and linked images and an optional page view image",
  JSON: "A JSON object",
  SearchResult: "A search result with answer and sources",
  Anything: "Anything",
  Composite: "A named composition of contents",
} satisfies Record<string, string>;

/** A code the catalog knows. Derived from the catalog so the two cannot disagree. */
export type NativeConceptCode = keyof typeof NATIVE_CONCEPT_DESCRIPTIONS;

export const NATIVE_CONCEPT_CODES: ReadonlySet<string> = new Set(
  Object.keys(NATIVE_CONCEPT_DESCRIPTIONS),
);

/** Narrow an arbitrary code to the catalog, so callers cannot mint a native the catalog lacks. */
export function isNativeConceptCode(code: string): code is NativeConceptCode {
  return Object.hasOwn(NATIVE_CONCEPT_DESCRIPTIONS, code);
}

// ─── Ref parsing ─────────────────────────────────────────────────────────────

export interface ConceptRefParts {
  /** Explicit domain qualifier (`recruitment` in `recruitment.Profile`), or null for bare refs. */
  domain: string | null;
  code: string;
  /** `[]` → true (many), `[N]` → N, no suffix → null (single). */
  multiplicity: number | boolean | null;
  /** `?` → "optional", `!` → "force", no suffix → "plain". */
  presence: PresenceMarker;
}

const CONCEPT_REF_RE = /^(?:([A-Za-z0-9_][A-Za-z0-9_.]*)\.)?([A-Za-z0-9_]+)(?:\[(\d*)\])?([?!])?$/;

function presenceFromSymbol(symbol: string | undefined): PresenceMarker {
  if (symbol === "?") return "optional";
  if (symbol === "!") return "force";
  return "plain";
}

/** Parse a concept ref string into its parts. Returns null when the ref is not interpretable. */
export function parseConceptRef(raw: unknown): ConceptRefParts | null {
  if (typeof raw !== "string") return null;
  const match = CONCEPT_REF_RE.exec(raw.trim());
  if (!match) return null;
  const [, domain, code, multiplicity, presence] = match;
  return {
    domain: domain ?? null,
    code,
    multiplicity:
      multiplicity === undefined
        ? null
        : multiplicity === ""
          ? true
          : Number.parseInt(multiplicity, 10),
    presence: presenceFromSymbol(presence),
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

export function nativeConceptInfo(code: NativeConceptCode): ConceptInfo {
  return {
    code,
    domain_code: NATIVE_DOMAIN,
    description: NATIVE_CONCEPT_DESCRIPTIONS[code],
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
    return isNativeConceptCode(parts.code)
      ? nativeConceptInfo(parts.code)
      : stubConceptInfo(parts.code, NATIVE_DOMAIN);
  }
  if (parts.domain !== null && parts.domain !== currentDomain) {
    return stubConceptInfo(parts.code, parts.domain);
  }
  // Local before native. The spec inverts this ("Native concepts always take
  // priority"), but it also makes a bundle that declares a native-named concept
  // invalid outright — so this branch is only reachable on a bundle pipelex
  // rejects. Tracked in `wip/native-concept-shadowing.md`.
  const local = localConcepts[parts.code];
  if (local) return local;
  if (parts.domain === null && isNativeConceptCode(parts.code)) {
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
    presence: parts.presence,
  };
}
