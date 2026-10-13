import {
  compareTimestamps,
  isRunEnded,
  timestampMs,
  type ProgressSnapshot,
} from "./progressSnapshot";

/**
 * The stream of progress a snapshot belongs to, as one string: its run, its
 * mode, and the part of the run it covers (`root_path`, absent for the whole
 * run). Two snapshots with the same key are compared by `fresherSnapshot`; two
 * with different keys are not compared at all. A reader keys on it whatever
 * belongs to one stream, as the timeline keys what its reader expanded and its
 * own reading clock.
 */
export function progressStreamKey(snapshot: ProgressSnapshot): string {
  return JSON.stringify([snapshot.pipeline_run_id, snapshot.mode, snapshot.root_path ?? null]);
}

/**
 * True when two snapshots describe the same stream of progress: one run, one
 * mode, and the same part of it. Two snapshots that differ here are not
 * compared at all; the one a reader is handed is a different run to draw.
 */
export function isSameProgressStream(a: ProgressSnapshot, b: ProgressSnapshot): boolean {
  return progressStreamKey(a) === progressStreamKey(b);
}

/**
 * Of the snapshot a reader holds and one it has just read, the one to keep.
 *
 * Reads that overlap can answer out of order, so a reader never simply takes
 * the latest answer. The contract's rule, its first clause before the other two:
 *
 * 1. Never a `pending` or `running` snapshot over one saying the run has ended,
 *    whatever their versions and their `assembled_at`: an ended run does not
 *    resume, and a read lagging behind the writes can project an ended run from
 *    fewer events than an earlier read projected it running from.
 * 2. Of two snapshots of different versions, the higher version.
 * 3. Of two of the same version, the later `assembled_at`: the later projection
 *    is the one that saw, say, a timeout end the run with no event between them.
 *    The two are compared exactly, at every fractional digit they carry.
 *
 * Ties keep the snapshot held, so a repeated read changes nothing. A snapshot of
 * another run, another mode or another part of a run replaces the held one, since
 * there is nothing to compare it with. Returns one of its two arguments, never a
 * copy, so a caller can tell by identity whether anything changed.
 */
export function fresherSnapshot(
  held: ProgressSnapshot | null | undefined,
  incoming: ProgressSnapshot,
): ProgressSnapshot {
  if (!held || held === incoming) return incoming;
  if (!isSameProgressStream(held, incoming)) return incoming;

  const heldEnded = isRunEnded(held.status);
  const incomingEnded = isRunEnded(incoming.status);
  if (heldEnded !== incomingEnded) return heldEnded ? held : incoming;

  if (incoming.version !== held.version) {
    return incoming.version > held.version ? incoming : held;
  }
  const order = compareTimestamps(incoming.assembled_at, held.assembled_at);
  // An `assembled_at` that cannot be read loses: the incoming one when it is
  // unreadable, else the held one.
  if (order === null) return timestampMs(incoming.assembled_at) === null ? held : incoming;
  return order > 0 ? incoming : held;
}
