"use client";

import * as React from "react";
import {
  buildResultField,
  getPipeInputForm,
  getPipeIOContract,
  getPipeOutputForm,
  type InputForm,
  type OutputForm,
  type PipeIOContracts,
  type RunField,
} from "@pipelex/mthds-form";
import {
  JsonView,
  ResultEnvProvider,
  ResultPanel,
  useFieldStrings,
  type ResolveShareUrl,
  type ResolveUrl,
} from "@pipelex/mthds-form/react";
import { parsePipeRef } from "@graph/pipeRefs";
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
 * `ResultPanel` lays that out without ever inspecting the value: a table for a
 * list of records, a gallery for images, a sandboxed frame for markup, a
 * two-column grid for a structure. The JSON view survives as one of the panel's
 * two, because a receipt is worth having; "Pretty" and "HTML" do not, because
 * they were two guesses at a question now answered.
 *
 * ## What it needs from the host, and why
 *
 * The artifacts every `/validate` call returns beside the graph spec, keyed by
 * `pipe_ref`. The join is the producing pipe: the graph hands over
 * `producerPipeRef` (see `stuffLookup.ts`), and `output_form` plus the output
 * half of the contract are looked up by it.
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
 * ## What it deliberately does not do
 *
 * It does not resolve `pipelex-storage://` URIs. `StuffViewer` took a
 * `resolveStorageUrl` and exchanged them for presigned URLs before painting
 * media; the kernel has no such seam yet, so a result carrying a storage
 * reference shows the file named rather than rendered. That is a real gap, not
 * an oversight — porting it belongs in the kernel's file arms, where every
 * consumer gets it, rather than being re-implemented here for one host.
 */
export interface StuffResultRendererOptions {
  /** `pipe_io_contracts` for the method being displayed. */
  contracts: PipeIOContracts;
  /** `output_form` for the same method — the SAME `/validate` call. */
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
   */
  resolveUrl?: ResolveUrl;
  /**
   * Mints a URL that works OUTSIDE this page — what the copy control hands over.
   * A display URL may sit behind the host's session; a shared one carries its
   * own credential.
   */
  resolveShareUrl?: ResolveShareUrl;
}

export function StuffResultPanel({
  contracts,
  outputForm,
  inputForm,
  stuff,
  producerPipeRef,
  consumer,
  resolveUrl,
  resolveShareUrl,
}: StuffResultPanelProps) {
  const field = React.useMemo(
    () =>
      fromProducer(contracts, outputForm, producerPipeRef) ??
      fromConsumer(contracts, inputForm, consumer),
    [contracts, outputForm, inputForm, producerPipeRef, consumer],
  );

  if (field) {
    const panel = <ResultPanel field={field} value={stuff.data} />;
    return resolveUrl || resolveShareUrl ? (
      <ResultEnvProvider resolveUrl={resolveUrl} resolveShareUrl={resolveShareUrl}>
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
