"use client";

import * as React from "react";
import {
  buildResultField,
  getPipeIOContract,
  getPipeOutputForm,
  type OutputForm,
  type PipeIOContracts,
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
 * Two artifacts, keyed by `pipe_ref` — the same pair every `/validate` call
 * returns beside the graph spec. The join is the producing pipe: the graph hands
 * over `producerPipeRef` (see `stuffLookup.ts`), and both artifacts are looked
 * up by it. That is why a method's own INPUTS render nothing here: no pipe
 * produced them, so no output descriptor describes them. They are a run's
 * arguments, and `RunPanel` is the component that speaks about those.
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
}

export interface StuffResultPanelProps extends StuffResultRendererOptions {
  /** The context the graph hands its `renderStuffData` seam. */
  context: StuffRenderContext;
}

export function StuffResultPanel({ contracts, outputForm, context }: StuffResultPanelProps) {
  const field = React.useMemo(() => {
    if (!context.producerPipeRef) return null;
    const parsed = parsePipeRef(context.producerPipeRef);
    if (!parsed?.domainPath) return null;
    const descriptor = getPipeOutputForm(outputForm, parsed.domainPath, parsed.pipeCode);
    const contract = getPipeIOContract(contracts, parsed.domainPath, parsed.pipeCode);
    // Both or neither, the same rule the input side follows: the descriptor says
    // what the result IS and the schema says what shape it arrives in, and a
    // renderer given one of the two would be guessing the other.
    if (!descriptor || !contract) return null;
    return buildResultField(descriptor, contract.output.json_schema);
  }, [contracts, outputForm, context.producerPipeRef]);

  if (!field) return null;
  return <ResultPanel field={field} value={context.stuff.data} />;
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
