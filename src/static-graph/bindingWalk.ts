// ─── The binding walk: the concept a binding step's `from` path reaches ──────
// A binding step `{ from = "invoice.total", result = "total_amount" }` stores
// the value at a path under a new name, and the concept of that value is read
// off declared structures alone, one segment at a time:
//
// | The segment names a field declared as        | The walk continues into, or the result is |
// | -------------------------------------------- | ----------------------------------------- |
// | `concept`, `concept_ref = X`                 | `X`, whose structure the next segment walks |
// | `list`, `item_type = "concept"`, `item_concept_ref = X` | `X`, crossing a list           |
// | `text`, or no `type` (a field of `choices`)  | `native.Text`, a leaf                      |
// | `number` or `integer`                        | `native.Number`, a leaf                    |
// | `boolean`                                    | `native.YesNo`, a leaf                     |
// | `date` or `datetime`                         | `native.Date`, a leaf                      |
// | `time`                                       | `native.Time`, a leaf                      |
// | `dict`                                       | `native.JSON`, a leaf                      |
// | `list` with a scalar `item_type`             | that scalar's native, a leaf, crossing a list |
//
// Crossing any list, or starting from a plural root, makes the result a list;
// a bare name keeps its root's concept and multiplicity. This mirrors the
// runtime's derivation walk over a bundle's own blueprints, so the static graph
// types a binding's result as a run graph does. It is pure and never throws:
// a path it cannot walk comes back as a reason, which the builder reports.

import type { ConceptInfo, StuffMultiplicity } from "@graph/types";
import { isPluralMultiplicity } from "@graph/types";

import {
  isNativeConceptCode,
  NATIVE_DOMAIN,
  nativeConceptFields,
  resolveConceptInfo,
} from "./conceptRefs";
import type { MergedMethodSet, StructureField } from "./types";

/** The root's concept and multiplicity, as the sequence knows them at the binding step. */
export interface BindingRoot {
  concept: ConceptInfo;
  multiplicity: StuffMultiplicity;
}

export type BindingDerivation =
  | { kind: "derived"; concept: ConceptInfo; multiplicity: StuffMultiplicity }
  | { kind: "unresolved"; reason: string };

// ─── What the walk sees of a concept ─────────────────────────────────────────

type WalkableConcept =
  | { shape: "structure"; ref: string; fields: Readonly<Record<string, StructureField>> }
  /** A leaf: a single-field native, or a concept refining one, with why. */
  | { shape: "value"; ref: string; reason: string }
  /** Nothing to walk: a structureless native, a concept declaring no structure, or one nothing resolves, with why. */
  | { shape: "no-structure"; ref: string; reason: string };

const SINGLE_FIELD_NATIVE_REASON = "holds its value in a single field";
const DESCRIBED_ONLY_REASON = "is declared with neither a structure nor refines";

/** Split a domain-qualified ref (`a.b.Code`) at its last dot. */
function splitRef(ref: string): { domain: string; code: string } {
  const dot = ref.lastIndexOf(".");
  return { domain: ref.slice(0, dot), code: ref.slice(dot + 1) };
}

/**
 * A concept ref as a structure field writes it, made domain-qualified in the
 * declaring concept's domain, as the runtime qualifies it: a native's code
 * (bare or `native.`-prefixed) names the native, a dotted ref names its
 * domain, and a bare ref the declaring domain. A dependency ref
 * (`alias->domain.Code`) is left as written, and nothing resolves it here.
 */
function qualifyFieldRef(ref: string, domain: string): string {
  if (ref.includes("->")) return ref;
  if (ref.startsWith(`${NATIVE_DOMAIN}.`)) return ref;
  if (!ref.includes("."))
    return isNativeConceptCode(ref) ? `${NATIVE_DOMAIN}.${ref}` : `${domain}.${ref}`;
  return ref;
}

function resolveWalkable(
  set: MergedMethodSet,
  ref: string,
  visited: ReadonlySet<string> = new Set(),
): WalkableConcept {
  if (ref.includes("->")) {
    return {
      shape: "no-structure",
      ref,
      reason: "belongs to a dependency, which a method's own bundles do not show",
    };
  }
  const { domain, code } = splitRef(ref);
  if (domain === NATIVE_DOMAIN) {
    // A native is walked through its pinned fields, which the catalog holds
    // beside its description, so what resolves as a native is what walks as one.
    if (!isNativeConceptCode(code)) {
      return { shape: "no-structure", ref, reason: "is not a native concept" };
    }
    const fields = nativeConceptFields(code);
    if (fields === null) {
      return { shape: "no-structure", ref, reason: "is structureless by definition" };
    }
    if (Object.keys(fields).length === 1) {
      return { shape: "value", ref, reason: SINGLE_FIELD_NATIVE_REASON };
    }
    return { shape: "structure", ref, fields };
  }
  if (visited.has(ref))
    return { shape: "no-structure", ref, reason: "refines itself through a cycle" };
  const namespace = set.domains[domain];
  const concept =
    namespace !== undefined && Object.hasOwn(namespace.concepts, code)
      ? namespace.concepts[code]
      : undefined;
  if (namespace === undefined || concept === undefined) {
    return { shape: "no-structure", ref, reason: "is not declared in this method" };
  }
  const structure = Object.hasOwn(namespace.structures, code)
    ? namespace.structures[code]
    : undefined;
  if (typeof structure === "string") {
    return {
      shape: "no-structure",
      ref,
      reason: "has a Python class for a structure, which a bundle does not show",
    };
  }
  if (structure !== undefined) {
    const fields: Record<string, StructureField> = Object.create(null) as Record<
      string,
      StructureField
    >;
    for (const [name, declared] of Object.entries(structure)) {
      fields[name] = {
        ...declared,
        conceptRef:
          declared.conceptRef === null ? null : qualifyFieldRef(declared.conceptRef, domain),
        itemConceptRef:
          declared.itemConceptRef === null
            ? null
            : qualifyFieldRef(declared.itemConceptRef, domain),
      };
    }
    return { shape: "structure", ref, fields };
  }
  if (concept.refines != null) {
    // A refinement inherits the structure it refines, or the leaf or void it refines.
    const refined = resolveWalkable(set, concept.refines, new Set([...visited, ref]));
    if (refined.shape === "structure") return { shape: "structure", ref, fields: refined.fields };
    const reason = `refines '${refined.ref}', which ${refined.reason}`;
    return refined.shape === "value"
      ? { shape: "value", ref, reason }
      : { shape: "no-structure", ref, reason };
  }
  return { shape: "no-structure", ref, reason: DESCRIBED_ONLY_REASON };
}

// ─── One field, as a step of the walk ────────────────────────────────────────

/** The native a plain field type is stored as, or null for `concept`, `list` and a type the standard lacks. */
const SCALAR_NATIVE: Readonly<Record<string, string>> = {
  text: "Text",
  number: "Number",
  integer: "Number",
  boolean: "YesNo",
  date: "Date",
  datetime: "Date",
  time: "Time",
  dict: "JSON",
};

type FieldStep =
  /** The field holds a concept's content: walk on into it, or end on it. */
  | { kind: "concept"; ref: string | null; crossesList: boolean }
  /** The field holds a plain value, stored as this native: a leaf. */
  | { kind: "leaf"; nativeCode: string; crossesList: boolean; description: string }
  /** No concept exists for what the field holds. */
  | { kind: "underivable"; crossesList: boolean; reason: string };

function fieldStep(declared: StructureField): FieldStep {
  // A field declared by its `choices` alone holds one of them, a text.
  const type = declared.type ?? "text";
  if (type === "concept") return { kind: "concept", ref: declared.conceptRef, crossesList: false };
  if (type === "list") {
    const itemType = declared.itemType;
    if (itemType === null) {
      return { kind: "underivable", crossesList: true, reason: "the list declares no item_type" };
    }
    if (itemType === "concept") {
      return { kind: "concept", ref: declared.itemConceptRef, crossesList: true };
    }
    const nativeCode = Object.hasOwn(SCALAR_NATIVE, itemType) ? SCALAR_NATIVE[itemType] : null;
    if (nativeCode === null) {
      return {
        kind: "underivable",
        crossesList: true,
        reason: `the list's item_type '${itemType}' derives no concept`,
      };
    }
    return { kind: "leaf", nativeCode, crossesList: true, description: `a list of ${itemType}` };
  }
  const nativeCode = Object.hasOwn(SCALAR_NATIVE, type) ? SCALAR_NATIVE[type] : null;
  if (nativeCode === null) {
    return {
      kind: "underivable",
      crossesList: false,
      reason: `its type '${type}' derives no concept`,
    };
  }
  return { kind: "leaf", nativeCode, crossesList: false, description: `a ${type} field` };
}

/** The `ConceptInfo` a derived ref names: a declared concept, a native, or a best-effort stub. */
function conceptInfoForRef(set: MergedMethodSet, ref: string): ConceptInfo {
  const { domain, code } = splitRef(ref);
  return resolveConceptInfo(
    { domain, code, multiplicity: null, presence: "plain" },
    domain,
    set.domains[domain]?.concepts ?? {},
  );
}

function conceptRefOf(concept: ConceptInfo): string {
  return `${concept.domain_code}.${concept.code}`;
}

// ─── The walk ────────────────────────────────────────────────────────────────

/**
 * Walk a binding step's `from` path through the structures the method's
 * bundles declare, and derive the concept and multiplicity of what the step
 * binds. `path` already follows the path grammar; `root` is what the sequence
 * holds under the path's first segment at the step.
 */
export function deriveBinding(
  set: MergedMethodSet,
  path: string,
  root: BindingRoot,
): BindingDerivation {
  const segments = path.split(".").slice(1);
  // A bare name binds a renamed copy of the whole value, concept and multiplicity unchanged.
  if (segments.length === 0) {
    return { kind: "derived", concept: root.concept, multiplicity: root.multiplicity };
  }

  let crossesAnyList = isPluralMultiplicity(root.multiplicity);
  let reachedPath = path.split(".")[0];
  let current: WalkableConcept | null = resolveWalkable(set, conceptRefOf(root.concept));
  let leafDescription: string | null = null;
  let derivedRef = conceptRefOf(root.concept);
  const fail = (reason: string): BindingDerivation => ({
    kind: "unresolved",
    reason: `cannot bind '${path}': ${reason}`,
  });

  for (const [index, segment] of segments.entries()) {
    if (leafDescription !== null) {
      return fail(
        `'${reachedPath}' is ${leafDescription}, a leaf holding a plain value, so the segment '${segment}' cannot follow it`,
      );
    }
    if (current === null) {
      return fail(
        `nothing is known of '${reachedPath}', so the segment '${segment}' cannot be walked`,
      );
    }
    if (current.shape === "value") {
      return fail(
        `'${reachedPath}' holds a '${current.ref}', which ${current.reason}, so it is a leaf and the segment '${segment}' cannot follow it`,
      );
    }
    if (current.shape === "no-structure") {
      return fail(
        `'${reachedPath}' holds a '${current.ref}', which ${current.reason}, so the segment '${segment}' has no structure to walk`,
      );
    }
    const declared = Object.hasOwn(current.fields, segment) ? current.fields[segment] : undefined;
    if (declared === undefined) {
      const names = Object.keys(current.fields);
      return fail(
        `'${reachedPath}' holds a '${current.ref}', which has no field '${segment}'` +
          (names.length > 0
            ? ` (its fields are ${names.map((name) => `'${name}'`).join(", ")})`
            : ""),
      );
    }

    reachedPath = `${reachedPath}.${segment}`;
    const isLast = index === segments.length - 1;
    const step = fieldStep(declared);
    if (step.crossesList) crossesAnyList = true;
    switch (step.kind) {
      case "underivable":
        return fail(`'${reachedPath}' derives no concept, since ${step.reason}`);
      case "concept":
        if (step.ref === null) return fail(`the concept field '${reachedPath}' names no concept`);
        derivedRef = step.ref;
        current = isLast ? null : resolveWalkable(set, step.ref);
        break;
      case "leaf":
        derivedRef = `${NATIVE_DOMAIN}.${step.nativeCode}`;
        leafDescription = step.description;
        current = null;
        break;
    }
  }

  return {
    kind: "derived",
    concept: conceptInfoForRef(set, derivedRef),
    multiplicity: crossesAnyList ? true : null,
  };
}
