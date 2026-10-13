import * as React from "react";
import type { GraphThemeMode } from "@graph/types";
import { timestampMs, type ProgressSnapshot } from "@timeline/progressSnapshot";
import { formatClockTime } from "@timeline/timelineTime";
import { RunTimeline } from "../RunTimeline";

export interface SnapshotReplayProps {
  /** A recorded run's successive snapshots, in the order they were read. */
  snapshots: ProgressSnapshot[];
  /** Start playing on mount. */
  autoplay?: boolean;
  /** The snapshot to start at. Defaults to the first. */
  initialFrame?: number;
  /** How many times faster than the run went. */
  initialSpeed?: number;
  theme?: GraphThemeMode;
  wideBatchThreshold?: number;
}

const SPEEDS = [1, 2, 5, 10];

function momentOf(snapshot: ProgressSnapshot): number {
  return timestampMs(snapshot.assembled_at) ?? 0;
}

/** The last snapshot read by the replay clock. */
function frameAt(moments: number[], clock: number): number {
  let frame = 0;
  for (let index = 0; index < moments.length; index += 1) {
    if (moments[index] <= clock) frame = index;
  }
  return frame;
}

const BUTTON_STYLE: React.CSSProperties = {
  padding: "4px 10px",
  border: "1px solid #475569",
  borderRadius: 6,
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
};

/**
 * Replays a recorded run through the timeline, the way a client reading the
 * progress route after each change would have drawn it.
 *
 * The replay keeps a clock in the run's own time. Playing advances it, and each
 * snapshot is handed to the timeline once the clock reaches its `assembled_at`;
 * the clock is also the timeline's `now`, so running bars grow smoothly between
 * snapshots at any speed. Going back mounts a fresh timeline: a timeline never
 * trades the snapshot it holds for an older one, which is the contract's rule
 * and exactly what a rewind would otherwise run into.
 */
export function SnapshotReplay({
  snapshots,
  autoplay = false,
  initialFrame = 0,
  initialSpeed = 5,
  theme,
  wideBatchThreshold,
}: SnapshotReplayProps) {
  const moments = React.useMemo(() => snapshots.map(momentOf), [snapshots]);
  const endMoment = moments[moments.length - 1];
  const [clock, setClock] = React.useState(() => moments[initialFrame] ?? moments[0]);
  const [playing, setPlaying] = React.useState(autoplay);
  const [speed, setSpeed] = React.useState(initialSpeed);
  const [generation, setGeneration] = React.useState(0);
  const frame = frameAt(moments, clock);
  const atEnd = clock >= endMoment;

  React.useEffect(() => {
    if (!playing) return undefined;
    let previous = performance.now();
    let request = 0;
    const advance = (now: number) => {
      const elapsed = (now - previous) * speed;
      previous = now;
      setClock((current) => Math.min(current + elapsed, endMoment));
      request = window.requestAnimationFrame(advance);
    };
    request = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(request);
  }, [playing, speed, endMoment]);

  React.useEffect(() => {
    if (playing && atEnd) setPlaying(false);
  }, [playing, atEnd]);

  const jumpTo = (target: number) => {
    const bounded = Math.max(0, Math.min(snapshots.length - 1, target));
    if (bounded < frame) setGeneration((current) => current + 1);
    setClock(moments[bounded]);
  };

  const snapshot = snapshots[frame];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, color: "#64748b" }}>
      <div
        role="toolbar"
        aria-label="Replay"
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 13 }}
      >
        <button
          type="button"
          style={BUTTON_STYLE}
          onClick={() => {
            if (atEnd) jumpTo(0);
            setPlaying((current) => !current || atEnd);
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" style={BUTTON_STYLE} onClick={() => jumpTo(frame - 1)}>
          Previous snapshot
        </button>
        <button type="button" style={BUTTON_STYLE} onClick={() => jumpTo(frame + 1)}>
          Next snapshot
        </button>
        <button type="button" style={BUTTON_STYLE} onClick={() => jumpTo(0)}>
          Restart
        </button>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          Speed
          <select
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            style={{ ...BUTTON_STYLE, padding: "3px 6px" }}
          >
            {SPEEDS.map((choice) => (
              <option key={choice} value={choice}>
                {choice}×
              </option>
            ))}
          </select>
        </label>
        <span data-testid="replay-position" style={{ fontVariantNumeric: "tabular-nums" }}>
          {`Snapshot ${frame + 1} of ${snapshots.length} · version ${snapshot.version} · read at ${formatClockTime(moments[frame])}`}
        </span>
      </div>
      <RunTimeline
        key={generation}
        snapshot={snapshot}
        now={clock}
        theme={theme}
        wideBatchThreshold={wideBatchThreshold}
      />
    </div>
  );
}
