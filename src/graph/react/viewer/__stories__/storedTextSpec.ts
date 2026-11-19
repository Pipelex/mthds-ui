import type { ConceptInfo, GraphSpec } from "@graph/types";

/**
 * The members pipelex 0.106 and later write into a native text's schema beside
 * its `text`, for the form in which the text travels as a reference to where it
 * is stored. Copied from `TextContent.model_json_schema()` as pipelex 0.110
 * prints it; a concept refining `Text` inherits them.
 */
const STORED_TEXT_REFERENCE_PROPERTIES: Readonly<Record<string, Record<string, unknown>>> = {
  url: {
    anyOf: [{ type: "string" }, { type: "null" }],
    default: null,
    description: "The URL of the stored text: a storage URI, an HTTP(S) URL, or a base64 data URL",
    title: "Url",
  },
  size: {
    anyOf: [{ type: "integer" }, { type: "null" }],
    default: null,
    description: "The length of the stored text, in bytes as stored",
    title: "Size",
  },
  mime_type: {
    anyOf: [{ type: "string" }, { type: "null" }],
    default: null,
    description: "The MIME type of the stored text: text/plain or text/markdown",
    title: "Mime Type",
  },
  preview: {
    anyOf: [{ type: "string" }, { type: "null" }],
    default: null,
    description: "The first few hundred characters of the stored text, always its true start",
    title: "Preview",
  },
};

function isTextConcept(concept: ConceptInfo): boolean {
  return (
    (concept.domain_code === "native" && concept.code === "Text") ||
    concept.refines === "native.Text"
  );
}

/**
 * A run's spec as pipelex 0.106 and later record it: every native `Text` and
 * every concept refining it carries the stored-reference members beside its
 * value. The generated corpus fixtures predate 0.106, so a story or a test
 * showing what the detail panel makes of today's schema derives it from one of
 * them here rather than from a hand-written spec.
 */
export function withStoredTextMembers(spec: GraphSpec): GraphSpec {
  if (!spec.concept_registry) return spec;
  const registry: Record<string, ConceptInfo> = {};
  for (const [ref, concept] of Object.entries(spec.concept_registry)) {
    const properties = concept.json_schema?.properties as Record<string, unknown> | undefined;
    registry[ref] =
      isTextConcept(concept) && properties
        ? {
            ...concept,
            json_schema: {
              ...concept.json_schema,
              properties: { ...properties, ...STORED_TEXT_REFERENCE_PROPERTIES },
            },
          }
        : concept;
  }
  return { ...spec, concept_registry: registry };
}
