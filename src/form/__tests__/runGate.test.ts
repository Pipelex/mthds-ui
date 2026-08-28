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
import type {
  PipeInputFormDescriptor,
  PipeIOContract,
  PipeInputContract,
  RunInputError,
} from "@pipelex/mthds-form";
import { fieldsForContract } from "@pipelex/mthds-form";
import {
  defaultValidationTranslate,
  runSubmitGate,
  summarizeVerdict,
  type RunPanelTranslate,
} from "../runGate";

const TEXT_INPUT: PipeInputContract = {
  concept_ref: "native.Text",
  presence: "plain",
  multiplicity: "single",
  item_count: null,
  json_schema: {
    title: "native.Text",
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
  presence: "plain",
  multiplicity: "single",
  item_count: null,
  json_schema: {
    title: "demo.Booking",
    type: "object",
    properties: { starts_on: { type: "string", format: "date" }, note: { type: "string" } },
    required: ["starts_on"],
  },
};

const OPTIONAL_TEXT: PipeInputContract = { ...TEXT_INPUT, presence: "optional" };

const PLURAL_IMAGES: PipeInputContract = {
  concept_ref: "native.Image",
  presence: "plain",
  multiplicity: "variable",
  item_count: null,
  json_schema: {
    type: "array",
    items: { type: "object", properties: { url: { type: "string" } } },
  },
};

const OUTPUT = {
  concept_ref: "native.Text",
  multiplicity: "single",
  item_count: null,
  optional: false,
} as const;

/**
 * A top-level descriptor node, read off the artifact the kernel does export.
 *
 * `mthds/protocol` names this `InputFormTopLevelField`, but the kernel
 * re-exports only `InputForm` and `PipeInputFormDescriptor` — and `mthds`
 * reaches this repo as the kernel's peer rather than as a dependency of our
 * own, so importing the name from there would be undeclared. Indexed access
 * gets the same type from what is exported.
 */
type TopLevelField = PipeInputFormDescriptor["fields"][number];

/**
 * One input slot, stated ONCE as the pair the wire sends: the contract entry
 * (what the slot accepts) and the descriptor node (what it is).
 *
 * Kept together rather than in two parallel maps because the kernel co-walks
 * them, so a slot described in one and not the other does not fail — it renders
 * a field the payload has no schema for, or a schema no field fills. The
 * descriptor node is a function of the name because a top-level field carries
 * its authored identifier inline, and the map key is where that name lives
 * here; deriving it removes the only place these two could disagree.
 */
interface TestSlot {
  contract: PipeInputContract;
  field: (name: string) => TopLevelField;
}

/** `native.Text` is prose over a `text` wrapper — what the corpus fixtures show. */
const TEXT_SLOT: TestSlot = {
  contract: TEXT_INPUT,
  field: (name) => ({
    kind: "prose",
    name,
    concept_ref: "native.Text",
    refines: ["native.Text"],
    required: true,
    presence: "plain",
    gating: true,
  }),
};

const OPTIONAL_TEXT_SLOT: TestSlot = {
  contract: OPTIONAL_TEXT,
  field: (name) => ({
    kind: "prose",
    name,
    concept_ref: "native.Text",
    refines: ["native.Text"],
    required: false,
    presence: "optional",
    gating: false,
  }),
};

const BOOKING_SLOT: TestSlot = {
  contract: BOOKING_INPUT,
  field: (name) => ({
    kind: "object",
    name,
    concept_ref: "demo.Booking",
    required: true,
    presence: "plain",
    gating: true,
    fields: [
      { kind: "text", name: "starts_on", required: true, format: "date" },
      { kind: "text", name: "note", required: false },
    ],
  }),
};

/** A variable list: required, yet `[]` satisfies it — so it never gates. */
const PLURAL_IMAGES_SLOT: TestSlot = {
  contract: PLURAL_IMAGES,
  field: (name) => ({
    kind: "list",
    name,
    concept_ref: "native.Image",
    required: true,
    presence: "plain",
    gating: false,
    item: { kind: "image", concept_ref: "native.Image", required: true },
  }),
};

/** A pipe's two artifacts, exactly as the panel receives them. */
interface PipeArtifacts {
  contract: PipeIOContract;
  descriptor: PipeInputFormDescriptor;
}

function pipeOf(slots: Record<string, TestSlot>): PipeArtifacts {
  return {
    contract: {
      inputs: Object.fromEntries(
        Object.entries(slots).map(([name, slot]) => [name, slot.contract]),
      ),
      output: OUTPUT,
    },
    descriptor: {
      fields: Object.entries(slots).map(([name, slot]) => slot.field(name)),
    },
  };
}

/** The panel's own call shape: fields come from the two artifacts, never from us. */
function gate({ contract, descriptor }: PipeArtifacts, values: Record<string, unknown>) {
  return runSubmitGate(contract, fieldsForContract(contract, descriptor), values);
}

describe("runSubmitGate", () => {
  it("passes a filled form and hands back the wire payload", () => {
    const pipe = pipeOf({ quote: TEXT_SLOT });
    const outcome = gate(pipe, { quote: "hello" });

    expect(outcome).toEqual({
      ok: true,
      apiInputs: { quote: { concept: "native.Text", content: { text: "hello" } } },
    });
  });

  it("carries the wire's two exceptions through: blank optionals are omitted, empty plurals ship bare", () => {
    const pipe = pipeOf({
      quote: TEXT_SLOT,
      comments: OPTIONAL_TEXT_SLOT,
      illustrations: PLURAL_IMAGES_SLOT,
    });
    const outcome = gate(pipe, { quote: "hello", comments: "", illustrations: [] });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.apiInputs).not.toHaveProperty("comments");
    expect(outcome.apiInputs.illustrations).toEqual([]);
  });

  /**
   * The module's stated invariant — build the payload from the PREPARED data,
   * so the pruning reaches the wire — was pinned by nothing until now: every
   * other fixture here is a shape where prepared and raw agree at the payload
   * level, so swapping `preparedData` for the raw values left the whole file
   * green. A structured concept with an untouched OPTIONAL subfield is the
   * shape that tells them apart, and it has to be a case the gate ACCEPTS,
   * since a rejected run never reaches the payload at all.
   */
  it("builds the payload from the prepared data, so an untouched optional subfield is pruned", () => {
    const pipe = pipeOf({ booking: BOOKING_SLOT });
    const outcome = gate(pipe, { booking: { starts_on: "2026-01-01" } });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const booking = outcome.apiInputs.booking as { content?: Record<string, unknown> };
    expect(booking.content).toEqual({ starts_on: "2026-01-01" });
    expect(booking.content).not.toHaveProperty("note");
  });

  it("names the variable at fault when a required subfield is absent", () => {
    const pipe = pipeOf({ booking: BOOKING_SLOT });
    const outcome = gate(pipe, { booking: {} });

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
    const pipe = pipeOf({ booking: BOOKING_SLOT });
    const outcome = gate(pipe, { booking: { starts_on: "not-a-date" } });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.missingInputs).toEqual([]);
    expect(outcome.summary).toContain("not-a-date");
  });

  /**
   * The assertion this file used to make was the opposite one, and it was the
   * shape of a real hole rather than a property worth pinning: an empty
   * REQUIRED text input reaches ajv as `{ text: "" }`, a perfectly valid
   * string, so schema validation alone waves it through. The Run button never
   * did — it gates on `computeReadiness` — which left the two halves refusing
   * different things, and a host driving the panel programmatically (or any
   * caller reaching the gate without the button in front of it) could start a
   * run the interface would have blocked.
   *
   * `gateRunInputs` closes it by re-running readiness' own predicates after
   * ajv, so the name comes back rather than the run going out.
   */
  it("catches a required text input left blank, and names it", () => {
    const pipe = pipeOf({ quote: TEXT_SLOT, subject: TEXT_SLOT });
    const outcome = gate(pipe, { quote: "hello" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.missingInputs).toEqual(["subject"]);
    expect(outcome.summary).toContain("subject");
  });

  /**
   * The same rule one level down, and the reason the kernel's own pair of
   * predicates had to be the ones used: whitespace is not a value. This is the
   * case a lookalike emptiness check gets wrong.
   */
  it("counts a whitespace-only required input as blank", () => {
    const pipe = pipeOf({ quote: TEXT_SLOT });
    const outcome = gate(pipe, { quote: "   " });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.missingInputs).toEqual(["quote"]);
  });

  it("runs a pipe that takes no inputs", () => {
    const outcome = gate(pipeOf({}), {});

    expect(outcome).toEqual({ ok: true, apiInputs: {} });
  });

  it("ignores values for variables the contract does not declare", () => {
    const pipe = pipeOf({ quote: TEXT_SLOT });
    const outcome = gate(pipe, { quote: "hello", leftover: "from a previous pipe" });

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

    // BOTH edges of the cap, not just the far one: asserting only that the
    // fourth error is absent passes just as happily with the cap silently
    // reduced to one, which leaves the constant this test exists to pin free to
    // shrink to a third of its documented size.
    expect(summary).toContain("error number 0");
    expect(summary).toContain("error number 2");
    expect(summary).not.toContain("error number 3");
  });

  /**
   * Which of the three routes a rejected run takes is the KERNEL's decision —
   * it depends on whether the verdict named variables, produced raw errors, or
   * neither. A host cannot predict that, so covering one route says nothing
   * about the seam: the summary would still revert to English on the others.
   *
   * That is not hypothetical. The named-variables line was hardcoded English
   * while the only test of the seam happened to exercise the fallback, so the
   * gap was invisible until a kernel version shifted the same input onto the
   * other route. Each route therefore gets its own assertion.
   */
  describe("routes every line through the host's translator", () => {
    const shout: RunPanelTranslate = (key) => `[${key}]`;

    it("translates the named-variables line", () => {
      expect(summarizeVerdict(["quote"], [], {}, shout)).toBe("[runPanel.missingInputs]");
    });

    it("translates the nothing-else-to-say line", () => {
      expect(summarizeVerdict([], [], {}, shout)).toBe("[runPanel.fillRequired]");
    });

    // The third route — the raw-error line — passes `t` to the kernel's
    // `describeValidationError`, which decides for itself whether a given error
    // needs a message key or reads out its own stack. Asserting what it picks
    // would pin this repo to kernel internals (Decision C); that the translator
    // reaches it at all is covered end to end by the
    // `HostTranslatesTheErrorSummary` story.

    it("hands the variable names to the host as an interpolation value", () => {
      // A host's template puts the names where its own grammar needs them, so
      // they have to arrive as a VALUE rather than pre-baked into our English.
      const translate: RunPanelTranslate = (key, values) =>
        key === "runPanel.missingInputs" ? `Champs manquants : ${values?.inputs}` : key;

      expect(summarizeVerdict(["quote", "subject"], [], {}, translate)).toBe(
        "Champs manquants : quote, subject",
      );
    });
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
