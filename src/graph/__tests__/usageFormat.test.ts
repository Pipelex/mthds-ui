/**
 * Tests for the usage presentation rules. Each block pins one of the ways a
 * naive rendering would state something false about money.
 */
import { describe, it, expect } from "vitest";
import type { GraphSpecModelUsage, GraphSpecNodeUsage } from "@graph/types";
import { formatCost, hasRealTokenCounts, scopeUsage, usageState } from "@graph/usageFormat";

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

describe("hasRealTokenCounts", () => {
  function modelOfType(model_type: string): GraphSpecModelUsage {
    return {
      inference_model_name: `${model_type}-model`,
      inference_model_id: `${model_type}-model-id`,
      model_type,
      inference_calls: 1,
      rated_inference_calls: 1,
      cost: 0.01,
    };
  }

  function scopedWith(modelTypes: string[]) {
    return scopeUsage(makeUsage({ by_model: modelTypes.map(modelOfType) }), "own");
  }

  it("trusts the tokens of an LLM and of a judgment model, alone or together", () => {
    expect(hasRealTokenCounts(scopedWith(["llm"]))).toBe(true);
    expect(hasRealTokenCounts(scopedWith(["judgment"]))).toBe(true);
    expect(hasRealTokenCounts(scopedWith(["llm", "judgment"]))).toBe(true);
  });

  it("distrusts a scope that any per-request model joined", () => {
    expect(hasRealTokenCounts(scopedWith(["extract"]))).toBe(false);
    expect(hasRealTokenCounts(scopedWith(["llm", "search"]))).toBe(false);
    expect(hasRealTokenCounts(scopedWith(["judgment", "img_gen"]))).toBe(false);
  });

  it("distrusts a model type it does not know, and a scope where nothing ran", () => {
    expect(hasRealTokenCounts(scopedWith(["unknown"]))).toBe(false);
    expect(hasRealTokenCounts(scopedWith([]))).toBe(false);
  });
});
