/**
 * The panel's submit path, kept React-free.
 *
 * Everything between "the user pressed Run" and "the payload goes on the wire"
 * is the kernel's (`@pipelex/mthds-form`, `core/gate.ts`); this module bridges
 * the panel's values into the shape the gate takes, calls it, and turns the
 * verdict into one line a panel can show. Splitting it out of `RunPanel.tsx` is
 * what lets the node vitest project test that seam without mounting React — the
 * gate's own behavior is covered by the kernel's tests and is deliberately not
 * re-tested here.
 */
import {
  describeValidationError,
  gateRunInputs,
  rjsfDataFromRunValues,
  type PipeIOContract,
  type RunField,
  type RunInputError,
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
 * Every message key the error summary can render — the kernel's, plus the two
 * this panel owns.
 *
 * The kernel's keys describe one ajv error each and are rendered by
 * `describeValidationError`. The `runPanel.` ones are lines the panel writes
 * itself, around those errors, and they carry the prefix precisely so the
 * ownership is legible at the call site and in a host's translation file.
 *
 * Nesting the kernel's union inside ours is deliberate: a key the kernel ADDS
 * lands here automatically and then fails `VALIDATION_STRINGS`'s exhaustiveness
 * until it is given a string, which is how a kernel bump is stopped from
 * silently rendering `undefined` at a user.
 */
export type RunPanelMessageKey =
  | ValidationMessageKey
  | "runPanel.missingInputs"
  | "runPanel.fillRequired";

/**
 * The panel's i18n seam — the kernel's `Translate` widened to the panel's own
 * keys. It accepts a superset of what the kernel asks for, so it is still a
 * valid `Translate` wherever the kernel wants one.
 */
export type RunPanelTranslate = (
  key: RunPanelMessageKey,
  values?: Record<string, string>,
) => string;

/**
 * English defaults for every key above. The kernel deliberately ships no
 * defaults for its own (its `Translate` contract is host-supplied), so a panel
 * that wants to say anything at all has to name them — the wording matches the
 * canonical consumer's `en.json` so the two surfaces read alike.
 */
const VALIDATION_STRINGS: Record<RunPanelMessageKey, string> = {
  "inputPanel.aDateField": "A date field",
  "inputPanel.pickValidDate": "{label}: “{value}” is not a valid date",
  "inputPanel.pickValidDateEmpty": "{label}: pick a valid date",
  "inputPanel.dateCarriesTime":
    "{label}: “{value}” carries a time, but a date field takes the day alone — use “{day}” and put the time in the “time” field",
  "inputPanel.invalidValue": "Invalid value",
  "inputPanel.invalidValueWithData": "{stack} (value: “{value}”)",
  "runPanel.missingInputs": "Missing required fields in: {inputs}",
  "runPanel.fillRequired": "Please fill in all required fields before running.",
};

/**
 * The default translator: the English strings above with `{placeholder}`
 * interpolation. A host that localizes passes its own translator instead.
 */
export const defaultValidationTranslate: RunPanelTranslate = (key, values) => {
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
 *
 * All three routes go through `t`. Which one runs is decided by the kernel's
 * verdict, so a host that localizes cannot know in advance which line it will
 * be shown — leaving any of them in hardcoded English would surface as the
 * summary silently reverting to English on some inputs and not others.
 */
export function summarizeVerdict(
  missingInputs: string[],
  errors: RunInputError[],
  preparedData: unknown,
  t: RunPanelTranslate = defaultValidationTranslate,
): string {
  if (missingInputs.length > 0) {
    return t("runPanel.missingInputs", { inputs: missingInputs.join(", ") });
  }
  const described = errors
    .slice(0, MAX_QUOTED_ERRORS)
    .map((error) => describeValidationError(error, t, preparedData))
    .join("; ");
  return described || t("runPanel.fillRequired");
}

/**
 * Run the kernel's gate over the panel's current values.
 *
 * `gateRunInputs` IS the gate — the whole chain in one call — so all this
 * module does either side of it is bridge and phrase: the panel holds values
 * keyed by variable, the gate takes the schema-shaped data those become, and a
 * rejected verdict has to come back as one line rather than as a discriminated
 * union the panel would have to read.
 *
 * Assembling those steps here instead was the earlier shape and it was wrong in
 * a way nothing local could see. The chain's schema validation is not the whole
 * rule: ajv's `required` only asserts a key is PRESENT, and a content model
 * carries no `minLength`, so a required input that arrived empty — `{text: ""}`
 * from an untouched text field, `{url: ""}` from an untouched file field —
 * satisfied the schema and the run went out. The Run button refuses exactly
 * those, through `computeReadiness`. The gate now re-applies that same
 * emptiness rule with `computeReadiness`'s own functions over the same derived
 * fields, which makes the button's verdict and this one a single invariant
 * rather than two things that resemble each other.
 */
export function runSubmitGate(
  contract: PipeIOContract,
  fields: RunField[],
  values: Record<string, unknown>,
  t: RunPanelTranslate = defaultValidationTranslate,
): RunGateOutcome {
  const verdict = gateRunInputs(contract, rjsfDataFromRunValues(values, fields));
  if (!verdict.ok) {
    return {
      ok: false,
      missingInputs: verdict.missingInputs,
      summary: summarizeVerdict(verdict.missingInputs, verdict.errors, verdict.preparedData, t),
    };
  }
  return { ok: true, apiInputs: verdict.inputs };
}
