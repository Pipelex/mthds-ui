import type * as React from "react";
import type { ConceptInfo, GraphSpecNodeIoItem, GraphTheme } from "@graph/types";

/**
 * Everything the graph knows about one data item, handed to whoever renders it.
 *
 * ## Why the graph does not render its own data any more
 *
 * It used to: `StuffViewer` sniffed the payload for a URL, guessed a MIME type,
 * sanitized any `data_html` through DOMPurify and offered the reader a choice of
 * three tabs — HTML, JSON, Pretty — which is three ways of saying the renderer
 * could not tell what the value was. It could not: a `GraphSpec` states a
 * concept and a payload, and nothing about what that payload IS.
 *
 * The standard answers that question, in an artifact built for it. `output_form`
 * gives a pipe's result one descriptor node — kind, concept identity, the
 * refinement chain, nested fields in authored order — and the output half of
 * `pipe_io_contracts` gives the payload's JSON Schema beside it. Paired, they
 * are enough to lay a result out without ever inspecting the value. That is the
 * form kernel's job, and `@pipelex/mthds-form` does it.
 *
 * The kernel is an OPTIONAL peer of this package, isolated behind the
 * `./form/react` entry, so the graph entries must keep resolving with it absent
 * (see the `no-restricted-imports` block in `eslint.config.mjs`). Hence a render
 * prop rather than an import: the graph owns the panel, the selection and the
 * lookup, and the host — or this package's own `./form/react` entry — owns the
 * rendering. A consumer that passes nothing gets the concept's structure table
 * and no data view, which is the honest thing for a viewer that has not been
 * given a renderer.
 */
export interface StuffRenderContext {
  /**
   * The selected graph node's id. Stable per selection, so a renderer can key
   * per-item state on it rather than on a digest two nodes may share.
   */
  nodeId: string;
  /** The data item as the spec holds it. */
  stuff: GraphSpecNodeIoItem;
  /** Its concept, resolved against the spec's concept table, when it has one. */
  concept?: ConceptInfo;
  /**
   * `domain.code` of the pipe that produced it — the key `output_form` and
   * `pipe_io_contracts` are both keyed by. Absent for a method's own inputs,
   * which no pipe produced.
   */
  producerPipeRef?: string;
  /**
   * The first pipe that CONSUMES it, and the slot name it arrives in — the
   * fallback identity for a method's own inputs, which no pipe produced. The
   * consuming pipe's `input_form` entry for that slot describes the same field
   * from the other side.
   */
  consumer?: { pipeRef: string; slotName: string };
  /**
   * The viewer's RESOLVED theme (never `system`), so a renderer can match the
   * panel it is drawn into.
   *
   * It is on the context rather than left to the renderer because the graph is
   * the only one that knows: the theme may come from a prop, from the built-in
   * toggle, or from the environment via `system`, and only the viewer has
   * resolved all three. A renderer reading `prefers-color-scheme` itself would
   * be right by luck and wrong the moment a host pins a theme against it — dark
   * text on a dark panel, which is exactly the bug this slot was added for.
   */
  theme: GraphTheme;
  /**
   * True on a dry-run spec. The payload is then mock data the engine invented
   * to shape the run, not a result: a renderer may legitimately decline to show
   * it, and this viewer's default is to say so rather than paint fiction.
   */
  isDryRun: boolean;
}

/**
 * Renders one data item. Returning `null` or `undefined` means "nothing to show
 * for this one" and is not an error — the panel falls back to the structure
 * view, exactly as it does when no renderer was passed at all.
 */
export type RenderStuffData = (context: StuffRenderContext) => React.ReactNode;
