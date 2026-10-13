import { isRunEnded, timestampMs, type ProgressSnapshot } from "./progressSnapshot";

/**
 * True when two snapshots describe the same stream of progress: one run, one
 * mode, and the same part of it. Two snapshots that differ here are not
 * compared at all; the one a reader is handed is a different run to draw.
 */
export function isSameProgressStream(a: ProgressSnapshot, b: ProgressSnapshot): boolean {
  return (
    a.pipeline_run_id === b.pipeline_run_id && a.mode === b.mode && a.root_path === b.root_path
  );
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
  const heldAt = timestampMs(held.assembled_at);
  const incomingAt = timestampMs(incoming.assembled_at);
  if (incomingAt === null) return held;
  if (heldAt === null) return incoming;
  return incomingAt > heldAt ? incoming : held;
}
