/**
 * What the `./form/generative/headless` entry carries of the kernel's
 * `./generative/headless` entry.
 *
 * The entry re-exports the half of the generative layer that renders nothing,
 * wholesale, so a host builds the designer's inputs and checks a stored layout
 * on its server through this package and never names the kernel. These
 * assertions notice an entry that stops carrying it: a re-export narrowed to a
 * list, a copy of the kernel's functions rather than the kernel's own, a client
 * directive that would turn every function into a reference a server cannot
 * call, or a split from `./form/generative` that left the two entries with
 * different functions or a different prompt pin. The checks' guarantees are the
 * kernel's and are tested there; here one composer layout goes through the
 * checks a producer runs, over a descriptor generated from a real bundle.
 *
 * What the built file carries, and that it loads under the `react-server`
 * condition, only the packed tarball shows: `make smoke-pack` checks both.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";
import * as kernelHeadless from "@pipelex/mthds-form/generative/headless";
import type {
  DesignerBrief as KernelDesignerBrief,
  DesignerCatalog as KernelDesignerCatalog,
  Frame as KernelFrame,
  LayoutCheck as KernelLayoutCheck,
  LayoutDescriptor as KernelLayoutDescriptor,
  SpecVerdict as KernelSpecVerdict,
} from "@pipelex/mthds-form/generative/headless";
import { fieldsForContract, getPipeInputForm, getPipeIOContract } from "@form/index";
import * as generative from "@form/generative/index";
import * as headless from "@form/generative/headless/index";
import {
  FRAMES,
  PROMPT_HASH,
  REPAIR_ATTEMPTS,
  designerCatalog,
  frameCatalog,
  inputBrief,
  layoutCheckProblems,
  validateAgainstCatalog,
  type DesignerBrief,
  type DesignerCatalog,
  type Frame,
  type LayoutCheck,
  type LayoutDescriptor,
  type SpecVerdict,
} from "@form/generative/headless/index";
import {
  CONTRACTS_SINGLE_PIPE,
  INPUT_FORM_SINGLE_PIPE,
} from "@form/react/__stories__/contracts/_generated/pipeline_01";

const ENTRY_SOURCE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../generative/headless/index.ts",
);

/** The generated fixture's one pipe: it summarizes a text, its only input. */
const DOMAIN = "text_processing";
const PIPE_CODE = "summarize";

function summarizeFields() {
  const contract = getPipeIOContract(CONTRACTS_SINGLE_PIPE, DOMAIN, PIPE_CODE);
  const descriptor = getPipeInputForm(INPUT_FORM_SINGLE_PIPE, DOMAIN, PIPE_CODE);
  if (contract === undefined || descriptor === undefined) {
    throw new Error("the generated fixture no longer carries text_processing.summarize");
  }
  return fieldsForContract(contract, descriptor);
}

/** What an element's `on` binds, as the checks take a layout. */
type ElementEvents = NonNullable<
  Parameters<typeof validateAgainstCatalog>[0]["elements"][string]["on"]
>;

/**
 * A composer for that pipe, as a model following its brief would write it: the
 * composer's panel, the one input inside it, and whatever its own button does,
 * the button being the control that runs the method in this frame.
 */
function summarizeComposer(on: ElementEvents) {
  return {
    root: "composer",
    elements: {
      composer: {
        type: "Composer",
        props: { headline: "Summarize a text", runLabel: "Summarize" },
        on,
        children: ["text"],
      },
      text: {
        type: "Textarea",
        props: { label: "Text", name: "text", value: { $bindState: "/inputs/text" } },
        children: [],
      },
    },
  };
}

describe("the ./form/generative/headless entry", () => {
  it("re-exports the kernel's headless entry wholesale", () => {
    expect(Object.keys(headless).sort()).toEqual(Object.keys(kernelHeadless).sort());
  });

  it("is no client module, so a server component or a server action can call it", () => {
    // A directive here turns every export into a client reference on a React
    // Server Components host's server, which throws when called.
    const source = readFileSync(ENTRY_SOURCE, "utf8");
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });

  it("re-exports the kernel's own functions, not copies of them", () => {
    expect(headless.designerCatalog).toBe(kernelHeadless.designerCatalog);
    expect(headless.frameCatalog).toBe(kernelHeadless.frameCatalog);
    expect(headless.inputBrief).toBe(kernelHeadless.inputBrief);
    expect(headless.resultBrief).toBe(kernelHeadless.resultBrief);
    expect(headless.seedLine).toBe(kernelHeadless.seedLine);
    expect(headless.specFromJsonl).toBe(kernelHeadless.specFromJsonl);
    expect(headless.validateAgainstCatalog).toBe(kernelHeadless.validateAgainstCatalog);
    expect(headless.layoutFits).toBe(kernelHeadless.layoutFits);
    expect(headless.layoutCheckProblems).toBe(kernelHeadless.layoutCheckProblems);
  });

  it("is the half of ./form/generative that renders nothing: the same functions and the same pin", () => {
    // A host stamps a layout on its server with this entry's pin and compares
    // the stamp wherever it renders, through the client entry.
    for (const name of Object.keys(headless)) {
      expect(generative, name).toHaveProperty(name);
      expect((generative as Record<string, unknown>)[name], name).toBe(
        (headless as Record<string, unknown>)[name],
      );
    }
    expect(PROMPT_HASH).toBe(generative.PROMPT_HASH);
    expect(PROMPT_HASH).toMatch(/^[0-9a-f]{12}$/);
    expect(Object.keys(headless)).not.toContain("GenerativePage");
    expect(Object.keys(headless)).not.toContain("BrandBar");
  });

  it("carries the producer's types, the same ones the kernel declares", () => {
    expectTypeOf<DesignerCatalog>().toEqualTypeOf<KernelDesignerCatalog>();
    expectTypeOf<DesignerBrief>().toEqualTypeOf<KernelDesignerBrief>();
    expectTypeOf<Frame>().toEqualTypeOf<KernelFrame>();
    expectTypeOf<LayoutCheck>().toEqualTypeOf<KernelLayoutCheck>();
    expectTypeOf<LayoutDescriptor>().toEqualTypeOf<KernelLayoutDescriptor>();
    expectTypeOf<SpecVerdict>().toEqualTypeOf<KernelSpecVerdict>();
    expectTypeOf(designerCatalog).returns.toEqualTypeOf<DesignerCatalog>();
    expectTypeOf(inputBrief).returns.toEqualTypeOf<DesignerBrief>();
    expectTypeOf(layoutCheckProblems).returns.toEqualTypeOf<string[]>();
  });
});

describe("what a producer runs on its server, through the entry", () => {
  it("names the frames, and builds the composer's vocabulary without the page's own chrome", () => {
    expect([...FRAMES].sort()).toEqual(["composer", "page", "result"]);
    const names = designerCatalog({ frame: "composer" }).components.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(["Composer", "Textarea"]));
    expect(names).not.toContain("AppBar");
    expect(names).not.toContain("Cta");
  });

  it("projects a composer's brief from the descriptor", () => {
    const brief = inputBrief({ pipeRef: `${DOMAIN}.${PIPE_CODE}` }, summarizeFields(), {
      frame: "composer",
      style: "quiet",
    });
    expect(brief.side).toBe("input");
    expect(brief.paths.map((entry) => entry.path)).toEqual(["/inputs/text"]);
  });

  it("accepts a composer that runs on its own button", () => {
    const composer = summarizeComposer({ press: { action: "run" } });
    expect(validateAgainstCatalog(composer, frameCatalog("composer"))).toEqual({
      ok: true,
      problems: [],
    });
    expect(
      layoutCheckProblems(composer, {
        frame: "composer",
        descriptor: { inputs: summarizeFields() },
      }),
    ).toEqual([]);
  });

  it("accepts the run after the form's own validation, as one press", () => {
    const composer = summarizeComposer({
      press: [{ action: "validateForm" }, { action: "run" }],
    });
    expect(
      layoutCheckProblems(composer, {
        frame: "composer",
        descriptor: { inputs: summarizeFields() },
      }),
    ).toEqual([]);
  });

  it("refuses a run chained under another action, in words the repair pass reads", () => {
    // Kernel 0.32.0: a run under `onError` started a second billed run as the
    // first one failed, and a run under `onSuccess` either never fires or does
    // the same.
    for (const chain of ["onSuccess", "onError"] as const) {
      const composer = summarizeComposer({
        press: { action: "validateForm", [chain]: { action: "run" } },
      });
      expect(validateAgainstCatalog(composer, frameCatalog("composer")).ok, chain).toBe(false);
      const problems = layoutCheckProblems(composer, {
        frame: "composer",
        descriptor: { inputs: summarizeFields() },
      });
      expect(problems.join("\n"), chain).toContain(`on.press.${chain} chains a run`);
    }
  });

  it("answers a layout that is not one with a problem line rather than a throw", () => {
    expect(REPAIR_ATTEMPTS).toBeGreaterThan(0);
    expect(
      layoutCheckProblems(null as never, {
        frame: "composer",
        descriptor: { inputs: summarizeFields() },
      }).length,
    ).toBeGreaterThan(0);
  });
});
