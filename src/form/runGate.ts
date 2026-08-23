/**
 * The panel's submit path, kept React-free.
 *
 * Everything between "the user pressed Run" and "the payload goes on the wire"
 * is the kernel's (`@pipelex/mthds-form`, `core/gate.ts`); this module only
 * runs its four steps in order and turns the verdict into one line a panel can
 * show. Splitting it out of `RunPanel.tsx` is what lets the node vitest project
 * test the composition without mounting React — the kernel's own behavior is
 * covered by the kernel's tests and is deliberately not re-tested here.
 */
import {
  apiInputsFromSchemaData,
  buildRunInputsSchema,
  describeValidationError,
  prepareRunInputs,
  rjsfDataFromRunValues,
  validateRunInputs,
  type PipeIOContract,
  type RunField,
  type RunInputError,
  type Translate,
  type ValidationMessageKey,
} from "@pipelex/mthds-form";

/**
 * How many ajv errors the summary quotes when the missing-input scan comes up
 * empty. A form with a deep mismatch can produce dozens; past a handful the
 * line stops being readable and the user acts on the first one anyway.
 */
const MAX_QUOTED_ERRORS = 3;

/** The outcome of one submit attempt. */
export type RunGateOutcome =
  | { ok: true; apiInputs: Record<string, unknown> }
  | { ok: false; missingInputs: string[]; summary: string };

/**
 * English defaults for the validation-message keys the kernel renders through
 * an injected translator. The kernel deliberately ships no defaults for these
 * (its `Translate` contract is host-supplied), so a panel that wants to say
 * anything at all has to name them — the wording matches the canonical
 * consumer's `en.json` so the two surfaces read alike.
 */
const VALIDATION_STRINGS: Record<ValidationMessageKey, string> = {
  "inputPanel.aDateField": "A date field",
  "inputPanel.pickValidDate": "{label}: “{value}” is not a valid date",
  "inputPanel.pickValidDateEmpty": "{label}: pick a valid date",
  "inputPanel.dateCarriesTime":
    "{label}: “{value}” carries a time, but a date field takes the day alone — use “{day}” and put the time in the “time” field",
  "inputPanel.invalidValue": "Invalid value",
  "inputPanel.invalidValueWithData": "{stack} (value: “{value}”)",
};

/**
 * The default translator: the English strings above with `{placeholder}`
 * interpolation. A host that localizes passes its own `Translate` instead.
 */
export const defaultValidationTranslate: Translate = (key, values) => {
  const template = VALIDATION_STRINGS[key];
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => values[name] ?? whole);
};

/**
 * One human line for an invalid verdict.
 *
 * `missingInputs` is the good case: it names the VARIABLES at fault, which is
 * what the user clicks on. The scan can legitimately come up empty on an
 * invalid form (a wrong value shape, a nested mismatch), and that is exactly
 * when falling back to the raw ajv errors keeps the failure diagnosable rather
 * than silent — see `validateRunInputs` in the kernel.
 */
export function summarizeVerdict(
  missingInputs: string[],
  errors: RunInputError[],
  preparedData: unknown,
  t: Translate = defaultValidationTranslate,
): string {
  if (missingInputs.length > 0) {
    return `Missing required fields in: ${missingInputs.join(", ")}`;
  }
  const described = errors
    .slice(0, MAX_QUOTED_ERRORS)
    .map((error) => describeValidationError(error, t, preparedData))
    .join("; ");
  return described || "Please fill in all required fields before running.";
}

/**
 * Run the kernel's four-step gate over the panel's current values.
 *
 * The order is the kernel's and is not ours to rearrange: build the combined
 * schema, prepare (heal then prune) against that exact schema, validate the
 * PREPARED data, and build the payload from the PREPARED data too — so the
 * pruning reaches the wire.
 */
export function runSubmitGate(
  contract: PipeIOContract,
  fields: RunField[],
  values: Record<string, unknown>,
  t: Translate = defaultValidationTranslate,
): RunGateOutcome {
  const schema = buildRunInputsSchema(contract.inputs);
  const preparedData = prepareRunInputs(rjsfDataFromRunValues(values, fields), schema);
  const verdict = validateRunInputs(preparedData, contract.inputs, schema);
  if (!verdict.isValid) {
    return {
      ok: false,
      missingInputs: verdict.missingInputs,
      summary: summarizeVerdict(verdict.missingInputs, verdict.errors, preparedData, t),
    };
  }
  return { ok: true, apiInputs: apiInputsFromSchemaData(preparedData, contract.inputs) };
}
