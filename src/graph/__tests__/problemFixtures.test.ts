/**
 * The problem documents the shared fixtures write out by hand, held to what the
 * standard's own builder writes for their codes, so a fixture cannot drift from
 * the core registry it is worded after.
 */
import { describe, it, expect } from "vitest";
import { buildProblem, isProblem } from "mthds/errors";
import { BINDING_FAILED_PROBLEM, FUNCTION_RAISED_PROBLEM } from "./testUtils";
import { NODE_FAILED } from "@graph/react/detail/__stories__/enrichedMockData";

describe("the fixtures' problem documents", () => {
  it("writes pipe.function_raised as the builder does", () => {
    expect(FUNCTION_RAISED_PROBLEM).toEqual(
      buildProblem(
        "pipe.function_raised",
        { pipe: "score_match", function: "funcs.score.score_match" },
        { location: { pipe: "score_match", path: ["screen_candidate", "score_match"] } },
      ),
    );
  });

  it("writes pipe.binding_failed as the builder does", () => {
    expect(BINDING_FAILED_PROBLEM).toEqual(
      buildProblem(
        "pipe.binding_failed",
        { pipe: "review_catalog", binding: "editor_note", segment: "catalog" },
        { location: { pipe: "review_catalog", path: ["review_catalog"] } },
      ),
    );
  });

  it("gives the detail panel story's failed node the builder's problem, plus a member of its own", () => {
    const { stack, ...problem } = NODE_FAILED.error!;
    expect(typeof stack).toBe("string");
    expect(isProblem(NODE_FAILED.error)).toBe(true);
    expect(problem).toEqual(
      buildProblem(
        "provider.rate_limited",
        { provider: "openai", model: "gpt-4o-mini" },
        {
          status: 429,
          retryAfter: 60,
          location: { pipe: "broken_pipe", path: ["cv_screening", "broken_pipe"] },
          pipeline_run_id: "608b9d8b-669a-41cf-ab49-92aa700c5462",
        },
      ),
    );
  });
});
