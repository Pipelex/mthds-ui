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
import { ResultPanel } from "@pipelex/mthds-form/react";
import { parsePipeRef } from "@graph/pipeRefs";
import type { RenderStuffData, StuffRenderContext } from "@graph/react/stuffRender";

/**
 * The graph's stuff panel, rendered through the form kernel — the replacement
 * for `StuffViewer`.
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
  /** The context the graph hands its `renderStuffData` seam. */
  context: StuffRenderContext;
}

export function StuffResultPanel({
  contracts,
  outputForm,
  inputForm,
  context,
}: StuffResultPanelProps) {
  const { producerPipeRef, consumer } = context;
  const field = React.useMemo(
    () =>
      fromProducer(contracts, outputForm, producerPipeRef) ??
      fromConsumer(contracts, inputForm, consumer),
    [contracts, outputForm, inputForm, producerPipeRef, consumer],
  );

  if (!field) return null;
  return <ResultPanel field={field} value={context.stuff.data} />;
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
  const node = descriptor.fields.find((candidate) => candidate.name === consumer.slotName);
  if (!node) return null;
  // Wrapped into the OUTPUT descriptor's shape, which is what `buildResultField`
  // takes. That is not a cheat: the two descriptors' nodes are the same
  // recursive vocabulary, and the wrapper's only job is to say "one field, and
  // here it is". The pipe-slot facts the input node also carries (`presence`,
  // `gating`) describe how a caller must fill it and mean nothing to a value
  // that has already arrived, so they are simply not read.
  return buildResultField({ field: node }, slot.json_schema);
}

/**
 * Bind the two artifacts once and get the function `GraphViewer.renderStuffData`
 * wants. A host holds the artifacts for the whole method, not per selection, so
 * this is the shape that actually fits a call site:
 *
 *     <GraphViewer
 *       graphspec={spec}
 *       renderStuffData={renderStuffResult({ contracts, outputForm })}
 *     />
 *
 * Returning `null` for a stuff it cannot describe is the contract, not a
 * failure: the panel then shows the concept's structure alone, which is exactly
 * right for a method input or a pipe whose artifacts the host does not hold.
 */
export function renderStuffResult(options: StuffResultRendererOptions): RenderStuffData {
  return (context) => <StuffResultPanel {...options} context={context} />;
}
