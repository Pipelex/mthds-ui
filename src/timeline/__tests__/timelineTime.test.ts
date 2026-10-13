import { describe, expect, it } from "vitest";
import {
  CANCELED_RUN_SNAPSHOT,
  WORKED_EXAMPLE_SNAPSHOT,
} from "@timeline/react/__stories__/recordedRuns";
import type { ProgressInvocation, ProgressSnapshot } from "../progressSnapshot";
import {
  axisPercent,
  barFollowsClock,
  formatClockTime,
  formatDuration,
  invocationBar,
  invocationTimes,
  readingClockMs,
  snapshotTimes,
  timelineTicks,
  timelineWindow,
  timelineWindowAt,
} from "../timelineTime";

const ms = (timestamp: string) => Date.parse(timestamp);
const RUN_START = ms("2026-10-12T09:30:00.104Z");
const ASSEMBLED = ms("2026-10-12T09:31:20.512Z");

function find(path: string): ProgressInvocation {
  const found = WORKED_EXAMPLE_SNAPSHOT.invocations.find((each) => each.path === path);
  if (!found) throw new Error(`no invocation at ${path}`);
  return found;
}

describe("the reading clock and the axis", () => {
  it("reads the clock off assembled_at unless the host pins it", () => {
    expect(readingClockMs(WORKED_EXAMPLE_SNAPSHOT)).toBe(ASSEMBLED);
    expect(readingClockMs(WORKED_EXAMPLE_SNAPSHOT, ASSEMBLED + 500)).toBe(ASSEMBLED + 500);
    expect(readingClockMs(WORKED_EXAMPLE_SNAPSHOT, "2026-10-12T09:31:30.000Z")).toBe(
      ms("2026-10-12T09:31:30.000Z"),
    );
    expect(readingClockMs(WORKED_EXAMPLE_SNAPSHOT, "garbage")).toBe(ASSEMBLED);
    expect(readingClockMs(WORKED_EXAMPLE_SNAPSHOT, Number.NaN)).toBeNull();
  });

  it("spans a running run from its first start to the reading clock", () => {
    expect(timelineWindow(WORKED_EXAMPLE_SNAPSHOT)).toEqual({
      startMs: RUN_START,
      endMs: ASSEMBLED,
    });
    expect(timelineWindow(WORKED_EXAMPLE_SNAPSHOT, ASSEMBLED + 4_000)).toEqual({
      startMs: RUN_START,
      endMs: ASSEMBLED + 4_000,
    });
  });

  it("spans an ended run to the latest time it recorded, not to when it was read", () => {
    const ended = {
      ...WORKED_EXAMPLE_SNAPSHOT,
      status: "succeeded" as const,
      assembled_at: "2026-10-13T09:00:00.000Z",
    };
    // The latest recorded moment is item 2's last failure, at 09:30:52.317.
    expect(timelineWindow(ended)).toEqual({
      startMs: RUN_START,
      endMs: ms("2026-10-12T09:30:52.317Z"),
    });
  });

  it("has no axis before anything started", () => {
    expect(timelineWindow({ ...WORKED_EXAMPLE_SNAPSHOT, invocations: [] })).toBeNull();
  });

  it("reaches an end recorded by an invocation whose start was not", () => {
    // The root's start was not recorded, but its end was, and it is the latest
    // moment the run recorded; only the axis's start needs a recorded start.
    const root: ProgressInvocation = {
      ...find("filings.review_filings"),
      status: "succeeded",
      started_at: null,
      ended_at: "2026-10-12T09:30:10.000Z",
    };
    const child: ProgressInvocation = {
      ...find("filings.review_filings/step_1"),
      started_at: "2026-10-12T09:30:00.000Z",
      ended_at: "2026-10-12T09:30:01.000Z",
    };
    const ended: ProgressSnapshot = {
      ...WORKED_EXAMPLE_SNAPSHOT,
      status: "succeeded",
      invocations: [root, child],
    };
    expect(timelineWindow(ended)).toEqual({
      startMs: ms("2026-10-12T09:30:00.000Z"),
      endMs: ms("2026-10-12T09:30:10.000Z"),
    });
    // A failure recorded on an invocation with no recorded start counts too.
    const failedLate: ProgressSnapshot = {
      ...ended,
      invocations: [
        { ...root, ended_at: null, last_failure: { message: "x", at: "2026-10-12T09:30:12Z" } },
        child,
      ],
    };
    expect(timelineWindow(failedLate)?.endMs).toBe(ms("2026-10-12T09:30:12.000Z"));
    // With no recorded start at all, there is still no axis.
    expect(timelineWindow({ ...ended, invocations: [root] })).toBeNull();
  });

  it("never spans zero time", () => {
    const instant = {
      ...WORKED_EXAMPLE_SNAPSHOT,
      status: "succeeded" as const,
      invocations: [
        {
          ...find("filings.review_filings"),
          status: "succeeded" as const,
          ended_at: "2026-10-12T09:30:00.104Z",
        },
      ],
    };
    expect(timelineWindow(instant)).toEqual({ startMs: RUN_START, endMs: RUN_START + 1 });
  });
});

describe("snapshotTimes, parsed once", () => {
  const times = snapshotTimes(WORKED_EXAMPLE_SNAPSHOT);

  it("holds each invocation's moments by path", () => {
    expect(times.invocations.size).toBe(WORKED_EXAMPLE_SNAPSHOT.invocations.length);
    expect(times.invocations.get("filings.review_filings/step_1")).toEqual({
      startedMs: ms("2026-10-12T09:30:00.131Z"),
      endedMs: ms("2026-10-12T09:30:06.870Z"),
      failedMs: null,
    });
    expect(times.assembledMs).toBe(ASSEMBLED);
    expect(times.ended).toBe(false);
  });

  it("gives the same axis as timelineWindow at every reading of the clock", () => {
    for (const nowMs of [undefined, null, ASSEMBLED, ASSEMBLED + 4_000, RUN_START]) {
      expect(timelineWindowAt(times, nowMs)).toEqual(
        timelineWindow(WORKED_EXAMPLE_SNAPSHOT, nowMs),
      );
    }
    const ended = { ...WORKED_EXAMPLE_SNAPSHOT, status: "failed" as const };
    expect(timelineWindowAt(snapshotTimes(ended), ASSEMBLED + 4_000)).toEqual(
      timelineWindow(ended, ASSEMBLED + 4_000),
    );
  });

  it("reads a clock that is not a finite number as no clock, so the axis stays finite", () => {
    for (const nowMs of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(timelineWindowAt(times, nowMs)).toEqual(timelineWindowAt(times));
      expect(timelineWindow(WORKED_EXAMPLE_SNAPSHOT, nowMs)).toEqual(
        timelineWindow(WORKED_EXAMPLE_SNAPSHOT),
      );
    }
    expect(timelineWindowAt(times, Number.POSITIVE_INFINITY)?.endMs).toBe(ASSEMBLED);
  });

  it("keeps the recorded span, which a clock that does not stretch it hands back as it is", () => {
    expect(times.recorded).toEqual({
      startMs: RUN_START,
      endMs: ms("2026-10-12T09:30:52.317Z"),
    });
    expect(timelineWindowAt(times, RUN_START)).toBe(times.recorded);
    expect(timelineWindowAt({ ...times, ended: true }, ASSEMBLED)).toBe(times.recorded);
  });

  it("knows which bars follow the clock and which the snapshot settles", () => {
    const running = find("filings.review_filings/step_3");
    const succeeded = find("filings.review_filings/step_1");
    expect(barFollowsClock(running)).toBe(true);
    expect(barFollowsClock(succeeded)).toBe(false);
    expect(barFollowsClock({ ...running, status: "canceled" })).toBe(true);
    expect(barFollowsClock({ ...running, status: "scheduled", started_at: null })).toBe(false);
    // A running invocation that somehow recorded its end is settled by it.
    expect(barFollowsClock({ ...running, ended_at: "2026-10-12T09:31:00Z" })).toBe(false);
  });

  it("draws a bar from moments parsed beforehand as from the invocation itself", () => {
    const axis = { startMs: RUN_START, endMs: ASSEMBLED };
    for (const invocation of WORKED_EXAMPLE_SNAPSHOT.invocations) {
      expect(invocationBar(invocation, axis, ASSEMBLED, invocationTimes(invocation))).toEqual(
        invocationBar(invocation, axis, ASSEMBLED),
      );
    }
  });
});

describe("invocationBar", () => {
  const axis = { startMs: RUN_START, endMs: ASSEMBLED };

  it("runs an ended invocation from its start to its end", () => {
    expect(invocationBar(find("filings.review_filings/step_1"), axis)).toEqual({
      startMs: ms("2026-10-12T09:30:00.131Z"),
      endMs: ms("2026-10-12T09:30:06.870Z"),
      growing: false,
      openEnded: false,
    });
  });

  it("grows a running invocation to the reading clock", () => {
    const bar = invocationBar(find("filings.review_filings/step_3"), axis, ASSEMBLED + 2_000);
    expect(bar).toMatchObject({ endMs: ASSEMBLED + 2_000, growing: true });
    expect(invocationBar(find("filings.review_filings/step_3"), axis)).toMatchObject({
      endMs: ASSEMBLED,
    });
  });

  it("runs a canceled invocation to the end of the axis", () => {
    const canceledAxis = timelineWindow(CANCELED_RUN_SNAPSHOT);
    const canceled = CANCELED_RUN_SNAPSHOT.invocations.find(
      (each) => each.path === "filings.review_filings/step_3/item_3",
    );
    expect(canceled?.status).toBe("canceled");
    expect(canceledAxis).not.toBeNull();
    if (!canceled || !canceledAxis) return;
    expect(invocationBar(canceled, canceledAxis)).toMatchObject({
      endMs: canceledAxis.endMs,
      openEnded: true,
      growing: false,
    });
  });

  it("draws no bar for an invocation that has not started", () => {
    const scheduled: ProgressInvocation = {
      ...find("filings.review_filings/step_3/item_3"),
      status: "scheduled",
      started_at: null,
      ended_at: null,
    };
    expect(invocationBar(scheduled, axis)).toBeNull();
  });

  it("never draws a bar ending before it starts", () => {
    const skewed = {
      ...find("filings.review_filings/step_3"),
      started_at: "2026-10-12T09:32:00.000Z",
    };
    const bar = invocationBar(skewed, axis, ASSEMBLED);
    expect(bar?.endMs).toBe(bar?.startMs);
    const unended = { ...find("filings.review_filings/step_1"), ended_at: null };
    expect(invocationBar(unended, axis)?.endMs).toBe(ms("2026-10-12T09:30:00.131Z"));
  });

  it("places moments on the axis as percentages, clamped to it", () => {
    expect(axisPercent(RUN_START, axis)).toBe(0);
    expect(axisPercent(ASSEMBLED, axis)).toBe(100);
    expect(axisPercent(ASSEMBLED + 1_000, axis)).toBe(100);
    expect(axisPercent(RUN_START - 1_000, axis)).toBe(0);
    expect(axisPercent(RUN_START, { startMs: 5, endMs: 5 })).toBe(0);
  });
});

describe("ticks and durations", () => {
  it("ticks the axis at a round step, no more than six intervals", () => {
    const ticks = timelineTicks({ startMs: 0, endMs: 80_408 });
    expect(ticks.map((tick) => tick.label)).toEqual(["0s", "15s", "30s", "45s", "1m", "1m 15s"]);
    expect(ticks[1].percent).toBeCloseTo((15_000 / 80_408) * 100, 6);
    expect(timelineTicks({ startMs: 0, endMs: 900 }).map((tick) => tick.label)).toEqual([
      "0s",
      "200ms",
      "400ms",
      "600ms",
      "800ms",
    ]);
  });

  it("steps by whole days past its largest step, still keeping to the budget", () => {
    const day = 24 * 3_600_000;
    // A week over six intervals: one day would make seven, so the step is two days.
    expect(timelineTicks({ startMs: 0, endMs: 7 * day }).map((tick) => tick.offsetMs)).toEqual([
      0,
      2 * day,
      4 * day,
      6 * day,
    ]);
    // Sixty days on a narrow axis: two intervals of thirty days, never sixty-one labels.
    const sixtyDays = timelineTicks({ startMs: 0, endMs: 60 * day }, 2);
    expect(sixtyDays.map((tick) => tick.offsetMs)).toEqual([0, 30 * day, 60 * day]);
    for (const budget of [1, 3, 4, 6, 9]) {
      const ticks = timelineTicks({ startMs: 0, endMs: 60 * day + 1 }, budget);
      expect(ticks.length - 1).toBeLessThanOrEqual(budget);
      for (const tick of ticks) expect(tick.offsetMs % day).toBe(0);
    }
  });

  it("ticks no axis whose span is not a finite positive number, rather than looping forever", () => {
    expect(timelineTicks({ startMs: 5, endMs: 5 })).toEqual([]);
    expect(timelineTicks({ startMs: 10, endMs: 0 })).toEqual([]);
    expect(timelineTicks({ startMs: 0, endMs: Number.NaN })).toEqual([]);
    expect(timelineTicks({ startMs: 0, endMs: Number.POSITIVE_INFINITY })).toEqual([]);
    expect(timelineTicks({ startMs: Number.NEGATIVE_INFINITY, endMs: 0 })).toEqual([]);
  });

  it("takes a budget below one interval as one", () => {
    expect(timelineTicks({ startMs: 0, endMs: 10_000 }, 0).map((tick) => tick.label)).toEqual([
      "0s",
      "10s",
    ]);
  });

  it("formats durations in a few characters", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(-20)).toBe("0s");
    expect(formatDuration(340)).toBe("340ms");
    expect(formatDuration(999.7)).toBe("1s");
    expect(formatDuration(6_739)).toBe("6.7s");
    expect(formatDuration(42_400)).toBe("42s");
    expect(formatDuration(59_600)).toBe("1m");
    expect(formatDuration(125_000)).toBe("2m 05s");
    expect(formatDuration(3_599_700)).toBe("1h");
    expect(formatDuration(4_320_000)).toBe("1h 12m");
  });

  it("formats a moment as its UTC time of day", () => {
    expect(formatClockTime(ms("2026-10-12T09:30:07.034Z"))).toBe("09:30:07.034 UTC");
  });
});
