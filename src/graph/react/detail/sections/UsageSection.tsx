import React from "react";
import type { GraphSpecNodeUsage } from "@graph/types";
import {
  formatCost,
  hasRealTokenCounts,
  scopeUsage,
  usageState,
  type ScopedUsage,
} from "@graph/usageFormat";
import { KV } from "./shared";

/**
 * Inference cost, rendered inline beside the status and duration.
 *
 * Cost belongs with the other facts about the run itself — it succeeded, it took
 * 23.57s, it cost $0.0138 — so it shares that line and that formatting rather
 * than claiming a block of its own. Everything else about usage (call counts,
 * the node's own figures vs its branch's) is a diagnostic and lives behind the
 * chevron. Token counts are shown nowhere — see UsageColumn for why.
 *
 * The cost text is honest about the three states rather than printing a number
 * in all of them: a real price, a lower bound when only some calls were priced,
 * and nothing at all when there is no price to give.
 *
 * The state lives in the panel, not here, because the trigger sits inside the
 * status row while the body renders below it.
 */

/** Which half of the usage a node reports: a controller has only its branch. */
export function usageHeadlineScope(usage: GraphSpecNodeUsage, isController: boolean): ScopedUsage {
  return scopeUsage(usage, isController ? "subtree" : "own");
}

function costText(scoped: ScopedUsage): string | null {
  const state = usageState(scoped);
  // No inference, or nothing priced: there is no cost to state, and a "0" or a
  // "—" would each imply something. Say nothing.
  if (state === "ran-nothing" || state === "unrated") return null;
  const cost = formatCost(scoped.cost ?? 0);
  return state === "partial" ? `≥ ${cost}` : cost;
}

function costTitle(scoped: ScopedUsage, isController: boolean): string {
  const scopeWord = isController ? "This pipe and everything below it" : "This pipe";
  const state = usageState(scoped);
  if (state === "partial") {
    return `${scopeWord}: only ${scoped.ratedInferenceCalls} of ${scoped.inferenceCalls} calls were priced, so this is a lower bound. Click for details.`;
  }
  return `${scopeWord}: ${scoped.inferenceCalls} inference call(s). Click for the breakdown.`;
}

/** Thin chevron, deliberately quieter than the text it sits beside. */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`detail-usage-chevron ${open ? "detail-usage-chevron--open" : ""}`}
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/**
 * The inline cost + disclosure trigger. Returns null when there is no price to
 * show, so nothing appears beside the duration on a run that cost nothing.
 */
export function UsageCostInline({
  usage,
  isController,
  expanded,
  onToggle,
}: {
  usage: GraphSpecNodeUsage;
  isController: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const scoped = usageHeadlineScope(usage, isController);
  const text = costText(scoped);
  if (text === null) return null;

  return (
    <button
      type="button"
      className="detail-usage-inline"
      aria-expanded={expanded}
      onClick={onToggle}
      title={costTitle(scoped, isController)}
    >
      <span className="detail-usage-value">{text}</span>
      <Chevron open={expanded} />
    </button>
  );
}

/**
 * The categories that get a paired count/cost row of their own. Everything else in
 * `nb_tokens_by_category` (cached, audio, reasoning, prediction) is a detail listed
 * after — and only when non-zero, since a zero there says nothing a missing row
 * would not.
 */
const PAIRED_CATEGORIES = new Set(["input", "output"]);

function extraCategories(nbTokensByCategory: Record<string, number>): [string, number][] {
  return Object.entries(nbTokensByCategory)
    .filter(([category, nbTokens]) => !PAIRED_CATEGORIES.has(category) && nbTokens > 0)
    .sort(([a], [b]) => a.localeCompare(b));
}

/**
 * One usage scope: calls, then each token count beside the cost it produced.
 *
 * The pairing is the point — input tokens next to what the input cost, output next
 * to what the output cost, totals last. Reading down the column answers "where did
 * the money go" without the reader holding two separate blocks in their head.
 *
 * Token rows are gated on `hasRealTokenCounts` — every model in this scope being
 * token-billed — rather than on the node's pipe type. That is the difference between
 * a heuristic and the actual discriminator: it gets a controller's branch right too,
 * showing tokens for an all-LLM branch and hiding them the moment an extract or a
 * search joins it and turns the total into a blend of measurement and request
 * counter. The costs stay in either case: a price is a price.
 */
function UsageColumn({ scoped, label }: { scoped: ScopedUsage; label: string }) {
  const showsTokens = hasRealTokenCounts(scoped);
  const isPriced = scoped.cost !== null;
  const nbTokensInput = scoped.nbTokensByCategory.input ?? 0;
  const nbTokensOutput = scoped.nbTokensByCategory.output ?? 0;

  return (
    <div>
      <div className="detail-section-label">{label}</div>
      <KV label="inference calls" value={scoped.inferenceCalls} />
      <KV label="priced calls" value={scoped.ratedInferenceCalls} />

      {showsTokens && <KV label="input tokens" value={nbTokensInput.toLocaleString()} />}
      {isPriced && scoped.costInput !== null && (
        <KV label="input cost" value={formatCost(scoped.costInput)} />
      )}

      {showsTokens && <KV label="output tokens" value={nbTokensOutput.toLocaleString()} />}
      {isPriced && scoped.costOutput !== null && (
        <KV label="output cost" value={formatCost(scoped.costOutput)} />
      )}

      {/* total_tokens, never a sum of the categories: input_cached is a subset of
          input, so summing them double-counts. */}
      {showsTokens && <KV label="total tokens" value={scoped.totalTokens.toLocaleString()} />}
      <KV label="total cost" value={isPriced ? formatCost(scoped.cost ?? 0) : "not priced"} />

      {showsTokens &&
        extraCategories(scoped.nbTokensByCategory).map(([category, nbTokens]) => (
          <KV key={category} label={`tokens · ${category}`} value={nbTokens.toLocaleString()} />
        ))}
    </div>
  );
}

/** The expanded diagnostics: the node's own figures, and its branch's when they differ. */
export function UsageDetails({
  usage,
  isController,
}: {
  usage: GraphSpecNodeUsage;
  isController: boolean;
}) {
  const own = scopeUsage(usage, "own");
  const subtree = scopeUsage(usage, "subtree");
  // A leaf's branch is identical to itself; repeating it is noise.
  const showsSubtree = isController || subtree.inferenceCalls !== own.inferenceCalls;

  return (
    <div className="detail-usage-details">
      <UsageColumn scoped={own} label={isController ? "This pipe itself" : "Usage"} />
      {showsSubtree && <UsageColumn scoped={subtree} label="This pipe and everything below it" />}
    </div>
  );
}
