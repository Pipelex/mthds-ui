/**
 * Why `GraphViewer` drew no graph, as a value it can draw.
 *
 * `validateGraphSpec` throws on a spec it refuses, which is the right contract
 * for the code that calls it directly: a CLI, a worker, a test. Inside a React
 * render the same throw unmounts the host's whole tree, so the viewer reads the
 * spec through `readGraphSpec` instead and draws the refusal in place of the
 * graph (`GraphErrorState`). The validator itself is unchanged.
 */
import type { GraphSpec } from "@graph/types";
import { GraphSpecValidationError, validateGraphSpec } from "@graph/validateGraphSpec";

/**
 * The sentence the error state shows for a failure: a refused spec's own
 * message, which names the location it refused and what it found there, or any
 * other error's name and message.
 */
export function describeGraphFailure(error: unknown): string {
  if (error instanceof GraphSpecValidationError) return error.message;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

/** The spec the viewer draws, or why it refused it: never both. */
export type GraphSpecReading =
  | { graphspec: GraphSpec | null; failure: null }
  | { graphspec: null; failure: string };

/**
 * Validate the host's spec at the viewer's boundary, returning the refusal
 * rather than throwing it. `null` is no spec, which draws nothing and is no
 * failure. Like `validateGraphSpec`, it normalizes an accepted spec in place
 * and returns that same object.
 */
export function readGraphSpec(raw: GraphSpec | null): GraphSpecReading {
  if (raw === null) return { graphspec: null, failure: null };
  try {
    return { graphspec: validateGraphSpec(raw), failure: null };
  } catch (error) {
    return { graphspec: null, failure: describeGraphFailure(error) };
  }
}
