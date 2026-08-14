/**
 * Presentation rules for per-node inference usage.
 *
 * Pure, React-free, and the single place the `GraphSpecNodeUsage` invariants are
 * turned into something a human reads. The invariants themselves live on the type
 * in `types.ts`; what this module adds is the rule that a *missing* dollar is
 * never printed as a zero one, and a *partial* dollar is never printed as a
 * complete one.
 *
 * Cost is a side-panel concern only — it is never rendered on a graph card.
 */
import type { GraphSpecModelUsage, GraphSpecNodeUsage } from "./types";

/**
 * Which half of a usage object a node should be read through.
 *
 * A controller runs no inference itself — its own numbers are always zero — so
 * it must read the subtree half or it reports nothing at all. An operator is a
 * leaf and reads its own.
 */
export type UsageScope = "own" | "subtree";

/** The scoped numbers, with the own/subtree distinction already resolved away. */
export interface ScopedUsage {
  scope: UsageScope;
  inferenceCalls: number;
  ratedInferenceCalls: number;
  /**
   * ⚠ NOT a token count for every pipe type — do not render these.
   *
   * Extract, search and image generation are billed per request, and pipelex
   * encodes that price by putting exactly `1_000_000` in each token category:
   * rates are per-million, so `1_000_000 x rate/1e6` reproduces the per-request
   * price exactly (see `linkup_extract_worker.py`, `gateway_extract_worker.py`).
   * A one-page extract therefore reports 2,000,000 "tokens".
   *
   * A controller's subtree total sums those sentinels with real LLM tokens, so
   * no token figure is trustworthy at any level of a graph. `cost` is the number
   * that survives the encoding; these are carried for completeness only.
   */
  nbTokensByCategory: Record<string, number>;
  /** ⚠ See `nbTokensByCategory` — not a token count for every pipe type. */
  totalTokens: number;
  cost: number | null;
  costInput: number | null;
  costOutput: number | null;
  models: GraphSpecModelUsage[];
}

export function scopeUsage(usage: GraphSpecNodeUsage, scope: UsageScope): ScopedUsage {
  if (scope === "subtree") {
    return {
      scope,
      inferenceCalls: usage.subtree_inference_calls,
      ratedInferenceCalls: usage.subtree_rated_inference_calls,
      nbTokensByCategory: usage.subtree_nb_tokens_by_category,
      totalTokens: usage.subtree_total_tokens,
      cost: usage.subtree_cost,
      costInput: usage.subtree_cost_input,
      costOutput: usage.subtree_cost_output,
      models: usage.subtree_by_model,
    };
  }
  return {
    scope,
    inferenceCalls: usage.inference_calls,
    ratedInferenceCalls: usage.rated_inference_calls,
    nbTokensByCategory: usage.nb_tokens_by_category,
    totalTokens: usage.total_tokens,
    cost: usage.cost,
    costInput: usage.cost_input,
    costOutput: usage.cost_output,
    models: usage.by_model,
  };
}

/**
 * The four states a scoped usage can be rendered in.
 *
 * `ran-nothing` and an absent usage object both render as nothing, but they are
 * distinct upstream — see invariant 1 — and the detail panel says so.
 */
export type UsageState = "ran-nothing" | "unrated" | "partial" | "rated";

export function usageState(scoped: ScopedUsage): UsageState {
  if (scoped.inferenceCalls === 0) return "ran-nothing";
  if (scoped.cost === null) return "unrated";
  if (scoped.ratedInferenceCalls < scoped.inferenceCalls) return "partial";
  return "rated";
}

/**
 * USD at the same 4-decimal precision the pipelex cost table uses.
 *
 * A rated call that cost nothing is a real `$0.0000` and prints as such; a cost
 * too small to show at 4 decimals prints as `<$0.0001` rather than rounding to
 * zero, because "rounded to nothing" and "cost nothing" are different claims.
 */
export function formatCost(cost: number): string {
  if (cost > 0 && cost < 0.0001) return "<$0.0001";
  return `$${cost.toFixed(4)}`;
}

/**
 * Whether this scope's token counts are real measurements.
 *
 * True only when every model that ran is token-billed. Anything else is billed per
 * request, and pipelex encodes that price as `1_000_000` tokens per category — so a
 * mixed branch (an LLM beside an extract) has a token total that silently blends a
 * measurement with a request counter, and must not be displayed either.
 */
export function hasRealTokenCounts(scoped: ScopedUsage): boolean {
  return scoped.models.length > 0 && scoped.models.every((entry) => entry.model_type === "llm");
}
