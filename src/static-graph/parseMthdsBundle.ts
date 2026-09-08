// ─── parseMthdsBundle: `.mthds` TOML text → ParsedBundle ─────────────────────
// The single entry point for turning one raw `.mthds` string into a
// blueprint-shaped bundle. Lenient in the `validateGraphSpec` house style but
// inverted: instead of failing loudly on contract violations, it tolerates
// missing or partial sections, skips what it cannot interpret, and records
// non-fatal diagnostics — the whole point is rendering methods while they are
// being written. It never throws on content; even unparseable TOML becomes an
// `error` diagnostic with an empty bundle.

import { parse as parseToml } from "smol-toml";

import type { ConceptInfo, PipeBlueprintUnion } from "@graph/types";

import {
  isNativeConceptCode,
  NATIVE_DOMAIN,
  parseConceptRef,
  qualifiedStructureClassName,
} from "./conceptRefs";
import { normalizePipe } from "./normalizePipe";
import type { Diagnostic, ParseMthdsBundleResult, ParsedBundle } from "./types";
import { authoredRecord, isPlainObject, strOrNull, UNKNOWN_DOMAIN } from "./types";

// ─── Concept structure → JSON schema (display-only, best-effort) ─────────────

const FIELD_TYPE_TO_JSON: Record<string, Record<string, unknown>> = {
  text: { type: "string" },
  integer: { type: "integer" },
  number: { type: "number" },
  boolean: { type: "boolean" },
  date: { type: "string", format: "date" },
  datetime: { type: "string", format: "date-time" },
  time: { type: "string", format: "time" },
  list: { type: "array" },
  dict: { type: "object" },
  concept: { type: "object" },
};

function fieldSchema(spec: Record<string, unknown>): Record<string, unknown> {
  const typeName = strOrNull(spec.type) ?? "text";
  const schema: Record<string, unknown> = {
    ...(FIELD_TYPE_TO_JSON[typeName] ?? { type: "string" }),
  };
  const description = strOrNull(spec.description);
  if (description !== null) schema.description = description;
  if (typeName === "list") {
    const itemType = strOrNull(spec.item_type);
    schema.items = itemType !== null ? { ...(FIELD_TYPE_TO_JSON[itemType] ?? {}) } : {};
  }
  if (Array.isArray(spec.choices)) {
    schema.enum = spec.choices.filter((choice) => typeof choice === "string");
  }
  if (spec.default_value !== undefined && spec.default_value !== null) {
    schema.default = spec.default_value;
  }
  return schema;
}

/**
 * Derive a lightweight JSON schema from a `[concept.X.structure]` table so
 * concept detail panels have fields to show. Deliberately simpler than the
 * pydantic-generated schema the runtime emits (no anyOf-null wrapping, no
 * per-field titles) — this is presentation data, not a contract.
 */
function deriveJsonSchema(
  structure: unknown,
  title: string,
  description: string,
): Record<string, unknown> | undefined {
  if (!isPlainObject(structure)) return undefined;
  const properties = authoredRecord<unknown>();
  const required: string[] = [];
  for (const [name, spec] of Object.entries(structure)) {
    if (typeof spec === "string") {
      properties[name] = { type: "string", description: spec };
      continue;
    }
    if (!isPlainObject(spec)) continue;
    properties[name] = fieldSchema(spec);
    if (spec.required === true) required.push(name);
  }
  return {
    title,
    type: "object",
    description,
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

// ─── Concept table parsing ───────────────────────────────────────────────────

/** Qualify a `refines` ref the way the runtime registry does (`Text` → `native.Text`). */
function qualifyRefines(
  raw: unknown,
  domain: string,
  declaredCodes: ReadonlySet<string>,
  conceptCode: string,
  diagnostics: Diagnostic[],
): string | null {
  const parts = parseConceptRef(raw);
  if (parts === null) return null;
  // `refines` names a concept; multiplicity and presence are properties of an io
  // slot that holds values, so a `refines` carrying either is malformed. Dropping
  // the suffix silently would turn `refines = "Text?"` into a plain `native.Text`
  // that reads back as if the author had written it that way.
  if (parts.multiplicity !== null || parts.presence !== "plain") {
    diagnostics.push({
      severity: "warning",
      code: "invalid-concept-ref",
      message:
        `concept "${conceptCode}": \`refines\` names a concept, so it takes no multiplicity ` +
        `or presence suffix — ignored`,
      path: `concept.${conceptCode}.refines`,
    });
    return null;
  }
  if (parts.domain !== null) return `${parts.domain}.${parts.code}`;
  if (!declaredCodes.has(parts.code) && isNativeConceptCode(parts.code)) {
    return `${NATIVE_DOMAIN}.${parts.code}`;
  }
  return `${domain}.${parts.code}`;
}

function parseConcepts(
  raw: unknown,
  domain: string,
  diagnostics: Diagnostic[],
): Record<string, ConceptInfo> {
  const concepts = authoredRecord<ConceptInfo>();
  if (raw === undefined) return concepts;
  if (!isPlainObject(raw)) {
    diagnostics.push({
      severity: "warning",
      code: "invalid-bundle-shape",
      message: "concept section is not a table — ignored",
      path: "concept",
    });
    return concepts;
  }
  const declaredCodes: ReadonlySet<string> = new Set(Object.keys(raw));
  for (const [code, entry] of Object.entries(raw)) {
    if (typeof entry === "string") {
      // Shorthand form: `Concept = "description"`.
      concepts[code] = {
        code,
        domain_code: domain,
        description: entry,
        structure_class_name: qualifiedStructureClassName(domain, code),
        refines: null,
      };
      continue;
    }
    if (!isPlainObject(entry)) {
      diagnostics.push({
        severity: "warning",
        code: "invalid-concept-entry",
        message: `concept "${code}" is neither a table nor a description string — skipped`,
        path: `concept.${code}`,
      });
      continue;
    }
    const description = strOrNull(entry.description) ?? "";
    // A `structure = "ClassName"` string names an existing structure class;
    // the table form gets the runtime's `<domain>__<Code>` synthetic name.
    const structureClassName =
      strOrNull(entry.structure) ?? qualifiedStructureClassName(domain, code);
    concepts[code] = {
      code,
      domain_code: domain,
      description,
      structure_class_name: structureClassName,
      refines: qualifyRefines(entry.refines, domain, declaredCodes, code, diagnostics),
      json_schema: deriveJsonSchema(entry.structure, structureClassName, description),
    };
  }
  return concepts;
}

// ─── Bundle parsing ──────────────────────────────────────────────────────────

function emptyBundle(): ParsedBundle {
  return {
    domain: null,
    description: null,
    main_pipe: null,
    system_prompt: null,
    concepts: authoredRecord<ConceptInfo>(),
    pipes: authoredRecord<PipeBlueprintUnion>(),
  };
}

/**
 * Parse one `.mthds` TOML string. Returns whatever could be interpreted plus
 * the diagnostics collected along the way — never throws.
 */
export function parseMthdsBundle(tomlText: string): ParseMthdsBundleResult {
  const diagnostics: Diagnostic[] = [];
  let root: Record<string, unknown>;
  try {
    root = parseToml(tomlText);
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: "toml-parse-error",
      message: error instanceof Error ? error.message : String(error),
    });
    return { bundle: emptyBundle(), diagnostics };
  }

  const bundle = emptyBundle();
  bundle.domain = strOrNull(root.domain);
  bundle.description = strOrNull(root.description);
  bundle.main_pipe = strOrNull(root.main_pipe);
  bundle.system_prompt = strOrNull(root.system_prompt);
  if (bundle.domain === null) {
    diagnostics.push({
      severity: "warning",
      code: "missing-domain",
      message: `bundle declares no domain — using "${UNKNOWN_DOMAIN}"`,
      path: "domain",
    });
  }
  const domain = bundle.domain ?? UNKNOWN_DOMAIN;

  bundle.concepts = parseConcepts(root.concept, domain, diagnostics);

  const pipeTable = root.pipe;
  if (pipeTable !== undefined) {
    if (!isPlainObject(pipeTable)) {
      diagnostics.push({
        severity: "warning",
        code: "invalid-bundle-shape",
        message: "pipe section is not a table — ignored",
        path: "pipe",
      });
    } else {
      const ctx = { domain, concepts: bundle.concepts, diagnostics };
      for (const [code, entry] of Object.entries(pipeTable)) {
        if (!isPlainObject(entry)) {
          diagnostics.push({
            severity: "error",
            code: "invalid-pipe-entry",
            message: `pipe "${code}" is not a table — skipped`,
            path: `pipe.${code}`,
          });
          continue;
        }
        const pipe: PipeBlueprintUnion | null = normalizePipe(code, entry, ctx);
        if (pipe !== null) bundle.pipes[code] = pipe;
      }
    }
  }

  // Stamp every diagnostic with the file's namespace domain — the declaring-file
  // identity hosts need to qualify `pipe.<code>` locators into full pipe refs.
  // (The toml-parse-error path returns above, before any domain exists.)
  for (const diagnostic of diagnostics) {
    diagnostic.domain_code ??= domain;
  }

  return { bundle, diagnostics };
}
