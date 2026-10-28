/**
 * Every phrase the simple timeline style shows, in one table. The projection
 * (`buildSimpleProgress`) is language-free; this table words it. English only
 * for now, and shaped so a host can pass its own table later: every phrase is a
 * string or a function of the values it carries, and none is assembled from
 * fragments elsewhere, since another language orders its words differently.
 */
import type { SimpleItemTally, SimpleLineState } from "@timeline/styles/simpleProgress";
import { outcomeLabel } from "@graph/styles/humanize";
import { formatDuration } from "@timeline/timelineTime";

export interface SimpleProgressStrings {
  /** The headline before anything started. */
  waiting: string;
  /** The headline while the run goes on, with its elapsed time, when known. */
  working: (elapsed: string | null) => string;
  done: (elapsed: string | null) => string;
  /** The headline of a failed run, with the title of the top-level line it failed in, when one holds the failure. */
  failed: (where: string | null, elapsed: string | null) => string;
  canceled: (elapsed: string | null) => string;
  /** The headline of a run that ended before anything started. */
  nothingRecorded: string;
  /** The badge beside the headline on a dry run. */
  dryRun: string;
  /** The checklist's accessible name. */
  checklistLabel: string;

  /** A parallel's mark after its title. */
  together: string;
  /** A batch's mark after its title: "for each filing", "for each item". */
  forEach: (item: string | null) => string;
  /** After a decision's title, the outcome it took: the default outcome's key is `null`. */
  outcomeTaken: (key: string | null) => string;
  /** On a branch of a condition that resolved none, as a dry run's, the outcome it stands for. */
  branchFor: (key: string | null) => string;
  /** A wide parallel's finished branches folded into one line. */
  finishedBranches: (count: number) => string;
  /** The deepest work going on past the indentation cap, before its title. */
  now: string;

  /** A batch's counts: "1 of 3 done · 2 in progress · 1 failed". */
  batchCounts: (done: number, total: number, running: number, failed: number) => string;
  /** A branch step's items at each state, for a screen reader. */
  tally: (tally: SimpleItemTally) => string;

  /** What a line's state reads as, for a screen reader and a skipped or stopped line. */
  state: Record<SimpleLineState, string>;

  /** A running line's attempt, past the first. */
  tryingAgain: (attempt: number) => string;
  /** A line's items being tried again, on a line that counts items. */
  tryingAgainItems: (count: number, item: string | null) => string;
  /** Where the run is stuck, with the moment it gives up, when known (already worded as a clock time). */
  havingTrouble: (until: string | null) => string;
  /** A line's items where the run is stuck, on a line that counts items. */
  havingTroubleItems: (count: number, item: string | null, until: string | null) => string;
  /** The run's own note when its status could not be read. */
  unreachable: string;
  /** The run's own note when it is stuck at no line drawn. */
  runStuck: (until: string | null) => string;
  /** The disclosure that holds the platform's own words. */
  details: string;

  /** A toggle's accessible name. */
  expand: (title: string) => string;
  collapse: (title: string) => string;

  /** A line's duration once ended, or its elapsed time while it runs. */
  duration: (ms: number) => string;
  /** The run's elapsed time in the headline. */
  elapsed: (ms: number) => string;
  /** A moment as a clock time in the reader's zone, for "until 09:45". */
  clockTime: (ms: number) => string;
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

function withElapsed(phrase: string, elapsed: string | null): string {
  return elapsed === null ? phrase : `${phrase} · ${elapsed}`;
}

/** A count of items in words: "1 filing", "3 items". */
function itemCount(count: number, item: string | null): string {
  const noun = item ?? "item";
  return `${count} ${plural(count, noun, `${noun}s`)}`;
}

/** "1:20", "12:05", "1:02:03": minutes and seconds, with hours once there are any. */
function clockElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

/** The simple style's English phrases. */
export const DEFAULT_SIMPLE_PROGRESS_STRINGS: SimpleProgressStrings = {
  waiting: "Waiting to start",
  working: (elapsed) => withElapsed("Working on it", elapsed),
  done: (elapsed) => withElapsed("Done", elapsed),
  failed: (where, elapsed) =>
    withElapsed(where === null ? "Failed" : `Failed in ${where}`, elapsed),
  canceled: (elapsed) => withElapsed("Canceled", elapsed),
  nothingRecorded: "No progress was recorded",
  dryRun: "Dry run",
  checklistLabel: "Steps of the run",

  together: "at the same time",
  forEach: (item) => `for each ${item ?? "item"}`,
  outcomeTaken: (key) => `→ ${key === null ? "Otherwise" : outcomeLabel(key)}`,
  branchFor: (key) => (key === null ? "otherwise" : `if ${outcomeLabel(key)}`),
  finishedBranches: (count) => `${count} done`,
  now: "Now:",

  batchCounts: (done, total, running, failed) => {
    let text = `${done} of ${total} done`;
    if (running > 0) text += ` · ${running} in progress`;
    if (failed > 0) text += ` · ${failed} failed`;
    return text;
  },
  tally: (tally) => {
    const parts: string[] = [];
    if (tally.done > 0) parts.push(`${tally.done} done`);
    if (tally.running > 0) parts.push(`${tally.running} in progress`);
    if (tally.failed > 0) parts.push(`${tally.failed} failed`);
    if (tally.skipped > 0) parts.push(`${tally.skipped} skipped`);
    if (tally.stopped > 0) parts.push(`${tally.stopped} stopped`);
    return parts.length > 0 ? parts.join(", ") : "not started";
  },

  state: {
    upcoming: "Not started",
    running: "In progress",
    done: "Done",
    failed: "Failed",
    skipped: "Skipped",
    stopped: "Stopped",
  },

  tryingAgain: (attempt) => `Trying again (attempt ${attempt})`,
  tryingAgainItems: (count, item) => `Trying again for ${itemCount(count, item)}`,
  havingTrouble: (until) =>
    until === null
      ? "Having trouble here. Still trying."
      : `Having trouble here. Still trying until ${until}.`,
  havingTroubleItems: (count, item, until) =>
    `Having trouble with ${itemCount(count, item)}. Still trying${until === null ? "" : ` until ${until}`}.`,
  unreachable: "Progress may be out of date: the run can't be reached right now.",
  runStuck: (until) =>
    until === null
      ? "The run is having trouble. Still trying."
      : `The run is having trouble. Still trying until ${until}.`,
  details: "Details",

  expand: (title) => `Show the steps of ${title}`,
  collapse: (title) => `Hide the steps of ${title}`,

  duration: (ms) => (ms < 1_000 ? "<1s" : formatDuration(ms)),
  elapsed: clockElapsed,
  clockTime: (ms) =>
    new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(ms),
};
