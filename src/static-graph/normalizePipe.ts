// ─── Pipe normalization: authored TOML shape → registry blueprint shape ─────
// The authoring surface (mthds_schema.json, checked in under data/schema/)
// and the runtime-serialized registry shape (`PipeBlueprintUnion` in
// `@graph/types`) name things differently: `steps` vs `sequential_sub_pipes`,
// `model` vs `llm_choices`, `prompt` vs `prompt_blueprint`, … This module maps
// the former to the latter, leniently: uninterpretable pieces are skipped with
// a diagnostic, and a pipe is dropped entirely only when it names no usable
// `type` and is not a signature (see `resolvePipeTypeTag`).

import type {
  ConceptInfo,
  PipeBlueprintUnion,
  PipeComposeConstructBlueprint,
  PipeComposeConstructField,
  PipeType,
  StuffSpecInfo,
  SubPipeSpec,
  TemplateBlueprint,
} from "@graph/types";
import { KNOWN_PIPE_TYPES } from "@graph/types";

import {
  NATIVE_DOMAIN,
  nativeConceptInfo,
  resolveInputSlot,
  resolveStuffSpec,
} from "./conceptRefs";
import type { Diagnostic } from "./types";
import { boolOrNull, intOrNull, isPlainObject, strOrNull } from "./types";

export interface NormalizePipeContext {
  domain: string;
  /** The bundle's declared concepts, keyed by bare code. */
  concepts: Record<string, ConceptInfo>;
  diagnostics: Diagnostic[];
}

// ─── Small shared builders ───────────────────────────────────────────────────

function makeTemplate(template: string, category: string): TemplateBlueprint {
  return { template, templating_style: null, category, extra_context: null };
}

/**
 * Extract a display string from a model choice, which the authoring surface
 * allows as a plain handle (`"gpt-5"`), an inline setting (`{ model = … }`),
 * or a model reference (`{ name = … }`).
 */
function modelToString(value: unknown): string | null {
  if (typeof value === "string") return strOrNull(value);
  if (isPlainObject(value)) {
    return strOrNull(value.model) ?? strOrNull(value.raw) ?? strOrNull(value.name);
  }
  return null;
}

function stringArrayOrNull(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is string => typeof item === "string");
}

// ─── IO normalization ────────────────────────────────────────────────────────

function normalizeInputs(
  raw: unknown,
  pipeCode: string,
  ctx: NormalizePipeContext,
): Record<string, StuffSpecInfo> {
  const inputs: Record<string, StuffSpecInfo> = {};
  if (raw === undefined || raw === null) return inputs;
  if (!isPlainObject(raw)) {
    ctx.diagnostics.push({
      severity: "warning",
      code: "invalid-pipe-entry",
      message: `pipe "${pipeCode}": inputs is not a table — ignored`,
      path: `pipe.${pipeCode}.inputs`,
    });
    return inputs;
  }
  for (const [name, slot] of Object.entries(raw)) {
    const { spec, unknownKeys } = resolveInputSlot(slot, ctx.domain, ctx.concepts);
    if (unknownKeys.length > 0) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unknown-input-slot-key",
        message:
          `pipe "${pipeCode}": input "${name}" declares ${unknownKeys.map((key) => `"${key}"`).join(", ")}, ` +
          "which the input slot form does not define — ignored here, rejected by the runtime",
        path: `pipe.${pipeCode}.inputs.${name}`,
      });
    }
    if (spec === null) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "invalid-concept-ref",
        message: `pipe "${pipeCode}": input "${name}" has an uninterpretable concept ref — skipped`,
        path: `pipe.${pipeCode}.inputs.${name}`,
      });
      continue;
    }
    inputs[name] = spec;
  }
  return inputs;
}

function normalizeOutput(raw: unknown, pipeCode: string, ctx: NormalizePipeContext): StuffSpecInfo {
  const spec = resolveStuffSpec(raw, ctx.domain, ctx.concepts);
  if (spec !== null) return spec;
  ctx.diagnostics.push({
    severity: "warning",
    code: "missing-pipe-output",
    message: `pipe "${pipeCode}": missing or uninterpretable output — assuming native.Anything`,
    path: `pipe.${pipeCode}.output`,
  });
  return { concept: nativeConceptInfo("Anything"), multiplicity: null, presence: "plain" };
}

// ─── Sub-pipe normalization (sequence steps, parallel branches) ──────────────

function normalizeSubPipe(
  raw: unknown,
  pipeCode: string,
  path: string,
  ctx: NormalizePipeContext,
): SubPipeSpec | null {
  if (!isPlainObject(raw) || strOrNull(raw.pipe) === null) {
    ctx.diagnostics.push({
      severity: "warning",
      code: "invalid-sub-pipe",
      message: `pipe "${pipeCode}": sub-pipe entry without a "pipe" ref — skipped`,
      path,
    });
    return null;
  }
  const batchOver = strOrNull(raw.batch_over);
  const batchAs = strOrNull(raw.batch_as);
  let batchParams: SubPipeSpec["batch_params"] = null;
  if (batchOver !== null && batchAs !== null) {
    batchParams = { input_list_stuff_name: batchOver, input_item_stuff_name: batchAs };
  } else if (batchOver !== null || batchAs !== null) {
    ctx.diagnostics.push({
      severity: "warning",
      code: "incomplete-batch-spec",
      message:
        `pipe "${pipeCode}": sub-pipe "${raw.pipe as string}" sets only one of ` +
        `batch_over/batch_as — batching ignored`,
      path,
    });
  }
  // Mirrors the runtime SubPipeFactory: explicit nb_output wins, then
  // multiple_output, and a batched step is implicitly multiple.
  let outputMultiplicity: SubPipeSpec["output_multiplicity"] =
    intOrNull(raw.nb_output) ?? (raw.multiple_output === true ? true : null);
  if (batchParams !== null && outputMultiplicity === null) outputMultiplicity = true;
  return {
    pipe_code: raw.pipe as string,
    output_name: strOrNull(raw.result),
    output_multiplicity: outputMultiplicity,
    batch_params: batchParams,
  };
}

function normalizeSubPipeList(
  raw: unknown,
  pipeCode: string,
  key: string,
  ctx: NormalizePipeContext,
): SubPipeSpec[] {
  if (!Array.isArray(raw)) {
    if (raw !== undefined) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "invalid-pipe-entry",
        message: `pipe "${pipeCode}": ${key} is not an array — treated as empty`,
        path: `pipe.${pipeCode}.${key}`,
      });
    }
    return [];
  }
  return raw
    .map((entry, index) =>
      normalizeSubPipe(entry, pipeCode, `pipe.${pipeCode}.${key}[${index}]`, ctx),
    )
    .filter((entry): entry is SubPipeSpec => entry !== null);
}

// ─── Compose construct normalization ─────────────────────────────────────────

function normalizeConstructField(value: unknown): PipeComposeConstructField | null {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    Array.isArray(value)
  ) {
    return { method: "fixed", fixed_value: value };
  }
  if (isPlainObject(value)) {
    if (typeof value.from === "string") {
      return {
        method: "from_var",
        from_path: value.from,
        list_to_dict_keyed_by: strOrNull(value.list_to_dict_keyed_by),
      };
    }
    if (typeof value.template === "string") {
      return { method: "template", template: value.template };
    }
    const nested = normalizeConstruct(value);
    if (nested !== null) return { method: "nested", nested };
  }
  return null;
}

function normalizeConstruct(raw: unknown): PipeComposeConstructBlueprint | null {
  if (!isPlainObject(raw)) return null;
  const fields: Record<string, PipeComposeConstructField> = {};
  for (const [name, value] of Object.entries(raw)) {
    const field = normalizeConstructField(value);
    if (field !== null) fields[name] = field;
  }
  return Object.keys(fields).length > 0 ? { fields } : null;
}

// ─── The signature contract: `type` on two different surfaces ────────────────
//
// `KNOWN_PIPE_TYPES` serves two masters, and pipelex 0.41 made them diverge:
//
//   - GraphSpec `pipe_type` / the `pipe_registry` dump — `PipeSignature` IS a
//     member. The runtime `PipeSignature.type` serializes normally, so a
//     registry entry does carry `type: "PipeSignature"`. `validateGraphSpec`
//     checks against that set and must keep accepting it.
//   - Authored `.mthds` — `PipeSignature` is NOT a member. `PipeSignatureBlueprint`
//     sets `exclude=True` on its tag: a signature has no `type` in `.mthds`,
//     because *omitting the type IS the signature*. It is the sole definition in
//     `data/schema/mthds_schema.json` with no `type` property, which is exactly
//     what discriminates it in the bundle-level `oneOf`.
//
// Only this module reads the authored surface, so the split lives here. Mirrors
// `normalize_typeless_signature_section` in pipelex's `pipe_blueprint.py`.

/**
 * The only keys a typeless section may declare — `PipeSignatureBlueprint.properties`
 * in `data/schema/mthds_schema.json`. Anything else means the author started an
 * implementation and simply has not named its `type` yet.
 */
const SIGNATURE_ONLY_KEYS: ReadonlySet<string> = new Set([
  "description",
  "inputs",
  "output",
  "signature_for",
]);

/**
 * Resolve the pipe class from the authored section, reconciling both spellings
 * of a signature. Returns null (with a diagnostic) when the section names no
 * usable class.
 */
function resolvePipeTypeTag(
  code: string,
  raw: Record<string, unknown>,
  ctx: NormalizePipeContext,
): PipeType | null {
  const typeValue = raw.type;

  if (typeValue === undefined) {
    // A typeless section is a signature — but only if it declares nothing
    // beyond the contract, and `output` is present (the schema requires it).
    // Everything else keeps the plain unknown-type error: the schema rejects it too.
    const isSignature =
      raw.output !== undefined && Object.keys(raw).every((key) => SIGNATURE_ONLY_KEYS.has(key));
    if (isSignature) return "PipeSignature";
  } else if (typeValue === "PipeSignature") {
    // Retired in 0.41. Tolerated with a warning rather than dropped: erroring
    // would delete the pipe from the bundle — and with it the whole calling
    // step — which is the exact hole the typeless branch above exists to close.
    ctx.diagnostics.push({
      severity: "warning",
      code: "retired-signature-tag",
      message:
        `pipe "${code}": \`type = "PipeSignature"\` is no longer a pipe type — delete the ` +
        "`type` line. A pipe with no `type` and no implementation is a signature (contract only).",
      path: `pipe.${code}.type`,
    });
    return "PipeSignature";
  }

  if (typeof typeValue === "string" && KNOWN_PIPE_TYPES.has(typeValue)) {
    return typeValue as PipeType;
  }

  ctx.diagnostics.push({
    severity: "error",
    code: "unknown-pipe-type",
    message: `pipe "${code}": unknown pipe type ${JSON.stringify(typeValue)} — pipe skipped`,
    path: `pipe.${code}.type`,
  });
  return null;
}

// ─── Per-type normalization ──────────────────────────────────────────────────

/**
 * Normalize one `[pipe.<code>]` table to its registry blueprint shape.
 * Returns null (with a diagnostic) only when the section names no usable pipe
 * class and is not a signature — everything else degrades field-by-field.
 */
export function normalizePipe(
  code: string,
  raw: Record<string, unknown>,
  ctx: NormalizePipeContext,
): PipeBlueprintUnion | null {
  const typeValue = resolvePipeTypeTag(code, raw, ctx);
  if (typeValue === null) return null;
  const type = typeValue;
  const base = {
    code,
    domain_code: ctx.domain,
    description: strOrNull(raw.description) ?? "",
    inputs: normalizeInputs(raw.inputs, code, ctx),
    output: normalizeOutput(raw.output, code, ctx),
  };

  switch (type) {
    case "PipeSequence":
      return {
        ...base,
        type,
        pipe_category: "PipeController",
        sequential_sub_pipes: normalizeSubPipeList(raw.steps, code, "steps", ctx),
      };
    case "PipeParallel":
      return {
        ...base,
        type,
        pipe_category: "PipeController",
        parallel_sub_pipes: normalizeSubPipeList(raw.branches, code, "branches", ctx),
        add_each_output: raw.add_each_output === true,
        combined_output: strOrNull(raw.combined_output),
      };
    case "PipeCondition": {
      const outcomeMap: Record<string, string> = {};
      if (isPlainObject(raw.outcomes)) {
        for (const [outcome, pipeRef] of Object.entries(raw.outcomes)) {
          if (typeof pipeRef === "string" && pipeRef.length > 0) {
            outcomeMap[outcome] = pipeRef;
          } else {
            ctx.diagnostics.push({
              severity: "warning",
              code: "invalid-pipe-entry",
              message: `pipe "${code}": outcome "${outcome}" is not a pipe ref — skipped`,
              path: `pipe.${code}.outcomes.${outcome}`,
            });
          }
        }
      }
      return {
        ...base,
        type,
        pipe_category: "PipeController",
        expression: strOrNull(raw.expression) ?? strOrNull(raw.expression_template) ?? "",
        outcome_map: outcomeMap,
        default_outcome: strOrNull(raw.default_outcome) ?? "",
        add_alias_from_expression_to: strOrNull(raw.add_alias_from_expression_to),
      };
    }
    case "PipeBatch": {
      const branchPipeCode = strOrNull(raw.branch_pipe_code);
      if (branchPipeCode === null) {
        ctx.diagnostics.push({
          severity: "warning",
          code: "invalid-pipe-entry",
          message: `pipe "${code}": PipeBatch without branch_pipe_code`,
          path: `pipe.${code}.branch_pipe_code`,
        });
      }
      return {
        ...base,
        type,
        pipe_category: "PipeController",
        branch_pipe_code: branchPipeCode ?? "",
        batch_params: {
          input_list_stuff_name: strOrNull(raw.input_list_name) ?? "",
          input_item_stuff_name: strOrNull(raw.input_item_name) ?? "",
        },
      };
    }
    case "PipeLLM": {
      const systemPrompt = strOrNull(raw.system_prompt);
      const prompt = strOrNull(raw.prompt);
      return {
        ...base,
        type,
        pipe_category: "PipeOperator",
        llm_prompt_spec: {
          system_prompt_blueprint:
            systemPrompt === null ? null : makeTemplate(systemPrompt, "llm_prompt"),
          prompt_blueprint: prompt === null ? null : makeTemplate(prompt, "llm_prompt"),
          user_image_references: null,
          user_document_references: null,
          system_image_references: null,
          system_document_references: null,
        },
        llm_choices: {
          for_text: modelToString(raw.model),
          for_object: modelToString(raw.model_to_structure),
        },
        structuring_method: strOrNull(raw.structuring_method),
        output_multiplicity: null,
      };
    }
    case "PipeStructure": {
      const inputNames = Object.keys(base.inputs);
      const llmChoice = isPlainObject(raw.model) ? raw.model : strOrNull(raw.model);
      return {
        ...base,
        type,
        pipe_category: "PipeOperator",
        llm_choice: llmChoice,
        text_input_name: inputNames[0] ?? "text",
        output_multiplicity: null,
      };
    }
    case "PipeExtract": {
      // Mirrors the runtime PipeExtractFactory: the (single) input is either
      // image-like or document-like, and exactly one of the two stuff names is
      // set. Statically, "compatible with native.Image" approximates to the
      // concept being Image or refining it; anything else counts as a document.
      const isImageLike = (spec: StuffSpecInfo): boolean =>
        (spec.concept.domain_code === NATIVE_DOMAIN && spec.concept.code === "Image") ||
        spec.concept.refines === `${NATIVE_DOMAIN}.Image`;
      const inputEntries = Object.entries(base.inputs);
      const imageInput = inputEntries.find(([, spec]) => isImageLike(spec));
      const documentInput = imageInput === undefined ? inputEntries[0] : undefined;
      return {
        ...base,
        type,
        pipe_category: "PipeOperator",
        extract_choice: modelToString(raw.model),
        should_caption_images: raw.page_image_captions === true,
        max_page_images: intOrNull(raw.max_page_images),
        should_include_page_views: raw.page_views === true,
        page_views_dpi: intOrNull(raw.page_views_dpi),
        render_js: boolOrNull(raw.render_js),
        include_raw_html: boolOrNull(raw.include_raw_html),
        image_stuff_name: imageInput?.[0] ?? null,
        document_stuff_name: documentInput?.[0] ?? null,
      };
    }
    case "PipeSearch":
      return {
        ...base,
        type,
        pipe_category: "PipeOperator",
        search_choice: modelToString(raw.model),
        prompt_blueprint: makeTemplate(strOrNull(raw.prompt) ?? "", "basic"),
        include_images_override: boolOrNull(raw.include_images),
        max_results_override: intOrNull(raw.max_results),
        from_date: strOrNull(raw.from_date),
        to_date: strOrNull(raw.to_date),
        include_domains: stringArrayOrNull(raw.include_domains),
        exclude_domains: stringArrayOrNull(raw.exclude_domains),
        is_structured_output: false,
      };
    case "PipeImgGen": {
      const prompt = strOrNull(raw.prompt);
      const negativePrompt = strOrNull(raw.negative_prompt);
      const seed = intOrNull(raw.seed) ?? (raw.seed === "auto" ? "auto" : null);
      return {
        ...base,
        type,
        pipe_category: "PipeOperator",
        img_gen_prompt_blueprint: {
          prompt_blueprint: prompt === null ? null : makeTemplate(prompt, "img_gen_prompt"),
          negative_prompt_blueprint:
            negativePrompt === null ? null : makeTemplate(negativePrompt, "img_gen_prompt"),
          image_references: null,
        },
        img_gen_choice: modelToString(raw.model),
        aspect_ratio: strOrNull(raw.aspect_ratio),
        is_raw: boolOrNull(raw.is_raw),
        seed,
        background: strOrNull(raw.background),
        output_format: strOrNull(raw.output_format),
        output_multiplicity:
          typeof base.output.multiplicity === "number" ? base.output.multiplicity : 1,
      };
    }
    case "PipeCompose": {
      const rawTemplate = raw.template;
      let template: string | null = null;
      let templatingStyle: string | null = null;
      let category = "basic";
      let extraContext: Record<string, unknown> | null = null;
      if (typeof rawTemplate === "string") {
        template = rawTemplate;
      } else if (isPlainObject(rawTemplate)) {
        template = strOrNull(rawTemplate.template);
        templatingStyle = strOrNull(rawTemplate.templating_style);
        category = strOrNull(rawTemplate.category) ?? category;
        extraContext = isPlainObject(rawTemplate.extra_context) ? rawTemplate.extra_context : null;
      }
      return {
        ...base,
        type,
        pipe_category: "PipeOperator",
        template,
        templating_style: templatingStyle,
        category,
        extra_context: extraContext,
        construct_blueprint: normalizeConstruct(raw.construct),
      };
    }
    case "PipeFunc":
      return { ...base, type, pipe_category: "PipeOperator" };
    case "PipeSignature": {
      const signatureFor = strOrNull(raw.signature_for);
      // `PipeSignature` itself is excluded: it is no longer a member of pipelex's
      // `PipeType`, so `signature_for = "PipeSignature"` is rejected upstream.
      return {
        ...base,
        type,
        pipe_category: null,
        signature_for:
          signatureFor !== null &&
          signatureFor !== "PipeSignature" &&
          KNOWN_PIPE_TYPES.has(signatureFor)
            ? (signatureFor as PipeType)
            : null,
      };
    }
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
