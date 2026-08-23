/**
 * The panel's submit path.
 *
 * What is under test is the ORCHESTRATION — that the kernel's four steps run in
 * the right order over the right data, and that a rejected verdict always
 * produces a line someone can act on. The steps' own behaviour belongs to the
 * kernel and is covered by the kernel's tests; re-asserting it here would just
 * pin this repo to the kernel's internals, which is exactly what design
 * Decision C keeps us out of.
 */
import { describe, expect, it } from "vitest";
import type { PipeIOContract, PipeInputContract, RunInputError } from "@pipelex/mthds-form";
import { fieldsForContract } from "@pipelex/mthds-form";
import { defaultValidationTranslate, runSubmitGate, summarizeVerdict } from "../runGate";

const TEXT_INPUT: PipeInputContract = {
  concept_ref: "native.Text",
  json_schema: {
    title: "TextContent",
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
  },
};

/**
 * A structured concept with one required, format-constrained subfield — the
 * shape that produces both interesting verdicts: absent, the scan names the
 * VARIABLE; present but malformed, the scan finds nothing and only ajv has
 * anything to say.
 */
const BOOKING_INPUT: PipeInputContract = {
  concept_ref: "demo.Booking",
  json_schema: {
    title: "Booking",
    type: "object",
    properties: { starts_on: { type: "string", format: "date" }, note: { type: "string" } },
    required: ["starts_on"],
  },
};

const OPTIONAL_TEXT: PipeInputContract = { ...TEXT_INPUT, optional: true };

const PLURAL_IMAGES: PipeInputContract = {
  concept_ref: "native.Image[]",
  json_schema: {
    type: "array",
    items: { type: "object", properties: { url: { type: "string" } } },
  },
};

const OUTPUT = { concept_ref: "native.Text", multiplicity: "single" } as const;

function contractOf(inputs: Record<string, PipeInputContract>): PipeIOContract {
  return { inputs, output: OUTPUT };
}

/** The panel's own call shape: fields come from the contract, never from us. */
function gate(contract: PipeIOContract, values: Record<string, unknown>) {
  return runSubmitGate(contract, fieldsForContract(contract), values);
}

describe("runSubmitGate", () => {
  it("passes a filled form and hands back the wire payload", () => {
    const contract = contractOf({ quote: TEXT_INPUT });
    const outcome = gate(contract, { quote: "hello" });

    expect(outcome).toEqual({
      ok: true,
      apiInputs: { quote: { concept: "native.Text", content: { text: "hello" } } },
    });
  });

  it("carries the wire's two exceptions through: blank optionals are omitted, empty plurals ship bare", () => {
    const contract = contractOf({
      quote: TEXT_INPUT,
      comments: OPTIONAL_TEXT,
      illustrations: PLURAL_IMAGES,
    });
    const outcome = gate(contract, { quote: "hello", comments: "", illustrations: [] });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.apiInputs).not.toHaveProperty("comments");
    expect(outcome.apiInputs.illustrations).toEqual([]);
  });

  it("names the variable at fault when a required subfield is absent", () => {
    const contract = contractOf({ booking: BOOKING_INPUT });
    const outcome = gate(contract, { booking: {} });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.missingInputs).toEqual(["booking"]);
    expect(outcome.summary).toContain("booking");
  });

  it("falls back to the ajv errors when the scan cannot name anything", () => {
    // Every required field IS filled — just not with a valid value — so the
    // missing-input scan comes up empty. That is a documented legitimate state,
    // and without the fallback the run would be blocked with nothing said about
    // why.
    const contract = contractOf({ booking: BOOKING_INPUT });
    const outcome = gate(contract, { booking: { starts_on: "not-a-date" } });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.missingInputs).toEqual([]);
    expect(outcome.summary).toContain("not-a-date");
  });

  /**
   * Worth stating outright, because it is the reason the Run button gates on
   * `computeReadiness` rather than on this gate: an empty REQUIRED text input
   * reaches ajv as `{ text: "" }`, which is a perfectly valid string. The gate
   * is the last line of defence against a malformed payload, not the thing that
   * notices you have not filled the form in yet.
   */
  it("does not, on its own, catch a required text input left blank", () => {
    const contract = contractOf({ quote: TEXT_INPUT, subject: TEXT_INPUT });

    expect(gate(contract, { quote: "hello" }).ok).toBe(true);
  });

  it("runs a pipe that takes no inputs", () => {
    const outcome = gate(contractOf({}), {});

    expect(outcome).toEqual({ ok: true, apiInputs: {} });
  });

  it("ignores values for variables the contract does not declare", () => {
    const contract = contractOf({ quote: TEXT_INPUT });
    const outcome = gate(contract, { quote: "hello", leftover: "from a previous pipe" });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(Object.keys(outcome.apiInputs)).toEqual(["quote"]);
  });
});

describe("summarizeVerdict", () => {
  it("prefers the named variables over the raw errors", () => {
    const errors: RunInputError[] = [{ stack: "'Quote' is required", name: "required" }];

    expect(summarizeVerdict(["quote", "subject"], errors, {})).toBe(
      "Missing required fields in: quote, subject",
    );
  });

  it("still says something when there is neither a name nor an error", () => {
    expect(summarizeVerdict([], [], {})).toBe("Please fill in all required fields before running.");
  });

  it("quotes at most a handful of errors, so the line stays readable", () => {
    const errors: RunInputError[] = Array.from({ length: 7 }, (_, index) => ({
      stack: `error number ${index}`,
    }));
    const summary = summarizeVerdict([], errors, {});

    expect(summary).toContain("error number 0");
    expect(summary).not.toContain("error number 3");
  });
});

describe("defaultValidationTranslate", () => {
  it("interpolates the values the kernel supplies", () => {
    expect(
      defaultValidationTranslate("inputPanel.pickValidDate", { label: "Due", value: "13/45" }),
    ).toBe("Due: “13/45” is not a valid date");
  });

  it("leaves a placeholder it was given no value for visible rather than blank", () => {
    expect(defaultValidationTranslate("inputPanel.pickValidDate", { label: "Due" })).toContain(
      "{value}",
    );
  });
});
