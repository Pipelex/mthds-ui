/**
 * What the `./form/generative` entry carries of the kernel's `./generative` entry.
 *
 * The entry re-exports the kernel's generative layer wholesale, so a host
 * renders a produced layout, and hands the designer method its catalog and its
 * brief, through this package and never names the kernel itself. These
 * assertions notice an entry that stops carrying it: a re-export narrowed to a
 * list, a copy of the kernel's functions rather than the kernel's own, or a
 * kernel range from before the layer existed. The layer's guarantees are the
 * kernel's and are tested there; here one layout goes through the checks a host
 * runs before it renders one, over a descriptor generated from a real bundle,
 * to show the entry is wired to code that works rather than to names that
 * resolve.
 *
 * The method files shipped beside the entry, `./form/layout-design.mthds` and
 * `./form/layout-sample.mthds`, are copies the build takes, so only the packed
 * tarball holds them: `make smoke-pack` is where they are checked against the
 * kernel a consumer installs.
 */
import { describe, expect, expectTypeOf, it } from "vitest";
import * as kernelGenerative from "@pipelex/mthds-form/generative";
import type {
  BrandBarProps as KernelBrandBarProps,
  CheckedField as KernelCheckedField,
  DesignerBrief as KernelDesignerBrief,
  DesignerCatalog as KernelDesignerCatalog,
  ElementErrorHandler as KernelElementErrorHandler,
  ElementErrorInfo as KernelElementErrorInfo,
  GenerativePageProps as KernelGenerativePageProps,
  LayoutDescriptor as KernelLayoutDescriptor,
  SpecVerdict as KernelSpecVerdict,
} from "@pipelex/mthds-form/generative";
import { fieldsForContract, getPipeInputForm, getPipeIOContract } from "@form/index";
import * as generative from "@form/generative/index";
import * as headless from "@form/generative/headless/index";
import {
  DESIGNER_BRIEF_CONCEPT,
  DESIGNER_CATALOG_CONCEPT,
  PROMPT_HASH,
  designerCatalog,
  inputBrief,
  layoutFits,
  layoutProblems,
  specFromJsonl,
  specToJsonl,
  validateAgainstCatalog,
  type BrandBarProps,
  type CheckedField,
  type DesignerBrief,
  type DesignerCatalog,
  type ElementErrorHandler,
  type ElementErrorInfo,
  type GenerativePageProps,
  type LayoutDescriptor,
  type SpecVerdict,
} from "@form/generative/index";
import {
  CONTRACTS_SINGLE_PIPE,
  INPUT_FORM_SINGLE_PIPE,
} from "@form/react/__stories__/contracts/_generated/pipeline_01";

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

/**
 * A layout for that pipe, as a model following its brief would write it: a
 * heading, a text area bound to the one input, and the call to action that
 * runs the method.
 */
const SUMMARIZE_LAYOUT = {
  root: "page",
  elements: {
    page: { type: "Stack", props: { gap: "md" }, children: ["title", "text", "go"] },
    title: { type: "Heading", props: { text: "Summarize a text", level: "h1" }, children: [] },
    text: {
      type: "Textarea",
      props: { label: "Text", name: "text", value: { $bindState: "/inputs/text" } },
      children: [],
    },
    go: {
      type: "Cta",
      props: { label: "Summarize" },
      on: { press: { action: "run" } },
      children: [],
    },
  },
};

describe("the ./form/generative entry", () => {
  it("re-exports the kernel's generative entry wholesale", () => {
    expect(Object.keys(generative).sort()).toEqual(Object.keys(kernelGenerative).sort());
  });

  it("re-exports the kernel's own components and functions, not copies of them", () => {
    expect(generative.GenerativePage).toBe(kernelGenerative.GenerativePage);
    expect(generative.generativeRegistry).toBe(kernelGenerative.generativeRegistry);
    expect(generative.catalog).toBe(kernelGenerative.catalog);
    expect(generative.validateAgainstCatalog).toBe(kernelGenerative.validateAgainstCatalog);
    expect(generative.layoutFits).toBe(kernelGenerative.layoutFits);
    expect(generative.specFromJsonl).toBe(kernelGenerative.specFromJsonl);
    expect(generative.designerCatalog).toBe(kernelGenerative.designerCatalog);
    expect(generative.inputBrief).toBe(kernelGenerative.inputBrief);
    expect(generative.resultBrief).toBe(kernelGenerative.resultBrief);
  });

  it("carries the brand's bar a host draws as its own chrome (kernel 0.32.0)", () => {
    expect(generative.BrandBar).toBe(kernelGenerative.BrandBar);
    expect(generative.BrandProvider).toBe(kernelGenerative.BrandProvider);
    expectTypeOf<BrandBarProps>().toEqualTypeOf<KernelBrandBarProps>();
  });

  it("carries the page's element-error seam a host falls back to its plain view on (kernel 0.32.0)", () => {
    expectTypeOf<ElementErrorHandler>().toEqualTypeOf<KernelElementErrorHandler>();
    expectTypeOf<ElementErrorInfo>().toEqualTypeOf<KernelElementErrorInfo>();
    expectTypeOf<GenerativePageProps["onElementError"]>().toEqualTypeOf<
      ElementErrorHandler | undefined
    >();
    expectTypeOf<ElementErrorInfo["type"]>().toEqualTypeOf<string>();
  });

  it("carries what a host's own checked control and hidden panel need (kernel 0.33.0 and 0.34.0)", () => {
    // A host's own control that carries checks calls `useCheckedField` in place
    // of json-render's `useFieldValidation` and attaches the `focusRef` it
    // returns (0.34.0) to what a refused run should focus; a host's own
    // component that hides part of a page wraps each panel in `RevealPanel`.
    expect(generative.useCheckedField).toBe(kernelGenerative.useCheckedField);
    expect(generative.RevealPanel).toBe(kernelGenerative.RevealPanel);
    expectTypeOf<CheckedField>().toEqualTypeOf<KernelCheckedField>();
    expectTypeOf(generative.useCheckedField).returns.toEqualTypeOf<CheckedField>();
    expectTypeOf<CheckedField["focusRef"]>().toEqualTypeOf<(element: HTMLElement | null) => void>();
  });

  it("carries the checks' verdict with its flag (kernel 0.33.0)", () => {
    expect(generative.layoutCheck).toBe(kernelGenerative.layoutCheck);
  });

  it("carries the whole of the headless entry, the same functions", () => {
    // `./form/generative/headless` is the half of this entry a server imports;
    // a client host keeps importing all of it from here.
    for (const name of Object.keys(headless)) {
      expect((generative as Record<string, unknown>)[name], name).toBe(
        (headless as Record<string, unknown>)[name],
      );
    }
  });

  it("carries the kernel's prompt pin and the concepts the designer's inputs travel under", () => {
    expect(PROMPT_HASH).toBe(kernelGenerative.PROMPT_HASH);
    expect(PROMPT_HASH).toMatch(/^[0-9a-f]{12}$/);
    expect(DESIGNER_CATALOG_CONCEPT).toBe("generative.Catalog");
    expect(DESIGNER_BRIEF_CONCEPT).toBe("generative.Brief");
  });

  it("carries the layer's types, the same ones the kernel declares", () => {
    expectTypeOf<GenerativePageProps>().toEqualTypeOf<KernelGenerativePageProps>();
    expectTypeOf<DesignerCatalog>().toEqualTypeOf<KernelDesignerCatalog>();
    expectTypeOf<DesignerBrief>().toEqualTypeOf<KernelDesignerBrief>();
    expectTypeOf<LayoutDescriptor>().toEqualTypeOf<KernelLayoutDescriptor>();
    expectTypeOf<SpecVerdict>().toEqualTypeOf<KernelSpecVerdict>();
    expectTypeOf(designerCatalog).returns.toEqualTypeOf<DesignerCatalog>();
    expectTypeOf(inputBrief).returns.toEqualTypeOf<DesignerBrief>();
  });
});

describe("what a producer hands the designer method, through the entry", () => {
  it("builds the catalog as data, its run action among the actions", () => {
    const data = designerCatalog();
    const components = data.components.map((component) => component.name);
    expect(components).toEqual(expect.arrayContaining(["Stack", "Heading", "Textarea", "Cta"]));
    expect(data.actions.map((action) => action.name)).toContain("run");
  });

  it("projects the brief from the descriptor, one path per input", () => {
    const brief = inputBrief({ pipeRef: `${DOMAIN}.${PIPE_CODE}` }, summarizeFields());
    expect(brief.side).toBe("input");
    expect(brief.pipe_ref).toBe(`${DOMAIN}.${PIPE_CODE}`);
    expect(brief.paths.map((entry) => entry.path)).toEqual(["/inputs/text"]);
  });
});

describe("one layout through the checks a host runs before it renders it", () => {
  it("compiles from the JSONL it is stored as, unchanged", () => {
    expect(specFromJsonl(specToJsonl(SUMMARIZE_LAYOUT))).toEqual(SUMMARIZE_LAYOUT);
  });

  it("is one the catalog can render", () => {
    expect(validateAgainstCatalog(SUMMARIZE_LAYOUT)).toEqual({ ok: true, problems: [] });
  });

  it("fits the descriptor it will be rendered over", () => {
    expect(layoutFits({ inputs: summarizeFields() }, SUMMARIZE_LAYOUT)).toBe(true);
  });

  it("stops fitting once the method takes an input the layout has nowhere to enter", () => {
    const fields = [...summarizeFields(), { kind: "text" as const, name: "tone", required: true }];
    expect(layoutProblems({ inputs: fields }, SUMMARIZE_LAYOUT)).toEqual([
      "/inputs/tone is required, and the layout offers nowhere to enter it",
    ]);
  });

  it("is refused by the catalog when a prop it requires is missing", () => {
    const { label, value } = SUMMARIZE_LAYOUT.elements.text.props;
    const verdict = validateAgainstCatalog({
      ...SUMMARIZE_LAYOUT,
      elements: {
        ...SUMMARIZE_LAYOUT.elements,
        text: { ...SUMMARIZE_LAYOUT.elements.text, props: { label, value } },
      },
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.problems).toEqual([
      { elementKey: "text", message: 'Textarea is missing required prop "name"' },
    ]);
  });
});
