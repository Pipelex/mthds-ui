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

  /** A batch's counts: "1 of 3 done · 2 in progress · 1 failed · 1 skipped". */
  batchCounts: (
    done: number,
    total: number,
    running: number,
    failed: number,
    skipped: number,
  ) => string;
  /** A branch step's items at each state, for a screen reader. */
  tally: (tally: SimpleItemTally) => string;

  /** What a line's state reads as, for a screen reader, and beside a line skipped, stopped or never run. */
  state: Record<SimpleLineState, string>;

  /** A running line's attempt, past the first. */
  tryingAgain: (attempt: number) => string;
  /** A line's items being tried again, on a line that counts items. */
  tryingAgainItems: (count: number, item: string | null) => string;
  /** Where the run is stuck, with the moment the run fails if it is still stuck then, when known (already worded as a clock time). */
  havingTrouble: (until: string | null) => string;
  /** A line's items where the run is stuck, on a line that counts items. */
  havingTroubleItems: (count: number, item: string | null, until: string | null) => string;
  /** The run's own note when its status could not be read. */
  unreachable: string;
  /** The run's own note when its entry sequence, which no line stands for, is being tried again. */
  runTryingAgain: (attempt: number) => string;
  /** The run's own note when it is stuck at no line drawn. */
  runStuck: (until: string | null) => string;
  /** The disclosure that holds the platform's own words. */
  details: string;

  /** What the live region says of a top-level line that ended or started, and of the run's end, given its headline. */
  announceDone: (title: string) => string;
  announceFailed: (title: string) => string;
  announceNow: (title: string) => string;
  announceEnd: (headline: string) => string;

  /** A toggle's accessible name. */
  expand: (title: string) => string;
  collapse: (title: string) => string;

  /** A line's duration once ended, or its elapsed time while it runs. */
  duration: (ms: number) => string;
  /** The run's elapsed time in the headline, in the lines' own format. */
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
  outcomeTaken: (key) => `→ ${key === null ? "Default" : outcomeLabel(key)}`,
  branchFor: (key) => (key === null ? "otherwise" : `if ${outcomeLabel(key)}`),
  finishedBranches: (count) => `${count} done`,
  now: "Now:",

  batchCounts: (done, total, running, failed, skipped) => {
    let text = `${done} of ${total} done`;
    if (running > 0) text += ` · ${running} in progress`;
    if (failed > 0) text += ` · ${failed} failed`;
    if (skipped > 0) text += ` · ${skipped} skipped`;
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
    notRun: "Not run",
  },

  tryingAgain: (attempt) => `Trying again (attempt ${attempt})`,
  tryingAgainItems: (count, item) => `Trying again for ${itemCount(count, item)}`,
  havingTrouble: (until) =>
    until === null
      ? "Having trouble here. Still trying."
      : `Having trouble here. Still trying; the run fails if this lasts past ${until}.`,
  havingTroubleItems: (count, item, until) =>
    until === null
      ? `Having trouble with ${itemCount(count, item)}. Still trying.`
      : `Having trouble with ${itemCount(count, item)}. Still trying; the run fails if this lasts past ${until}.`,
  unreachable: "Progress may be out of date: the run can't be reached right now.",
  runTryingAgain: (attempt) => `The run is trying again (attempt ${attempt}).`,
  runStuck: (until) =>
    until === null
      ? "The run is having trouble. Still trying."
      : `The run is having trouble. Still trying; it fails if this lasts past ${until}.`,
  details: "Details",

  announceDone: (title) => `Done: ${title}.`,
  announceFailed: (title) => `Failed: ${title}.`,
  announceNow: (title) => `Now: ${title}.`,
  announceEnd: (headline) => `${headline}.`,

  expand: (title) => `Show the steps of ${title}`,
  collapse: (title) => `Hide the steps of ${title}`,

  duration: (ms) => (ms < 1_000 ? "<1s" : formatDuration(ms)),
  elapsed: (ms) => (ms < 1_000 ? "<1s" : formatDuration(ms)),
  clockTime: (ms) =>
    new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(ms),
};
