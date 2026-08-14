/**
 * Tests for the usage presentation rules. Each block pins one of the ways a
 * naive rendering would state something false about money.
 */
import { describe, it, expect } from "vitest";
import type { GraphSpecNodeUsage } from "@graph/types";
import { formatCost, scopeUsage, usageState } from "@graph/usageFormat";

function makeUsage(overrides: Partial<GraphSpecNodeUsage> = {}): GraphSpecNodeUsage {
  return {
    inference_calls: 0,
    rated_inference_calls: 0,
    nb_tokens_by_category: {},
    total_tokens: 0,
    cost: null,
    cost_input: null,
    cost_output: null,
    subtree_inference_calls: 0,
    subtree_rated_inference_calls: 0,
    subtree_nb_tokens_by_category: {},
    subtree_total_tokens: 0,
    subtree_cost: null,
    subtree_cost_input: null,
    subtree_cost_output: null,
    by_model: [],
    subtree_by_model: [],
    ...overrides,
  };
}

describe("usageState", () => {
  it("separates unrated from a rated zero cost", () => {
    const unrated = scopeUsage(makeUsage({ inference_calls: 1, cost: null }), "own");
    const freeButRated = scopeUsage(
      makeUsage({ inference_calls: 1, rated_inference_calls: 1, cost: 0 }),
      "own",
    );
    expect(usageState(unrated)).toBe("unrated");
    expect(usageState(freeButRated)).toBe("rated");
    expect(formatCost(0)).toBe("$0.0000");
  });
});

describe("formatters", () => {
  it("never rounds a non-zero cost down to zero", () => {
    expect(formatCost(0.00001)).toBe("<$0.0001");
    expect(formatCost(0)).toBe("$0.0000");
    expect(formatCost(1.23456)).toBe("$1.2346");
  });
});
