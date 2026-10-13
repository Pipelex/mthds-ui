/**
 * Invocation paths: the name of each invocation in a run.
 *
 * A path is the route from the run's entry pipe to the invocation, one segment
 * per controller level: `filings.review_filings/step_3/item_2/step_1` is the
 * first step of the sequence that the batch at step 3 runs for its second item.
 * The root segment is the entry pipe's `pipe_ref`, which never contains `/`,
 * and an outcome key is percent-encoded, so splitting on `/` is exact.
 *
 *   step_<n>       a PipeSequence's step n, from 1, binding steps counted
 *   branch_<n>     a PipeParallel's branch n, from 1
 *   item_<n>       a PipeBatch's item n, from 1 (the list's index 0 is item_1)
 *   outcome_<key>  a PipeCondition's outcome group, named by its first key
 *   default        a PipeCondition's group that only the default outcome runs
 *
 * An ordinal counts from 1 with no leading zero. A segment matching none of the
 * forms is kept as `unknown` rather than rejected, so a reader keeps drawing a
 * path a later grammar adds a segment to.
 */

export const PATH_SEGMENT_KIND = {
  STEP: "step",
  BRANCH: "branch",
  ITEM: "item",
  OUTCOME: "outcome",
  DEFAULT: "default",
  UNKNOWN: "unknown",
} as const;

export type PathSegmentKind = (typeof PATH_SEGMENT_KIND)[keyof typeof PATH_SEGMENT_KIND];

/** A segment with a number: a sequence's step, a parallel's branch, a batch's item. */
export interface OrdinalPathSegment {
  kind:
    | typeof PATH_SEGMENT_KIND.STEP
    | typeof PATH_SEGMENT_KIND.BRANCH
    | typeof PATH_SEGMENT_KIND.ITEM;
  ordinal: number;
  raw: string;
}

/** A condition's outcome group, named by its first key, decoded. */
export interface OutcomePathSegment {
  kind: typeof PATH_SEGMENT_KIND.OUTCOME;
  key: string;
  raw: string;
}

/** A condition's group that only the default outcome runs. */
export interface DefaultPathSegment {
  kind: typeof PATH_SEGMENT_KIND.DEFAULT;
  raw: string;
}

/** A segment the grammar this reader knows does not define. */
export interface UnknownPathSegment {
  kind: typeof PATH_SEGMENT_KIND.UNKNOWN;
  raw: string;
}

export type PathSegment =
  | OrdinalPathSegment
  | OutcomePathSegment
  | DefaultPathSegment
  | UnknownPathSegment;

const PATH_SEPARATOR = "/";
const ORDINAL_SEGMENT = /^(step|branch|item)_([1-9][0-9]*)$/;
const OUTCOME_PREFIX = "outcome_";
const DEFAULT_SEGMENT = "default";

/** The root segment (the entry pipe's `pipe_ref`) and the segments after it. */
export function splitInvocationPath(path: string): { root: string; segments: string[] } {
  const [root, ...segments] = path.split(PATH_SEPARATOR);
  return { root, segments };
}

/** The number of a path's segments, the root included: the entry pipe's path has depth 1. */
export function invocationPathDepth(path: string): number {
  return path.split(PATH_SEPARATOR).length;
}

/** The path of the invocation one level up, or `null` for a root path. */
export function parentInvocationPath(path: string): string | null {
  const cut = path.lastIndexOf(PATH_SEPARATOR);
  return cut < 0 ? null : path.slice(0, cut);
}

/** The last segment of a path, or `null` for a root path. */
export function lastPathSegment(path: string): PathSegment | null {
  const cut = path.lastIndexOf(PATH_SEPARATOR);
  return cut < 0 ? null : parsePathSegment(path.slice(cut + 1));
}

/**
 * An outcome key decoded from its percent-encoded form: `high%20risk` is
 * `high risk`. Each `%XX` is one byte of the key's UTF-8 form. A malformed
 * encoding is returned as written rather than thrown, since a label is better
 * shown raw than not at all.
 */
export function decodeOutcomeKey(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

/** One segment after the root, parsed. */
export function parsePathSegment(raw: string): PathSegment {
  const ordinal = ORDINAL_SEGMENT.exec(raw);
  if (ordinal) {
    const kind = ordinal[1] as OrdinalPathSegment["kind"];
    return { kind, ordinal: Number.parseInt(ordinal[2], 10), raw };
  }
  if (raw.startsWith(OUTCOME_PREFIX)) {
    return {
      kind: PATH_SEGMENT_KIND.OUTCOME,
      key: decodeOutcomeKey(raw.slice(OUTCOME_PREFIX.length)),
      raw,
    };
  }
  if (raw === DEFAULT_SEGMENT) return { kind: PATH_SEGMENT_KIND.DEFAULT, raw };
  return { kind: PATH_SEGMENT_KIND.UNKNOWN, raw };
}

/** True for a segment that carries an ordinal: a step, a branch or an item. */
export function isOrdinalSegment(segment: PathSegment | null): segment is OrdinalPathSegment {
  return (
    segment !== null &&
    (segment.kind === PATH_SEGMENT_KIND.STEP ||
      segment.kind === PATH_SEGMENT_KIND.BRANCH ||
      segment.kind === PATH_SEGMENT_KIND.ITEM)
  );
}
