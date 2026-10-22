/**
 * What the two form entries carry of the kernel's file and example sources.
 *
 * `./form` and `./form/react` re-export the kernel wholesale, so a host reaches
 * the sources' shapes, the rules that write a chosen file into a value, the
 * controls and their strings through this package and never names the kernel
 * itself, which is the rule that keeps one copy of it in a host's tree. These
 * assertions are what notice an entry that stops carrying them: a re-export
 * narrowed to a list, or a kernel range from before the sources existed. The
 * sources' behaviour is the kernel's and is tested there; what `RunPanel` does
 * with them is pinned by its stories.
 */
import { describe, expect, expectTypeOf, it } from "vitest";
import * as form from "@form/index";
import type {
  ExampleSource as CoreExampleSource,
  ExampleSourcePage,
  ExampleSourceQuery,
  FileSource as CoreFileSource,
  FileSourcePage,
  FileSourceQuery,
  FileSourceScope,
  FormExample,
  SourceFile,
} from "@form/index";
import * as formReact from "@form/react/index";
import type {
  ExampleSource,
  FieldEnv,
  FieldStrings,
  FileSource,
  FillWithExampleProps,
  FilePickerProps,
  RunPanelProps,
} from "@form/react/index";

describe("the ./form entry", () => {
  it("carries the rules that write a chosen file into a value", () => {
    expect(form.sourceFileValue).toBeTypeOf("function");
    expect(form.addChosenFiles).toBeTypeOf("function");
    expect(form.chosenFilesAdded).toBeTypeOf("function");
    expect(form.roomForChosenFiles).toBeTypeOf("function");
  });

  it("carries the helpers that read an example back and compare two forms", () => {
    expect(form.runValuesFromInputs).toBeTypeOf("function");
    expect(form.sameRunValues).toBeTypeOf("function");
  });

  it("carries the sources' shapes, the same ones the react entry carries", () => {
    expectTypeOf<CoreFileSource>().toEqualTypeOf<FileSource>();
    expectTypeOf<CoreExampleSource>().toEqualTypeOf<ExampleSource>();
    expectTypeOf<CoreFileSource["list"]>().toEqualTypeOf<
      (query: FileSourceQuery) => Promise<FileSourcePage>
    >();
    expectTypeOf<CoreFileSource["initialScope"]>().toEqualTypeOf<FileSourceScope>();
    expectTypeOf<FileSourcePage["files"]>().toEqualTypeOf<readonly SourceFile[]>();
    expectTypeOf<CoreExampleSource["list"]>().toEqualTypeOf<
      (query: ExampleSourceQuery) => Promise<ExampleSourcePage>
    >();
    expectTypeOf<ExampleSourcePage["examples"]>().toEqualTypeOf<readonly FormExample[]>();
  });
});

describe("the ./form/react entry", () => {
  it("carries the sources' controls, for a host rendering its own form", () => {
    expect(formReact.FillWithExample).toBeTypeOf("function");
    expect(formReact.FilePicker).toBeTypeOf("function");
    expect(formReact.FilePickerEntry).toBeTypeOf("function");
    expectTypeOf<FillWithExampleProps["source"]>().toEqualTypeOf<ExampleSource>();
    expectTypeOf<FilePickerProps["source"]>().toEqualTypeOf<FileSource>();
  });

  it("carries the field environment that hands a file source to every control", () => {
    expectTypeOf<FieldEnv["fileSource"]>().toEqualTypeOf<FileSource | undefined>();
  });

  it("types RunPanel's two source props as the kernel's seams, and its fill callback", () => {
    expectTypeOf<RunPanelProps["fileSource"]>().toEqualTypeOf<FileSource | undefined>();
    expectTypeOf<RunPanelProps["exampleSource"]>().toEqualTypeOf<ExampleSource | undefined>();
    expectTypeOf<RunPanelProps["onFill"]>().toEqualTypeOf<
      ((values: Record<string, unknown>, example: FormExample) => void) | undefined
    >();
  });

  it("carries the strings the sources' controls speak, in every supplied language", () => {
    expectTypeOf<FieldStrings>().toHaveProperty("chooseFromSource");
    expectTypeOf<FieldStrings>().toHaveProperty("fillWithExample");
    expectTypeOf<FieldStrings>().toHaveProperty("replaceEnteredTitle");
    for (const strings of [formReact.EN_FIELD_STRINGS, formReact.FR_FIELD_STRINGS]) {
      expect(strings.chooseFromSource).toBeTypeOf("string");
      expect(strings.fillWithExample).toBeTypeOf("string");
      expect(strings.replaceEnteredTitle).toBeTypeOf("string");
    }
  });
});
