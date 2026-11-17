"use client";

import * as React from "react";
import {
  buildResultField,
  getPipeInputForm,
  getPipeIOContract,
  getPipeOutputForm,
  type InputForm,
  type LoadText,
  type OutputForm,
  type PipeIOContracts,
  type RunField,
  type SaveFiles,
} from "@pipelex/mthds-form";
import {
  JsonView,
  ResultEnvProvider,
  StuffViewer,
  useFieldStrings,
  useLoadText,
  type DownloadDisplay,
  type ResolveDocumentPdf,
  type ResolveRendition,
  type ResolveShareUrl,
  type ResolveUrl,
} from "@pipelex/mthds-form/react";
import { parsePipeRef } from "@graph/pipeRefs";
import { useNestedStoredTexts } from "@graph/react/detail/nestedStoredTexts";
import type { ConceptInfo, GraphSpecNodeIoItem, GraphTheme } from "@graph/types";

/**
 * The graph's stuff panel — the replacement for `StuffViewer`.
 *
 * ## What changed, and why it is not a reskin
 *
 * `StuffViewer` had three tabs — HTML, JSON, Pretty — and that was an admission:
 * a `GraphSpec` states a concept and a payload, and nothing about what the
 * payload IS, so the only honest thing it could do was hand the reader three
 * renderings and let them pick. It sniffed for URLs, guessed MIME types from
 * file extensions, and ran any `data_html` through DOMPurify because the markup
 * was model output going into the host's own document.
 *
 * None of that guessing is necessary, because the standard answers the question
 * in an artifact built for it. `output_form` gives a pipe's result ONE
 * descriptor node — kind, concept identity, refinement chain, nested fields in
 * authored order — and the output half of `pipe_io_contracts` gives the
 * payload's JSON Schema beside it, naming the property the content model wraps
 * the value under. `buildResultField` pairs them into a `RunField`, and
 * `StuffViewer` lays that out without ever inspecting the value: a table for a
 * list of records, a gallery for images, a sandboxed frame for markup, a
 * two-column grid for a structure. The JSON view survives as one of the panel's
 * two, because a receipt is worth having; "Pretty" and "HTML" do not, because
 * they were two guesses at a question now answered.
 *
 * ## What it needs from the host, and why
 *
 * The artifacts a run's results (or a `/validate` call) return beside the graph
 * spec, keyed by `pipe_ref`. The join is the producing pipe: the graph hands
 * over `producerPipeRef` (see `stuffLookup.ts`), and `output_form` plus the
 * output half of the contract are looked up by it. That join only holds when
 * the artifacts and the graph come from the same source, which is why
 * `GraphViewer` takes them as one `graph` object (`GraphArtifacts`).
 *
 * ## The method's own inputs, which no pipe produced
 *
 * They have no `producerPipeRef`, so no output descriptor describes them — and
 * showing nothing for the top of every graph is not acceptable, because a
 * method's arguments are as much a part of what happened as its results. What
 * DOES describe them is the CONSUMING pipe's `input_form` entry for the slot
 * they arrive in: the same field, seen from the other side. So `inputForm` is
 * an optional third artifact, and when it is supplied the panel falls back to
 * it.
 *
 * **Only on the `single` arm, and that is a correctness boundary rather than a
 * conservative default.** An input's `json_schema` describes what a CALLER
 * SENDS, so a plural slot's is a bare array; a stuff's payload is what the
 * runtime HOLDS, which for a plural value is a `ListContent {items}` envelope.
 * The two disagree exactly where the standard says they do, and rendering a
 * plural input against its caller-side schema would unwrap by a property that
 * is not there. On the single arm the two are byte-identical by construction —
 * both are `render_stuff_spec`'s output — so the fallback is exact there and
 * declines everywhere else.
 *
 * ## Stored files
 *
 * It does not resolve `pipelex-storage://` URIs itself. A host that can passes
 * `resolveUrl`, which is installed as the kernel's `ResultEnvProvider` so the
 * kernel's own file arms paint the file; without one, the panel paints whatever
 * `public_url` the payload carries. A host that keeps smaller copies of its
 * pictures passes `resolveRendition` on the same provider, and a gallery's
 * tiles and a table cell's thumbnails are drawn from those copies while every
 * other use of a picture keeps the whole one. A host that can make a PDF of a
 * document the browser cannot render, such as a Word, Excel or PowerPoint file,
 * passes `resolveDocumentPdf` there too, and that document's preview shows the
 * PDF's pages.
 *
 * ## Stored texts
 *
 * A runtime may store a large `Text`, `Markdown`, `Html` or `JSON` value and
 * hand back its reference, `{url, size, mime_type, preview}`, in its place. The
 * kernel shows the reference's preview and, given the host's `loadText`, loads
 * the whole text and draws it as if it had arrived inline. It goes on the same
 * provider as `resolveUrl`, and since the kernel loads a value only when its
 * view renders, and the graph renders this panel only when a node is opened, a
 * stored text is loaded when its node is opened, never while the graph draws.
 *
 * A stored text nested in another native's content, such as a `Page`'s text
 * under `text_and_images.text`, is one the kernel's views do not load
 * themselves. So whenever a loader is reachable the panel loads every stored
 * text in the value with the kernel's own walk (`useNestedStoredTexts`),
 * through the provider's loader, which asks the host once per address for
 * this load and the kernel's own views alike. The value shows as it came until
 * the texts are read, with a line saying they are being loaded, then with
 * them inline, and keeps them while an equal value a host re-creates is read
 * again. A value holding none is read with no request; a text whose read
 * fails keeps its reference. The kernel's
 * whole-result Download loads the value's stored texts again itself, so it
 * saves the texts it can read and says how many it could not.
 *
 * ## Saving
 *
 * The kernel's Download control and its per-file download buttons save through
 * the browser tab unless a host says otherwise. A host whose view runs in a
 * sandboxed frame, where the tab's object URL, clicked link and popup are all
 * refused, passes `saveFiles` to deliver the files through its own bridge, and
 * `downloads` to choose which of those controls are drawn. Both go on the same
 * provider as `resolveUrl`, because the kernel's provider replaces an outer
 * one rather than merging with it: set around the graph instead, they would
 * never reach a panel that installs its own.
 */
export interface StuffResultRendererOptions {
  /**
   * `pipe_io_contracts` from the same source as the `producerPipeRef` and
   * `consumer` below: the run, or the validate report, whose graph they were
   * read from. Inside `GraphViewer` that pairing is guaranteed by its single
   * `graph` prop; a host using this panel on its own owns it.
   */
  pipeIoContracts: PipeIOContracts;
  /** `output_form` from that SAME source. */
  outputForm: OutputForm;
  /**
   * `input_form`, optional. Supplying it is what lets a method's own INPUTS
   * render as described fields rather than as nothing: they have no producing
   * pipe, so the consuming pipe's descriptor for their slot is what names them.
   */
  inputForm?: InputForm;
}

export interface StuffResultPanelProps extends StuffResultRendererOptions {
  /** The data item as the spec holds it. */
  stuff: GraphSpecNodeIoItem;
  /** Its concept, resolved against the spec's concept table, when it has one. */
  concept?: ConceptInfo;
  /**
   * `domain.code` of the pipe that PRODUCED it — the key both output artifacts
   * are keyed by. Absent for a method's own inputs, which no pipe produced.
   */
  producerPipeRef?: string;
  /**
   * The first pipe that CONSUMES it, and the slot it arrives in — the fallback
   * identity for those method inputs.
   */
  consumer?: { pipeRef: string; slotName: string };
  /** The viewer's resolved theme, so the panel matches the chrome it sits in. */
  theme?: GraphTheme;
  /**
   * Turns the runtime's own `pipelex-storage://…` reference into something a
   * browser can fetch.
   *
   * Supply it and the panel paints files through it; omit it and the panel
   * falls back to whatever `public_url` the payload carries. On the hosted
   * platform that fallback is a PRESIGNED S3 URL with an hour's life, baked
   * into the stored result — so a run opened the next morning shows broken
   * images, and the URL answers `403` in a way that reads as a permissions
   * problem rather than an expiry. A resolver is what makes a result durable.
   *
   * A document is framed only when this answers it on the page's own origin,
   * as a root-relative path or an absolute URL there; anything else, a URL
   * the payload names included, is shown as the document's link.
   */
  resolveUrl?: ResolveUrl;
  /**
   * Answers a smaller copy of a picture, at the width the kernel asks for, so a
   * gallery's tiles and a table cell's thumbnails stop loading the whole file.
   * The viewer a picture opens, "Open the original", the copy control and every
   * download keep the whole picture, and a copy that fails to load gives way to
   * it. Unset, or for a picture it does not answer, the whole picture is drawn.
   */
  resolveRendition?: ResolveRendition;
  /**
   * Answers whether the host has a PDF of a document the browser cannot render,
   * such as a Word, Excel or PowerPoint file: `undefined` for one it cannot
   * convert, or an ask the kernel calls when the reader opens the preview. The
   * document's preview then shows the PDF's pages, while its name, its copy
   * control and every download keep the original. Unset, such a document
   * offers no preview.
   */
  resolveDocumentPdf?: ResolveDocumentPdf;
  /**
   * Reads a stored text: called with the reference's `url` when the panel
   * shows a `Text`, `Markdown`, `Html` or `JSON` value the runtime stored
   * rather than inlined, it resolves to the text as stored and rejects when it
   * cannot be read. Until it answers the panel shows the text's start (the
   * reference's `preview`) and its size; once it answers, the value is drawn
   * as if it had arrived inline; when it rejects, the start stays with a line
   * saying the rest could not be loaded. Unset, the start is all the panel
   * shows.
   */
  loadText?: LoadText;
  /**
   * Mints a URL that works OUTSIDE this page — what the copy control hands over.
   * A display URL may sit behind the host's session; a shared one carries its
   * own credential.
   */
  resolveShareUrl?: ResolveShareUrl;
  /**
   * Delivers the files a download hands over, for a host that cannot save
   * through the browser tab. Without one, the kernel saves in the tab.
   */
  saveFiles?: SaveFiles;
  /**
   * Which download controls are drawn: the whole-result Download and each
   * file's own button, set independently. Both are drawn by default.
   */
  downloads?: DownloadDisplay;
}

export function StuffResultPanel({
  pipeIoContracts,
  outputForm,
  inputForm,
  stuff,
  producerPipeRef,
  consumer,
  resolveUrl,
  loadText,
  resolveRendition,
  resolveDocumentPdf,
  resolveShareUrl,
  saveFiles,
  downloads,
}: StuffResultPanelProps) {
  // Keyed on the consumer's two strings rather than its object, so a host that
  // rebuilds the object on each render does not rebuild the field, and with it
  // start another load of the value's stored texts.
  const consumerPipeRef = consumer?.pipeRef;
  const consumerSlot = consumer?.slotName;
  const field = React.useMemo(
    () =>
      fromProducer(pipeIoContracts, outputForm, producerPipeRef) ??
      fromConsumer(
        pipeIoContracts,
        inputForm,
        consumerPipeRef !== undefined && consumerSlot !== undefined
          ? { pipeRef: consumerPipeRef, slotName: consumerSlot }
          : undefined,
      ),
    [pipeIoContracts, outputForm, inputForm, producerPipeRef, consumerPipeRef, consumerSlot],
  );
  // The node the value belongs to, so a value loaded for one node is never
  // shown on another, while a host re-creating the same node's value keeps
  // the texts already read.
  const nodeKey = [
    stuff.digest ?? "",
    stuff.name,
    producerPipeRef ?? "",
    consumerPipeRef ?? "",
    consumerSlot ?? "",
  ].join("\u0000");

  if (field) {
    // The STUFF's name, not the descriptor's. `build_output_form` names every
    // pipe's root node `output` - correct in the artifact, where the descriptor
    // describes an output SLOT with no name of its own, and wrong on screen,
    // where the reader has just clicked a node called `report_pages` and every
    // other surface calls it that. The graph is the one that knows, so the
    // graph is the one that says. It is also what heads the panel in a host
    // that sets the `app` presentation: there the kernel draws a title only
    // when it is given a name, and nothing else here says which value is open.
    // An HTML page (`native.Html`) is the one result it leaves untitled in
    // `app` even when named, by design: the page heads itself.
    const panel = (
      <LoadedStuffViewer field={field} nodeKey={nodeKey} value={stuff.data} name={stuff.name} />
    );
    // Installed only when the host said something, so a host that wraps the
    // whole graph in its own provider still reaches a panel given nothing.
    return resolveUrl ||
      loadText ||
      resolveRendition ||
      resolveDocumentPdf ||
      resolveShareUrl ||
      saveFiles ||
      downloads ? (
      <ResultEnvProvider
        resolveUrl={resolveUrl}
        loadText={loadText}
        resolveRendition={resolveRendition}
        resolveDocumentPdf={resolveDocumentPdf}
        resolveShareUrl={resolveShareUrl}
        saveFiles={saveFiles}
        downloads={downloads}
      >
        {panel}
      </ResultEnvProvider>
    ) : (
      panel
    );
  }

  // No descriptor, but there IS a value. Show it, and say why it is not laid
  // out.
  //
  // Returning null here was the first behaviour and it was wrong in the way
  // that matters: a reader looking at a finished run saw a schema table, no
  // data tab, and no reason — indistinguishable from a broken view. The two
  // artifacts are opt-in `views` on `/validate` and an engine that predates
  // them simply omits them, so "the server has not got them yet" is an ordinary
  // state a host will be in, not an edge case.
  //
  // This is not `StuffViewer` coming back. That offered three renderings as a
  // CHOICE because it could not tell what the value was; this is one labelled
  // fallback that names its own cause and disappears the moment the descriptor
  // arrives.
  return stuff.data === undefined || stuff.data === null ? null : (
    <UndescribedValue value={stuff.data} />
  );
}

/**
 * The kernel's `StuffViewer` over a value whose nested stored texts are loaded
 * (`useNestedStoredTexts`): drawn at once as the spec holds it, then with the
 * texts inline once they are read. Rendered inside the panel's provider, or an
 * outer one the host installed, so it loads through that provider's
 * `loadText`, which asks each address once for this load and the kernel's own
 * view of a stored text alike.
 *
 * While the load runs, a line above the value says so in the kernel's own
 * words (`storedTextLoading`), since a view that reads a nested text only
 * inline, such as the kernel's page view, would otherwise say the text is
 * absent. It is drawn from the first render of a value holding stored texts,
 * never for one holding none, and goes in the same render that brings the
 * texts in.
 */
function LoadedStuffViewer({
  field,
  nodeKey,
  value,
  name,
}: {
  field: RunField;
  nodeKey: string;
  value: unknown;
  name: string;
}) {
  const s = useFieldStrings();
  const shown = useNestedStoredTexts(field, nodeKey, value, useLoadText());
  return (
    <>
      {shown.loading && (
        <p role="status" className="detail-stored-texts-loading">
          {s.storedTextLoading(undefined)}
        </p>
      )}
      <StuffViewer field={field} value={shown.value} name={name} />
    </>
  );
}

function UndescribedValue({ value }: { value: unknown }) {
  const s = useFieldStrings();
  return (
    <div className="space-y-2">
      <p className="text-[12px] text-muted-foreground">{s.resultUndescribed}</p>
      <JsonView value={value} />
    </div>
  );
}

/** The normal case: the pipe that resolved to this value describes it. */
function fromProducer(
  contracts: PipeIOContracts,
  outputForm: OutputForm,
  producerPipeRef: string | undefined,
): RunField | null {
  if (!producerPipeRef) return null;
  const parsed = parsePipeRef(producerPipeRef);
  if (!parsed?.domainPath) return null;
  const descriptor = getPipeOutputForm(outputForm, parsed.domainPath, parsed.pipeCode);
  const contract = getPipeIOContract(contracts, parsed.domainPath, parsed.pipeCode);
  // Both or neither, the same rule the input side follows: the descriptor says
  // what the result IS and the schema says what shape it arrives in, and a
  // renderer given one of the two would be guessing the other.
  if (!descriptor || !contract) return null;
  return buildResultField(descriptor, contract.output.json_schema);
}

/**
 * The fallback for a method's own input: the pipe that READS it describes it.
 *
 * Single-valued slots only. See the component's note — a plural input's schema
 * is the caller-side bare array, and the payload is a `ListContent` envelope, so
 * the fallback would unwrap by a property that is not there.
 */
function fromConsumer(
  contracts: PipeIOContracts,
  inputForm: InputForm | undefined,
  consumer: { pipeRef: string; slotName: string } | undefined,
): RunField | null {
  if (!inputForm || !consumer) return null;
  const parsed = parsePipeRef(consumer.pipeRef);
  if (!parsed?.domainPath) return null;
  const descriptor = getPipeInputForm(inputForm, parsed.domainPath, parsed.pipeCode);
  const contract = getPipeIOContract(contracts, parsed.domainPath, parsed.pipeCode);
  if (!descriptor || !contract) return null;
  const slot = contract.inputs[consumer.slotName];
  if (!slot || slot.multiplicity !== "single") return null;
  const node = descriptor.fields.find(
    (candidate: { name: string }) => candidate.name === consumer.slotName,
  );
  if (!node) return null;
  // Wrapped into the OUTPUT descriptor's shape, which is what `buildResultField`
  // takes. That is not a cheat: the two descriptors' nodes are the same
  // recursive vocabulary, and the wrapper's only job is to say "one field, and
  // here it is". The pipe-slot facts the input node also carries (`presence`,
  // `gating`) describe how a caller must fill it and mean nothing to a value
  // that has already arrived, so they are simply not read.
  return buildResultField({ field: node }, slot.json_schema);
}
