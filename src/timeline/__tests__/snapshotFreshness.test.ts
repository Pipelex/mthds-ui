import { describe, expect, it } from "vitest";
import { isRunEnded, timestampMs, type ProgressSnapshot } from "../progressSnapshot";
import { fresherSnapshot, isSameProgressStream } from "../snapshotFreshness";

function snapshot(overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
  return {
    pipeline_run_id: "run_7Qd2kV",
    mode: "live",
    status: "running",
    version: 10,
    assembled_at: "2026-10-12T09:30:10.000Z",
    summary: "Running review_filings",
    invocations: [],
    ...overrides,
  };
}

describe("fresherSnapshot", () => {
  it("takes the first snapshot it is given", () => {
    const first = snapshot();
    expect(fresherSnapshot(null, first)).toBe(first);
    expect(fresherSnapshot(undefined, first)).toBe(first);
  });

  it("keeps the higher version, whichever arrives last", () => {
    const older = snapshot({ version: 10 });
    const newer = snapshot({ version: 12, assembled_at: "2026-10-12T09:30:09.000Z" });
    expect(fresherSnapshot(older, newer)).toBe(newer);
    // A read lagging behind the writes answers late with a lower version.
    expect(fresherSnapshot(newer, older)).toBe(newer);
  });

  it("keeps the later assembled_at between two snapshots of one version", () => {
    const earlier = snapshot({ version: 26, assembled_at: "2026-10-12T09:31:20.512Z" });
    const later = snapshot({ version: 26, assembled_at: "2026-10-12T09:31:21.004Z" });
    expect(fresherSnapshot(earlier, later)).toBe(later);
    expect(fresherSnapshot(later, earlier)).toBe(later);
  });

  it("keeps the one it holds when the two are as fresh as each other", () => {
    const held = snapshot();
    const repeated = snapshot();
    expect(fresherSnapshot(held, repeated)).toBe(held);
  });

  it("never trades an ended run's snapshot for one showing it still going", () => {
    const ended = snapshot({ status: "succeeded", version: 30 });
    const stillRunning = snapshot({
      status: "running",
      version: 31,
      assembled_at: "2026-10-12T09:40:00.000Z",
    });
    expect(fresherSnapshot(ended, stillRunning)).toBe(ended);
    expect(fresherSnapshot(ended, snapshot({ status: "pending", version: 99 }))).toBe(ended);
  });

  it("takes an ended run's snapshot over a running one, whatever its version", () => {
    // A timeout ends the run with no new event; a read lagging behind the
    // writes may even project the ended run from fewer events.
    const running = snapshot({ status: "running", version: 26 });
    const timedOut = snapshot({ status: "failed", version: 24 });
    expect(fresherSnapshot(running, timedOut)).toBe(timedOut);
  });

  it("orders two snapshots of an ended run by version, then by assembled_at", () => {
    const ended = snapshot({ status: "failed", version: 24 });
    const endedLater = snapshot({ status: "failed", version: 26 });
    expect(fresherSnapshot(ended, endedLater)).toBe(endedLater);
    expect(fresherSnapshot(endedLater, ended)).toBe(endedLater);
  });

  it("replaces the held snapshot with one of another run, mode or part", () => {
    const held = snapshot({ status: "succeeded", version: 40 });
    const otherRun = snapshot({ pipeline_run_id: "run_other", version: 1 });
    const dry = snapshot({ mode: "dry", version: 1 });
    const part = snapshot({ root_path: "filings.review_filings/step_3/item_2", version: 1 });
    expect(fresherSnapshot(held, otherRun)).toBe(otherRun);
    expect(fresherSnapshot(held, dry)).toBe(dry);
    expect(fresherSnapshot(held, part)).toBe(part);
    expect(isSameProgressStream(held, snapshot())).toBe(true);
  });

  it("compares assembled_at past the millisecond, and across offsets", () => {
    const first = snapshot({ version: 5, assembled_at: "2026-10-12T09:30:10.000100Z" });
    const second = snapshot({ version: 5, assembled_at: "2026-10-12T09:30:10.000200Z" });
    expect(fresherSnapshot(first, second)).toBe(second);
    const offset = snapshot({ version: 5, assembled_at: "2026-10-12T09:30:11+00:00" });
    expect(fresherSnapshot(second, offset)).toBe(offset);
  });

  it("does not take a snapshot whose assembled_at it cannot read", () => {
    const held = snapshot({ version: 5 });
    const unreadable = snapshot({ version: 5, assembled_at: "yesterday" });
    expect(fresherSnapshot(held, unreadable)).toBe(held);
    expect(fresherSnapshot(unreadable, held)).toBe(held);
  });
});

describe("isRunEnded and timestampMs", () => {
  it("knows the three ends of a run", () => {
    expect(isRunEnded("succeeded")).toBe(true);
    expect(isRunEnded("failed")).toBe(true);
    expect(isRunEnded("canceled")).toBe(true);
    expect(isRunEnded("running")).toBe(false);
    expect(isRunEnded("pending")).toBe(false);
  });

  it("reads RFC 3339 timestamps, keeping digits past the millisecond", () => {
    expect(timestampMs("2026-10-12T09:30:06.870Z")).toBe(Date.parse("2026-10-12T09:30:06.870Z"));
    expect(timestampMs("2026-10-12T09:30:06Z")).toBe(Date.parse("2026-10-12T09:30:06Z"));
    expect(timestampMs("2026-10-12T09:30:06.870500Z")).toBeCloseTo(
      Date.parse("2026-10-12T09:30:06.870Z") + 0.5,
      6,
    );
    expect(timestampMs("2026-10-12T11:30:06.870+02:00")).toBe(
      Date.parse("2026-10-12T09:30:06.870Z"),
    );
    expect(timestampMs(null)).toBeNull();
    expect(timestampMs(undefined)).toBeNull();
    expect(timestampMs("not a time")).toBeNull();
    expect(timestampMs("2026-10-12T25:30:06Z")).toBeNull();
  });
});
