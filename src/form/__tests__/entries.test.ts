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
import type { ComponentProps } from "react";
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
  SearchResultContentView,
  SearchSourceView,
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
  FilePickerSource,
  MarkdownCitation,
  MarkdownProps,
  RenditionRequest,
  ResolveRendition,
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

  it("carries the readers of a search result, for a host drawing one its own way", () => {
    // Kernel 0.27.0: the readers the kernel's search arm draws with.
    expect(form.NATIVE_SEARCH_RESULT_CONCEPT_REF).toBe("native.SearchResult");
    expect(form.isNativeSearchResultNode).toBeTypeOf("function");
    expect(form.readSearchResultContent).toBeTypeOf("function");
    expect(form.citedSource).toBeTypeOf("function");
    expect(form.splitCitations).toBeTypeOf("function");
    expectTypeOf(form.readSearchResultContent).returns.toEqualTypeOf<
      SearchResultContentView | undefined
    >();
    expectTypeOf<SearchResultContentView["sources"][number]>().toEqualTypeOf<SearchSourceView>();
  });
});

describe("the ./form/react entry", () => {
  it("carries the sources' controls, for a host rendering its own form", () => {
    expect(formReact.FillWithExample).toBeTypeOf("function");
    expect(formReact.FilePicker).toBeTypeOf("function");
    expect(formReact.FilePickerEntry).toBeTypeOf("function");
    expectTypeOf<FillWithExampleProps["source"]>().toEqualTypeOf<ExampleSource>();
    expectTypeOf<FilePickerProps["source"]>().toEqualTypeOf<FilePickerSource>();
  });

  it("carries the field environment that hands a file source to every control", () => {
    // A `FilePickerSource` is a `FileSource` with an optional `renderGlyph`
    // (kernel 0.23.2), so every `FileSource` a host already passes is one.
    expectTypeOf<FieldEnv["fileSource"]>().toEqualTypeOf<FilePickerSource | undefined>();
    expectTypeOf<FileSource>().toExtend<FilePickerSource>();
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

  it("carries the result provider's seam for a host's smaller copies of its pictures", () => {
    // Kernel 0.26.0. A host rendering the result view itself mounts the
    // re-exported `ResultEnvProvider` and passes `resolveRendition` there.
    expect(formReact.useResolveRendition).toBeTypeOf("function");
    expectTypeOf<RenditionRequest>().toEqualTypeOf<{ width: number }>();
    expectTypeOf<ResolveRendition>().toEqualTypeOf<
      (url: string, request: RenditionRequest) => string | undefined
    >();
    expectTypeOf<
      ComponentProps<typeof formReact.ResultEnvProvider>["resolveRendition"]
    >().toEqualTypeOf<ResolveRendition | undefined>();
  });

  it("carries the strings of a PDF the browser cannot show and of the picture viewer", () => {
    // Kernel 0.26.0. A host supplying a complete `FieldStrings` adds these.
    const keys = [
      "pdfViewerUnavailable",
      "openInNewTab",
      "viewImage",
      "imagePosition",
      "previousImage",
      "nextImage",
      "openOriginal",
    ] as const satisfies readonly (keyof FieldStrings)[];
    for (const strings of [formReact.EN_FIELD_STRINGS, formReact.FR_FIELD_STRINGS]) {
      for (const key of keys) expect(strings[key], key).toBeDefined();
    }
  });

  it("carries the heading of a search result's sources, and where a citation leads", () => {
    // Kernel 0.27.0. A host supplying a complete `FieldStrings` adds
    // `searchSources`; a host typesetting its own text links citations through
    // the re-exported `Markdown`'s `citations`.
    for (const strings of [formReact.EN_FIELD_STRINGS, formReact.FR_FIELD_STRINGS]) {
      expect(strings.searchSources).toBeTypeOf("string");
    }
    expectTypeOf<MarkdownCitation>().toEqualTypeOf<{ href: string; label: string }>();
    expectTypeOf<MarkdownProps["citations"]>().toEqualTypeOf<
      ((citation: number) => MarkdownCitation | undefined) | undefined
    >();
  });
});
