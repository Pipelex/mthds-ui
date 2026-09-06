import {
  ARTIFACT_SETS,
  type ArtifactSet,
} from "@form/react/__stories__/contracts/_generated.contracts";

/**
 * The artifacts a per-pipeline graph story hands `GraphViewer`, by method name.
 *
 * ## Why the stories carry them
 *
 * Clicking a data node in one of the 34 `Graph - from run/NN …` stories and
 * getting only a schema table is the wrong answer to "what happened in this
 * run?". Every one of those specs is a real (or dry) run of a bundle whose
 * `pipe_io_contracts` and `output_form` this repo also generates, so the panel
 * can show what each step actually produced — and, through `input_form`, what
 * the method was given.
 *
 * A method whose artifacts are missing returns `{}` rather than a half-set:
 * the viewer needs the contract and the output descriptor TOGETHER, and passing
 * one of the two would have it guess the other.
 */
export function artifactsFor(methodName: string): Partial<ArtifactSet> {
  return ARTIFACT_SETS[methodName] ?? {};
}
