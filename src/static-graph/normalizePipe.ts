// ─── Pipe normalization: authored TOML shape → registry blueprint shape ─────
// The authoring surface (mthds_schema.json, checked in under data/schema/)
// and the runtime-serialized registry shape (`PipeBlueprintUnion` in
// `@graph/types`) name things differently: `steps` vs `sequential_sub_pipes`,
// `model` vs `llm_choices`, `prompt` vs `prompt_blueprint`, … This module maps
// the former to the latter, leniently: uninterpretable pieces are skipped with
// a diagnostic, and only a pipe without a usable `type` is dropped entirely.

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

import { NATIVE_DOMAIN, nativeConceptInfo, resolveStuffSpec } from "./conceptRefs";
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
  for (const [name, ref] of Object.entries(raw)) {
    const spec = resolveStuffSpec(ref, ctx.domain, ctx.concepts);
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
  return { concept: nativeConceptInfo("Anything"), multiplicity: null };
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

// ─── Per-type normalization ──────────────────────────────────────────────────

/**
 * Normalize one `[pipe.<code>]` table to its registry blueprint shape.
 * Returns null (with a diagnostic) only when the `type` is missing or not a
 * known pipe class — everything else degrades field-by-field.
 */
export function normalizePipe(
  code: string,
  raw: Record<string, unknown>,
  ctx: NormalizePipeContext,
): PipeBlueprintUnion | null {
  const typeValue = raw.type;
  if (typeof typeValue !== "string" || !KNOWN_PIPE_TYPES.has(typeValue)) {
    ctx.diagnostics.push({
      severity: "error",
      code: "unknown-pipe-type",
      message: `pipe "${code}": unknown pipe type ${JSON.stringify(typeValue)} — pipe skipped`,
      path: `pipe.${code}.type`,
    });
    return null;
  }
  const type = typeValue as PipeType;
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
          templating_style: null,
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
      return {
        ...base,
        type,
        pipe_category: null,
        signature_for:
          signatureFor !== null && KNOWN_PIPE_TYPES.has(signatureFor)
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
