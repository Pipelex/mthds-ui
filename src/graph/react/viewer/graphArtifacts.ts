import type { InputForm, OutputForm, PipeIOContracts } from "@pipelex/mthds-form";
import type { GraphSpec } from "@graph/types";

/**
 * A graph and the artifacts that describe its pipes, taken from ONE source.
 *
 * `GraphViewer` takes this as its single `graph` prop rather than a spec and
 * three descriptor props side by side, because the descriptors are keyed by the
 * graph's own `pipe_ref`s: the detail panel walks from a data node back to the
 * pipe that produced it and looks that pipe up in `outputForm` and
 * `pipeIoContracts`. A spec paired with another source's descriptors (a past
 * run's graph beside the current method's validate report, after the method's
 * pipes were renamed) misses every lookup, and the panel can only say that no
 * descriptor describes the value. Carrying all four in one object is what keeps
 * them from one run, or from one validate call.
 *
 * Where each source lives:
 *
 * - **A run**: its results carry `graph_spec`, `pipe_io_contracts`,
 *   `output_form` and `input_form` together; `graphArtifactsFrom(results)`
 *   reads them in one call.
 * - **A method that has not run** (a dry run, or a static graph built from its
 *   sources): the descriptors come from the same method's validate report, the
 *   one the dry graph or the static build describes.
 *
 * The descriptors are optional, and nullable as the wire carries them. Without
 * `pipeIoContracts` and `outputForm` together, the panel shows a data node's
 * structure table and no data tab, which is the honest floor for a graph whose
 * artifacts were not produced. `inputForm` is optional even beside the other
 * two: it is what lets a method's own inputs, which no pipe produced, show their
 * value through the consuming pipe's slot.
 */
export interface GraphArtifacts {
  /** The graph to draw: a run's `graph_spec`, a dry run's, or a static build. */
  graphSpec: GraphSpec;
  /** `pipe_io_contracts` for the pipes of THIS graph. */
  pipeIoContracts?: PipeIOContracts | null;
  /** `output_form` for the pipes of THIS graph, from the same source. */
  outputForm?: OutputForm | null;
  /** `input_form` for the pipes of THIS graph, from the same source. */
  inputForm?: InputForm | null;
}

/**
 * The four artifacts as a run's results, or a validate report, spell them on
 * the wire. `graph_spec` is `unknown` because transport layers type it that way;
 * `GraphViewer` validates it at its boundary.
 */
export interface GraphArtifactsSource {
  graph_spec?: unknown;
  pipe_io_contracts?: PipeIOContracts | null;
  output_form?: OutputForm | null;
  input_form?: InputForm | null;
}

/**
 * Read the graph and its descriptors out of one run's results (or one report
 * that carries all four), so a host never assembles the bundle by hand from two
 * places. Returns `null` when the source carries no graph.
 */
export function graphArtifactsFrom(source: GraphArtifactsSource): GraphArtifacts | null {
  if (source.graph_spec === undefined || source.graph_spec === null) return null;
  return {
    graphSpec: source.graph_spec as GraphSpec,
    pipeIoContracts: source.pipe_io_contracts ?? null,
    outputForm: source.output_form ?? null,
    inputForm: source.input_form ?? null,
  };
}

/** The descriptors the detail panel renders a value from, once they are usable. */
export interface ResultDescriptors {
  pipeIoContracts: PipeIOContracts;
  outputForm: OutputForm;
  inputForm?: InputForm;
}

/**
 * The descriptors a graph's detail panel can render from, or `null`.
 *
 * Both `pipeIoContracts` and `outputForm`, or neither: the contract names the
 * payload's shape and the descriptor says what the result IS, so a panel given
 * one of the two would be guessing the other. `inputForm` rides along when the
 * other two are there.
 */
export function resultDescriptors(graph: GraphArtifacts | null): ResultDescriptors | null {
  const pipeIoContracts = graph?.pipeIoContracts;
  const outputForm = graph?.outputForm;
  if (!pipeIoContracts || !outputForm) return null;
  const inputForm = graph?.inputForm;
  return inputForm ? { pipeIoContracts, outputForm, inputForm } : { pipeIoContracts, outputForm };
}
