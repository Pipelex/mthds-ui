import type { PipeStatus, StepCategory } from "@graph/types";
import type { SimpleRunTally } from "@graph/styles/simpleDetail";

// The simple style's detail panel in English, in one table: each phrase a
// string or a function of the values it carries, never a sentence assembled
// from fragments, so another language can order its words its own way. The
// run phrases follow the simple timeline's, so a step reads the same in both.

/** A duration in the timeline's words: "820ms", "3.2s", "42s", "1m 05s", "1h 02m". */
export function plainDuration(seconds: number): string {
  const ms = Math.max(0, seconds * 1000);
  if (ms === 0) return "0s";
  if (Math.round(ms) < 1_000) return `${Math.round(ms)}ms`;
  const tenths = Math.round(ms / 100) / 10;
  if (tenths < 10) return `${tenths}s`;
  const totalSeconds = Math.round(ms / 1_000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  if (totalSeconds < 3_600) {
    const minutes = Math.floor(totalSeconds / 60);
    const rest = totalSeconds % 60;
    return rest === 0 ? `${minutes}m` : `${minutes}m ${String(rest).padStart(2, "0")}s`;
  }
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

/** How many runs stand at each state: "11 of 12 done · 1 failed". */
function tallyCounts(tally: SimpleRunTally): string {
  const count = (status: PipeStatus) => tally.byStatus[status] ?? 0;
  let text = `${count("succeeded")} of ${tally.total} done`;
  if (count("running") > 0) text += ` · ${count("running")} in progress`;
  if (count("failed") > 0) text += ` · ${count("failed")} failed`;
  if (count("skipped") > 0) text += ` · ${count("skipped")} skipped`;
  if (count("canceled") > 0) text += ` · ${count("canceled")} canceled`;
  if (count("scheduled") > 0) text += ` · ${count("scheduled")} waiting`;
  return text;
}

export const SIMPLE_DETAIL_STRINGS = {
  /** What heads an AI step's prompt, a judge's question and the rest, by the step's category. */
  instructions: (category: StepCategory): string => {
    switch (category) {
      case "judge":
        return "What the AI is asked to judge";
      case "image":
        return "What to draw";
      case "search":
        return "What to search for";
      default:
        return "What the AI is asked";
    }
  },
  uses: "Uses",
  produces: "Produces",
  from: "From",
  usedBy: "Used by",
  madeBy: "Made by",
  readBy: "Read by",
  inputOfMethod: "An input of the method",
  resultOfMethod: "The result of the method",
  nothingReadsIt: "Nothing after this step reads it",
  showValue: "Show the value",
  value: "The value",
  dryRunValues: "This was a test run: its values are made up, so none is shown.",
  oneRunShown: (runs: number) =>
    `This step ran ${runs} times, once for each item. The values shown are one item's.`,
  ranOnce: (status: string, duration: string | null) =>
    duration ? `${status} · ${duration}` : status,
  ranTimes: (tally: SimpleRunTally) => `Ran ${tally.total} times: ${tallyCounts(tally)}`,
  items: (tally: SimpleRunTally) =>
    tally.total === 1
      ? `1 item: ${tallyCounts(tally)}`
      : `${tally.total} items: ${tallyCounts(tally)}`,
  groups: (count: number) => (count === 1 ? "Groups 1 step" : `Groups ${count} steps`),
  showSteps: "Show the steps",
  outcomes: "Possible outcomes",
  taken: (taken: number, runs: number) => {
    if (taken === 0) return "Not taken";
    if (runs <= 1 || taken === runs) return "Taken";
    return `Taken ${taken} of ${runs} times`;
  },
  repeatsOver: "Repeats over",
  stepsRepeated: "Steps it repeats",
  contains: "What it contains",
  arrowKind: "Passed along",
  arrowFrom: "From",
  arrowTo: "To",
  whenOutcome: (outcome: string) => `Taken when the decision says: ${outcome}`,
  carries: "What it carries",
  carriesNothing: "Nothing passes here: the arrow only says which way the decision went.",
  inputKind: "Input",
  outputKind: "Result",
  frameKind: "For each",
  decisionKind: "Decision",
  technicalDetails: "Technical details",
  whatToDoNext: "What to do next",
  // The concept's own name, never pluralized: a plural would be a guess ("Data", "Feedback").
  listOf: (plain: string) => `${plain} (list)`,
  list: "List",
} as const;
