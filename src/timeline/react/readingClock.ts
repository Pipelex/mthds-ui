"use client";

/**
 * The snapshot a timeline draws and the clock it reads it against, shared by
 * every timeline style: the fresher of the snapshots it was handed, and a
 * reading clock that starts from the snapshot's `assembled_at` and never steps
 * back within one stream of progress. A style decides only how often its clock
 * ticks and whether anything it draws follows it.
 */
import * as React from "react";
import {
  isRunEnded,
  type ProgressSnapshot,
  type ProgressTimestamp,
} from "@timeline/progressSnapshot";
import { fresherSnapshot } from "@timeline/snapshotFreshness";
import { readingClockMs } from "@timeline/timelineTime";

/**
 * The snapshot to draw: of the one held and the one just passed, the fresher by
 * the contract's rule. React's derived-state pattern rather than an effect, so
 * the render that receives a stale snapshot never paints it, not even once.
 */
export function useHeldSnapshot(snapshot: ProgressSnapshot): ProgressSnapshot {
  const [state, setState] = React.useState({ given: snapshot, held: snapshot });
  if (state.given !== snapshot) {
    const held = fresherSnapshot(state.held, snapshot);
    setState({ given: snapshot, held });
    return held;
  }
  return state.held;
}

/** What the clock last showed, for which stream and which reading, and whether it ticked on its own. */
interface SelfClock {
  stream: string;
  base: number | null;
  ticking: boolean;
  ms: number | null;
}

export interface ReadingClockOptions {
  /** The moment the host pinned, as on `RunTimelineProps.now`. */
  now: ProgressTimestamp | number | undefined;
  /** Whether the clock may tick on its own while the run goes on. */
  live: boolean;
  /** Whether anything drawn follows the clock: with nothing, a tick would redraw nothing that moves. */
  followsClock: boolean;
  /** How often the clock ticks, in milliseconds. */
  tickMs: number;
}

/**
 * The reading clock, in epoch milliseconds. Pinned by `now` when the host sets
 * it; otherwise the snapshot's `assembled_at`, advanced while the run goes on by
 * the time this page has measured since. It ticks every `tickMs` only while a
 * drawn element follows it (`followsClock`).
 *
 * The self-ticking clock never goes back within one stream of progress. A
 * snapshot that took long to arrive can carry an `assembled_at` older than the
 * moment the clock already shows; the clock then carries on from what it
 * showed, the later of the two readings, rather than jumping back, so nothing
 * that grows with it shrinks and grows again. That floor comes only from a
 * clock that was itself ticking in the same stream: a moment the host pinned
 * with `now`, or a clock standing still, is not one this clock reached on its
 * own, so a clock that starts ticking starts from its snapshot's reading. A
 * snapshot of another stream starts the clock afresh from its own reading.
 */
export function useReadingClock(
  held: ProgressSnapshot,
  stream: string,
  { now, live, followsClock, tickMs }: ReadingClockOptions,
): { nowMs: number | null; ticking: boolean } {
  const base = React.useMemo(() => readingClockMs(held, now), [held, now]);
  const ticking =
    live && now === undefined && base !== null && !isRunEnded(held.status) && followsClock;
  const [clock, setClock] = React.useState<SelfClock>({
    stream,
    base,
    ticking,
    ms: base,
  });
  let shown = clock;
  if (clock.stream !== stream || clock.base !== base || clock.ticking !== ticking) {
    // React's derived-state pattern, as in `useHeldSnapshot`: the render that
    // receives the new reading already shows the clock it starts from.
    const floor = ticking && clock.ticking && clock.stream === stream ? clock.ms : null;
    const ms = base !== null && floor !== null ? Math.max(base, floor) : base;
    shown = { stream, base, ticking, ms };
    setClock(shown);
  }
  React.useEffect(() => {
    if (!ticking) return undefined;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const current = performance.now();
      const step = current - previous;
      previous = current;
      setClock((state) =>
        state.stream === stream && state.base === base && state.ticking && state.ms !== null
          ? { ...state, ms: state.ms + step }
          : state,
      );
    }, tickMs);
    return () => window.clearInterval(timer);
  }, [ticking, stream, base, tickMs]);
  return { nowMs: ticking ? shown.ms : base, ticking };
}
