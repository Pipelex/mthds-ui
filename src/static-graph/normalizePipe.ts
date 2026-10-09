// ─── Pipe normalization: authored TOML shape → registry blueprint shape ─────
// The authoring surface (mthds_schema.json, checked in under data/schema/)
// and the runtime-serialized registry shape (`PipeBlueprintUnion` in
// `@graph/types`) name things differently: `steps` vs `sequential_sub_pipes`,
// `model` vs `llm_choices`, `prompt` vs `prompt_blueprint`, … This module maps
// the former to the latter, leniently: uninterpretable pieces are skipped with
// a diagnostic, and a pipe is dropped entirely only when it names no usable
// `type` and is not a signature (see `resolvePipeTypeTag`).

import type {
  BindingStepSpec,
  ConceptInfo,
  JudgmentQuestionSpec,
  PipeBlueprintUnion,
  PipeComposeConstructBlueprint,
  PipeComposeConstructField,
  PipeType,
  SequenceStepSpec,
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
  unquotedDottedInputNames,
} from "./conceptRefs";
import type { Diagnostic } from "./types";
import { authoredRecord, boolOrNull, intOrNull, isPlainObject, strOrNull } from "./types";

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

/**
 * A plain name (`^[a-z][a-z0-9_]*$` in the schema): the grammar of an input
 * name, and of every name a step stores a value under, since a later step
 * reads the stored value through its inputs. It has no dot, so a name never
 * reaches into a field, and no leading underscore, which keeps the reserved
 * private prefix out of an author's reach.
 */
const PLAIN_NAME_RE = /^[a-z][a-z0-9_]*$/;

/**
 * The prefix of the private name a sequence binds a dotted `batch_over`'s list
 * under — the runtime's own, reserved so no name an author writes takes it.
 */
export const PRIVATE_BINDING_NAME_PREFIX = "_bound_";

/** The binding step that hands the field a dotted path reaches to a pipe under a plain name. */
function bindingStepFor(dottedPath: string): string {
  const plainName = dottedPath.slice(dottedPath.lastIndexOf(".") + 1);
  return `{ from = "${dottedPath}", result = "${plainName}" }`;
}

/** What to do about a dotted input name, as the runtime says it when it refuses one. */
function dottedInputNameRemedy(dottedName: string): string {
  const root = dottedName.slice(0, dottedName.indexOf("."));
  return (
    `an input names one whole value, so its name cannot reach into a field with a dot; declare "${root}" ` +
    `with its whole concept and read the field through it, or have the calling sequence bind the field ` +
    `to a plain name with a binding step (${bindingStepFor(dottedName)}) and declare that name`
  );
}

/** Whether a name reads as a root followed by field names (`invoice.total`), each segment a plain name. */
function isDottedFieldPath(name: string): boolean {
  const segments = name.split(".");
  return segments.length > 1 && segments.every((segment) => PLAIN_NAME_RE.test(segment));
}

/** Why an input name breaking the plain-name grammar is refused. */
function invalidInputNameReason(name: string): string {
  if (isDottedFieldPath(name)) {
    return `is not a plain input name: ${dottedInputNameRemedy(name)}`;
  }
  return "is not a plain input name, which is a lowercase letter followed by lowercase letters, digits and underscores";
}

/**
 * Report a stored name that breaks the plain-name grammar. A stored name is one
 * a step stores a value under in working memory — a pipe step's or a parallel
 * branch's `result`, the `batch_as` of either, a PipeBatch's `input_item_name` —
 * for a later pipe to read through an input, so the runtime refuses any name
 * but a plain one with `invalid_input_name`, the reserved prefix among them.
 * Unlike an input, the name belongs to a step that still runs a pipe the graph
 * has to show, so it is reported and drawn as written rather than skipped. A
 * binding step's `result` is a stored name too, refused as a malformed binding
 * step instead (`normalizeBindingStep`).
 *
 * `storedUnder` says what the step stores under the name, phrased to end on
 * "under": `sub-pipe "write_label" stores its result under`.
 */
function reportInvalidStoredName(
  name: string | null,
  storedUnder: string,
  pipeCode: string,
  path: string,
  ctx: NormalizePipeContext,
): void {
  if (name === null || PLAIN_NAME_RE.test(name)) return;
  let why: string;
  if (name.startsWith(PRIVATE_BINDING_NAME_PREFIX)) {
    why = `and the prefix "${PRIVATE_BINDING_NAME_PREFIX}" is reserved for the runtime's own names`;
  } else if (name.includes(".")) {
    why = "and an input names one whole value, so its name cannot reach into a field with a dot";
  } else {
    why =
      "and an input name is a lowercase letter followed by lowercase letters, digits and underscores";
  }
  ctx.diagnostics.push({
    severity: "warning",
    code: "invalid-input-name",
    message:
      `pipe "${pipeCode}": ${storedUnder} "${name}", which is not a plain input name: ` +
      `a pipe reads the value through an input, ${why} — drawn as written`,
    path,
  });
}

/**
 * Report a PipeBatch's `input_list_name` that breaks the plain-name grammar.
 * The list is one of the batch's own inputs, so its name is a plain input name
 * and never a dotted path into a field: the runtime refuses any other with
 * `invalid_input_name` (`check_input_list_name`). A list held in a field of a larger value is
 * declared under a plain name and handed over by the calling sequence, which
 * binds the field to that name, or batches over the field itself in a step
 * running the branch pipe. Reported and drawn as written, as a stored name is.
 */
function reportInvalidBatchListName(
  name: string | null,
  branchPipeCode: string | null,
  pipeCode: string,
  ctx: NormalizePipeContext,
): void {
  if (name === null || PLAIN_NAME_RE.test(name)) return;
  let why: string;
  if (isDottedFieldPath(name)) {
    const plainName = name.slice(name.lastIndexOf(".") + 1);
    const branch = branchPipeCode === null ? "the branch pipe" : `"${branchPipeCode}"`;
    why =
      `: a PipeBatch maps over a list it declares as an input of its own, so declare the list as "${plainName}" ` +
      `and have the calling sequence bind the field to it with a binding step (${bindingStepFor(name)}), ` +
      `or have the calling sequence run ${branch} in a step that batches over the field itself`;
  } else {
    why = ", which is a lowercase letter followed by lowercase letters, digits and underscores";
  }
  ctx.diagnostics.push({
    severity: "warning",
    code: "invalid-input-name",
    message: `pipe "${pipeCode}": input_list_name "${name}" is not a plain input name${why} — drawn as written`,
    path: `pipe.${pipeCode}.input_list_name`,
  });
}

/**
 * Report a plain `batch_over` taking the reserved prefix. A sequence binds a
 * dotted `batch_over`'s list under a private name taking it, in working memory
 * a nested sequence shares with its caller, so the runtime refuses a step
 * batching over such a name by hand with `invalid_input_name`
 * (`check_name_is_not_reserved`). A `batch_over` reads a name rather than
 * storing one, so no plain-name grammar keeps it off the prefix. A dotted one
 * is a path, refused as a malformed binding step when a segment is
 * underscore-led, so only a name without a dot is checked here. Reported and
 * drawn as written, as a stored name is.
 */
function reportReservedBatchOver(
  batchOver: string | null,
  pipeRef: string,
  pipeCode: string,
  path: string,
  ctx: NormalizePipeContext,
): void {
  if (
    batchOver === null ||
    batchOver.includes(".") ||
    !batchOver.startsWith(PRIVATE_BINDING_NAME_PREFIX)
  ) {
    return;
  }
  ctx.diagnostics.push({
    severity: "warning",
    code: "invalid-input-name",
    message:
      `pipe "${pipeCode}": sub-pipe "${pipeRef}" batches over "${batchOver}", which takes the prefix ` +
      `"${PRIVATE_BINDING_NAME_PREFIX}" the runtime reserves for the list a dotted batch_over binds, ` +
      `a name only the runtime writes or reads — drawn as written`,
    path,
  });
}

/** A TOML-style locator segment for a key, quoted when a bare key cannot spell it. */
function tomlKey(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key);
}

function normalizeInputs(
  raw: unknown,
  pipeCode: string,
  ctx: NormalizePipeContext,
): Record<string, StuffSpecInfo> {
  const inputs = authoredRecord<StuffSpecInfo>();
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
    const path = `pipe.${pipeCode}.inputs.${tomlKey(name)}`;
    // The runtime refuses a name breaking the plain-name grammar, a quoted
    // dotted one among them, so it is skipped: nothing in scope holds it, and
    // drawing it would draw a dangling input for a bundle that never runs.
    if (!PLAIN_NAME_RE.test(name)) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "invalid-input-name",
        message: `pipe "${pipeCode}": input "${name}" ${invalidInputNameReason(name)} — skipped`,
        path,
      });
      continue;
    }
    // The same name unquoted is a nesting in TOML, which reads as a slot table
    // with an unknown key and no `concept`. Reported alone and as what it is,
    // since the two generic diagnostics below never mention the dot.
    const dottedNames = unquotedDottedInputNames(name, slot);
    if (dottedNames !== null) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "invalid-input-name",
        message:
          `pipe "${pipeCode}": input "${name}" is a table with no "concept", which is how TOML reads the ` +
          `unquoted dotted input ${dottedNames.length === 1 ? "name" : "names"} ` +
          `${dottedNames.map((dotted) => `"${dotted}"`).join(", ")}; ` +
          `${dottedInputNameRemedy(dottedNames[0])} — skipped`,
        path,
      });
      continue;
    }
    const { spec, missingConcept, unknownKeys } = resolveInputSlot(slot, ctx.domain, ctx.concepts);
    if (unknownKeys.length > 0) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unknown-input-slot-key",
        message:
          `pipe "${pipeCode}": input "${name}" declares ${unknownKeys.map((key) => `"${key}"`).join(", ")}, ` +
          "which the input slot form does not define — ignored here, and the runtime refuses the bundle",
        path,
      });
    }
    if (spec === null) {
      // Two ways to reach here, and they are different author mistakes: an
      // expanded slot that never declared the required `concept` key, versus a
      // ref that was written and does not parse. Saying "uninterpretable ref"
      // for the first blames a ref the author never wrote, which reads as a
      // grammar problem when the fix is to add the key.
      ctx.diagnostics.push({
        severity: "warning",
        code: "invalid-concept-ref",
        message: missingConcept
          ? `pipe "${pipeCode}": input "${name}" is a slot table with no "concept" — the key is required — skipped`
          : `pipe "${pipeCode}": input "${name}" has an uninterpretable concept ref — skipped`,
        path,
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
  raw: Record<string, unknown>,
  pipeCode: string,
  path: string,
  ctx: NormalizePipeContext,
): SubPipeSpec | null {
  if (strOrNull(raw.pipe) === null) {
    ctx.diagnostics.push({
      severity: "warning",
      code: "invalid-sub-pipe",
      message: `pipe "${pipeCode}": sub-pipe entry without a "pipe" ref — skipped`,
      path,
    });
    return null;
  }
  const pipeRef = raw.pipe as string;
  const result = strOrNull(raw.result);
  const batchOver = strOrNull(raw.batch_over);
  const batchAs = strOrNull(raw.batch_as);
  reportInvalidStoredName(
    result,
    `sub-pipe "${pipeRef}" stores its result under`,
    pipeCode,
    `${path}.result`,
    ctx,
  );
  reportInvalidStoredName(
    batchAs,
    `sub-pipe "${pipeRef}" hands each item to its pipe under`,
    pipeCode,
    `${path}.batch_as`,
    ctx,
  );
  reportReservedBatchOver(batchOver, pipeRef, pipeCode, `${path}.batch_over`, ctx);
  let batchParams: SubPipeSpec["batch_params"] = null;
  if (batchOver !== null && batchAs !== null) {
    batchParams = { input_list_stuff_name: batchOver, input_item_stuff_name: batchAs };
  } else if (batchOver !== null || batchAs !== null) {
    ctx.diagnostics.push({
      severity: "warning",
      code: "incomplete-batch-spec",
      message:
        `pipe "${pipeCode}": sub-pipe "${pipeRef}" sets only one of ` +
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
    pipe_code: pipeRef,
    output_name: result,
    output_multiplicity: outputMultiplicity,
    batch_params: batchParams,
  };
}

/**
 * A binding step's `from` path, and a dotted `batch_over`: a name in working
 * memory followed by zero or more field names, each segment an identifier that
 * does not start with an underscore — the grammar of the standard and of the
 * schema's `BindingStepBlueprint.from`.
 */
const BINDING_PATH_RE = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)*$/;

/** The keys a binding step may carry: `from` and `result`, both required, nothing else. */
const BINDING_STEP_KEYS: ReadonlySet<string> = new Set(["from", "result"]);

/**
 * Normalize one binding step, `{ from = "invoice.total", result = "total_amount" }`,
 * to the shape the runtime holds it in. The runtime refuses a step carrying
 * `pipe` beside `from`, one without `result`, and a `from` breaking the path
 * grammar, so those are skipped with a diagnostic: none of them names a value
 * a later step could read. A pipe step's key carried beside `from` is reported
 * and the binding still drawn, since nothing about what it binds is in doubt.
 */
function normalizeBindingStep(
  raw: Record<string, unknown>,
  pipeCode: string,
  path: string,
  ctx: NormalizePipeContext,
): BindingStepSpec | null {
  const skip = (why: string): null => {
    ctx.diagnostics.push({
      severity: "warning",
      code: "invalid-binding-step",
      message: `pipe "${pipeCode}": binding step ${why} — skipped`,
      path,
    });
    return null;
  };
  if (raw.pipe !== undefined) return skip(`carries both "from" and "pipe"`);
  const fromPath = strOrNull(raw.from);
  if (fromPath === null || !BINDING_PATH_RE.test(fromPath)) {
    return skip(`has a "from" that is not a path of identifiers separated by dots`);
  }
  const result = strOrNull(raw.result);
  if (result === null) return skip(`binds "${fromPath}" under no "result"`);
  if (!PLAIN_NAME_RE.test(result)) {
    return skip(
      result.startsWith(PRIVATE_BINDING_NAME_PREFIX)
        ? `binds "${fromPath}" under "${result}", which takes the prefix "${PRIVATE_BINDING_NAME_PREFIX}" the runtime reserves for its own names`
        : `binds "${fromPath}" under "${result}", which is not a plain name (lowercase letters, digits and underscores, starting with a letter)`,
    );
  }
  const extraKeys = Object.keys(raw).filter((key) => !BINDING_STEP_KEYS.has(key));
  if (extraKeys.length > 0) {
    ctx.diagnostics.push({
      severity: "warning",
      code: "invalid-binding-step",
      message:
        `pipe "${pipeCode}": binding step of "${fromPath}" carries ` +
        `${extraKeys.map((key) => `"${key}"`).join(", ")}, which a binding step does not take — ignored`,
      path,
    });
  }
  return { from_path: fromPath, output_name: result, is_dotted_batch_over: false };
}

/** Every name a sequence's inputs and steps write or read — the names a private binding name must not take. */
function namesInSequence(inputNames: string[], rawSteps: unknown[]): Set<string> {
  const names = new Set(inputNames);
  for (const step of rawSteps) {
    if (!isPlainObject(step)) continue;
    if (step.from !== undefined) {
      const fromPath = strOrNull(step.from);
      if (fromPath !== null) names.add(fromPath.split(".")[0]);
      const result = strOrNull(step.result);
      if (result !== null) names.add(result);
      continue;
    }
    for (const name of [strOrNull(step.result), strOrNull(step.batch_as)]) {
      if (name !== null) names.add(name);
    }
    const batchOver = strOrNull(step.batch_over);
    if (batchOver !== null) names.add(batchOver.split(".")[0]);
  }
  return names;
}

/**
 * The private name a dotted `batch_over`'s list is bound under: the prefix and
 * the path with its dots turned into underscores (`_bound_catalog_pages`), with
 * `_2`, `_3`… appended when a name of the sequence already holds that spelling.
 * Mirrors the runtime's `make_private_binding_name`, so the static graph names
 * the bound list as a run graph does.
 */
function makePrivateBindingName(path: string, takenNames: Set<string>): string {
  const baseName = `${PRIVATE_BINDING_NAME_PREFIX}${path.replaceAll(".", "_")}`;
  let name = baseName;
  for (let suffix = 2; takenNames.has(name); suffix++) name = `${baseName}_${suffix}`;
  return name;
}

/**
 * Normalize a sequence's `steps` to the runtime's `sequential_sub_pipes`: a
 * pipe step, or a binding step for a step carrying `from`. A pipe step whose
 * `batch_over` is a dotted path is held as the runtime holds it — a binding of
 * that path under a private name, followed by the same step batching over the
 * name — so the graph draws a binding followed by the batch.
 */
function normalizeSequenceSteps(
  raw: unknown,
  pipeCode: string,
  inputNames: string[],
  ctx: NormalizePipeContext,
): SequenceStepSpec[] {
  if (!Array.isArray(raw)) {
    if (raw !== undefined) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "invalid-pipe-entry",
        message: `pipe "${pipeCode}": steps is not an array — treated as empty`,
        path: `pipe.${pipeCode}.steps`,
      });
    }
    return [];
  }
  const takenNames = namesInSequence(inputNames, raw);
  const steps: SequenceStepSpec[] = [];
  raw.forEach((entry, index) => {
    const path = `pipe.${pipeCode}.steps[${index}]`;
    if (isPlainObject(entry) && entry.from !== undefined) {
      const binding = normalizeBindingStep(entry, pipeCode, path, ctx);
      if (binding !== null) steps.push(binding);
      return;
    }
    if (!isPlainObject(entry)) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "invalid-sub-pipe",
        message: `pipe "${pipeCode}": sub-pipe entry without a "pipe" ref — skipped`,
        path,
      });
      return;
    }
    const step = normalizeSubPipe(entry, pipeCode, path, ctx);
    if (step === null) return;
    const listName = step.batch_params?.input_list_stuff_name;
    if (step.batch_params != null && listName !== undefined && listName.includes(".")) {
      if (!BINDING_PATH_RE.test(listName)) {
        ctx.diagnostics.push({
          severity: "warning",
          code: "invalid-binding-step",
          message:
            `pipe "${pipeCode}": dotted batch_over "${listName}" is not a path of identifiers ` +
            `separated by dots — batching over it as a name`,
          path,
        });
      } else {
        const privateName = makePrivateBindingName(listName, takenNames);
        takenNames.add(privateName);
        steps.push({ from_path: listName, output_name: privateName, is_dotted_batch_over: true });
        step.batch_params = { ...step.batch_params, input_list_stuff_name: privateName };
      }
    }
    steps.push(step);
  });
  return steps;
}

/**
 * Normalize a parallel's `branches`. A branch is always a pipe step: the
 * runtime refuses a binding step there, and a dotted `batch_over`, since only
 * a sequence binds — a branch needing a field gets it bound by a sequence step
 * before the parallel. Both are skipped with a diagnostic.
 */
function normalizeBranchList(
  raw: unknown,
  pipeCode: string,
  ctx: NormalizePipeContext,
): SubPipeSpec[] {
  if (!Array.isArray(raw)) {
    if (raw !== undefined) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "invalid-pipe-entry",
        message: `pipe "${pipeCode}": branches is not an array — treated as empty`,
        path: `pipe.${pipeCode}.branches`,
      });
    }
    return [];
  }
  const branches: SubPipeSpec[] = [];
  raw.forEach((entry, index) => {
    const path = `pipe.${pipeCode}.branches[${index}]`;
    if (!isPlainObject(entry)) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "invalid-sub-pipe",
        message: `pipe "${pipeCode}": sub-pipe entry without a "pipe" ref — skipped`,
        path,
      });
      return;
    }
    if (entry.from !== undefined) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "invalid-binding-step",
        message:
          `pipe "${pipeCode}": a parallel branch cannot be a binding step — ` +
          `bind in a sequence step before the parallel — skipped`,
        path,
      });
      return;
    }
    const branch = normalizeSubPipe(entry, pipeCode, path, ctx);
    if (branch === null) return;
    if (branch.batch_params?.input_list_stuff_name.includes(".")) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "invalid-binding-step",
        message:
          `pipe "${pipeCode}": a parallel branch cannot batch over the dotted path ` +
          `"${branch.batch_params.input_list_stuff_name}" — bind it in a sequence step before ` +
          `the parallel — skipped`,
        path,
      });
      return;
    }
    branches.push(branch);
  });
  return branches;
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

// ─── PipeJudge question ──────────────────────────────────────────────────────

/**
 * The question a PipeJudge asks, in the runtime's shape. The kind is decided
 * by which of `options` and `levels` the pipe declares, never by a field of its
 * own, and `prompt` is read in place of `question`, as the runtime reads it.
 */
function normalizeJudgmentQuestion(raw: Record<string, unknown>): JudgmentQuestionSpec {
  const instructions = strOrNull(raw.question) ?? strOrNull(raw.prompt) ?? "";
  if (isPlainObject(raw.options)) {
    const options: Record<string, string | null> = {};
    for (const [key, description] of Object.entries(raw.options)) {
      options[key] = typeof description === "string" ? description : null;
    }
    return { kind: "choice", instructions, options };
  }
  if (Array.isArray(raw.levels)) {
    return {
      kind: "rating",
      instructions,
      levels: raw.levels.filter((level): level is string => typeof level === "string"),
    };
  }
  const criteria = isPlainObject(raw.criteria) ? raw.criteria : {};
  return {
    kind: "yes_no",
    instructions,
    yes_criterion: strOrNull(criteria.yes),
    no_criterion: strOrNull(criteria.no),
  };
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
        sequential_sub_pipes: normalizeSequenceSteps(
          raw.steps,
          code,
          Object.keys(base.inputs),
          ctx,
        ),
      };
    case "PipeParallel":
      return {
        ...base,
        type,
        pipe_category: "PipeController",
        parallel_sub_pipes: normalizeBranchList(raw.branches, code, ctx),
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
      const inputListName = strOrNull(raw.input_list_name);
      const inputItemName = strOrNull(raw.input_item_name);
      reportInvalidBatchListName(inputListName, branchPipeCode, code, ctx);
      reportInvalidStoredName(
        inputItemName,
        "the batch hands each item to its branch pipe under",
        code,
        `pipe.${code}.input_item_name`,
        ctx,
      );
      return {
        ...base,
        type,
        pipe_category: "PipeController",
        branch_pipe_code: branchPipeCode ?? "",
        batch_params: {
          input_list_stuff_name: inputListName ?? "",
          input_item_stuff_name: inputItemName ?? "",
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
    case "PipeJudge":
      return {
        ...base,
        type,
        pipe_category: "PipeOperator",
        judgment_choice: isPlainObject(raw.model) ? raw.model : strOrNull(raw.model),
        judgment_question: normalizeJudgmentQuestion(raw),
        threshold: typeof raw.threshold === "number" ? raw.threshold : null,
      };
    case "PipeDocGen":
      return {
        ...base,
        type,
        pipe_category: "PipeOperator",
        doc_gen_format: strOrNull(raw.format) ?? "",
        doc_gen_choice: isPlainObject(raw.model) ? raw.model : strOrNull(raw.model),
        template: strOrNull(raw.template),
        template_file: strOrNull(raw.template_file),
        filename: strOrNull(raw.filename),
      };
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
