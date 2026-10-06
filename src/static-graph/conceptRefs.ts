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

import type { StructureField } from "./types";
import { isPlainObject } from "./types";

export const NATIVE_DOMAIN = "native";

// ─── The native concept catalog ──────────────────────────────────────────────

const field = (type: string): StructureField => ({
  type,
  conceptRef: null,
  itemType: null,
  itemConceptRef: null,
});
const conceptField = (conceptRef: string): StructureField => ({
  type: "concept",
  conceptRef,
  itemType: null,
  itemConceptRef: null,
});
const conceptListField = (itemConceptRef: string): StructureField => ({
  type: "list",
  conceptRef: null,
  itemType: "concept",
  itemConceptRef,
});

/** What the catalog holds of one native. */
interface NativeConceptDefinition {
  description: string;
  /** The native it refines, as the runtime records it: `Markdown` refines `Text`. */
  refines?: string;
  /**
   * Its pinned fields, as the binding walk reads them (each field's type and the
   * concept it names), or null for a native structureless by definition.
   */
  fields: Readonly<Record<string, StructureField>> | null;
}

/**
 * The native concept catalog, the one source of what this module knows of a
 * native: its code, description and refinement, which resolve a ref, and its
 * pinned fields, which the binding walk reads. Copied from the MTHDS standard's
 * pinned set — `docs/spec/native-concepts.md` in the sibling `mthds/` repo —
 * which pipelex mirrors in `pipelex/core/concepts/native/concept_native.py`
 * (`NativeConceptCode`) and `native/pinned_blueprints.py`, together with
 * `Markdown`, which pipelex defines ahead of the standard. Structure class
 * names follow the runtime's `<Code>Content` rule. Keep this table in
 * `NativeConceptCode`'s order; a code missing here silently degrades to a stub.
 * See `docs/static-graph.md`.
 */
const NATIVE_CONCEPTS = {
  Dynamic: { description: "A dynamic concept", fields: null },
  Text: { description: "A text", fields: { text: field("text") } },
  Markdown: {
    description: "A text written in Markdown",
    refines: "native.Text",
    fields: { text: field("text") },
  },
  Image: {
    description: "An image",
    fields: {
      url: field("text"),
      public_url: field("text"),
      source_prompt: field("text"),
      source_negative_prompt: field("text"),
      caption: field("text"),
      mime_type: field("text"),
      width: field("integer"),
      height: field("integer"),
      filename: field("text"),
    },
  },
  Document: {
    description: "A document",
    fields: {
      url: field("text"),
      public_url: field("text"),
      mime_type: field("text"),
      filename: field("text"),
      title: field("text"),
      snippet: field("text"),
    },
  },
  Html: {
    description: "HTML content",
    fields: { inner_html: field("text"), css_class: field("text") },
  },
  TextAndImages: {
    description: "A text and an image",
    fields: {
      text: conceptField("native.Text"),
      images: conceptListField("native.Image"),
      raw_html: field("text"),
    },
  },
  Number: { description: "A number", fields: { number: field("number") } },
  YesNo: {
    description: "The answer to a yes/no question",
    fields: { yes_no: field("boolean"), probability: field("number") },
  },
  Choice: {
    description: "One option picked out of a declared set",
    fields: { choice: field("text"), confidence: field("number"), probabilities: field("dict") },
  },
  Rating: {
    description: "A position on an ordered scale of described levels",
    fields: {
      level: field("integer"),
      confidence: field("number"),
      probabilities: field("dict"),
      position: field("number"),
    },
  },
  Date: {
    description:
      "A calendar date, optionally with a time of day — as precise as its source states.",
    fields: { date: field("date"), time: field("time") },
  },
  Time: {
    description: "A time of day, optionally with a UTC offset — as precise as its source states.",
    fields: { time: field("time") },
  },
  Page: {
    description:
      "The content of a page of a document, comprising text and linked images and an optional page view image",
    fields: {
      text_and_images: conceptField("native.TextAndImages"),
      page_view: conceptField("native.Image"),
    },
  },
  JSON: { description: "A JSON object", fields: { json_obj: field("dict") } },
  SearchResult: {
    description: "A search result with answer and sources",
    fields: { answer: field("text"), sources: conceptListField("native.Document") },
  },
  Anything: { description: "Anything", fields: null },
  Composite: { description: "A named composition of contents", fields: null },
} satisfies Record<string, NativeConceptDefinition>;

/** A code the catalog knows. Derived from the catalog so the two cannot disagree. */
export type NativeConceptCode = keyof typeof NATIVE_CONCEPTS;

export const NATIVE_CONCEPT_CODES: ReadonlySet<string> = new Set(Object.keys(NATIVE_CONCEPTS));

/** Narrow an arbitrary code to the catalog, so callers cannot mint a native the catalog lacks. */
export function isNativeConceptCode(code: string): code is NativeConceptCode {
  return Object.hasOwn(NATIVE_CONCEPTS, code);
}

/** A native's pinned fields, or null for a native structureless by definition. */
export function nativeConceptFields(
  code: NativeConceptCode,
): Readonly<Record<string, StructureField>> | null {
  const definition: NativeConceptDefinition = NATIVE_CONCEPTS[code];
  return definition.fields;
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

// ─── Input slot declarations ─────────────────────────────────────────────────
// A value in a pipe's `inputs` table has two forms, and the standard states
// them equivalent (`docs/spec/mthds-format.md`, "Input slot declarations"):
// the string form `x = "S"`, and the expanded form `x = { concept = "S",
// hints = { … } }`, whose `concept` carries exactly the same grammar. The
// expanded form is inputs-only — an `output` is always a string — so this
// layer sits beside `parseConceptRef` rather than inside it.

/**
 * The keys the expanded slot table defines in this version of the standard.
 * The form is deliberately closed: the spec says an unknown key MUST be
 * rejected, which pipelex implements as `extra="forbid"` on its
 * `InputSlotBlueprint`. This module renders rather than adjudicates, so it
 * reports the key and reads past it — see `parseInputSlot`.
 */
const INPUT_SLOT_KEYS: ReadonlySet<string> = new Set(["concept", "hints"]);

export interface InputSlotParts {
  /** The slot's concept ref parts, or null when the slot is not interpretable. */
  ref: ConceptRefParts | null;
  /**
   * True when an expanded slot table declares no `concept` at all. The key is
   * required, so there is no ref for a diagnostic to be about — the caller says
   * the key is missing rather than blaming a ref the author never wrote.
   */
  missingConcept: boolean;
  /** Keys of an expanded slot table this version of the standard does not define. */
  unknownKeys: string[];
}

/**
 * Read one `inputs` value, whichever form authored it.
 *
 * `hints` is parsed as a known key and then dropped: intent hints are
 * presentational, and the standard routes them to renderers through the
 * input-form descriptor, not the GraphSpec (see `docs/static-graph.md`).
 * Their shape is not checked here for the same reason — a malformed `hints`
 * table is content this module never reads, so it is the validator's to
 * report, not the renderer's. An unknown key is different: it may well be
 * where a future standard puts something that changes the slot, so it is
 * named rather than passed over.
 */
export function parseInputSlot(raw: unknown): InputSlotParts {
  if (!isPlainObject(raw)) {
    return { ref: parseConceptRef(raw), missingConcept: false, unknownKeys: [] };
  }
  return {
    ref: parseConceptRef(raw.concept),
    missingConcept: raw.concept === undefined,
    unknownKeys: Object.keys(raw).filter((key) => !INPUT_SLOT_KEYS.has(key)),
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
  const definition: NativeConceptDefinition = NATIVE_CONCEPTS[code];
  return {
    code,
    domain_code: NATIVE_DOMAIN,
    description: definition.description,
    structure_class_name: `${code}Content`,
    refines: definition.refines ?? null,
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
  // rejects. The diagnostic that would warn the author is L-260929-79b6e6.
  // `hasOwn`, not a truthiness test: `localConcepts` is a caller-supplied
  // record, and on a plain `{}` a code of `toString` or `constructor` reads a
  // built-in off `Object.prototype` and returns a function as the concept.
  if (Object.hasOwn(localConcepts, parts.code)) return localConcepts[parts.code];
  if (parts.domain === null && isNativeConceptCode(parts.code)) {
    return nativeConceptInfo(parts.code);
  }
  return stubConceptInfo(parts.code, currentDomain);
}

/** Build a `StuffSpecInfo` from already-parsed ref parts. */
function stuffSpecFromParts(
  parts: ConceptRefParts,
  currentDomain: string,
  localConcepts: Record<string, ConceptInfo>,
): StuffSpecInfo {
  return {
    concept: resolveConceptInfo(parts, currentDomain, localConcepts),
    multiplicity: parts.multiplicity,
    presence: parts.presence,
  };
}

/** Resolve a raw concept ref string straight to a `StuffSpecInfo`, or null when unparseable. */
export function resolveStuffSpec(
  raw: unknown,
  currentDomain: string,
  localConcepts: Record<string, ConceptInfo>,
): StuffSpecInfo | null {
  const parts = parseConceptRef(raw);
  return parts === null ? null : stuffSpecFromParts(parts, currentDomain, localConcepts);
}

export interface ResolvedInputSlot {
  /** The resolved slot, or null when its concept ref is not interpretable. */
  spec: StuffSpecInfo | null;
  /** True when an expanded slot table declares no `concept` at all — see {@link InputSlotParts}. */
  missingConcept: boolean;
  /** Keys of an expanded slot table this version of the standard does not define. */
  unknownKeys: string[];
}

/**
 * Resolve one `inputs` value to a `StuffSpecInfo`, accepting either slot form.
 * The `StuffSpecInfo` is identical whichever form authored it, which is what
 * the standard means by calling `x = "S"` and `x = { concept = "S" }` the same
 * slot.
 */
export function resolveInputSlot(
  raw: unknown,
  currentDomain: string,
  localConcepts: Record<string, ConceptInfo>,
): ResolvedInputSlot {
  const { ref, missingConcept, unknownKeys } = parseInputSlot(raw);
  return {
    spec: ref === null ? null : stuffSpecFromParts(ref, currentDomain, localConcepts),
    missingConcept,
    unknownKeys,
  };
}
