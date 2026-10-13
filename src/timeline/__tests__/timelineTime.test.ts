import { describe, expect, it } from "vitest";
import {
  CANCELED_RUN_SNAPSHOT,
  WORKED_EXAMPLE_SNAPSHOT,
} from "@timeline/react/__stories__/recordedRuns";
import type { ProgressInvocation } from "../progressSnapshot";
import {
  axisPercent,
  formatClockTime,
  formatDuration,
  invocationBar,
  readingClockMs,
  timelineTicks,
  timelineWindow,
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

  it("falls back to its largest step for a very long run", () => {
    const week = 7 * 24 * 3_600_000;
    expect(timelineTicks({ startMs: 0, endMs: week })).toHaveLength(8);
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
