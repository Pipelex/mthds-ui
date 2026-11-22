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
import type { ComponentProps, ReactNode } from "react";
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
  LoadText as CoreLoadText,
  RunField,
  SearchResultContentView,
  SearchSourceView,
  SourceFile,
} from "@form/index";
import * as formReact from "@form/react/index";
import type {
  AskDocumentPdf,
  BytesRequest,
  DocumentPdfAnswer,
  DocumentPdfRequest,
  ExamplePickerSource,
  ExampleSource,
  FieldEnv,
  FieldStrings,
  FileSource,
  FillWithExampleProps,
  FilePickerProps,
  FilePickerSource,
  LoadBytes,
  LoadText,
  MarkdownCitation,
  MethodFormController,
  MarkdownProps,
  OpenExternal,
  PdfWorkerConfig,
  PdfWorkerSource,
  RenditionRequest,
  ResolveDocumentPdf,
  ResolveRendition,
  RunPanelProps,
  UploadedFile,
  UseMethodFormOptions,
} from "@form/react/index";
import type { UploadedFile as KernelUploadedFile } from "@pipelex/mthds-form/react";

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

  it("carries the example source's open capability", () => {
    // Kernel 0.28.0: `open` hands a row's example to the host's own surface,
    // with `fill` the row's own choice of it.
    expectTypeOf<CoreExampleSource["open"]>().toEqualTypeOf<
      ((example: FormExample, fill: () => void) => void) | undefined
    >();
  });

  it("carries the readers of a stored text, for a host loading one before it draws", () => {
    // Kernel 0.37.0: a `Text`, `Markdown`, `Html` or `JSON` value a runtime
    // stored arrives as its reference, read by the value's concept.
    expect(form.storedValueKeyOf).toBeTypeOf("function");
    expect(form.isStoredValueNode).toBeTypeOf("function");
    expect(form.readStoredReference).toBeTypeOf("function");
    expect(form.inlineStoredValue).toBeTypeOf("function");
    expect(form.loadStoredValues).toBeTypeOf("function");
    expect(form.loadedRunValue).toBeTypeOf("function");
    expectTypeOf<CoreLoadText>().toEqualTypeOf<(url: string) => Promise<string>>();
    expectTypeOf<CoreLoadText>().toEqualTypeOf<LoadText>();
  });

  it("carries the rule that says which file inputs the camera fills", () => {
    // Kernel 0.38.0: a document input accepting PDF and an image input
    // accepting JPEG are offered the camera on a touch screen.
    expect(form.takesPhotos).toBeTypeOf("function");
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
    expectTypeOf<FillWithExampleProps["source"]>().toEqualTypeOf<ExamplePickerSource>();
    expectTypeOf<FilePickerProps["source"]>().toEqualTypeOf<FilePickerSource>();
  });

  it("carries the example source a row's second line is drawn from", () => {
    // An `ExamplePickerSource` is an `ExampleSource` with an optional
    // `renderDetail` (kernel 0.28.0), so every `ExampleSource` a host already
    // passes is one, and the kernel's own form takes it as the control does.
    expectTypeOf<ExampleSource>().toExtend<ExamplePickerSource>();
    expectTypeOf<ExamplePickerSource["renderDetail"]>().toEqualTypeOf<
      ((example: FormExample, fields: readonly RunField[]) => ReactNode) | undefined
    >();
    expectTypeOf<UseMethodFormOptions["exampleSource"]>().toEqualTypeOf<
      ExamplePickerSource | undefined
    >();
  });

  it("carries the field environment that hands a file source to every control", () => {
    // A `FilePickerSource` is a `FileSource` with an optional `renderGlyph`
    // (kernel 0.23.2), so every `FileSource` a host already passes is one.
    expectTypeOf<FieldEnv["fileSource"]>().toEqualTypeOf<FilePickerSource | undefined>();
    expectTypeOf<FileSource>().toExtend<FilePickerSource>();
  });

  it("carries the seam by which a field reports a file its camera is still making", () => {
    // Kernel 0.38.0. A host rendering its own fields passes it as `MethodForm`
    // does, from the controller's `preparingFile`, and counts `preparingIds`
    // as uploads in flight.
    expectTypeOf<FieldEnv["onPreparingFile"]>().toEqualTypeOf<
      ((id: string) => () => void) | undefined
    >();
    expectTypeOf<MethodFormController["preparingFile"]>().toEqualTypeOf<
      (id: string) => () => void
    >();
    expectTypeOf<MethodFormController["preparingIds"]>().toEqualTypeOf<ReadonlySet<string>>();
  });

  it("types RunPanel's two source props as the kernel's controls take them, and its fill callback", () => {
    // The panel hands both sources to the kernel's controls as they are, so it
    // takes what they take: a row's glyph and a row's second line reach them.
    expectTypeOf<RunPanelProps["fileSource"]>().toEqualTypeOf<FilePickerSource | undefined>();
    expectTypeOf<RunPanelProps["exampleSource"]>().toEqualTypeOf<ExamplePickerSource | undefined>();
    // Every core source still fits, and so does a host's source typed over its
    // own rows, whose handlers the kernel declares as methods.
    expectTypeOf<FileSource>().toExtend<NonNullable<RunPanelProps["fileSource"]>>();
    expectTypeOf<ExampleSource>().toExtend<NonNullable<RunPanelProps["exampleSource"]>>();
    type HostFile = SourceFile & { readonly folder: string };
    type HostExample = FormExample & { readonly savedBy: string };
    expectTypeOf<FilePickerSource<HostFile>>().toExtend<NonNullable<RunPanelProps["fileSource"]>>();
    expectTypeOf<{
      list: ExampleSource["list"];
      open(example: HostExample, fill: () => void): void;
      renderDetail(example: HostExample, fields: readonly RunField[]): ReactNode;
    }>().toExtend<NonNullable<RunPanelProps["exampleSource"]>>();
    expectTypeOf<RunPanelProps["onFill"]>().toEqualTypeOf<
      ((values: Record<string, unknown>, example: FormExample) => void) | undefined
    >();
  });

  it("carries the kernel's upload result, the one RunPanel and MethodForm both take", () => {
    // The panel once exported an `UploadedFile` of its own, narrower than the
    // kernel's, which shadowed the kernel's in this entry: a host typing
    // `MethodForm`'s `uploadFile` through it got the panel's type instead.
    expectTypeOf<UploadedFile>().toEqualTypeOf<KernelUploadedFile>();
    expectTypeOf<UploadedFile>().toEqualTypeOf<string | { url: string; filename?: string }>();
    expectTypeOf<NonNullable<RunPanelProps["uploadFile"]>>().returns.toEqualTypeOf<
      Promise<UploadedFile>
    >();
  });

  it("carries the strings the sources' controls speak, in every supplied language", () => {
    expectTypeOf<FieldStrings>().toHaveProperty("chooseFromSource");
    expectTypeOf<FieldStrings>().toHaveProperty("fillWithExample");
    expectTypeOf<FieldStrings>().toHaveProperty("replaceEnteredTitle");
    // Kernel 0.28.0: the row menu's Open. A host supplying a complete
    // `FieldStrings` adds it.
    expectTypeOf<FieldStrings>().toHaveProperty("openExample");
    for (const strings of [formReact.EN_FIELD_STRINGS, formReact.FR_FIELD_STRINGS]) {
      expect(strings.chooseFromSource).toBeTypeOf("string");
      expect(strings.fillWithExample).toBeTypeOf("string");
      expect(strings.replaceEnteredTitle).toBeTypeOf("string");
      expect(strings.openExample).toBeTypeOf("string");
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

  it("carries the result provider's seam for a host's PDF of a document the browser cannot render", () => {
    // A host rendering the result view itself mounts the re-exported
    // `ResultEnvProvider` and passes `resolveDocumentPdf` there. A host
    // supplying a complete `FieldStrings` adds the preview's three strings.
    expect(formReact.useResolveDocumentPdf).toBeTypeOf("function");
    expectTypeOf<DocumentPdfRequest>().toEqualTypeOf<{ filename?: string; mimeType?: string }>();
    expectTypeOf<AskDocumentPdf>().toEqualTypeOf<() => Promise<DocumentPdfAnswer>>();
    expectTypeOf<ResolveDocumentPdf>().toEqualTypeOf<
      (url: string, request: DocumentPdfRequest) => AskDocumentPdf | undefined
    >();
    expectTypeOf<
      ComponentProps<typeof formReact.ResultEnvProvider>["resolveDocumentPdf"]
    >().toEqualTypeOf<ResolveDocumentPdf | undefined>();
    const keys = [
      "documentPdfPreparing",
      "documentPdfFailed",
      "documentPdfUnavailable",
    ] as const satisfies readonly (keyof FieldStrings)[];
    for (const strings of [formReact.EN_FIELD_STRINGS, formReact.FR_FIELD_STRINGS]) {
      for (const key of keys) expect(strings[key]).toBeTypeOf("string");
    }
  });

  it("carries the result provider's settings for a PDF the view draws from the host's bytes", () => {
    // Kernel 0.41.0. A host rendering the result view itself passes
    // `loadBytes`, `pdfWorker` and `openExternal` to the re-exported
    // `ResultEnvProvider`; `GraphViewer` and `StuffResultPanel` take them as
    // props. A host supplying a complete `FieldStrings` adds the two strings
    // the drawn pages speak.
    expect(formReact.useLoadBytes).toBeTypeOf("function");
    expect(formReact.usePdfWorker).toBeTypeOf("function");
    expect(formReact.useOpenExternal).toBeTypeOf("function");
    expect(formReact.PDF_PAGES_MAX_BYTES).toBe(32 * 1024 * 1024);
    expect(formReact.PDF_PAGES_MAX_PAGES).toBe(500);
    expect(formReact.PDF_PAGES_MAX_IMAGE_PIXELS).toBe(40_000_000);
    expectTypeOf<BytesRequest>().toEqualTypeOf<{ maxBytes: number; signal: AbortSignal }>();
    expectTypeOf<LoadBytes>().toEqualTypeOf<
      (url: string, request: BytesRequest) => Promise<Uint8Array | ArrayBuffer>
    >();
    expectTypeOf<OpenExternal>().toEqualTypeOf<(url: string) => void>();
    expectTypeOf<PdfWorkerConfig>().toExtend<PdfWorkerSource>();
    expectTypeOf<ComponentProps<typeof formReact.ResultEnvProvider>["loadBytes"]>().toEqualTypeOf<
      LoadBytes | undefined
    >();
    expectTypeOf<ComponentProps<typeof formReact.ResultEnvProvider>["pdfWorker"]>().toEqualTypeOf<
      PdfWorkerConfig | undefined
    >();
    expectTypeOf<
      ComponentProps<typeof formReact.ResultEnvProvider>["openExternal"]
    >().toEqualTypeOf<OpenExternal | undefined>();
    for (const strings of [formReact.EN_FIELD_STRINGS, formReact.FR_FIELD_STRINGS]) {
      expect(strings.pdfPageNotDrawn).toBeTypeOf("string");
      expect(strings.pdfPagesContinue).toBeTypeOf("function");
    }
  });

  it("carries the loader of a stored text, on the result provider, the form and the panel", () => {
    // Kernel 0.37.0. A host rendering the result view itself passes `loadText`
    // to the re-exported `ResultEnvProvider`; the run form takes it as
    // `FieldEnv.loadText`, which `RunPanel` fills from its own `loadText`. A
    // host supplying a complete `FieldStrings` adds the stored text's strings.
    expect(formReact.useLoadText).toBeTypeOf("function");
    expectTypeOf<ComponentProps<typeof formReact.ResultEnvProvider>["loadText"]>().toEqualTypeOf<
      LoadText | undefined
    >();
    expectTypeOf<FieldEnv["loadText"]>().toEqualTypeOf<LoadText | undefined>();
    expectTypeOf<RunPanelProps["loadText"]>().toEqualTypeOf<LoadText | undefined>();
    const keys = [
      "storedTextLoading",
      "storedTextStart",
      "storedTextUnloaded",
      "storedTextHeld",
      "storedTextEdit",
      "storedTextReplace",
      "storedTextEditFailed",
      "storedTextsNotLoaded",
    ] as const satisfies readonly (keyof FieldStrings)[];
    for (const strings of [formReact.EN_FIELD_STRINGS, formReact.FR_FIELD_STRINGS]) {
      for (const key of keys) expect(strings[key], key).toBeDefined();
    }
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

  it("carries the seam for a result drawn inside a host's own panel", () => {
    // Kernel 0.34.0: a table of records draws no outline of its own there.
    expectTypeOf<ComponentProps<typeof formReact.ResultEnvProvider>["framed"]>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<ComponentProps<typeof formReact.StuffViewer>["framed"]>().toEqualTypeOf<
      boolean | undefined
    >();
  });

  it("carries the camera's strings, in every supplied language", () => {
    // Kernel 0.38.0. A host supplying a complete `FieldStrings` adds them.
    const keys = [
      "takePhoto",
      "takePhotoAria",
      "addPage",
      "photoPage",
      "photoImage",
      "photoDocument",
      "retakePhoto",
      "removePhoto",
      "readingPhoto",
      "photoUndecodable",
      "photoNotKept",
      "photoPagesChip",
      "photoChip",
    ] as const satisfies readonly (keyof FieldStrings)[];
    for (const strings of [formReact.EN_FIELD_STRINGS, formReact.FR_FIELD_STRINGS]) {
      for (const key of keys) expect(strings[key], key).toBeDefined();
      expect(strings.photoPagesChip("Invoice", 2)).toBeTypeOf("string");
    }
  });

  it("carries the line a composer's action row says it waits for", () => {
    // Kernel 0.34.0. A host supplying a complete `FieldStrings` adds it.
    expectTypeOf<FieldStrings["runWaitsFor"]>().toEqualTypeOf<
      (names: readonly string[], more: number) => string
    >();
    for (const strings of [formReact.EN_FIELD_STRINGS, formReact.FR_FIELD_STRINGS]) {
      expect(strings.runWaitsFor(["City"], 0)).toBeTypeOf("string");
    }
  });
});
