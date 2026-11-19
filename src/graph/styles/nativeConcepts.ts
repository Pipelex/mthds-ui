// What the styles know of the concepts the standard defines, the natives, as a
// spec's concept registry records them. Internal to the styles: the module is
// not re-exported from the graph entry.
//
// Pure and React-free.

import type { ConceptInfo, GraphSpec } from "@graph/types";
import { resolveConceptRef } from "@graph/graphAnalysis";
import { stripDomain } from "./humanize";

/** The domain of the concepts the standard defines, as a spec's concept registry records them. */
export const NATIVE_DOMAIN = "native";

/**
 * The natives whose value may live in storage: a text (and a Markdown text,
 * which refines it), an HTML fragment and a JSON object. Such a value travels
 * either inline or as a reference to where it is stored, so its schema carries
 * both forms side by side.
 */
const STORED_VALUE_NATIVES: ReadonlySet<string> = new Set(["Text", "Markdown", "Html", "JSON"]);

/**
 * The members of a stored-value native's referenced form: where the value is
 * stored and three facts describing it without reading it. They say how the
 * runtime carries the value, never what the value is.
 */
export const STORED_VALUE_REFERENCE_MEMBERS: ReadonlySet<string> = new Set([
  "url",
  "size",
  "mime_type",
  "preview",
]);

/**
 * Whether a concept is a native whose value may live in storage (`Text`,
 * `Markdown`, `Html`, `JSON`), or refines one through any chain of refinements,
 * as a method's `Report` refining `Text` does. A concept with a structure of its
 * own is never one: the standard lets a concept refine or declare a structure,
 * not both, so a method's own field called `url` is never mistaken for a
 * stored value's reference.
 */
export function isStoredValueConcept(graphspec: GraphSpec, concept: ConceptInfo): boolean {
  const seen = new Set<ConceptInfo>();
  let current: ConceptInfo | undefined = concept;
  while (current && !seen.has(current)) {
    seen.add(current);
    if (current.domain_code === NATIVE_DOMAIN) return STORED_VALUE_NATIVES.has(current.code);
    const parent = current.refines;
    if (!parent) return false;
    const resolved = resolveConceptRef(graphspec, parent);
    if (!resolved) {
      // The registry lists only the concepts the run met, so a refined native
      // may be missing from it: its ref still names it.
      return (
        parent.startsWith(`${NATIVE_DOMAIN}.`) && STORED_VALUE_NATIVES.has(stripDomain(parent))
      );
    }
    current = resolved;
  }
  return false;
}
