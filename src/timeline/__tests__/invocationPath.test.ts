import { describe, expect, it } from "vitest";
import {
  PATH_SEGMENT_KIND,
  decodeOutcomeKey,
  invocationPathDepth,
  isOrdinalSegment,
  lastPathSegment,
  parentInvocationPath,
  parsePathSegment,
  splitInvocationPath,
} from "../invocationPath";

describe("invocation paths", () => {
  it("splits a path into the entry pipe's pipe_ref and the segments under it", () => {
    expect(splitInvocationPath("filings.review_filings/step_3/item_2/step_1")).toEqual({
      root: "filings.review_filings",
      segments: ["step_3", "item_2", "step_1"],
    });
    expect(splitInvocationPath("filings.review_filings")).toEqual({
      root: "filings.review_filings",
      segments: [],
    });
  });

  it("counts a path's depth with the root included", () => {
    expect(invocationPathDepth("filings.review_filings")).toBe(1);
    expect(invocationPathDepth("filings.review_filings/step_3/item_2")).toBe(3);
  });

  it("names the parent one segment up, and none above the root", () => {
    expect(parentInvocationPath("filings.review_filings/step_3/item_2")).toBe(
      "filings.review_filings/step_3",
    );
    expect(parentInvocationPath("filings.review_filings")).toBeNull();
    expect(lastPathSegment("filings.review_filings")).toBeNull();
  });

  it("parses the numbered segments", () => {
    expect(parsePathSegment("step_3")).toEqual({ kind: "step", ordinal: 3, raw: "step_3" });
    expect(parsePathSegment("branch_12")).toEqual({
      kind: "branch",
      ordinal: 12,
      raw: "branch_12",
    });
    expect(parsePathSegment("item_1")).toEqual({ kind: "item", ordinal: 1, raw: "item_1" });
    expect(isOrdinalSegment(parsePathSegment("item_1"))).toBe(true);
    expect(isOrdinalSegment(parsePathSegment("default"))).toBe(false);
    expect(isOrdinalSegment(null)).toBe(false);
  });

  it("keeps an ordinal the grammar does not allow as an unknown segment", () => {
    // Ordinals count from 1, without a leading zero.
    expect(parsePathSegment("step_0").kind).toBe(PATH_SEGMENT_KIND.UNKNOWN);
    expect(parsePathSegment("item_01").kind).toBe(PATH_SEGMENT_KIND.UNKNOWN);
    expect(parsePathSegment("Step_1").kind).toBe(PATH_SEGMENT_KIND.UNKNOWN);
    expect(parsePathSegment("batch_branch")).toEqual({ kind: "unknown", raw: "batch_branch" });
  });

  it("decodes an outcome key, and reads the default group", () => {
    expect(parsePathSegment("outcome_detailed")).toEqual({
      kind: "outcome",
      key: "detailed",
      raw: "outcome_detailed",
    });
    expect(parsePathSegment("outcome_high%20risk")).toMatchObject({ key: "high risk" });
    expect(parsePathSegment("outcome_a%2Fb")).toMatchObject({ key: "a/b" });
    expect(parsePathSegment("outcome_caf%C3%A9")).toMatchObject({ key: "café" });
    expect(parsePathSegment("outcome_")).toMatchObject({ kind: "outcome", key: "" });
    expect(parsePathSegment("default")).toEqual({ kind: "default", raw: "default" });
  });

  it("returns a malformed encoding as written rather than throwing", () => {
    expect(decodeOutcomeKey("100%")).toBe("100%");
    expect(decodeOutcomeKey("%E2%82")).toBe("%E2%82");
  });

  it("reads a percent-encoded slash as part of the key, never as a separator", () => {
    const path = "risk.assess/step_1/outcome_a%2Fb/step_2";
    expect(splitInvocationPath(path).segments).toEqual(["step_1", "outcome_a%2Fb", "step_2"]);
    expect(parentInvocationPath(path)).toBe("risk.assess/step_1/outcome_a%2Fb");
  });
});
