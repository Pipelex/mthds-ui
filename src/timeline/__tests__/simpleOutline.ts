/**
 * The simple style's projection as a compact text outline, one line per line
 * of the checklist, so a test reads like the design's pictures:
 *
 *   ✓ Extract the filings from the document
 *   ◐ Summarize a filing · for each filing [1/3 done, 2 running] {stuck 1}
 *   ○ Assemble the report
 *
 * The marks are the state (`○` upcoming, `◐` running, `✓` done, `✗` failed,
 * `–` skipped, `■` stopped), `→` an outcome taken, `=` an outcome a branch
 * stands for, `▾` an expanded line and `▸` a folded one that opens.
 */
import type { SimpleLineState, SimpleProgress, SimpleProgressLine } from "../styles/simpleProgress";

const MARK: Record<SimpleLineState, string> = {
  upcoming: "○",
  running: "◐",
  done: "✓",
  failed: "✗",
  skipped: "–",
  stopped: "■",
};

function describe(line: SimpleProgressLine): string {
  const parts: string[] = [MARK[line.state]];
  if (line.kind === "now") parts.push("Now:");
  if (line.kind === "finished") parts.push(`${line.foldedCount} done`);
  else parts.push(line.title);
  if (line.kind === "forEach") parts.push(`· for each ${line.forEachItem ?? "item"}`);
  if (line.kind === "together") parts.push("· together");
  if (line.outcome) {
    const key = line.outcome.key ?? "(default)";
    parts.push(line.outcome.resolved ? `→ ${key}` : `= ${key}`);
  }
  if (line.counts) {
    const c = line.counts;
    let text = `[${c.done}/${c.total} done`;
    if (c.running) text += `, ${c.running} running`;
    if (c.failed) text += `, ${c.failed} failed`;
    parts.push(`${text}]`);
  }
  if (line.tally) {
    const t = line.tally;
    const tally = (["done", "running", "failed", "skipped", "stopped"] as const)
      .filter((key) => t[key] > 0)
      .map((key) => `${key} ${t[key]}`);
    parts.push(`(${tally.join(", ") || "none"})`);
  }
  const health = line.health;
  if (health) {
    const notes: string[] = [];
    if (health.retryAttempt !== null) notes.push(`attempt ${health.retryAttempt}`);
    if (health.retryingItems) notes.push(`retrying ${health.retryingItems}`);
    if (health.stuckItems) notes.push(`stuck ${health.stuckItems}`);
    else if (health.degradation) notes.push("stuck");
    if (health.problem) notes.push(`problem ${health.problem.code}`);
    parts.push(`{${notes.join(", ")}}`);
  }
  if (line.expandable) parts.push(line.expanded ? "▾" : "▸");
  return parts.join(" ");
}

/** The lines of a projection, indented two spaces per level. */
export function outline(progress: SimpleProgress | SimpleProgressLine[]): string[] {
  const lines = Array.isArray(progress) ? progress : progress.lines;
  const out: string[] = [];
  const visit = (line: SimpleProgressLine, depth: number) => {
    out.push(`${"  ".repeat(depth)}${describe(line)}`);
    for (const child of line.children) visit(child, depth + 1);
  };
  for (const line of lines) visit(line, 0);
  return out;
}
