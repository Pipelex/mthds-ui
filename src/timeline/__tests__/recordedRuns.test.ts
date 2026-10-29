/**
 * The recorded runs the stories replay are held to the contract here: the
 * recording of the worked example's run, taken at the example's moment, is the
 * snapshot the contract prints, summary and version included, and every
 * recording's snapshots come in an order a reader would keep each of.
 */
import { describe, expect, it } from "vitest";
import { buildProblem } from "mthds/errors";
import {
  CANCELED_RUN_SNAPSHOT,
  CONDENSE_FAILED_PROBLEM,
  DRY_RUN_SNAPSHOTS,
  ENGINE_RETRY_PROBLEM,
  HUNDREDS_OF_ITEMS_END_SNAPSHOT,
  HUNDREDS_OF_ITEMS_FAILED,
  HUNDREDS_OF_ITEMS_MID_RUN_SNAPSHOT,
  OUTAGE_END_SNAPSHOT,
  OUTAGE_FIRST_FAILED_ITEM,
  REVIEW_FILINGS_RUN,
  REVIEW_FILINGS_SNAPSHOTS,
  VET_COMPANY_SNAPSHOTS,
  WIDE_BATCH_SNAPSHOTS,
  WORKED_EXAMPLE_MOMENT,
  WORKED_EXAMPLE_SNAPSHOT,
} from "@timeline/react/__stories__/recordedRuns";
import {
  REVIEW_FILINGS_REGISTRY,
  VET_COMPANY_REGISTRY,
} from "@timeline/react/__stories__/methodRegistries";
import { snapshotAt } from "@timeline/react/__stories__/runRecorder";
import { fresherSnapshot } from "../snapshotFreshness";

describe("the recorded runs", () => {
  it("reproduce the contract's worked example at its moment", () => {
    expect(snapshotAt(REVIEW_FILINGS_RUN, WORKED_EXAMPLE_MOMENT)).toEqual(WORKED_EXAMPLE_SNAPSHOT);
    expect(REVIEW_FILINGS_SNAPSHOTS).toContainEqual(WORKED_EXAMPLE_SNAPSHOT);
  });

  it("word the retry clause the contract gives for the example without item 3's trouble", () => {
    const withoutItem3 = snapshotAt(
      {
        ...REVIEW_FILINGS_RUN,
        health: REVIEW_FILINGS_RUN.health?.slice(0, 2),
        runDegradations: [],
      },
      WORKED_EXAMPLE_MOMENT,
    );
    expect(withoutItem3.summary).toBe(
      "Running summarize_filing_batch (step 3 of 4): 1 of 3 items done, 2 running; retrying condense_filing (step 3 of 4, item 2 of 3, step 2 of 2), attempt 2",
    );
  });

  it.each([
    ["the worked example's run", REVIEW_FILINGS_SNAPSHOTS],
    ["the wide batch's run", WIDE_BATCH_SNAPSHOTS],
    ["the vetting run", VET_COMPANY_SNAPSHOTS],
    ["the dry run", DRY_RUN_SNAPSHOTS],
  ])("give each snapshot of %s as fresher than the one before", (_name, snapshots) => {
    for (let index = 1; index < snapshots.length; index += 1) {
      expect(fresherSnapshot(snapshots[index - 1], snapshots[index])).toBe(snapshots[index]);
      expect(snapshots[index].version).toBeGreaterThanOrEqual(snapshots[index - 1].version);
    }
  });

  it("start before the run starts and end once it has", () => {
    const first = REVIEW_FILINGS_SNAPSHOTS[0];
    expect(first).toMatchObject({ status: "pending", version: 0, summary: "Waiting to start" });
    expect(first.invocations).toEqual([]);
    const last = REVIEW_FILINGS_SNAPSHOTS[REVIEW_FILINGS_SNAPSHOTS.length - 1];
    expect(last).toMatchObject({ status: "succeeded", summary: "Completed" });
    expect(last.invocations.every((each) => each.status === "succeeded")).toBe(true);
  });

  it("walk into a parallel's branches, and stop at the entry pipe once its steps are done", () => {
    const summaries = REVIEW_FILINGS_SNAPSHOTS.map((snapshot) => snapshot.summary);
    expect(summaries).toContain(
      "Running deep_checks (step 2 of 4, outcome detailed): 2 branches running",
    );
    // Step 4 has ended and the entry pipe has not: it is the running
    // invocation with no running child, so the walk stops there.
    const afterStep4 = snapshotAt(REVIEW_FILINGS_RUN, "09:31:36.090");
    expect(afterStep4.summary).toBe("Running review_filings");
    expect(summaries).toContain("Running review_filings");
  });

  it("end the wide batch's run at its deepest failure", () => {
    const last = WIDE_BATCH_SNAPSHOTS[WIDE_BATCH_SNAPSHOTS.length - 1];
    expect(last.status).toBe("failed");
    expect(last.summary).toBe("Failed at condense_filing (step 3 of 4, item 9 of 24, step 2 of 2)");
    const summaries = WIDE_BATCH_SNAPSHOTS.map((snapshot) => snapshot.summary);
    expect(summaries.some((summary) => /items done, 6 running, 1 failed$/.test(summary))).toBe(
      true,
    );
    expect(summaries.some((summary) => summary.endsWith("attempt 3"))).toBe(true);
  });

  it("fail the four-hundred-item run's items early, in the middle and near the end", () => {
    const batchOf = (snapshot: typeof OUTAGE_END_SNAPSHOT) =>
      snapshot.invocations.find((each) => each.path === "filings.review_filings/step_3")?.batch;
    const failedItems = (snapshot: typeof OUTAGE_END_SNAPSHOT) =>
      snapshot.invocations
        .filter((each) => /\/step_3\/item_\d+$/.test(each.path) && each.status === "failed")
        .map((each) => Number(each.path.slice(each.path.lastIndexOf("_") + 1)));
    const [early, middle, late] = HUNDREDS_OF_ITEMS_FAILED;

    const mid = HUNDREDS_OF_ITEMS_MID_RUN_SNAPSHOT;
    expect(mid.status).toBe("running");
    expect(batchOf(mid)).toMatchObject({ total: 400, failed: 2 });
    expect(failedItems(mid)).toEqual([early, middle]);
    // Every item is in the snapshot once the batch has fanned out, those not yet started as scheduled.
    expect(mid.invocations.filter((each) => /\/step_3\/item_\d+$/.test(each.path))).toHaveLength(
      400,
    );
    expect(mid.invocations.some((each) => each.status === "scheduled")).toBe(true);

    const end = HUNDREDS_OF_ITEMS_END_SNAPSHOT;
    expect(end.status).toBe("failed");
    expect(failedItems(end)).toEqual([early, middle, late]);
    expect(batchOf(end)).toEqual({ total: 400, done: 397, running: 0, failed: 3 });
  });

  it("fail every item of the outage run past its first thirty, at their first step", () => {
    const end = OUTAGE_END_SNAPSHOT;
    expect(end.status).toBe("failed");
    const batch = end.invocations.find((each) => each.path === "filings.review_filings/step_3");
    expect(batch?.batch).toEqual({
      total: 400,
      done: OUTAGE_FIRST_FAILED_ITEM - 1,
      running: 0,
      failed: 400 - OUTAGE_FIRST_FAILED_ITEM + 1,
    });
    const failedItems = end.invocations
      .filter(
        (each) =>
          /^filings\.review_filings\/step_3\/item_\d+$/.test(each.path) && each.status === "failed",
      )
      .map((each) => each.path);
    expect(failedItems).toEqual(
      Array.from(
        { length: 400 - OUTAGE_FIRST_FAILED_ITEM + 1 },
        (_, index) => `filings.review_filings/step_3/item_${OUTAGE_FIRST_FAILED_ITEM + index}`,
      ),
    );
    for (const item of failedItems) {
      expect(end.invocations.find((each) => each.path === `${item}/step_1`)?.status).toBe("failed");
      expect(end.invocations.some((each) => each.path === `${item}/step_2`)).toBe(false);
    }
  });

  it("write their problems as the standard's builder does", () => {
    expect(ENGINE_RETRY_PROBLEM).toEqual(buildProblem("runtime.unexpected", {}));
    expect(CONDENSE_FAILED_PROBLEM).toEqual(
      buildProblem(
        "pipe.output_invalid",
        { pipe: "condense_filing", output_concept: "FilingSummary", fields: ["text"] },
        {
          location: {
            pipe: "condense_filing",
            path: [
              "review_filings",
              "summarize_filing_batch",
              "summarize_filing",
              "condense_filing",
            ],
          },
        },
      ),
    );
  });

  it("carry the problem that ended the wide run's failed step, and the engine's retries as runtime.unexpected", () => {
    const last = WIDE_BATCH_SNAPSHOTS[WIDE_BATCH_SNAPSHOTS.length - 1];
    const failedStep = last.invocations.find(
      (each) => each.path === "filings.review_filings/step_3/item_9/step_2",
    );
    expect(failedStep?.status).toBe("failed");
    expect(failedStep?.last_failure?.problem).toEqual(CONDENSE_FAILED_PROBLEM);
    const retrying = WIDE_BATCH_SNAPSHOTS.flatMap((snapshot) => snapshot.invocations).find(
      (each) => each.status === "running" && each.attempts !== undefined,
    );
    expect(retrying?.last_failure?.problem).toEqual(ENGINE_RETRY_PROBLEM);
  });

  it.each([
    ["the worked example's run", REVIEW_FILINGS_SNAPSHOTS, REVIEW_FILINGS_REGISTRY],
    ["the wide batch's run", WIDE_BATCH_SNAPSHOTS, REVIEW_FILINGS_REGISTRY],
    ["the vetting run", VET_COMPANY_SNAPSHOTS, VET_COMPANY_REGISTRY],
    ["the dry run", DRY_RUN_SNAPSHOTS, REVIEW_FILINGS_REGISTRY],
    [
      "the four-hundred-item run",
      [HUNDREDS_OF_ITEMS_MID_RUN_SNAPSHOT, HUNDREDS_OF_ITEMS_END_SNAPSHOT],
      REVIEW_FILINGS_REGISTRY,
    ],
    ["the outage run", [OUTAGE_END_SNAPSHOT], REVIEW_FILINGS_REGISTRY],
  ])("run only pipes the method of %s declares", (_name, snapshots, registry) => {
    for (const snapshot of snapshots) {
      for (const invocation of snapshot.invocations) {
        const pipe = registry[invocation.pipe_ref];
        expect(pipe, invocation.pipe_ref).toBeDefined();
        expect(pipe?.type).toBe(invocation.pipe_type);
        expect(pipe?.code).toBe(invocation.pipe_code);
      }
    }
  });

  it("number the vetting run's steps as the contract does: its binding counted, the dotted batch_over's not", () => {
    const last = VET_COMPANY_SNAPSHOTS[VET_COMPANY_SNAPSHOTS.length - 1];
    expect(last.status).toBe("succeeded");
    const byPath = new Map(last.invocations.map((each) => [each.path, each]));
    expect(byPath.get("diligence.vet_company")?.step_count).toBe(6);
    expect(byPath.has("diligence.vet_company/step_1")).toBe(false);
    expect(byPath.get("diligence.vet_company/step_2")?.pipe_code).toBe("gather_sources");
    expect(byPath.get("diligence.vet_company/step_4")?.pipe_code).toBe("verify_claim_batch");
    expect(byPath.get("diligence.vet_company/step_6")?.pipe_code).toBe("write_memo");
    expect(byPath.get("diligence.vet_company/step_5/step_1/step_1/step_2/step_1")?.pipe_code).toBe(
      "run_stress_case",
    );
  });

  it("cancel what was still going when the run was canceled", () => {
    expect(CANCELED_RUN_SNAPSHOT).toMatchObject({ status: "canceled", summary: "Canceled" });
    const statuses = Object.fromEntries(
      CANCELED_RUN_SNAPSHOT.invocations.map((each) => [each.path, each.status]),
    );
    expect(statuses["filings.review_filings"]).toBe("canceled");
    expect(statuses["filings.review_filings/step_3/item_1/step_2"]).toBe("canceled");
    expect(statuses["filings.review_filings/step_1"]).toBe("succeeded");
    expect(CANCELED_RUN_SNAPSHOT.invocations.find((each) => each.batch)?.batch).toEqual({
      total: 3,
      done: 0,
      running: 0,
      failed: 0,
    });
  });
});
