import { ARTIFACT_SETS } from "@form/react/__stories__/contracts/_generated.contracts";
import type { GraphSpec } from "@graph/types";
import type { GraphArtifacts } from "../graphArtifacts";

/**
 * The `graph` a per-pipeline graph story hands `GraphViewer`: the spec, with
 * the method's own descriptors in the same object.
 *
 * ## Why the stories carry them
 *
 * Clicking a data node in one of the `Graph - from run/NN …` stories and
 * getting only a schema table is the wrong answer to "what happened in this
 * run?". Every one of those specs is a real (or dry) run of a bundle whose
 * `pipe_io_contracts` and `output_form` this repo also generates, so the panel
 * can show what each step actually produced — and, through `input_form`, what
 * the method was given.
 *
 * The method name and the spec are named side by side at the one call site, so
 * a story cannot hand the viewer one method's graph and another's descriptors
 * without both being visible on the same line.
 *
 * A method whose artifacts are missing gets the spec alone rather than a
 * half-set: the viewer needs the contract and the output descriptor TOGETHER,
 * and passing one of the two would have it guess the other.
 */
export function graphFor(methodName: string, graphSpec: GraphSpec): GraphArtifacts {
  const set = ARTIFACT_SETS[methodName];
  if (!set) return { graphSpec };
  return {
    graphSpec,
    pipeIoContracts: set.contracts,
    outputForm: set.outputForm,
    inputForm: set.inputForm,
  };
}
