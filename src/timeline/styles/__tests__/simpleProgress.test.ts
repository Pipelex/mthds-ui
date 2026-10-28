import { describe, expect, it } from "vitest";
import type { ProgressInvocation, ProgressSnapshot } from "@timeline/progressSnapshot";
import {
  CANCELED_RUN_SNAPSHOT,
  CONDENSE_FAILED_PROBLEM,
  DRY_RUN_SNAPSHOTS,
  REVIEW_FILINGS_SNAPSHOTS,
  VET_COMPANY_SNAPSHOTS,
  WIDE_BATCH_SNAPSHOTS,
  WORKED_EXAMPLE_SNAPSHOT,
} from "@timeline/react/__stories__/recordedRuns";
import {
  REVIEW_FILINGS_REGISTRY,
  VET_COMPANY_REGISTRY,
} from "@timeline/react/__stories__/methodRegistries";
import { outline } from "@timeline/__tests__/simpleOutline";
import { lastPathSegment } from "@timeline/invocationPath";
import {
  SIMPLE_MAX_DEPTH,
  buildSimpleProgress,
  simpleProgressChanges,
  type SimpleProgress,
  type SimpleProgressLine,
} from "../simpleProgress";

const ROOT = "filings.review_filings";
const BATCH = `${ROOT}/step_3`;
const VET_ROOT = "diligence.vet_company";
const filings = { pipeRegistry: REVIEW_FILINGS_REGISTRY };
const vetting = { pipeRegistry: VET_COMPANY_REGISTRY };

const LAST_WIDE = WIDE_BATCH_SNAPSHOTS[WIDE_BATCH_SNAPSHOTS.length - 1];
const LAST_DRY = DRY_RUN_SNAPSHOTS[DRY_RUN_SNAPSHOTS.length - 1];

/** The last of a recording's snapshots taken at or before a clock time of its day. */
function at(snapshots: ProgressSnapshot[], clock: string): ProgressSnapshot {
  const found = [...snapshots]
    .reverse()
    .find((snapshot) => snapshot.assembled_at.slice(11) <= clock);
  if (!found) throw new Error(`no snapshot at ${clock}`);
  return found;
}

function lineAt(lines: SimpleProgressLine[], key: string): SimpleProgressLine {
  for (const line of lines) {
    if (line.key === key) return line;
    const found = line.children.length > 0 ? lineAtOrNull(line.children, key) : null;
    if (found) return found;
  }
  throw new Error(`no line ${key}`);
}

function lineAtOrNull(lines: SimpleProgressLine[], key: string): SimpleProgressLine | null {
  try {
    return lineAt(lines, key);
  } catch {
    return null;
  }
}

function allLines(progress: SimpleProgress): { line: SimpleProgressLine; depth: number }[] {
  const out: { line: SimpleProgressLine; depth: number }[] = [];
  const visit = (line: SimpleProgressLine, depth: number) => {
    out.push({ line, depth });
    for (const child of line.children) visit(child, depth + 1);
  };
  for (const line of progress.lines) visit(line, 0);
  return out;
}

function invocation(
  path: string,
  pipe: string,
  type: string,
  status: ProgressInvocation["status"],
  extra: Partial<ProgressInvocation> = {},
): ProgressInvocation {
  return {
    path,
    pipe_code: pipe.split(".").pop() ?? pipe,
    pipe_ref: pipe,
    pipe_type: type,
    status,
    started_at: status === "scheduled" ? null : "2026-10-12T09:30:00.000Z",
    ended_at:
      status === "running" || status === "scheduled" || status === "canceled"
        ? null
        : "2026-10-12T09:30:05.000Z",
    ...extra,
  };
}

function snapshotOf(
  invocations: ProgressInvocation[],
  extra: Partial<ProgressSnapshot> = {},
): ProgressSnapshot {
  return {
    pipeline_run_id: "run_test",
    mode: "live",
    status: "running",
    version: invocations.length,
    assembled_at: "2026-10-12T09:30:10.000Z",
    summary: "",
    invocations,
    ...extra,
  };
}

describe("the worked example", () => {
  it("draws as the design's picture", () => {
    const progress = buildSimpleProgress(WORKED_EXAMPLE_SNAPSHOT, filings);
    expect(outline(progress)).toEqual([
      "✓ Extract the filings from the document",
      "✓ Decide how deep to check → detailed ▸",
      "◐ Summarize a filing · for each filing [1/3 done, 2 running] {retrying 1, stuck 1} ▸",
      "○ Assemble the report",
    ]);
    const batch = lineAt(progress.lines, BATCH);
    expect(batch.health?.degradation?.ends_at).toBe("2026-10-12T09:45:33.480Z");
    expect(batch.health?.retryAttempt).toBeNull();
    expect(lineAt(progress.lines, `${ROOT}/step_4`).invocation).toBeNull();
    // The batch's line carries the run's degradation, so the run needs no note of its own.
    expect(progress.runNote).toBeNull();
    expect(progress.failure).toBeNull();
    expect(progress.status).toBe("running");
    expect(progress.mode).toBe("live");
  });

  it("draws its batch expanded as its branch's steps, counted across items", () => {
    const progress = buildSimpleProgress(WORKED_EXAMPLE_SNAPSHOT, {
      ...filings,
      expanded: { [BATCH]: true },
    });
    expect(outline(lineAt(progress.lines, BATCH).children)).toEqual([
      "◐ Read the filing (done 2, running 1)",
      "◐ Condense the filing (done 1, running 1) {retrying 1}",
    ]);
    expect(lineAt(progress.lines, `${BATCH}/*/step_1`).kind).toBe("branchStep");
    // Counted across the items, never one item's attempt.
    expect(lineAt(progress.lines, `${BATCH}/*/step_2`).health?.retryAttempt).toBeNull();
    // Opened, the batch keeps only the trouble its steps do not show.
    expect(outline([{ ...lineAt(progress.lines, BATCH), children: [] }])).toEqual([
      "◐ Summarize a filing · for each filing [1/3 done, 2 running] {stuck 1} ▾",
    ]);
  });

  it("names its branch's steps no item has reached yet", () => {
    const early = at(REVIEW_FILINGS_SNAPSHOTS, "09:30:25.000");
    const progress = buildSimpleProgress(early, { ...filings, expanded: { [BATCH]: true } });
    expect(outline(lineAt(progress.lines, BATCH).children)).toEqual([
      "◐ Read the filing (running 3)",
      "○ Condense the filing (none)",
    ]);
  });

  it("falls back to humanized codes and draws no upcoming line without a registry", () => {
    const progress = buildSimpleProgress(WORKED_EXAMPLE_SNAPSHOT);
    expect(outline(progress)).toEqual([
      "✓ Extract filings",
      "✓ Choose depth → detailed ▸",
      "◐ Summarize filing · for each item [1/3 done, 2 running] {retrying 1, stuck 1} ▸",
    ]);
    expect(progress.lines.every((line) => !line.titleFromDescription)).toBe(true);
  });

  it("unfolds the active path: a running condition shows the branch it took", () => {
    const progress = buildSimpleProgress(at(REVIEW_FILINGS_SNAPSHOTS, "09:30:16.000"), filings);
    expect(outline(progress)).toEqual([
      "✓ Extract the filings from the document",
      "◐ Decide how deep to check → detailed ▾",
      "  ◐ Check the filings in depth · together ▾",
      "    ✓ Check the figures",
      "    ◐ Check the wording",
      "○ Summarize a filing · for each filing",
      "○ Assemble the report",
    ]);
  });

  it("keeps a closed group closed and an opened one open, by key", () => {
    const snapshot = at(REVIEW_FILINGS_SNAPSHOTS, "09:30:10.000");
    const closed = buildSimpleProgress(snapshot, {
      ...filings,
      expanded: { [`${ROOT}/step_2`]: false },
    });
    expect(lineAt(closed.lines, `${ROOT}/step_2`)).toMatchObject({
      expandable: true,
      expanded: false,
      children: [],
    });
    const opened = buildSimpleProgress(WORKED_EXAMPLE_SNAPSHOT, {
      ...filings,
      expanded: { [`${ROOT}/step_2`]: true },
    });
    expect(outline(lineAt(opened.lines, `${ROOT}/step_2`).children)).toEqual([
      "✓ Check the filings in depth · together ▸",
    ]);
  });
});

describe("every recorded moment", () => {
  const recordings: [string, ProgressSnapshot[], typeof filings][] = [
    ["the worked example's run", REVIEW_FILINGS_SNAPSHOTS, filings],
    ["the wide batch's run", WIDE_BATCH_SNAPSHOTS, filings],
    ["the dry run", DRY_RUN_SNAPSHOTS, filings],
    ["the vetting run", VET_COMPANY_SNAPSHOTS, vetting],
  ];

  it.each(recordings)(
    "of %s draws no line per item, keys every line once and keeps the indentation cap",
    (_name, snapshots, options) => {
      for (const snapshot of snapshots) {
        for (const expandAll of [false, true]) {
          const expanded: Record<string, boolean> = {};
          if (expandAll) for (const each of snapshot.invocations) expanded[each.path] = true;
          const progress = buildSimpleProgress(snapshot, { ...options, expanded });
          const lines = allLines(progress);
          const keys = lines.map(({ line }) => line.key);
          expect(new Set(keys).size).toBe(keys.length);
          for (const { line, depth } of lines) {
            if (line.invocation && line.kind !== "now") {
              expect(lastPathSegment(line.invocation.path)?.kind).not.toBe("item");
            }
            expect(depth).toBeLessThanOrEqual(
              line.kind === "now" ? SIMPLE_MAX_DEPTH + 1 : SIMPLE_MAX_DEPTH,
            );
          }
          expect(buildSimpleProgress(snapshot, { ...options, expanded })).toEqual(progress);
        }
      }
    },
  );

  it.each(recordings)(
    "of %s lists the entry sequence's steps from start to end, unless it failed",
    (_name, snapshots, options) => {
      const entryPipeRef = snapshots[snapshots.length - 1].invocations[0].pipe_ref;
      const sequence = options.pipeRegistry[entryPipeRef];
      const steps =
        sequence?.type === "PipeSequence"
          ? sequence.sequential_sub_pipes.filter((step) => "pipe_code" in step).length
          : 0;
      // A run that failed or was canceled never reaches the steps after its end.
      for (const snapshot of snapshots.filter(
        (each) => !["failed", "canceled"].includes(each.status),
      )) {
        const progress = buildSimpleProgress(snapshot, { ...options, entryPipeRef });
        expect(progress.lines).toHaveLength(steps);
      }
    },
  );
});

describe("a run not started yet", () => {
  const pending = REVIEW_FILINGS_SNAPSHOTS[0];

  it("lists the entry sequence's steps when it has the registry and the entry pipe", () => {
    const progress = buildSimpleProgress(pending, { ...filings, entryPipeRef: ROOT });
    expect(outline(progress)).toEqual([
      "○ Extract the filings from the document",
      "○ Decide how deep to check",
      "○ Summarize a filing · for each filing",
      "○ Assemble the report",
    ]);
    expect(progress.lines.map((line) => line.key)).toEqual([
      `${ROOT}/step_1`,
      `${ROOT}/step_2`,
      `${ROOT}/step_3`,
      `${ROOT}/step_4`,
    ]);
  });

  it("lists nothing without the registry, or without the entry pipe", () => {
    expect(buildSimpleProgress(pending, { entryPipeRef: ROOT }).lines).toEqual([]);
    expect(buildSimpleProgress(pending, filings).lines).toEqual([]);
    expect(
      buildSimpleProgress(pending, { ...filings, entryPipeRef: "filings.unknown" }).lines,
    ).toEqual([]);
  });

  it("lists an entry pipe that is not a sequence as its one line", () => {
    const progress = buildSimpleProgress(pending, {
      ...filings,
      entryPipeRef: "filings.deep_checks",
    });
    expect(outline(progress)).toEqual(["○ Check the filings in depth · together"]);
  });

  it("lists a step that batches with its item", () => {
    const progress = buildSimpleProgress(pending, { ...vetting, entryPipeRef: VET_ROOT });
    expect(outline(progress)).toEqual([
      "○ Gather what every source says about the company · together",
      "○ Gather the claims the sources make",
      "○ Verify a claim · for each claim",
      "○ Weigh the risks of signing",
      "○ Write the memo",
    ]);
  });
});

describe("a run that ended", () => {
  it("names where a failed run failed, with its problem on the line that shows it", () => {
    const progress = buildSimpleProgress(LAST_WIDE, filings);
    expect(outline(progress)).toEqual([
      "✓ Extract the filings from the document",
      "✓ Decide how deep to check → (default) ▸",
      "✗ Summarize a filing · for each filing [23/24 done, 1 failed, 1 skipped] {problem pipe.output_invalid} ▸",
      "◌ Assemble the report",
    ]);
    expect(progress.failure).toEqual({
      lineKey: BATCH,
      problem: CONDENSE_FAILED_PROBLEM,
      shownOnLine: true,
    });
  });

  it("shows the failure on the deepest drawn line only", () => {
    const progress = buildSimpleProgress(LAST_WIDE, { ...filings, expanded: { [BATCH]: true } });
    expect(outline(lineAt(progress.lines, BATCH).children)).toEqual([
      "✓ Read the filing (done 23)",
      "✗ Condense the filing (done 22, failed 1) {problem pipe.output_invalid}",
    ]);
    expect(lineAt(progress.lines, BATCH).health?.problem ?? null).toBeNull();
    expect(progress.failure).toEqual({
      lineKey: BATCH,
      problem: CONDENSE_FAILED_PROBLEM,
      shownOnLine: true,
    });
  });

  it("stops what was going when the run was canceled, and lists the steps it never ran", () => {
    const progress = buildSimpleProgress(CANCELED_RUN_SNAPSHOT, filings);
    expect(outline(progress)).toEqual([
      "✓ Extract the filings from the document",
      "✓ Decide how deep to check → detailed ▸",
      "■ Summarize a filing · for each filing [0/3 done] ▸",
      "◌ Assemble the report",
    ]);
    expect(lineAt(progress.lines, `${ROOT}/step_4`).invocation).toBeNull();
    expect(progress.failure).toBeNull();
  });

  it("draws nothing for a run that ended before it started, the entry pipe known or not", () => {
    const empty = { ...REVIEW_FILINGS_SNAPSHOTS[0], status: "failed" as const };
    const progress = buildSimpleProgress(empty, { ...filings, entryPipeRef: ROOT });
    expect(progress.lines).toEqual([]);
    expect(progress.failure).toEqual({ lineKey: null, problem: null, shownOnLine: false });
  });

  it("names no line when only the entry pipe failed, and says the problem is shown on none", () => {
    const snapshot = snapshotOf(
      [
        invocation(ROOT, ROOT, "PipeSequence", "failed", {
          last_failure: { problem: CONDENSE_FAILED_PROBLEM },
        }),
        invocation(`${ROOT}/step_1`, "filings.extract_filings", "PipeExtract", "succeeded"),
      ],
      { status: "failed" },
    );
    const progress = buildSimpleProgress(snapshot, filings);
    expect(progress.failure).toEqual({
      lineKey: null,
      problem: CONDENSE_FAILED_PROBLEM,
      shownOnLine: false,
    });
  });

  it("skips a skipped step quietly", () => {
    const snapshot = snapshotOf([
      invocation(ROOT, ROOT, "PipeSequence", "running", { step_count: 4 }),
      invocation(`${ROOT}/step_1`, "filings.extract_filings", "PipeExtract", "skipped", {
        skip_reason: "No document",
      }),
    ]);
    expect(outline(buildSimpleProgress(snapshot, filings))[0]).toBe(
      "– Extract the filings from the document",
    );
  });
});

describe("a dry run", () => {
  it("labels each branch of its condition by the outcome it stands for", () => {
    const progress = buildSimpleProgress(LAST_DRY, {
      ...filings,
      expanded: { [`${ROOT}/step_2`]: true },
    });
    expect(progress.mode).toBe("dry");
    expect(outline(lineAt(progress.lines, `${ROOT}/step_2`).children)).toEqual([
      "✓ Check the filings in depth · together = detailed ▸",
      "✓ Check the filings quickly = quick",
    ]);
    expect(lineAt(progress.lines, `${ROOT}/step_2`).outcome).toBeNull();
  });

  it("labels a branch of the default outcome as such", () => {
    const snapshot = snapshotOf([
      invocation("filings.choose_depth", "filings.choose_depth", "PipeCondition", "running"),
      invocation("filings.choose_depth/default", "filings.quick_check", "PipeLLM", "running"),
      invocation(
        "filings.choose_depth/outcome_high%20risk",
        "filings.deep_checks",
        "PipeParallel",
        "running",
      ),
    ]);
    const progress = buildSimpleProgress(snapshot, filings);
    expect(outline(progress)).toEqual([
      "◐ Decide how deep to check ▾",
      "  ◐ Check the filings quickly = (default)",
      "  ◐ Check the filings in depth · together = high risk",
    ]);
  });
});

describe("a condition that resolved", () => {
  it("says the outcome it took on its own line, the default outcome as a null key", () => {
    const progress = buildSimpleProgress(at(WIDE_BATCH_SNAPSHOTS, "10:00:05.000"), filings);
    const decision = lineAt(progress.lines, `${ROOT}/step_2`);
    expect(decision.outcome).toEqual({ key: null, resolved: true });
    expect(outline(decision.children)).toEqual(["◐ Check the filings quickly"]);
  });

  it("labels its branches by their paths when several ran under one resolution", () => {
    const snapshot = snapshotOf([
      invocation("filings.choose_depth", "filings.choose_depth", "PipeCondition", "running", {
        condition: { selected_outcome: "detailed" },
      }),
      invocation(
        "filings.choose_depth/outcome_detailed",
        "filings.deep_checks",
        "PipeParallel",
        "running",
      ),
      invocation("filings.choose_depth/outcome_quick", "filings.quick_check", "PipeLLM", "running"),
    ]);
    expect(outline(buildSimpleProgress(snapshot, filings))).toEqual([
      "◐ Decide how deep to check → detailed ▾",
      "  ◐ Check the filings in depth · together = detailed",
      "  ◐ Check the filings quickly = quick",
    ]);
  });
});

describe("a wide parallel", () => {
  it("folds its finished branches into one line past the threshold", () => {
    const progress = buildSimpleProgress(at(VET_COMPANY_SNAPSHOTS, "14:00:05.000"), vetting);
    expect(outline(progress).slice(0, 6)).toEqual([
      "◐ Gather what every source says about the company · together ▾",
      "  ✓ 4 done",
      "  ◐ Search court records",
      "  ◐ Search the news {attempt 2}",
      "  ◐ Check the directors",
      "  ◐ Trace who owns the company",
    ]);
    expect(lineAt(progress.lines, `${VET_ROOT}/step_2#finished`)).toMatchObject({
      kind: "finished",
      foldedCount: 4,
      expandable: false,
    });
  });

  it("folds nothing under the threshold, or with fewer than two finished", () => {
    const snapshot = at(VET_COMPANY_SNAPSHOTS, "14:00:05.000");
    const wide = buildSimpleProgress(snapshot, { ...vetting, wideParallelThreshold: 8 });
    expect(lineAt(wide.lines, `${VET_ROOT}/step_2`).children).toHaveLength(8);
    const early = buildSimpleProgress(at(VET_COMPANY_SNAPSHOTS, "14:00:02.900"), vetting);
    expect(
      lineAt(early.lines, `${VET_ROOT}/step_2`).children.map((line) => line.kind),
    ).not.toContain("finished");
  });

  it("shows a retry inside it on its own line once the reader folds it", () => {
    const progress = buildSimpleProgress(at(VET_COMPANY_SNAPSHOTS, "14:00:05.000"), {
      ...vetting,
      expanded: { [`${VET_ROOT}/step_2`]: false },
    });
    expect(outline(progress)[0]).toBe(
      "◐ Gather what every source says about the company · together {attempt 2} ▸",
    );
  });
});

describe("a nesting deeper than the indentation cap", () => {
  const deep = at(VET_COMPANY_SNAPSHOTS, "14:00:45.000");

  it("draws the deepest work going on as one now line", () => {
    const progress = buildSimpleProgress(deep, vetting);
    expect(outline(progress)).toEqual([
      "✓ Gather what every source says about the company · together ▸",
      "✓ Gather the claims the sources make",
      "✓ Verify a claim · for each claim [12/12 done]",
      "◐ Weigh the risks of signing ▾",
      "  ◐ Assess what the company could cost us ▾",
      "    ◐ Model what could go wrong ▾",
      "      ◐ Now: Run the worst case",
      "    ○ Summarize the exposure",
      "  ○ Rate the risk",
      "○ Write the memo",
    ]);
    const now = lineAt(progress.lines, `${VET_ROOT}/step_5/step_1/step_1#now`);
    expect(now.invocation?.pipe_code).toBe("run_stress_case");
  });

  it("names a failure past the cap when nothing beneath runs", () => {
    const failing: ProgressSnapshot = {
      ...deep,
      status: "failed",
      invocations: deep.invocations.map((each) =>
        each.status === "running"
          ? {
              ...each,
              status: "failed",
              ended_at: each.started_at,
              last_failure:
                each.pipe_code === "run_stress_case"
                  ? { problem: CONDENSE_FAILED_PROBLEM }
                  : undefined,
            }
          : each,
      ),
    };
    const progress = buildSimpleProgress(failing, vetting);
    const capped = lineAt(progress.lines, `${VET_ROOT}/step_5/step_1/step_1`);
    expect(outline(capped.children)).toEqual([
      "✗ Now: Run the worst case {problem pipe.output_invalid}",
    ]);
    expect(capped.health).toBeNull();
    expect(progress.failure).toEqual({
      lineKey: `${VET_ROOT}/step_5`,
      problem: CONDENSE_FAILED_PROBLEM,
      shownOnLine: true,
    });
    const folded = buildSimpleProgress(failing, {
      ...vetting,
      expanded: { [`${VET_ROOT}/step_5/step_1/step_1`]: false },
    });
    expect(lineAt(folded.lines, `${VET_ROOT}/step_5/step_1/step_1`).health?.problem).toBe(
      CONDENSE_FAILED_PROBLEM,
    );
  });

  it("names the failure rather than work going on beside it under a failed group", () => {
    const root = "x.main";
    const par = `${root}/step_1/step_1/step_1`;
    const snapshot = snapshotOf([
      invocation(root, "x.main", "PipeSequence", "running"),
      invocation(`${root}/step_1`, "x.outer", "PipeSequence", "running"),
      invocation(`${root}/step_1/step_1`, "x.inner", "PipeSequence", "running"),
      invocation(par, "x.par", "PipeParallel", "failed"),
      invocation(`${par}/branch_1`, "x.first_branch", "PipeLLM", "failed", {
        last_failure: { problem: CONDENSE_FAILED_PROBLEM, at: "2026-10-12T09:30:05.000Z" },
      }),
      invocation(`${par}/branch_2`, "x.second_branch", "PipeLLM", "running"),
    ]);
    const progress = buildSimpleProgress(snapshot);
    expect(outline(lineAt(progress.lines, par).children)).toEqual([
      "✗ Now: First branch {problem pipe.output_invalid}",
    ]);
  });

  it("does not open a finished group past the cap", () => {
    const progress = buildSimpleProgress(at(VET_COMPANY_SNAPSHOTS, "14:00:56.000"), vetting);
    expect(lineAt(progress.lines, `${VET_ROOT}/step_5/step_1/step_1`)).toMatchObject({
      state: "done",
      expandable: false,
      expanded: false,
      children: [],
    });
  });
});

describe("the run's own degradation", () => {
  const unreachable = {
    reason: "status_unavailable",
    message: "The run's status could not be read.",
    failed_attempts: null,
    failing_since: null,
    ends_at: null,
  };

  it("is a note when the run status could not be read", () => {
    const snapshot = { ...WORKED_EXAMPLE_SNAPSHOT, degradation: unreachable };
    expect(buildSimpleProgress(snapshot, filings).runNote).toEqual({
      reason: "unreachable",
      degradation: unreachable,
    });
  });

  it("is a note when the run is stuck at no invocation a line stands for", () => {
    const stuck = WORKED_EXAMPLE_SNAPSHOT.degradation;
    const snapshot = {
      ...WORKED_EXAMPLE_SNAPSHOT,
      invocations: WORKED_EXAMPLE_SNAPSHOT.invocations.map(({ degradation: _d, ...each }) => each),
    };
    expect(buildSimpleProgress(snapshot, filings).runNote).toEqual({
      reason: "stuck",
      degradation: stuck,
    });
  });

  it("is a note naming its own message for a reason the style does not know", () => {
    const other = { ...unreachable, reason: "quota_paused", message: "Paused for quota." };
    const snapshot = { ...WORKED_EXAMPLE_SNAPSHOT, degradation: other };
    expect(buildSimpleProgress(snapshot, filings).runNote).toEqual({
      reason: "other",
      degradation: other,
    });
    expect(
      buildSimpleProgress({ ...snapshot, degradation: undefined }, filings).runNote,
    ).toBeNull();
  });
});

describe("what the style does not know", () => {
  it("draws a pipe type it does not know as a step, or a group when it holds work", () => {
    const snapshot = snapshotOf([
      invocation("x.loop", "x.loop", "PipeLoop", "running"),
      invocation("x.loop/round_1", "x.do_work", "PipeLLM", "running"),
      invocation("x.solo", "x.solo", "PipeTeleport", "running"),
    ]);
    const progress = buildSimpleProgress(snapshot);
    expect(progress.lines.map((line) => line.kind)).toEqual(["group", "step"]);
    expect(outline(progress)).toEqual(["◐ Loop ▾", "  ◐ Do work", "◐ Solo"]);
  });

  it("reads a status it does not know from the invocation's moments", () => {
    const unknown = (status: string, ended: boolean, started = true) =>
      ({
        ...invocation(`x.p_${status}`, `x.p_${status}`, "PipeLLM", "running"),
        status: status as ProgressInvocation["status"],
        started_at: started ? "2026-10-12T09:30:00.000Z" : null,
        ended_at: ended ? "2026-10-12T09:30:01.000Z" : null,
      }) satisfies ProgressInvocation;
    const snapshot = snapshotOf([
      unknown("paused", false),
      unknown("archived", true),
      unknown("queued", false, false),
    ]);
    expect(buildSimpleProgress(snapshot).lines.map((line) => line.state)).toEqual([
      "running",
      "done",
      "upcoming",
    ]);
  });

  it("nests a part of a run under what it holds, each root a line", () => {
    const snapshot = snapshotOf(
      [
        invocation(`${BATCH}/item_2/step_1`, "filings.read_filing", "PipeLLM", "succeeded"),
        invocation(`${BATCH}/item_2/step_2`, "filings.condense_filing", "PipeLLM", "running"),
      ],
      { root_path: `${BATCH}/item_2` },
    );
    expect(outline(buildSimpleProgress(snapshot, filings))).toEqual([
      "✓ Read the filing",
      "◐ Condense the filing",
    ]);
  });
});

describe("a batch whose branch is a condition", () => {
  const batch = "x.route_all";
  const item = (n: number, status: ProgressInvocation["status"]) =>
    invocation(`${batch}/item_${n}`, "x.route", "PipeCondition", status);
  const outcome = (n: number, key: string, status: ProgressInvocation["status"]) =>
    invocation(`${batch}/item_${n}/outcome_${key}`, `x.do_${key}`, "PipeLLM", status);

  it("counts each outcome's group against the items that took it", () => {
    const snapshot = snapshotOf(
      [
        invocation(batch, "x.route_all", "PipeBatch", "succeeded", {
          batch: { total: 2, done: 2, running: 0, failed: 0 },
        }),
        item(1, "succeeded"),
        outcome(1, "high", "succeeded"),
        item(2, "succeeded"),
        outcome(2, "low", "succeeded"),
      ],
      { status: "succeeded" },
    );
    const progress = buildSimpleProgress(snapshot, { expanded: { [batch]: true } });
    expect(outline(lineAt(progress.lines, batch).children)).toEqual([
      "✓ Do high (done 1)",
      "✓ Do low (done 1)",
    ]);
  });

  it("keeps an outcome's group going while an item may still take it", () => {
    const snapshot = snapshotOf([
      invocation(batch, "x.route_all", "PipeBatch", "running", {
        batch: { total: 3, done: 1, running: 2, failed: 0 },
      }),
      item(1, "succeeded"),
      outcome(1, "high", "succeeded"),
      item(2, "running"),
      item(3, "running"),
      outcome(3, "low", "running"),
    ]);
    const progress = buildSimpleProgress(snapshot, { expanded: { [batch]: true } });
    expect(outline(lineAt(progress.lines, batch).children)).toEqual([
      "◐ Do high (done 1)",
      "◐ Do low (running 1)",
    ]);
  });
});

describe("a batch inside a batch's branch", () => {
  it("sums the inner batches' counts across the outer items", () => {
    const outer = "x.outer";
    const snapshot = snapshotOf([
      invocation(outer, "x.outer_batch", "PipeBatch", "running", {
        batch: { total: 2, done: 0, running: 2, failed: 0 },
      }),
      ...[1, 2].flatMap((item) => [
        invocation(`${outer}/item_${item}`, "x.per_document", "PipeSequence", "running"),
        invocation(`${outer}/item_${item}/step_1`, "x.page_batch", "PipeBatch", "running", {
          batch: { total: 3, done: item, running: 3 - item, failed: 0 },
        }),
      ]),
    ]);
    const progress = buildSimpleProgress(snapshot, { expanded: { [outer]: true } });
    expect(outline(progress)).toEqual([
      "◐ Per document · for each item [0/2 done, 2 running] ▾",
      "  ◐ Page batch [3/6 done, 3 running] (running 2)",
    ]);
  });

  it("cannot open a batch whose branch is one step", () => {
    const progress = buildSimpleProgress(at(VET_COMPANY_SNAPSHOTS, "14:00:30.000"), {
      ...vetting,
      expanded: { [`${VET_ROOT}/step_4`]: true },
    });
    expect(lineAt(progress.lines, `${VET_ROOT}/step_4`)).toMatchObject({
      expandable: false,
      expanded: false,
      forEachItem: "claim",
    });
  });
});

describe("a batch whose items end early", () => {
  const outer = "x.outer";
  /** Three items running two steps each, the second item failing at the first step. */
  function earlyFailure(batchStatus: ProgressInvocation["status"]): ProgressSnapshot {
    return snapshotOf(
      [
        invocation(outer, "x.outer_batch", "PipeBatch", batchStatus, {
          batch: { total: 3, done: 2, running: 0, failed: 1 },
        }),
        ...[1, 2, 3].flatMap((item) =>
          item === 2
            ? [
                invocation(`${outer}/item_2`, "x.per_filing", "PipeSequence", "failed"),
                invocation(`${outer}/item_2/step_1`, "x.read", "PipeLLM", "failed", {
                  last_failure: { problem: CONDENSE_FAILED_PROBLEM },
                }),
              ]
            : [
                invocation(`${outer}/item_${item}`, "x.per_filing", "PipeSequence", "succeeded"),
                invocation(`${outer}/item_${item}/step_1`, "x.read", "PipeLLM", "succeeded"),
                invocation(`${outer}/item_${item}/step_2`, "x.write", "PipeLLM", "succeeded"),
              ],
        ),
      ],
      { status: batchStatus === "failed" ? "failed" : "running" },
    );
  }

  it("does not wait at a step for an item that failed before it", () => {
    for (const status of ["failed", "running"] as const) {
      const progress = buildSimpleProgress(earlyFailure(status), { expanded: { [outer]: true } });
      expect(lineAt(progress.lines, `${outer}/*/step_1`).state).toBe("failed");
      expect(lineAt(progress.lines, `${outer}/*/step_2`)).toMatchObject({
        state: "done",
        tally: { done: 2, running: 0, failed: 0, skipped: 0, stopped: 0 },
      });
    }
  });

  it("still waits at a step for an item going on, or not started yet", () => {
    const snapshot = snapshotOf([
      invocation(outer, "x.outer_batch", "PipeBatch", "running", {
        batch: { total: 3, done: 1, running: 1, failed: 0 },
      }),
      invocation(`${outer}/item_1`, "x.per_filing", "PipeSequence", "succeeded"),
      invocation(`${outer}/item_1/step_1`, "x.read", "PipeLLM", "succeeded"),
      invocation(`${outer}/item_1/step_2`, "x.write", "PipeLLM", "succeeded"),
      invocation(`${outer}/item_2`, "x.per_filing", "PipeSequence", "running"),
      invocation(`${outer}/item_2/step_1`, "x.read", "PipeLLM", "running"),
    ]);
    const progress = buildSimpleProgress(snapshot, { expanded: { [outer]: true } });
    expect(lineAt(progress.lines, `${outer}/*/step_2`).state).toBe("running");
  });

  it("counts an inner batch's skipped items apart from its done ones", () => {
    const snapshot = snapshotOf([
      invocation(outer, "x.outer_batch", "PipeBatch", "running", {
        batch: { total: 1, done: 0, running: 1, failed: 0 },
      }),
      invocation(`${outer}/item_1`, "x.per_document", "PipeSequence", "running"),
      invocation(`${outer}/item_1/step_1`, "x.page_batch", "PipeBatch", "succeeded", {
        batch: { total: 2, done: 2, running: 0, failed: 0 },
      }),
      invocation(`${outer}/item_1/step_1/item_1`, "x.read_page", "PipeLLM", "succeeded"),
      invocation(`${outer}/item_1/step_1/item_2`, "x.read_page", "PipeLLM", "skipped"),
      invocation(`${outer}/item_1/step_2`, "x.assemble", "PipeLLM", "running"),
    ]);
    const progress = buildSimpleProgress(snapshot, { expanded: { [outer]: true } });
    expect(lineAt(progress.lines, `${outer}/*/step_1`)).toMatchObject({
      counts: { total: 2, done: 2 },
      skippedItems: 1,
    });
  });
});

describe("an entry sequence being tried again", () => {
  it("says so for the run, since no line stands for the entry sequence", () => {
    const root = "x.root";
    const snapshot = snapshotOf([
      invocation(root, "x.root", "PipeSequence", "running", { attempts: 2 }),
      invocation(`${root}/step_1`, "x.read", "PipeLLM", "succeeded"),
    ]);
    expect(buildSimpleProgress(snapshot).retryAttempt).toBe(2);
  });

  it("says nothing once it ended, or when the entry pipe has a line of its own", () => {
    const ended = snapshotOf(
      [
        invocation("x.root", "x.root", "PipeSequence", "succeeded", { attempts: 2 }),
        invocation("x.root/step_1", "x.read", "PipeLLM", "succeeded"),
      ],
      { status: "succeeded" },
    );
    expect(buildSimpleProgress(ended).retryAttempt).toBeNull();
    const parallel = snapshotOf([
      invocation("x.root", "x.root", "PipeParallel", "running", { attempts: 2 }),
      invocation("x.root/branch_1", "x.read", "PipeLLM", "running"),
    ]);
    const progress = buildSimpleProgress(parallel);
    expect(progress.retryAttempt).toBeNull();
    expect(progress.lines[0].health?.retryAttempt).toBe(2);
  });
});

describe("two failures as deep as each other", () => {
  it("show one problem, the first in the run's order, wherever the snapshot lists them", () => {
    const outer = "x.outer";
    const second = { ...CONDENSE_FAILED_PROBLEM, title: "The second item's problem" };
    const snapshot = snapshotOf(
      [
        invocation(outer, "x.outer_batch", "PipeBatch", "failed", {
          batch: { total: 2, done: 0, running: 0, failed: 2 },
        }),
        invocation(`${outer}/item_2`, "x.per_filing", "PipeSequence", "failed"),
        invocation(`${outer}/item_2/step_1`, "x.read", "PipeLLM", "failed", {
          last_failure: { problem: second },
        }),
        invocation(`${outer}/item_1`, "x.per_filing", "PipeSequence", "failed"),
        invocation(`${outer}/item_1/step_1`, "x.read", "PipeLLM", "failed", {
          last_failure: { problem: CONDENSE_FAILED_PROBLEM },
        }),
      ],
      { status: "failed" },
    );
    for (const expanded of [{}, { [outer]: true }] as Record<string, boolean>[]) {
      const progress = buildSimpleProgress(snapshot, { expanded });
      expect(progress.failure).toMatchObject({
        problem: CONDENSE_FAILED_PROBLEM,
        shownOnLine: true,
      });
    }
  });
});

describe("what changed between two readings", () => {
  const progressAt = (clock: string, expanded: Record<string, boolean> = {}) =>
    buildSimpleProgress(at(REVIEW_FILINGS_SNAPSHOTS, clock), { ...filings, expanded });

  it("names the top-level lines that ended and started", () => {
    const first = buildSimpleProgress(REVIEW_FILINGS_SNAPSHOTS[0], filings);
    const extracting = progressAt("09:30:01.000");
    expect(simpleProgressChanges(first, extracting)).toEqual({
      done: [],
      failed: [],
      started: ["Extract the filings from the document"],
      runEnded: false,
    });
    const deciding = progressAt("09:30:08.000");
    expect(simpleProgressChanges(extracting, deciding)).toEqual({
      done: ["Extract the filings from the document"],
      failed: [],
      started: ["Decide how deep to check"],
      runEnded: false,
    });
  });

  it("says nothing for a reading that changed no top-level line, or a group opened", () => {
    const reading = progressAt("09:30:10.000");
    expect(simpleProgressChanges(reading, progressAt("09:30:10.000", { [BATCH]: true }))).toEqual({
      done: [],
      failed: [],
      started: [],
      runEnded: false,
    });
  });

  it("says the run ended once, with the line it failed in", () => {
    const beforeEnd = buildSimpleProgress(
      WIDE_BATCH_SNAPSHOTS[WIDE_BATCH_SNAPSHOTS.length - 2],
      filings,
    );
    const ended = buildSimpleProgress(LAST_WIDE, filings);
    expect(simpleProgressChanges(beforeEnd, ended)).toMatchObject({ runEnded: true });
    expect(simpleProgressChanges(ended, ended).runEnded).toBe(false);
  });
});
